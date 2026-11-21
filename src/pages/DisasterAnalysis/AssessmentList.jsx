import { useCallback, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { Plus, RefreshCw, Eye, Search, AlertCircle } from "lucide-react";

import { getAssessments, getApiError } from "../../services/disasterAnalysisService";

 

const dateText = (value) => value ? new Date(value).toLocaleDateString() : "—";

const pretty = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

 

function Status({ value }) {

  const style = value === "completed" ? "bg-green-100 text-green-700" :

    value === "failed" ? "bg-red-100 text-red-700" :

    value === "processing" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{pretty(value || "unknown")}</span>;

}

 

export default function AssessmentList() {

  const [filters, setFilters] = useState({ district: "", disaster_type: "", status: "", from_date: "", to_date: "" });

  const [skip, setSkip] = useState(0);

  const [data, setData] = useState({ items: [], total: 0 });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [districts, setDistricts] = useState([]);

  const [districtError, setDistrictError] = useState("");

 

  useEffect(() => {

    let active = true;

    fetch("/gis/districts.geojson")

      .then(response => {

        if (!response.ok) throw new Error("Unable to load district options.");

        return response.json();

      })

      .then(geojson => {

        if (!Array.isArray(geojson.features)) throw new Error("District data is invalid.");

        if (active) {

          setDistricts([...new Set(geojson.features.map(feature => feature.properties?.dtname).filter(Boolean))].sort());

        }

      })

      .catch(() => {

        if (active) setDistrictError("District options could not be loaded.");

      });

    return () => { active = false; };

  }, []);

 

  const load = useCallback(async () => {

    setLoading(true); setError("");

    try {

      const params = { skip, limit: 10, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) };

      const response = await getAssessments(params);

      const rows = Array.isArray(response) ? response : (response.items || response.results || []);

      setData({ items: rows, total: response.total ?? response.count ?? rows.length });

    } catch (e) { setError(getApiError(e)); }

    finally { setLoading(false); }

  }, [filters, skip]);

 

  useEffect(() => { load(); }, [load]);

  const update = (key, value) => { setSkip(0); setFilters(old => ({ ...old, [key]: value })); };

 

  return (

    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

        <div>

          <h1 className="text-2xl font-bold text-slate-800">Pre & Post Disaster Analysis</h1>

          <p className="mt-1 text-sm text-slate-500">Create and review disaster image assessments.</p>

        </div>

        <Link to="/disaster-analysis/create" className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800">

          <Plus size={16}/> New assessment

        </Link>

      </div>

 

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="mb-3 flex items-center gap-2 font-semibold text-slate-700"><Search size={16}/> Filter assessments</div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <label className="text-xs font-medium text-slate-600">District

            <select value={filters.district} onChange={e => update("district", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">

              <option value="">All districts</option>

              {districts.map(district => <option key={district} value={district}>{district}</option>)}

            </select>

          </label>

          <label className="text-xs font-medium text-slate-600">Disaster type

            <select value={filters.disaster_type} onChange={e => update("disaster_type", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">

              <option value="">All types</option>{["Flood","Cyclone","Landslide","Earthquake","Fire","Other"].map(x => <option key={x}>{x}</option>)}

            </select>

          </label>

          <label className="text-xs font-medium text-slate-600">From date

            <input type="date" value={filters.from_date} max={filters.to_date || undefined} onChange={e => update("from_date", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/>

          </label>

          <label className="text-xs font-medium text-slate-600">To date

            <input type="date" value={filters.to_date} min={filters.from_date || undefined} onChange={e => update("to_date", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/>

          </label>

          {districtError && <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-4">{districtError}</p>}

          {/* <label className="text-xs font-medium text-slate-600">Status

            <select value={filters.status} onChange={e => update("status", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">

              <option value="">All statuses</option>{["pending","processing","completed","failed"].map(x => <option key={x}>{x}</option>)}

            </select>

          </label> */}

        </div>

      </section>

 

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-100 p-4">

          <div><h2 className="font-semibold text-slate-800">Assessment records</h2><p className="text-xs text-slate-500">{data.total} records</p></div>

          <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"><RefreshCw size={14}/> Refresh</button>

        </div>

        {error && <div className="m-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}

        {loading ? <p className="p-10 text-center text-sm text-slate-500">Loading assessments...</p> :

          !data.items.length ? <div className="p-12 text-center text-sm text-slate-500">No assessments found. Create your first assessment.</div> :

          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Title","Location","Incident date","Status","Created",""].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead>

              <tbody className="divide-y divide-slate-100">

                {data.items.map(row => <tr key={row.id} className="hover:bg-slate-50">

                  <td className="px-4 py-3"><Link className="font-semibold text-slate-800 hover:text-green-700" to={`/disaster-analysis/${row.id}`}>{row.assessment_title || `Assessment #${row.id}`}</Link><p className="mt-1 text-xs text-slate-400">#{row.id} · {pretty(row.disaster_type)}</p></td>

                  <td className="px-4 py-3 text-slate-600">{[row.area ?? row.Area,row.block,row.district].filter(Boolean).join(", ") || "—"}</td>

                  <td className="px-4 py-3 text-slate-600">{dateText(row.incident_date)}</td>

                  <td className="px-4 py-3"><Status value={row.status}/></td>

                  <td className="px-4 py-3 text-slate-600">{dateText(row.created_at)}</td>

                  <td className="px-4 py-3"><Link to={`/disaster-analysis/${row.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><Eye size={14}/> View</Link></td>

                </tr>)}

              </tbody>

            </table>

          </div>}

        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs text-slate-500">

          <span>{data.total} total</span>

          <div className="flex gap-2">

            <button disabled={!skip || loading} onClick={() => setSkip(Math.max(0, skip - 10))} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button>

            <button disabled={skip + 10 >= data.total || loading} onClick={() => setSkip(skip + 10)} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button>

          </div>

        </div>

      </section>

    </div>

  );

}