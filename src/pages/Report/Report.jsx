import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart2,
  AlertTriangle,
  ClipboardList,
  Package,
  Building2,
  Activity,
  Bell,
  RefreshCw,
  Search,
  Download,
  ChevronDown,
  FileSpreadsheet,
  FileDown,
  FileText,
  Eye,
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  Users,
  FileBarChart,
} from "lucide-react";
import * as XLSX from "xlsx";
import { downloadStyledPdf, downloadStyledXlsx } from "../../utils/tableExport";
import {
  getReportSummary,
  getReportIncidents,
  getReportTasks,
  getReportInventory,
  getReportAgencies,
  getReportActivity,
  getReportAlerts,
} from "../../services/reportService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v) => (v === null || v === undefined ? "—" : v);

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d) ? v : d.toLocaleString();
};

const fmtDateOnly = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d) ? v : d.toLocaleDateString();
};

const REPORT_RECORD_ARRAYS = new Set([
  "incidents",
  "tasks",
  "items",
  "agencies",
  "pre_alerts",
  "post_alerts",
  "logs",
]);

const RECORD_DATE_FIELDS = [
  "reported_at",
  "incident_date",
  "created_at",
  "date",
  "createdAt",
  "timestamp",
  "updated_at",
  "purchase_date",
  "expiry_date",
  "due_at",
];

const isCreatedAtField = (field) =>
  String(field).replace(/[_\s]/g, "").toLowerCase() === "createdat";

function withoutCreatedAt(value) {
  if (Array.isArray(value)) {
    return value.map(withoutCreatedAt);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isCreatedAtField(key))
        .map(([key, nestedValue]) => [key, withoutCreatedAt(nestedValue)])
    );
  }
  return value;
}

function getRecordDate(record) {
  const value = RECORD_DATE_FIELDS.map((field) => record?.[field]).find(Boolean);
  if (!value) return "";
  const rawDate = String(value);
  const calendarDate = rawDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (calendarDate) return calendarDate;
  const parsedDate = new Date(rawDate.replace(" ", "T"));
  return Number.isNaN(parsedDate.getTime())
    ? rawDate.slice(0, 10)
    : parsedDate.toISOString().slice(0, 10);
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function matchesReportPeriod(record, period, month, fromDate, toDate) {
  if (period === "all") return true;
  const date = getRecordDate(record);
  if (!date) return false;
  const today = new Date();
  const todayString = formatLocalDate(today);

  if (period === "month") return date.slice(0, 7) === month;
  if (period === "this_month") return date.slice(0, 7) === todayString.slice(0, 7);
  if (period === "last_30") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return date >= formatLocalDate(start) && date <= todayString;
  }
  if (period === "custom") {
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }
  return true;
}

function filterReportData(value, key, filters) {
  if (Array.isArray(value)) {
    if (REPORT_RECORD_ARRAYS.has(key)) {
      return value.filter((record) => {
        const matchesSearch =
          !filters.search ||
          JSON.stringify(record).toLowerCase().includes(filters.search.toLowerCase());
        return (
          matchesSearch &&
          matchesReportPeriod(
            record,
            filters.period,
            filters.month,
            filters.fromDate,
            filters.toDate
          )
        );
      });
    }
    if (key === "trend" && filters.period !== "all") {
      return value.filter((point) =>
        matchesReportPeriod(
          { date: point.date },
          filters.period,
          filters.month,
          filters.fromDate,
          filters.toDate
        )
      );
    }
    return value.map((item) => filterReportData(item, "", filters));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        filterReportData(childValue, childKey, filters),
      ])
    );
  }
  return value;
}

function getExcelRows(value) {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === "object"
        ? Object.fromEntries(
            Object.entries(withoutCreatedAt(item)).map(([key, fieldValue]) => [
              key,
              fieldValue && typeof fieldValue === "object"
                ? JSON.stringify(fieldValue)
                : fieldValue,
            ])
          )
        : { Value: item }
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(withoutCreatedAt(value))
      .map(([Field, fieldValue]) => ({
        Field,
        Value:
          fieldValue && typeof fieldValue === "object"
            ? JSON.stringify(fieldValue)
            : fieldValue,
      }));
  }
  return [{ Value: value }];
}

function getExportFilename(title, extension) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `mis_report_${slug}_${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function downloadCsv(rows, filename) {
  const safeRows = getExcelRows(rows).map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === "string" && /^[=+\-@]/.test(value) ? `'${value}` : value,
      ])
    )
  );
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(safeRows));
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportReportRows(format, rows, title) {
  const exportRows = getExcelRows(rows);
  const filename = getExportFilename(title, format === "excel" ? "xlsx" : format);
  if (format === "excel") {
    downloadStyledXlsx({
      records: exportRows,
      title,
      filename,
      sheetName: "Report",
    });
    return;
  }
  if (format === "csv") {
    downloadCsv(rows, filename);
    return;
  }
  if (format === "pdf") {
    downloadStyledPdf({
      records: exportRows,
      title,
      filename,
    });
  }
}

