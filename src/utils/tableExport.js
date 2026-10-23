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

 

const isPreAlertExport = (title, headers) =>

  title.toLowerCase().replace(/[-_]/g, " ").includes("pre alert") &&

  ["S.No.", "Title", "Description", "Instruction", "Created At"].every(

    (header) => headers.includes(header)

  );

 

// Estimate Excel row height so wrapped text remains visible.

const getWrappedRowHeight = (record, headers, widths) => {

  const estimatedLines = headers.map((header, index) => {

    const text = getCellText(record[header]);

    const width = widths[index] || 12;

 

    return text

      .split("\n")

      .reduce(

        (total, line) => total + Math.max(1, Math.ceil(line.length / width)),

        0

      );

  });

 

  return Math.max(22, Math.max(...estimatedLines) * 14 + 8);

};

 

export function downloadStyledXlsx({

  records,

  title,

  filename,

  sheetName = title,

}) {

  const data = normalizeRows(records);

 

  if (!data.length) {

    throw new Error("There are no records to export.");

  }

 

  const headers = getHeaders(data);

  const rows = data.map((record) =>

    headers.map((header) => getCellText(record[header]))

  );

 

  const reportTitle = getReportTitle(title);

  const isPreAlert = isPreAlertExport(title, headers);

 

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

 

  // Fixed widths for Pre-Alerts; retain automatic widths for other reports.

  const preAlertWidths = {

    "S.No.": 8,

    Title: 28,

    Description: 45,

    Instruction: 45,

    "Created At": 23,

  };

 

  const columnWidths = headers.map((header) => {

    if (isPreAlert) {

      return preAlertWidths[header] ?? 15;

    }

 

    return Math.min(

      42,

      data.reduce(

        (width, record) =>

          Math.max(width, getCellText(record[header]).length + 2),

        Math.max(12, header.length + 2)

      )

    );

  });

 

  worksheet["!cols"] = columnWidths.map((wch) => ({ wch }));

 

  worksheet["!rows"] = [

    { hpt: 30 },

    { hpt: 20 },

    { hpt: 20 },

    { hpt: 8 },

    { hpt: 25 },

    ...data.map((record) => ({

      hpt: isPreAlert

        ? getWrappedRowHeight(record, headers, columnWidths)

        : 22,

    })),

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

      const cell = XLSX.utils.encode_cell({

        r: rowIndex + 5,

        c: colIndex,

      });

 

      const isStatus = header.toLowerCase() === "status";

      const isActive =

        getCellText(record[header]).toLowerCase() === "active";

 

      worksheet[cell].s = {

        font: {

          sz: 10,

          bold: isStatus,

          color: {

            rgb: isStatus

              ? isActive

                ? "15803D"

                : "64748B"

              : "1F2937",

          },

        },

        alignment: {

          horizontal:

            header === "S.No." || colIndex === 0 ? "center" : "left",

          vertical: "top",

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

 

  if (!data.length) {

    throw new Error("There are no records to export.");

  }

 

  const doc = new jsPDF({

    orientation: "landscape",

    unit: "mm",

    format: "a4",

  });

 

  const columns = getHeaders(data);

  const reportTitle = getReportTitle(title);

  const isPreAlert = isPreAlertExport(title, columns);

 

  const pageWidth = doc.internal.pageSize.getWidth();

  const titleLines = doc.splitTextToSize(reportTitle, pageWidth - 28);

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

 

  // These fixed widths total 263 mm and fit within a landscape A4 page

  // with 10 mm left and right margins.

  const preAlertColumnWidths = {

    "S.No.": 12,

    Title: 42,

    Description: 83,

    Instruction: 83,

    "Created At": 43,

  };

 

  const columnStyles = {};

 

  if (isPreAlert) {

    columns.forEach((column, index) => {

      columnStyles[index] = {

        cellWidth: preAlertColumnWidths[column],

        halign: column === "S.No." ? "center" : "left",

      };

    });

  }

 

  autoTable(doc, {

    startY: titleBottom + 17,

    head: [columns],

    body: data.map((record) =>

      columns.map((column) => getCellText(record[column]))

    ),

    theme: "grid",

 

    // Use the full available page width.

    tableWidth: "auto",

    margin: {

      top: 12,

      right: isPreAlert ? 10 : 14,

      bottom: 14,

      left: isPreAlert ? 10 : 14,

    },

 

    styles: {

      font: "helvetica",

      fontSize: isPreAlert ? 8 : 9,

      cellPadding: isPreAlert ? 2 : 3,

      overflow: "linebreak",

      lineColor: [209, 213, 219],

      lineWidth: 0.2,

      textColor: [31, 41, 55],

      valign: isPreAlert ? "top" : "middle",

    },

 

    headStyles: {

      fillColor: [22, 101, 52],

      textColor: [255, 255, 255],

      fontStyle: "bold",

      fontSize: isPreAlert ? 8 : 9,

      halign: "center",

      valign: "middle",

    },

 

    alternateRowStyles: {

      fillColor: [240, 253, 244],

    },

 

    columnStyles,

 

    // Repeat column headings when the table continues onto another page.

    showHead: "everyPage",

 

    // Avoid splitting a row across pages when possible.

    rowPageBreak: "avoid",

 

    // Do not split the table horizontally into separate page sections.

    horizontalPageBreak: false,

 

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