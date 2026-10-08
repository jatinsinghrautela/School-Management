import PDFDocument from "pdfkit";
export async function reportPdf(r) {
  const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: { Title: `${r.examName} - ${r.studentName}`, Author: r.schoolName },
    }),
    chunks = [];
  const done = new Promise((resolve, reject) => {
    doc.on("data", (b) => chunks.push(b));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const style = r.reportStyle || {},
    accent = style.accent || "#176455";
  doc.fillColor(accent).fontSize(22).text(r.schoolName, { align: "center" });
  doc
    .fillColor("#465951")
    .fontSize(11)
    .text(r.schoolCity || "", { align: "center" })
    .moveDown();
  doc
    .fillColor("#183a31")
    .fontSize(16)
    .text(style.heading || "Academic report card", { align: "center" })
    .fontSize(11)
    .text(`${r.examName} | ${r.academicYear}`, { align: "center" })
    .moveDown();
  doc
    .fontSize(12)
    .text(`Student: ${r.studentName}`)
    .text(`Class: ${r.className}`)
    .fontSize(10)
    .text(
      `Approved version ${r.version} | Published ${r.publishedAt.slice(0, 10)}`,
    )
    .moveDown();
  function tableHeader() {
    const y = doc.y;
    doc.rect(48, y, 499, 26).fill(accent);
    doc
      .fillColor("#ffffff")
      .fontSize(10)
      .text("Subject", 58, y + 8, { width: 210 })
      .text("Marks", 285, y + 8, { width: 80 })
      .text("Weight", 375, y + 8, { width: 65 })
      .text("Result", 455, y + 8, { width: 82 });
    doc.y = y + 30;
    doc.fillColor("#183a31");
  }
  tableHeader();
  for (const row of r.rows) {
    doc.fontSize(10);
    const height = Math.max(
      28,
      doc.heightOfString(row.name, { width: 210 }) + 14,
    );
    if (doc.y + height > 720) {
      doc.addPage();
      tableHeader();
    }
    const y = doc.y;
    doc
      .fillColor("#183a31")
      .text(row.name, 58, y + 6, { width: 210 })
      .text(`${row.score} / ${row.maxScore}`, 285, y + 6, { width: 80 })
      .text(String(row.weight), 375, y + 6, { width: 65 })
      .text(row.passed ? "Pass" : "Needs support", 455, y + 6, { width: 82 });
    doc
      .moveTo(48, y + height)
      .lineTo(547, y + height)
      .strokeColor("#d6e5dd")
      .stroke();
    doc.y = y + height;
  }
  if (doc.y > 610) doc.addPage();
  doc.x = 48;
  doc
    .moveDown()
    .fontSize(12)
    .fillColor(accent)
    .text(`Total: ${r.totalScore} / ${r.totalMax}`)
    .text(
      `Weighted percentage: ${r.percentage.toFixed(2)}% | Grade: ${r.grade}`,
    )
    .text(`Outcome: ${r.passed ? "Passed" : "Needs support"}`)
    .moveDown();
  doc
    .fillColor("#465951")
    .fontSize(10)
    .text(`Class teacher: ${style.classTeacher || "________________________"}`)
    .text(`Principal: ${style.principal || r.publishedBy}`)
    .text(
      "Typed sign-off names; this document does not contain a cryptographic signature.",
    )
    .moveDown()
    .text(
      "This report uses the approved publication snapshot. Later corrections require a new published version.",
    );
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor("#64756d")
      .text(
        `Schoolglass Desk | Version ${r.version} | Page ${i + 1} of ${pages.count}`,
        48,
        780,
        { width: 499, align: "center", lineBreak: false },
      );
  }
  doc.end();
  return done;
}