function getSummaryExportRows(data) {
  const rows = [];
  const visit = (value, section, metric = []) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, section, [...metric, index + 1]));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, nestedValue]) =>
        visit(nestedValue, metric.length ? section : key, [...metric, key])
      );
      return;
    }
    rows.push({
      Section: section || "Summary",
      Metric: metric.join(" / ") || "Value",
      Value: value ?? "",
    });
  };

  Object.entries(data ?? {}).forEach(([section, value]) => visit(value, section));
  return rows;
}

function ReportDownloadMenu({ rows, title, onExport }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const handleExport = (format) => {
    onExport(format, rows, title);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        disabled={!rows.length}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center justify-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download size={15} />
        Download
        <ChevronDown size={14} />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("excel")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-green-50"
          >
            <FileSpreadsheet size={17} className="text-green-600" />
            <span>
              <span className="block font-medium">Download XLSX</span>
              <span className="block text-xs text-slate-400">Excel workbook</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("csv")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-blue-50"
          >
            <FileDown size={17} className="text-blue-600" />
            <span>
              <span className="block font-medium">Download CSV</span>
              <span className="block text-xs text-slate-400">Comma-separated data</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("pdf")}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-red-50"
          >
            <FileText size={17} className="text-red-600" />
            <span>
              <span className="block font-medium">Download PDF</span>
              <span className="block text-xs text-slate-400">Printable report</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function ViewButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      <Eye size={14} />
      View
    </button>
  );
}

function ReportTableToolbar({
  title,
  rows,
  filters,
  onFilterChange,
  onExport,
  error,
  titleClassName = "text-slate-700",
}) {
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${titleClassName}`}>{title}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {rows.length}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label className="relative block sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Search {title}</span>
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onFilterChange("search", event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className={`${inputClass} pl-9`}
            />
          </label>
          <label>
            <span className="sr-only">Filter {title} by time period</span>
            <select
              value={filters.period}
              onChange={(event) => onFilterChange("period", event.target.value)}
              className={inputClass}
            >
              <option value="all">All time</option>
              <option value="this_month">This month</option>
              <option value="last_30">Last 30 days</option>
              <option value="month">Select month</option>
              <option value="custom">Custom date range</option>
            </select>
          </label>
          {filters.period === "month" && (
            <label>
              <span className="sr-only">Select month</span>
              <input
                type="month"
                value={filters.month}
                onChange={(event) => onFilterChange("month", event.target.value)}
                className={inputClass}
              />
            </label>
          )}
          {filters.period === "custom" && (
            <>
              <label>
                <span className="sr-only">From date</span>
                <input
                  type="date"
                  value={filters.fromDate}
                  max={filters.toDate || undefined}
                  onChange={(event) => onFilterChange("fromDate", event.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="sr-only">To date</span>
                <input
                  type="date"
                  value={filters.toDate}
                  min={filters.fromDate || undefined}
                  onChange={(event) => onFilterChange("toDate", event.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}
        </div>
        <ReportDownloadMenu rows={rows} title={title} onExport={onExport} />
      </div>
      {filters.period === "custom" && (
        <p className="text-xs text-slate-500">
          Choose a date range to filter and export the visible {title.toLowerCase()}.
        </p>
      )}
      {error && <div className="mt-3"><ReportError message={error} /></div>}
    </div>
  );
}

function ReportRecordModal({ record, onClose }) {
  if (!record) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-record-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="report-record-title" className="text-base font-semibold text-slate-800">
            Report record details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close record details"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(85vh-4.5rem)] overflow-y-auto p-5">
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {Object.entries(record)
              .filter(([key]) => !isCreatedAtField(key))
              .map(([key, value]) => (
                <div key={key} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(10rem,1fr)_2fr] sm:gap-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="break-words text-sm text-slate-800">
                    {value === null || value === undefined || value === ""
                      ? "—"
                      : typeof value === "object"
                        ? JSON.stringify(withoutCreatedAt(value), null, 2)
                        : String(value)}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
      <Calendar size={12} />
      {label}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, color = "blue", sub }) {
  const colors = {
    blue:   "bg-blue-50   text-blue-600   border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    green:  "bg-green-50  text-green-600  border-green-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red:    "bg-red-50    text-red-600    border-red-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    amber:  "bg-amber-50  text-amber-600  border-amber-100",
    slate:  "bg-slate-50  text-slate-600  border-slate-100",
  };
  const cls = colors[color] ?? colors.blue;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-800">{fmt(value)}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${cls}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TrendBar({ date, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-slate-500">{fmtDateOnly(date)}</span>
      <div className="flex-1 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-700">{count}</span>
    </div>
  );
}

function KVRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{fmt(value)}</span>
    </div>
  );
}

function Badge({ children, color = "slate" }) {
  const map = {
    slate:  "bg-slate-100  text-slate-600",
    blue:   "bg-blue-100   text-blue-700",
    green:  "bg-green-100  text-green-700",
    orange: "bg-orange-100 text-orange-700",
    red:    "bg-red-100    text-red-700",
    purple: "bg-purple-100 text-purple-700",
    indigo: "bg-indigo-100 text-indigo-700",
    amber:  "bg-amber-100  text-amber-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[color] ?? map.slate}`}>
      {children}
    </span>
  );
}

