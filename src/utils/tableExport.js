import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const border = {
  top: { style: "thin", color: { rgb: "D1D5DB" } },
  bottom: { style: "thin", color: { rgb: "D1D5DB" } },
  left: { style: "thin", color: { rgb: "D1D5DB" } },
  right: { style: "thin", color: { rgb: "D1D5DB" } },
};

const normalizeRows = (records) =>
  records.map((record) => {
    const plainRecord =
      record && typeof record === "object" && !Array.isArray(record)
        ? record
        : { Value: record };

    return Object.fromEntries(
      Object.entries(plainRecord).map(([key, value]) => [
        key,
        value && typeof value === "object"
          ? JSON.stringify(value)
          : value ?? "",
      ])
    );
  });

const getHeaders = (rows) => Object.keys(rows[0] ?? {});

const getCellText = (value) => String(value ?? "");

const getReportTitle = (title) =>
  title.toLowerCase().endsWith(" report") ? title : `${title} Report`;

export function downloadStyledXlsx({
  records,
  title,
  filename,
  sheetName = title,
}) {
  const data = normalizeRows(records);
  if (!data.length) throw new Error("There are no records to export.");

  const headers = getHeaders(data);
  const rows = data.map((record) =>
    headers.map((header) => getCellText(record[header]))
  );
  const reportTitle = getReportTitle(title);
  const worksheet = XLSX.utils.aoa_to_sheet([
    [reportTitle],
    [`Generated: ${new Date().toLocaleString()}`],
    [`Total Records: ${data.length}`],
    [],
    headers,
    ...rows,
  ]);
  const lastColumn = headers.length - 1;

  worksheet["!merges"] = [0, 1, 2].map((row) => ({
    s: { r: row, c: 0 },
    e: { r: row, c: lastColumn },
  }));
  worksheet["!cols"] = headers.map((header) => ({
    wch: Math.min(
      42,
      data.reduce(
        (width, record) =>
          Math.max(width, getCellText(record[header]).length + 2),
        Math.max(12, header.length + 2)
      )
    ),
  }));
  worksheet["!rows"] = [
    { hpt: 30 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 8 },
    { hpt: 25 },
    ...data.map(() => ({ hpt: 22 })),
  ];

  worksheet["A1"].s = {
    font: { bold: true, sz: 16, color: { rgb: "166534" } },
    alignment: { horizontal: "left", vertical: "center" },
  };
  ["A2", "A3"].forEach((cell) => {
    worksheet[cell].s = {
      font: { sz: 10, italic: true, color: { rgb: "64748B" } },
    };
  });

  headers.forEach((_, colIndex) => {
    worksheet[XLSX.utils.encode_cell({ r: 4, c: colIndex })].s = {
      fill: { patternType: "solid", fgColor: { rgb: "166534" } },
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border,
    };
  });

  data.forEach((record, rowIndex) => {
    headers.forEach((header, colIndex) => {
      const cell = XLSX.utils.encode_cell({ r: rowIndex + 5, c: colIndex });
      const isStatus = header.toLowerCase() === "status";
      const isActive = getCellText(record[header]).toLowerCase() === "active";
      worksheet[cell].s = {
        font: {
          sz: 10,
          bold: isStatus,
          color: {
            rgb: isStatus ? (isActive ? "15803D" : "64748B") : "1F2937",
          },
        },
        alignment: {
          horizontal: colIndex === 0 ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border,
      };
    });
  });

  worksheet["!autofilter"] = {
    ref: `A5:${XLSX.utils.encode_col(lastColumn)}${data.length + 5}`,
  };
  worksheet["!freeze"] = { xSplit: 0, ySplit: 5 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName.replace(/[\\/?*:[\]]/g, " ").slice(0, 31) || "Data"
  );
  XLSX.writeFile(workbook, filename);
}

export function downloadStyledPdf({ records, title, filename }) {
  const data = normalizeRows(records);
  if (!data.length) throw new Error("There are no records to export.");

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const columns = getHeaders(data);
  const reportTitle = getReportTitle(title);
  const titleLines = doc.splitTextToSize(
    reportTitle,
    doc.internal.pageSize.getWidth() - 28
  );
  const titleBottom = 15 + (titleLines.length - 1) * 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(22, 101, 52);
  doc.text(titleLines, 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, titleBottom + 7);
  doc.text(`Total Records: ${data.length}`, 14, titleBottom + 12);

  autoTable(doc, {
    startY: titleBottom + 17,
    head: [columns],
    body: data.map((record) =>
      columns.map((column) => getCellText(record[column]))
    ),
    theme: "grid",
    margin: { top: 12, right: 14, bottom: 14, left: 14 },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak",
      lineColor: [209, 213, 219],
      lineWidth: 0.2,
      textColor: [31, 41, 55],
      valign: "middle",
    },
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    showHead: "everyPage",
    horizontalPageBreak: true,
    didDrawPage: () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
        pageWidth - 14,
        pageHeight - 6,
        { align: "right" }
      );
    },
  });

  doc.save(filename);
}
