export function brandWorkbook(book, schoolName, logo) {
  const sheet = book.addWorksheet("School identity");
  sheet.columns = [{ width: 18 }, { width: 60 }];
  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = schoolName;
  sheet.getCell("A1").font = {
    size: 20,
    bold: true,
    color: { argb: "FF176455" },
  };
  sheet.getRow(1).height = 40;
  sheet.getCell("B3").value = "School document · Schoolglass Desk";
  sheet.getCell("B3").alignment = { wrapText: true };
  if (/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(logo || "")) {
    const image = book.addImage({ base64: logo, extension: "png" });
    sheet.addImage(image, {
      tl: { col: 0, row: 2 },
      ext: { width: 72, height: 72 },
    });
    sheet.getRow(3).height = 60;
  }
  sheet.pageSetup = {
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
  };
}
