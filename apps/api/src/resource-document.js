import PDFKit from "pdfkit";
import { PDFDocument } from "pdf-lib";
import { fail } from "./operations-common.js";

export async function brandedResource(bytes, mime, school, resource, logo) {
  if (!logo) return { bytes, mime };
  const doc = new PDFKit({ size: "A4", margin: 48 }),
    chunks = [];
  const ready = new Promise((resolve, reject) => {
    doc.on("data", (b) => chunks.push(b));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.image(
    Buffer.from(logo.split(",")[1], "base64"),
    (doc.page.width - 72) / 2,
    48,
    { width: 72, height: 72 },
  );
  doc.y = 140;
  doc
    .fillColor("#176455")
    .fontSize(22)
    .text(school.name, { align: "center" })
    .moveDown();
  doc
    .fillColor("#183a31")
    .fontSize(18)
    .text(resource.title, { align: "center" })
    .moveDown();
  doc
    .fontSize(11)
    .text(`Class resource | ${resource.type || "Learning material"}`)
    .moveDown();
  if (resource.description)
    doc.text(resource.description.slice(0, 600), { width: 499 }).moveDown();
  doc
    .fontSize(10)
    .fillColor("#465951")
    .text(
      "School-branded download. The uploaded material follows this cover; the stored original is retained.",
    );
  doc.end();
  const cover = await ready;
  try {
    const result = await PDFDocument.load(cover);
    if (mime === "application/pdf") {
      const source = await PDFDocument.load(bytes);
      if (source.getPageCount() > 200)
        fail(
          422,
          "Resource PDFs may contain at most 200 pages for branded downloads",
        );
      for (const page of await result.copyPages(
        source,
        source.getPageIndices(),
      ))
        result.addPage(page);
    } else {
      const image =
        mime === "image/png"
          ? await result.embedPng(bytes)
          : await result.embedJpg(bytes);
      const page = result.addPage([595.28, 841.89]),
        size = image.scale(Math.min(499 / image.width, 720 / image.height));
      page.drawImage(image, {
        x: (595.28 - size.width) / 2,
        y: (841.89 - size.height) / 2,
        width: size.width,
        height: size.height,
      });
    }
    return { bytes: Buffer.from(await result.save()), mime: "application/pdf" };
  } catch (e) {
    if (e.status) throw e;
    fail(
      422,
      "This attachment could not be formatted. Upload a valid, unencrypted PDF or PNG/JPEG image.",
    );
  }
}
