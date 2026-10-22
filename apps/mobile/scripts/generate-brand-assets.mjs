import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
const output = new URL("../assets/", import.meta.url);
await mkdir(output, { recursive: true });
const crc = (data) => {
  let n = 0xffffffff;
  for (const b of data) {
    n ^= b;
    for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
  }
  return (n ^ 0xffffffff) >>> 0;
};
const chunk = (name, data) => {
  const type = Buffer.from(name),
    size = Buffer.alloc(4),
    sum = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc(Buffer.concat([type, data])));
  return Buffer.concat([size, type, data, sum]);
};
// Same original geometric mark as BrandMark, expressed in its 30-unit grid.
const mark = (x, y) =>
  (x >= 6 &&
    x <= 29 &&
    y >= 2 &&
    y <= 25 &&
    (x <= 8 || x >= 27 || y <= 4 || y >= 23)) ||
  (x >= 17 && x <= 19 && y >= 2 && y <= 25) ||
  (x >= 6 && x <= 29 && y >= 13 && y <= 15) ||
  (x >= 1 && x <= 3 && y >= 8 && y <= 29) ||
  (x >= 1 && x <= 24 && y >= 27 && y <= 29);
for (const adaptive of [false, true]) {
  const size = 1024,
    scale = adaptive ? 17 : 22,
    offset = (size - scale * 30) / 2;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      if (mark((x - offset) / scale, (y - offset) / scale)) {
        raw[i] = 225;
        raw[i + 1] = 255;
        raw[i + 2] = 240;
        raw[i + 3] = 255;
      } else if (!adaptive) {
        const t = (x + y) / (size * 2);
        raw[i] = Math.round(18 + 3 * t);
        raw[i + 1] = Math.round(63 + 28 * t);
        raw[i + 2] = Math.round(58 + 23 * t);
        raw[i + 3] = 255;
      }
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  await writeFile(
    new URL(adaptive ? "adaptive-icon.png" : "icon.png", output),
    png,
  );
}
console.log(
  "Generated original Schoolglass icons (1024 × 1024); no remote assets.",
);