function severityColor(s) {
  return { low: "green", medium: "amber", high: "orange", critical: "red" }[s] ?? "slate";
}
function statusColor(s) {
  return { reported: "blue", acknowledged: "purple", in_progress: "indigo", resolved: "green", closed: "slate" }[s] ?? "slate";
}
function priorityColor(p) {
  return { low: "slate", medium: "amber", high: "orange", critical: "red" }[p] ?? "slate";
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-slate-400">
      <RefreshCw size={18} className="mr-2 animate-spin" />
      Loading…
    </div>
  );
}

function EmptyState({ icon: Icon = FileBarChart, message = "No data available." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={36} className="mb-3 text-slate-300" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function ReportError({ message }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

// ─── TAB DEFINITIONS ─────────────────────────────────────────────────────────

const TABS = [
  { id: "summary",   label: "Executive Summary",  icon: BarChart2,     color: "blue"   },
  { id: "incidents", label: "Incidents",           icon: AlertTriangle, color: "orange" },
  { id: "tasks",     label: "Tasks",               icon: ClipboardList, color: "indigo" },
  { id: "inventory", label: "Inventory",           icon: Package,       color: "green"  },
  { id: "agencies",  label: "Agencies",            icon: Building2,     color: "purple" },
  { id: "alerts",    label: "Alerts",              icon: Bell,          color: "red"    },
  { id: "activity",  label: "Activity Log",        icon: Activity,      color: "slate"  },
];

// ─── PANEL: EXECUTIVE SUMMARY ─────────────────────────────────────────────────

function SummaryPanel({ data, onExport }) {
  if (!data) return <EmptyState />;
  const { meta, incidents, tasks, inventory, agencies, alerts, activity } = data;
  const exportRows = getSummaryExportRows(data);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Executive Summary</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Download summary metrics and report breakdowns.
          </p>
        </div>
        <ReportDownloadMenu
          rows={exportRows}
          title="Executive Summary"
          onExport={onExport}
        />
      </div>
      {meta && <MetaBadge label={meta.period_label} />}

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={AlertTriangle} label="New Incidents"       value={incidents?.new_this_period}   color="orange" sub={`${incidents?.critical ?? 0} critical`} />
        <SummaryCard icon={CheckCircle2}  label="Resolved Incidents"  value={incidents?.resolved}          color="green"  sub={incidents?.avg_resolution_hours ? `Avg ${incidents.avg_resolution_hours}h` : undefined} />
        <SummaryCard icon={ClipboardList} label="Total Tasks"         value={tasks?.total}                 color="indigo" sub={`${tasks?.completed ?? 0} completed`} />
        <SummaryCard icon={XCircle}       label="Overdue Tasks"       value={tasks?.overdue}               color="red"    />
        <SummaryCard icon={Package}       label="Inventory Items"     value={inventory?.total_items}       color="green"  sub={`Qty: ${inventory?.total_quantity ?? 0}`} />
        <SummaryCard icon={ShieldAlert}   label="Expiring Soon"       value={inventory?.expiring_soon}     color="amber"  sub={`Expired: ${inventory?.expired ?? 0}`} />
        <SummaryCard icon={Building2}     label="Active Agencies"     value={agencies?.active}             color="purple" sub={`Total: ${agencies?.total ?? 0}`} />
        <SummaryCard icon={Bell}          label="Pre-Alerts"          value={alerts?.pre_alerts_this_period}  color="orange" />
        <SummaryCard icon={Activity}      label="Total Actions"       value={activity?.total_actions_this_period} color="slate" sub={`${activity?.unique_active_users ?? 0} active users`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Incidents by type */}
        {incidents?.by_type && Object.keys(incidents.by_type).length > 0 && (
          <SectionCard title="Incidents by Type">
            {Object.entries(incidents.by_type).map(([type, count]) => (
              <KVRow key={type} label={type.replace(/_/g, " ")} value={count} />
            ))}
          </SectionCard>
        )}
        {/* Incidents by severity */}
        {incidents?.by_severity && Object.keys(incidents.by_severity).length > 0 && (
          <SectionCard title="Incidents by Severity">
            {Object.entries(incidents.by_severity).map(([sev, count]) => (
              <div key={sev} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <Badge color={severityColor(sev)}>{sev}</Badge>
                <span className="text-sm font-semibold text-slate-800">{count}</span>
              </div>
            ))}
          </SectionCard>
        )}
        {/* Tasks by status */}
        {Array.isArray(tasks?.by_status) && tasks.by_status.length > 0 && (
          <SectionCard title="Tasks by Status">
            {tasks.by_status.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <Badge color={statusColor(status)}>{status.replace(/_/g, " ")}</Badge>
                <span className="text-sm font-semibold text-slate-800">{count}</span>
              </div>
            ))}
          </SectionCard>
        )}
        {/* Agencies by type */}
        {agencies?.by_type && Object.keys(agencies.by_type).length > 0 && (
          <SectionCard title="Agencies by Type">
            {Object.entries(agencies.by_type).map(([type, count]) => (
              <KVRow key={type} label={type.toUpperCase()} value={count} />
            ))}
          </SectionCard>
        )}
      </div>
    </div>
  );
}

