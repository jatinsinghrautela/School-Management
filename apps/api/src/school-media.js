import { brandedResource } from "./resource-document.js";
import { Router } from "express";
import multer from "multer";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import {
  id,
  visibleNotice,
  noticeMatchesClasses,
  canSeeClass,
} from "./domain.js";
import {
  route,
  manage,
  fail,
  text,
  reason,
  audit,
  escape,
  children,
  printable,
} from "./operations-common.js";
import { uploadType, checkQuota, scanBuffer } from "./upload-security.js";

const root = fileURLToPath(new URL("../data/uploads/", import.meta.url));
// Preserve image pixels while omitting EXIF/IPTC/comments and text metadata.
export function privateImageCopy(b) {
  const { type } = imageDimensions(b);
  if (type === "image/png") {
    const chunks = [b.subarray(0, 8)];
    let i = 8,
      pixels = false,
      ended = false;
    while (i + 12 <= b.length) {
      const size = b.readUInt32BE(i),
        end = i + 12 + size;
      if (end > b.length) fail(400, "Invalid PNG image");
      const kind = b.toString("ascii", i + 4, i + 8);
      if (
        [
          "IHDR",
          "PLTE",
          "IDAT",
          "IEND",
          "tRNS",
          "sRGB",
          "gAMA",
          "cHRM",
          "pHYs",
        ].includes(kind)
      )
        chunks.push(b.subarray(i, end));
      if (kind === "IDAT") pixels = true;
      i = end;
      if (kind === "IEND") {
        ended = true;
        break;
      }
    }
    if (!pixels || !ended) fail(400, "PNG image is incomplete");
    return Buffer.concat(chunks);
  }
  const chunks = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 < b.length) {
    const start = i;
    if (b[i++] !== 255) fail(400, "Invalid JPEG image");
    while (b[i] === 255) i++;
    const marker = b[i++];
    if (marker === 0xda) {
      chunks.push(b.subarray(start));
      return Buffer.concat(chunks);
    }
    const length = b.readUInt16BE(i);
    if (length < 2 || i + length > b.length) fail(400, "Invalid JPEG image");
    if (![0xe1, 0xed, 0xfe].includes(marker))
      chunks.push(b.subarray(start, i + length));
    i += length;
  }
  fail(400, "JPEG image is incomplete");
}
function validateLogoPixels(b) {
  if (b[28] !== 0) fail(400, "Export the logo as a non-interlaced PNG");
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[b[25]],
    bits = b[24];
  if (
    !channels ||
    !(
      {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      }[b[25]] || []
    ).includes(bits)
  )
    fail(400, "Unsupported PNG color format");
  const row = Math.ceil((256 * channels * bits) / 8) + 1,
    expected = row * 256,
    idat = [];
  for (let i = 8; i + 12 <= b.length;) {
    const n = b.readUInt32BE(i);
    if (b.toString("ascii", i + 4, i + 8) === "IDAT")
      idat.push(b.subarray(i + 8, i + 8 + n));
    i += n + 12;
  }
  try {
    const pixels = inflateSync(Buffer.concat(idat), {
      maxOutputLength: expected,
    });
    if (pixels.length !== expected) throw new Error();
    for (let y = 0; y < 256; y++) if (pixels[y * row] > 4) throw new Error();
  } catch {
    fail(400, "Logo pixel data is invalid or exceeds its specified dimensions");
  }
}
export function imageDimensions(b) {
  const type = uploadType(b);
  if (
    type === "image/png" &&
    b.length >= 33 &&
    b.toString("ascii", 12, 16) === "IHDR"
  )
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), type };
  if (type === "image/jpeg") {
    let i = 2;
    while (i + 4 < b.length) {
      if (b[i++] !== 255) break;
      while (b[i] === 255) i++;
      const marker = b[i++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = b.readUInt16BE(i);
      if (length < 2 || i + length > b.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8)
        return {
          width: b.readUInt16BE(i + 5),
          height: b.readUInt16BE(i + 3),
          type,
        };
      i += length;
    }
  }
  fail(400, "Upload a valid PNG or JPEG image");
}
export async function schoolLogo(store, schoolId) {
  const settings = (await store.all("schoolSettings", schoolId))[0];
  if (!settings?.logoFileId) return "";
  const file = (await store.all("files", schoolId)).find(
    (f) =>
      f.id === settings.logoFileId &&
      f.kind === "school-logo" &&
      f.scanStatus === "clean" &&
      !f.deleted,
  );
  if (!file) return "";
  try {
    return (
      "data:image/png;base64," +
      (await readFile(root + file.id)).toString("base64")
    );
  } catch (e) {
    if (e.code === "ENOENT") return "";
    throw e;
  }
}
export function logoHeader(logo) {
  return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(logo || "")
    ? `<img src="${escape(logo)}" alt="School logo" width="72" height="72" style="display:block;object-fit:contain;margin:0 auto 12px">`
    : "";
}
export function createSchoolMediaRouter(store, scanner) {
  const r = Router({ mergeParams: true });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6 },
  }).single("file");
  r.get(
    "/resources/:resourceId/document",
    route(async (req, res) => {
      const resource = (await store.all("resources", req.school.id)).find(
        (r) =>
          r.id === req.params.resourceId && canSeeClass(req.user, r.classId),
      );
      const file =
        resource &&
        (await store.all("files", req.school.id)).find(
          (f) =>
            f.id === resource.fileId &&
            !f.deleted &&
            !f.staged &&
            f.scanStatus === "clean" &&
            ["application/pdf", "image/png", "image/jpeg"].includes(f.mime),
        );
      if (!file || !/^[a-f0-9-]{36}$/i.test(file.id))
        fail(404, "Class attachment not found");
      let bytes;
      try {
        bytes = await readFile(root + file.id);
      } catch (e) {
        if (e.code === "ENOENT") fail(404, "Class attachment unavailable");
        throw e;
      }
      const logo =
        resource.schoolLogo || (await schoolLogo(store, req.school.id));
      const result = await brandedResource(
        bytes,
        file.mime,
        req.school,
        resource,
        logo,
      );
      res.json({
        filename: logo
          ? `${resource.title.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)}.pdf`
          : file.name,
        mime: result.mime,
        base64: result.bytes.toString("base64"),
      });
    }),
  );
  r.get(
    "/notices/:noticeId/download",
    route(async (req, res) => {
      const notice = (await store.all("notices", req.school.id)).find(
        (n) => n.id === req.params.noticeId,
      );
      const kids = req.user.role === "parent" ? await children(store, req) : [];
      if (
        !notice ||
        !(req.user.role === "parent"
          ? ["all", "parent", "student"].includes(notice.audience) &&
            noticeMatchesClasses(
              notice,
              kids.flatMap((k) => k.classIds),
            )
          : visibleNotice(req.user, notice))
      )
        fail(404, "Notice not found");
      res.json({
        filename: `notice-${notice.id}.html`,
        html: printable(
          notice.title,
          req.school.name,
          `<p>Published ${escape(notice.createdAt.slice(0, 10))}</p><pre>${escape(notice.body)}</pre>`,
          notice.schoolLogo || (await schoolLogo(store, req.school.id)),
        ),
      });
    }),
  );
  r.get(
    "/school-logo",
    route(async (req, res) =>
      res.json({
        dataUri: await schoolLogo(store, req.school.id),
        width: 256,
        height: 256,
      }),
    ),
  );
  r.post(
    "/school-logo",
    (req, res, next) => {
      try {
        manage(req);
        next();
      } catch (e) {
        res.status(e.status).json({ error: e.message });
      }
    },
    upload,
    route(async (req, res) => {
      if (!req.file) fail(400, "Choose a 256 × 256 PNG logo");
      const size = imageDimensions(req.file.buffer);
      if (
        size.type !== "image/png" ||
        size.width !== 256 ||
        size.height !== 256 ||
        req.file.size > 128 * 1024
      )
        fail(400, "Logo must be a 256 × 256 PNG, at most 128 KB");
      await scanner(req.file.buffer);
      const image = privateImageCopy(req.file.buffer);
      validateLogoPixels(image);
      const fileId = id();
      let written = false;
      try {
        const result = await store.transaction(req.school.id, async (tx) => {
          await checkQuota(tx, req.school.id, null, req.file.size);
          const settings = (await tx.all("schoolSettings", req.school.id))[0];
          if (Number(req.body.version) !== (settings?.version || 0))
            fail(409, "School settings changed; refresh before uploading");
          await mkdir(root, { recursive: true });
          await writeFile(root + fileId, image, { flag: "wx" });
          written = true;
          await tx.put("files", {
            id: fileId,
            schoolId: req.school.id,
            name: "school-logo.png",
            mime: size.type,
            size: req.file.size,
            kind: "school-logo",
            scanStatus: "clean",
            staged: false,
            createdAt: new Date().toISOString(),
          });
          const row = await tx.put("schoolSettings", {
            ...settings,
            id: settings?.id || id(),
            schoolId: req.school.id,
            displayName: settings?.displayName || "",
            accent: settings?.accent || "#11796f",
            locale: settings?.locale || "en-IN",
            timeZone: settings?.timeZone || "Asia/Kolkata",
            logoFileId: fileId,
            version: (settings?.version || 0) + 1,
          });
          await audit(tx, req, "school.logo-updated", { fileId });
          return row;
        });
        res.json({
          ...result,
          logoDataUri: await schoolLogo(store, req.school.id),
        });
      } catch (e) {
        if (written) await unlink(root + fileId).catch(() => {});
        throw e;
      }
    }),
  );
  r.get(
    "/gallery",
    route(async (req, res) => {
      const all = (await store.all("galleryPhotos", req.school.id))
        .filter((p) => !p.archived)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
      res.json({
        photos: all.slice((page - 1) * 12, page * 12),
        total: all.length,
        page,
        uploadsEnabled: scanner !== scanBuffer || !!process.env.CLAMAV_COMMAND,
      });
    }),
  );
  r.post(
    "/gallery",
    (req, res, next) => {
      try {
        manage(req);
        next();
      } catch (e) {
        res.status(e.status).json({ error: e.message });
      }
    },
    upload,
    route(async (req, res) => {
      const b = req.body;
      if (
        !req.file ||
        !text(b.title, 120) ||
        typeof b.caption !== "string" ||
        b.caption.length > 500 ||
        b.consentVerified !== "true"
      )
        fail(
          400,
          "Choose a photo, title, caption and confirm publication permission",
        );
      const size = imageDimensions(req.file.buffer);
      if (
        size.width < 1 ||
        size.height < 1 ||
        size.width > 4096 ||
        size.height > 4096 ||
        size.width * size.height > 16000000
      )
        fail(400, "Photos must be within 4096 × 4096 and 16 megapixels");
      await scanner(req.file.buffer);
      const image = privateImageCopy(req.file.buffer);
      const fileId = id();
      let written = false;
      try {
        const row = await store.transaction(req.school.id, async (tx) => {
          await checkQuota(tx, req.school.id, null, req.file.size);
          await mkdir(root, { recursive: true });
          await writeFile(root + fileId, image, { flag: "wx" });
          written = true;
          await tx.put("files", {
            id: fileId,
            schoolId: req.school.id,
            name: "gallery-photo",
            mime: size.type,
            size: req.file.size,
            kind: "gallery",
            scanStatus: "clean",
            staged: false,
            createdAt: new Date().toISOString(),
          });
          const row = await tx.put("galleryPhotos", {
            id: id(),
            schoolId: req.school.id,
            fileId,
            title: b.title.trim(),
            caption: b.caption.trim(),
            width: size.width,
            height: size.height,
            archived: false,
            publishedBy: req.user.id,
            consentVerified: true,
            createdAt: new Date().toISOString(),
          });
          await audit(tx, req, "gallery.published", { photoId: row.id });
          return row;
        });
        res.status(201).json(row);
      } catch (e) {
        if (written) await unlink(root + fileId).catch(() => {});
        throw e;
      }
    }),
  );
  r.get(
    "/gallery/:photoId/image",
    route(async (req, res) => {
      const photo = (await store.all("galleryPhotos", req.school.id)).find(
        (p) => p.id === req.params.photoId && !p.archived,
      );
      const file =
        photo &&
        (await store.all("files", req.school.id)).find(
          (f) =>
            f.id === photo.fileId && f.scanStatus === "clean" && !f.deleted,
        );
      if (!file) fail(404, "Photo not found");
      res.set("Cache-Control", "private, no-store");
      res.set("X-Content-Type-Options", "nosniff");
      try {
        res.json({
          dataUri: `data:${file.mime};base64,${(await readFile(root + file.id)).toString("base64")}`,
        });
      } catch (e) {
        if (e.code === "ENOENT") fail(404, "Photo file unavailable");
        throw e;
      }
    }),
  );
  r.post(
    "/gallery/:photoId/archive",
    route(async (req, res) => {
      manage(req);
      if (!reason(req.body.reason)) fail(400, "Give a removal reason");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = (await tx.all("galleryPhotos", req.school.id)).find(
            (p) => p.id === req.params.photoId,
          );
          if (!old) fail(404, "Photo not found");
          if (old.archived) fail(409, "Photo already removed");
          const row = await tx.put("galleryPhotos", {
            ...old,
            archived: true,
            archivedAt: new Date().toISOString(),
            archiveReason: req.body.reason.trim(),
          });
          await audit(tx, req, "gallery.archived", {
            photoId: row.id,
            reason: row.archiveReason,
          });
          return row;
        }),
      );
    }),
  );
  return r;
}
