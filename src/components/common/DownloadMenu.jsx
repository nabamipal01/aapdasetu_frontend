import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { downloadStyledPdf, downloadStyledXlsx } from "../../utils/tableExport";

function DownloadMenu({ records = [], title, disabled = false, onError }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const download = (format) => {
    try {
      const rows = records.map((record) => {
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
      const date = new Date().toISOString().slice(0, 10);
      const filenameBase = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      if (format === "xlsx") {
        downloadStyledXlsx({
          records: rows,
          title,
          filename: `${filenameBase}_${date}.xlsx`,
        });
      } else if (format === "csv") {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const url = URL.createObjectURL(
          new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filenameBase}_${date}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        downloadStyledPdf({
          records: rows,
          title,
          filename: `${filenameBase}_${date}.pdf`,
        });
      }
      setOpen(false);
    } catch (error) {
      console.error(`Failed to download ${title}:`, error);
      onError?.(error);
    }
  };

  const menuItems = [
    { format: "xlsx", label: "Download XLSX", description: "Excel workbook", icon: FileSpreadsheet, color: "text-green-600", hover: "hover:bg-green-50" },
    { format: "csv", label: "Download CSV", description: "Comma-separated data", icon: FileDown, color: "text-blue-600", hover: "hover:bg-blue-50" },
    { format: "pdf", label: "Download PDF", description: "Printable report", icon: FileText, color: "text-red-600", hover: "hover:bg-red-50" },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled || records.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download size={15} />
        Download
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {menuItems.map(({ format, label, description, icon: Icon, color, hover }) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              onClick={() => download(format)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 ${hover}`}
            >
              <Icon size={17} className={color} />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-slate-400">{description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DownloadMenu;