// ─── PANEL: INCIDENTS ─────────────────────────────────────────────────────────

function IncidentsPanel({ data, sourceData, onView, tableTools }) {
  if (!data) return <EmptyState icon={AlertTriangle} />;
  const { meta, summary, trend = [], incidents = [] } = data;
  const maxTrend = Math.max(...trend.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {meta && <MetaBadge label={meta.period_label} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={AlertTriangle} label="Total Incidents"      value={summary?.total}               color="orange" />
        <SummaryCard icon={CheckCircle2}  label="Resolved"             value={summary?.resolved_count}      color="green"  />
        <SummaryCard icon={Clock}         label="Avg Resolution (hrs)" value={fmt(summary?.avg_resolution_hours)} color="blue" />
        <SummaryCard icon={TrendingUp}    label="This Period"          value={summary?.total}               color="indigo" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* By type */}
        {summary?.by_type && Object.keys(summary.by_type).length > 0 && (
          <SectionCard title="By Incident Type">
            {Object.entries(summary.by_type).map(([type, count]) => (
              <KVRow key={type} label={type.replace(/_/g, " ")} value={count} />
            ))}
          </SectionCard>
        )}
        {/* By severity */}
        {summary?.by_severity && Object.keys(summary.by_severity).length > 0 && (
          <SectionCard title="By Severity">
            {Object.entries(summary.by_severity).map(([sev, count]) => (
              <div key={sev} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <Badge color={severityColor(sev)}>{sev}</Badge>
                <span className="text-sm font-semibold text-slate-800">{count}</span>
              </div>
            ))}
          </SectionCard>
        )}
        {/* By status */}
        {summary?.by_status && Object.keys(summary.by_status).length > 0 && (
          <SectionCard title="By Status">
            {Object.entries(summary.by_status).map(([st, count]) => (
              <div key={st} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <Badge color={statusColor(st)}>{st.replace(/_/g, " ")}</Badge>
                <span className="text-sm font-semibold text-slate-800">{count}</span>
              </div>
            ))}
          </SectionCard>
        )}
        {/* Daily trend */}
        {trend.length > 0 && (
          <SectionCard title="Daily Trend">
            <div className="space-y-3">
              {trend.map((t) => (
                <TrendBar key={t.date} date={t.date} count={t.count} max={maxTrend} />
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Incidents table */}
      {sourceData?.incidents?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ReportTableToolbar title="Incident List" rows={incidents} {...tableTools} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Incident No.</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Severity</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Reported By</th>
                  <th className="px-5 py-3 font-semibold">Reported At</th>
                  <th className="px-5 py-3 font-semibold">Tasks</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-500">No incidents match the selected filters.</td></tr>
                ) : incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-blue-600">{inc.incident_no || `#${inc.id}`}</td>
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-800">{inc.title}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">{inc.incident_type || "—"}</td>
                    <td className="px-5 py-3"><Badge color={severityColor(inc.severity)}>{inc.severity || "—"}</Badge></td>
                    <td className="px-5 py-3"><Badge color={statusColor(inc.status)}>{(inc.status || "—").replace(/_/g, " ")}</Badge></td>
                    <td className="px-5 py-3 text-slate-500">{inc.reported_by_name || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{fmtDate(inc.reported_at)}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {inc.total_tasks ?? 0} total / {inc.open_tasks ?? 0} open
                    </td>
                    <td className="px-5 py-3"><ViewButton onClick={() => onView(inc)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {sourceData?.incidents?.length === 0 && <EmptyState icon={AlertTriangle} message="No incidents found for this period." />}
    </div>
  );
}

// ─── PANEL: TASKS ─────────────────────────────────────────────────────────────

function TasksPanel({ data, sourceData, onView, tableTools }) {
  if (!data) return <EmptyState icon={ClipboardList} />;
  const { meta, summary, trend = [], tasks = [] } = data;
  const maxTrend = Math.max(...trend.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {meta && <MetaBadge label={meta.period_label} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardList} label="Total Tasks"       value={summary?.total}                 color="indigo" />
        <SummaryCard icon={CheckCircle2}  label="Completed"         value={summary?.completion_rate_pct != null ? `${summary.completion_rate_pct}%` : "—"} color="green" />
        <SummaryCard icon={XCircle}       label="Overdue"           value={summary?.overdue_count}         color="red"    />
        <SummaryCard icon={Clock}         label="Avg Completion"    value={summary?.avg_completion_hours ? `${summary.avg_completion_hours}h` : "—"} color="blue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* By status */}
        {Array.isArray(summary?.by_status) && summary.by_status.length > 0 && (
          <SectionCard title="By Status">
            {summary.by_status.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <Badge color={statusColor(status)}>{status.replace(/_/g, " ")}</Badge>
                <span className="text-sm font-semibold text-slate-800">{count}</span>
              </div>
            ))}
          </SectionCard>
        )}
        {/* By priority */}
        {Array.isArray(summary?.by_priority) && summary.by_priority.length > 0 && (
          <SectionCard title="By Priority">
            {summary.by_priority.map(({ priority, count }) => (
              <div key={priority} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <Badge color={priorityColor(priority)}>{priority}</Badge>
                <span className="text-sm font-semibold text-slate-800">{count}</span>
              </div>
            ))}
          </SectionCard>
        )}
        {/* Trend */}
        {trend.length > 0 && (
          <SectionCard title="Daily Trend">
            <div className="space-y-3">
              {trend.map((t) => (
                <TrendBar key={t.date} date={t.date} count={t.count} max={maxTrend} />
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {sourceData?.tasks?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ReportTableToolbar title="Task List" rows={tasks} {...tableTools} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Priority</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Assigned To</th>
                  <th className="px-5 py-3 font-semibold">Due At</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">No tasks match the selected filters.</td></tr>
                ) : tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-800">{t.title || "—"}</td>
                    <td className="px-5 py-3"><Badge color={priorityColor(t.priority)}>{t.priority || "—"}</Badge></td>
                    <td className="px-5 py-3"><Badge color={statusColor(t.status)}>{(t.status || "—").replace(/_/g, " ")}</Badge></td>
                    <td className="px-5 py-3 text-slate-500">{t.assigned_to_name || t.assigned_to || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{fmtDate(t.due_at)}</td>
                    <td className="px-5 py-3"><ViewButton onClick={() => onView(t)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {sourceData?.tasks?.length === 0 && <EmptyState icon={ClipboardList} message="No tasks found for this period." />}
    </div>
  );
}

// ─── PANEL: INVENTORY ─────────────────────────────────────────────────────────

function InventoryPanel({ data, sourceData, onView, tableTools }) {
  if (!data) return <EmptyState icon={Package} />;
  const { meta, summary, by_equipment = [], items = [] } = data;

  return (
    <div className="space-y-6">
      {meta && <MetaBadge label={meta.period_label} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={Package}        label="Total Items"       value={summary?.total_items}    color="green"  />
        <SummaryCard icon={TrendingUp}     label="Total Quantity"    value={summary?.total_quantity} color="blue"   />
        <SummaryCard icon={TrendingDown}   label="Total Issued"      value={summary?.total_issued}   color="indigo" />
        <SummaryCard icon={RefreshCw}      label="Total Returned"    value={summary?.total_returned} color="purple" />
        <SummaryCard icon={Clock}          label="Expiring Soon"     value={summary?.expiring_soon}  color="amber"  />
        <SummaryCard icon={XCircle}        label="Expired"           value={summary?.expired}        color="red"    />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* By equipment type */}
        {by_equipment.length > 0 && (
          <SectionCard title="By Equipment Type">
            {by_equipment.map((eq) => (
              <div key={eq.equipment_type} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <span className="text-sm text-slate-600">{eq.equipment_type}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-400">{eq.item_count} items</span>
                  <span className="font-semibold text-slate-800">Qty: {eq.total_qty}</span>
                </div>
              </div>
            ))}
          </SectionCard>
        )}
      </div>

      {sourceData?.items?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ReportTableToolbar title="Inventory Items" rows={items} {...tableTools} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product Name</th>
                  <th className="px-5 py-3 font-semibold">Equipment Type</th>
                  <th className="px-5 py-3 font-semibold">Brand</th>
                  <th className="px-5 py-3 font-semibold">Quantity</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Purchase Date</th>
                  <th className="px-5 py-3 font-semibold">Expiry</th>
                  <th className="px-5 py-3 font-semibold">Added By</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-500">No inventory items match the selected filters.</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{item.product_name}</td>
                    <td className="px-5 py-3 text-slate-600">{item.equipment_type || "—"}</td>
                    <td className="px-5 py-3 text-slate-500">{item.brand_name || "—"}</td>
                    <td className="px-5 py-3 text-slate-700 font-semibold">{item.quantity ?? "—"}</td>
                    <td className="px-5 py-3 capitalize text-slate-500">{item.location || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{fmtDateOnly(item.purchase_date)}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {item.expiry_date ? (
                        <span className={new Date(item.expiry_date) < new Date() ? "text-red-600 font-semibold" : "text-slate-500"}>
                          {fmtDateOnly(item.expiry_date)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{item.added_by_name || "—"}</td>
                    <td className="px-5 py-3"><ViewButton onClick={() => onView(item)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {sourceData?.items?.length === 0 && <EmptyState icon={Package} message="No inventory items found for this period." />}
    </div>
  );
}

// ─── PANEL: AGENCIES ──────────────────────────────────────────────────────────

function AgenciesPanel({ data, sourceData, onView, tableTools }) {
  if (!data) return <EmptyState icon={Building2} />;
  const { meta, summary, trend = [], agencies = [] } = data;
  const maxTrend = Math.max(...trend.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {meta && <MetaBadge label={meta.period_label} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Building2}   label="Total Agencies"     value={summary?.total}            color="purple" />
        <SummaryCard icon={CheckCircle2} label="Active"            value={summary?.active}           color="green"  />
        <SummaryCard icon={Clock}        label="Inactive"          value={summary?.inactive}         color="slate"  />
        <SummaryCard icon={ShieldAlert}  label="Pending Approval"  value={summary?.pending_approval} color="amber"  />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {summary?.by_type && Array.isArray(summary.by_type) && summary.by_type.length > 0 && (
          <SectionCard title="By Agency Type">
            {summary.by_type.map(({ type, count }) => (
              <KVRow key={type} label={type?.toUpperCase() ?? "—"} value={count} />
            ))}
          </SectionCard>
        )}
        {trend.length > 0 && (
          <SectionCard title="Daily Trend">
            <div className="space-y-3">
              {trend.map((t) => (
                <TrendBar key={t.date} date={t.date} count={t.count} max={maxTrend} />
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {sourceData?.agencies?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ReportTableToolbar title="Agency List" rows={agencies} {...tableTools} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agencies.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">No agencies match the selected filters.</td></tr>
                ) : agencies.map((ag) => (
                  <tr key={ag.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{ag.name || ag.agency_name || "—"}</td>
                    <td className="px-5 py-3 uppercase text-slate-500">{ag.type || ag.agency_type || "—"}</td>
                    <td className="px-5 py-3">
                      <Badge color={ag.status === "active" ? "green" : ag.status === "inactive" ? "slate" : "amber"}>
                        {ag.status || "—"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{ag.contact_person || ag.contact || "—"}</td>
                    <td className="px-5 py-3"><ViewButton onClick={() => onView(ag)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {sourceData?.agencies?.length === 0 && <EmptyState icon={Building2} message="No agency data found for this period." />}
    </div>
  );
}

// ─── PANEL: ALERTS ────────────────────────────────────────────────────────────

function AlertsPanel({ data, sourceData, onView, tableTools }) {
  if (!data) return <EmptyState icon={Bell} />;
  const { meta, summary, trend = [], pre_alerts = [], post_alerts = [] } = data;
  const maxTrend = Math.max(...trend.map((t) => Math.max(t.pre_alerts ?? 0, t.post_alerts ?? 0)), 1);

  return (
    <div className="space-y-6">
      {meta && <MetaBadge label={meta.period_label} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Bell}         label="Pre-Alerts"        value={summary?.total_pre_alerts}        color="orange" />
        <SummaryCard icon={ShieldAlert}  label="Post-Alerts"       value={summary?.total_post_alerts}       color="red"    />
        <SummaryCard icon={Package}      label="Post-Alert Photos" value={summary?.total_post_alert_photos} color="blue"   />
      </div>

      {summary?.response_actions_breakdown && Object.keys(summary.response_actions_breakdown).length > 0 && (
        <SectionCard title="Response Actions Breakdown">
          {Object.entries(summary.response_actions_breakdown).map(([action, count]) => (
            <KVRow key={action} label={action} value={count} />
          ))}
        </SectionCard>
      )}

      {trend.length > 0 && (
        <SectionCard title="Daily Trend (Pre vs Post Alerts)">
          <div className="space-y-3">
            {trend.map((t) => (
              <div key={t.date} className="flex items-start gap-3">
                <span className="w-24 shrink-0 pt-0.5 text-xs text-slate-500">{fmtDateOnly(t.date)}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-[10px] text-slate-400">Pre</span>
                    <div className="flex-1 rounded-full bg-orange-100">
                      <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${Math.round(((t.pre_alerts ?? 0) / maxTrend) * 100)}%` }} />
                    </div>
                    <span className="w-4 text-right text-xs font-semibold text-slate-700">{t.pre_alerts ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-[10px] text-slate-400">Post</span>
                    <div className="flex-1 rounded-full bg-red-100">
                      <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${Math.round(((t.post_alerts ?? 0) / maxTrend) * 100)}%` }} />
                    </div>
                    <span className="w-4 text-right text-xs font-semibold text-slate-700">{t.post_alerts ?? 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {sourceData?.pre_alerts?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
          <ReportTableToolbar title="Pre-Alerts" rows={pre_alerts} titleClassName="text-orange-700" {...tableTools} />
          <div className="divide-y divide-slate-100">
            {pre_alerts.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-slate-500">No pre-alerts match the selected filters.</p>
            )}
            {pre_alerts.map((a) => (
              <div key={a.alert_id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    {a.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{a.description}</p>}
                    {a.instruction && <p className="mt-1 text-xs text-slate-400 italic line-clamp-1">{a.instruction}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="mt-0.5 text-xs text-slate-500">{a.submitted_by_name}</p>
                    <div className="mt-2"><ViewButton onClick={() => onView(a)} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sourceData?.post_alerts?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
          <ReportTableToolbar title="Post-Alerts" rows={post_alerts} titleClassName="text-red-700" {...tableTools} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Response Action</th>
                  <th className="px-5 py-3 font-semibold">Photos</th>
                  <th className="px-5 py-3 font-semibold">Incident Date</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {post_alerts.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">No post-alerts match the selected filters.</td></tr>
                ) : post_alerts.map((a) => (
                  <tr key={a.post_alert_id} className="hover:bg-slate-50 transition-colors">
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-slate-800">{a.title}</td>
                    <td className="px-5 py-3 text-slate-500">{a.location || "—"}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs max-w-[200px] truncate">{a.response_action_required || "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{a.photo_count ?? 0}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{fmtDate(a.incident_date)}</td>
                    <td className="px-5 py-3"><ViewButton onClick={() => onView(a)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {sourceData?.pre_alerts?.length === 0 && sourceData?.post_alerts?.length === 0 && (
        <EmptyState icon={Bell} message="No alerts found for this period." />
      )}
    </div>
  );
}

// ─── PANEL: ACTIVITY LOG ─────────────────────────────────────────────────────

function ActivityPanel({ data, sourceData, onView, tableTools }) {
  if (!data) return <EmptyState icon={Activity} />;
  const { meta, summary, trend = [], logs = [] } = data;
  const maxTrend = Math.max(...trend.map((t) => t.count), 1);

  return (
    <div className="space-y-6">
      {meta && <MetaBadge label={meta.period_label} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={Activity}    label="Total Actions"   value={summary?.total_actions} color="slate"  />
        <SummaryCard icon={Users}       label="Unique Users"    value={summary?.unique_users}  color="blue"   />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top actions */}
        {Array.isArray(summary?.top_actions) && summary.top_actions.length > 0 && (
          <SectionCard title="Top Actions">
            {summary.top_actions.map(({ action, count }) => (
              <div key={action} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">{action}</span>
                <span className="text-sm font-semibold text-slate-800">{count}</span>
              </div>
            ))}
          </SectionCard>
        )}
        {/* Top entities */}
        {Array.isArray(summary?.top_entities) && summary.top_entities.length > 0 && (
          <SectionCard title="Top Entities">
            {summary.top_entities.map(({ entity_type, count }) => (
              <KVRow key={entity_type} label={entity_type} value={count} />
            ))}
          </SectionCard>
        )}
        {/* By user type */}
        {summary?.by_user_type && Object.keys(summary.by_user_type).length > 0 && (
          <SectionCard title="By User Type">
            {Object.entries(summary.by_user_type).map(([type, count]) => (
              <KVRow key={type} label={type} value={count} />
            ))}
          </SectionCard>
        )}
        {/* Daily trend */}
        {trend.length > 0 && (
          <SectionCard title="Daily Trend">
            <div className="space-y-3">
              {trend.map((t) => (
                <TrendBar key={t.date} date={t.date} count={t.count} max={maxTrend} />
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {sourceData?.logs?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ReportTableToolbar title="Activity Log" rows={logs} {...tableTools} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">User Type</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Entity</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">IP Address</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-500">No activity logs match the selected filters.</td></tr>
                ) : logs.map((log, i) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{log.user_name || `#${log.user_id}`}</td>
                    <td className="px-5 py-3 capitalize text-slate-500">{log.user_type || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-700">{log.action}</span>
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-500">{log.entity_type || "—"}</td>
                    <td className="max-w-xs truncate px-5 py-3 text-slate-500">{log.description || "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-400">{log.ip_address || "—"}</td>
                    <td className="px-5 py-3"><ViewButton onClick={() => onView(log)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {sourceData?.logs?.length === 0 && <EmptyState icon={Activity} message="No activity logs found for this period." />}
    </div>
  );
}

// ─── SERVICE MAP ──────────────────────────────────────────────────────────────

const FETCHERS = {
  summary:   getReportSummary,
  incidents: getReportIncidents,
  tasks:     getReportTasks,
  inventory: getReportInventory,
  agencies:  getReportAgencies,
  alerts:    getReportAlerts,
  activity:  getReportActivity,
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

function Report() {
  const [activeTab, setActiveTab]   = useState("summary");
  const [tabStates, setTabStates]   = useState({}); // { [tabId]: { data, loading, error } }
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [exportError, setExportError] = useState("");

  // Fetch one tab. Uses functional setState so it never reads stale closure state.
  const fetchTab = useCallback(async (tabId, force = false) => {
    // Check cache without stale closure — read inside functional updater
    let alreadyLoaded = false;
    setTabStates((prev) => {
      alreadyLoaded = !force && Boolean(prev[tabId]?.data);
      return prev; // no change yet
    });

    // Tiny async tick so the read above settles
    await Promise.resolve();
    if (alreadyLoaded) return;

    // Mark loading
    setTabStates((prev) => ({
      ...prev,
      [tabId]: { data: prev[tabId]?.data ?? null, loading: true, error: "" },
    }));

    try {
      const res = await FETCHERS[tabId]();
      // api.js returns the full parsed JSON body:
      //   { success: true, message: "...", data: { meta, summary, ... } }
      const payload = res?.data ?? res ?? null;
      setTabStates((prev) => ({
        ...prev,
        [tabId]: { data: payload, loading: false, error: "" },
      }));
    } catch (err) {
      const msg = err?.message || `Failed to load ${tabId} report.`;
      console.error(`[MIS Report] ${tabId}:`, err);
      setTabStates((prev) => ({
        ...prev,
        [tabId]: { data: null, loading: false, error: msg },
      }));
    }
  }, []); // stable — no deps needed

  // Fetch whenever the active tab changes
  useEffect(() => {
    void Promise.resolve().then(() => fetchTab(activeTab));
  }, [activeTab, fetchTab]);

  const handleTabChange = (tabId) => setActiveTab(tabId);
  const handleRefresh   = ()      => fetchTab(activeTab, true);

  const current     = tabStates[activeTab] ?? {};
  const activeData  = current.data    ?? null;
  const isLoading   = current.loading ?? false;
  const activeError = current.error   ?? "";
  const filteredData = useMemo(
    () =>
      filterReportData(activeData, "", {
        search: search.trim(),
        period,
        month,
        fromDate,
        toDate,
      }),
    [activeData, search, period, month, fromDate, toDate]
  );
  const handleFilterChange = (field, value) => {
      const setters = {
        search: setSearch,
        period: setPeriod,
        month: setMonth,
        fromDate: setFromDate,
        toDate: setToDate,
      };
      setters[field]?.(value);
  };

  const handleExport = (format, rows, title) => {
      try {
        exportReportRows(format, rows, title);
        setExportError("");
      } catch (error) {
        console.error(`[MIS Report] ${format.toUpperCase()} export failed:`, error);
        setExportError(
          error?.message || `Unable to download this report as ${format.toUpperCase()}.`
        );
      }
  };

  const tableTools = {
      filters: { search, period, month, fromDate, toDate },
      onFilterChange: handleFilterChange,
      onExport: handleExport,
      error: exportError,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px]">

        {/* ── Page Header ── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FileBarChart size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                MIS Reports
              </h1>
              <p className="text-sm text-slate-500">
                Management Information System — Disaster Response Analytics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex min-w-max gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            {TABS.map((tab) => {
              const tabState = tabStates[tab.id] ?? {};
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {tabState.loading && (
                    <RefreshCw size={12} className="animate-spin opacity-70" />
                  )}
                  {tabState.error && !isActive && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Error ── */}
        {activeError && (
          <div className="mb-5">
            <ReportError message={activeError} />
          </div>
        )}

        {/* ── Panel Content ── */}
        <div>
          {isLoading && !activeData ? (
            <Spinner />
          ) : (
            <>
              {activeTab === "summary"   && <SummaryPanel   data={filteredData} onExport={handleExport} />}
              {activeTab === "incidents" && <IncidentsPanel data={filteredData} sourceData={activeData} onView={setSelectedRecord} tableTools={tableTools} />}
              {activeTab === "tasks"     && <TasksPanel     data={filteredData} sourceData={activeData} onView={setSelectedRecord} tableTools={tableTools} />}
              {activeTab === "inventory" && <InventoryPanel data={filteredData} sourceData={activeData} onView={setSelectedRecord} tableTools={tableTools} />}
              {activeTab === "agencies"  && <AgenciesPanel  data={filteredData} sourceData={activeData} onView={setSelectedRecord} tableTools={tableTools} />}
              {activeTab === "alerts"    && <AlertsPanel    data={filteredData} sourceData={activeData} onView={setSelectedRecord} tableTools={tableTools} />}
              {activeTab === "activity"  && <ActivityPanel  data={filteredData} sourceData={activeData} onView={setSelectedRecord} tableTools={tableTools} />}
            </>
          )}
        </div>

      </div>
      <ReportRecordModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}

export default Report;
