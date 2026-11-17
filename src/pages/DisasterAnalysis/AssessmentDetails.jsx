import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Trash2, AlertCircle, FileText } from "lucide-react";
import { getAssessment, getAssessmentImages, getAssessmentImageUrl, rerunAssessment, deleteAssessment, downloadReport, getApiError } from "../../services/disasterAnalysisService";

const dateText = value => value ? new Date(value).toLocaleDateString() : "—";
const pretty = value => (value || "unknown").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const formatRupees = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
  ? `₹${Number(value).toLocaleString("en-IN")}`
  : "—";
function saveBlob(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }

function AssessmentImage({ image, label, onPreview }) {
  const [loadedImage, setLoadedImage] = useState(null);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    getAssessmentImageUrl(image)
      .then(url => {
        if (!active) {
          if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url?.startsWith("blob:") ? url : "";
        setLoadedImage({ image, src: url || "", error: "" });
      })
      .catch(error => {
        if (active) setLoadedImage({ image, src: "", error: getApiError(error) });
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image]);

  const currentImage = loadedImage?.image === image ? loadedImage : null;
  const src = currentImage?.src;
  if (!src) {
    return <div className="grid h-52 place-items-center rounded-lg bg-slate-50 px-3 text-center text-xs text-slate-400">{currentImage?.error ? `Unable to load image: ${currentImage.error}` : "Loading image..."}</div>;
  }

  return <>
    <button onClick={() => onPreview({ src, label })} className="h-52 w-full rounded-lg bg-slate-50">
      <img src={src} alt={label} className="h-full w-full object-contain" />
    </button>
    <a href={src} download={`${label.toLowerCase().replaceAll(" ", "-")}.png`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-green-700"><Download size={13}/> Download image</a>
  </>;
}

function VisualChangeDonut({ result }) {
  const changedPixels = Number(result.changed_pixels);
  const totalPixels = Number(result.total_pixels);
  const rawPercentage = Number(result.changed_pixel_percentage ?? (totalPixels > 0 ? changedPixels / totalPixels * 100 : NaN));
  const hasMetrics = Number.isFinite(rawPercentage) && Number.isFinite(changedPixels) &&
    Number.isFinite(totalPixels) && totalPixels > 0;

  if (!hasMetrics) {
    return <div className="mt-4 rounded-lg border border-slate-200 p-4 text-center text-xs text-slate-500">Visual change metrics are unavailable.</div>;
  }

  const changedPercentage = Math.min(100, Math.max(0, rawPercentage));
  const unchangedPixels = Math.max(0, totalPixels - changedPixels);

  return <div className="mt-4 flex flex-col items-center gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row">
    <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`${changedPercentage.toFixed(2)}% changed pixels and ${(100 - changedPercentage).toFixed(2)}% unchanged pixels`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#16a34a" strokeWidth="16" pathLength="100" />
        <circle cx="60" cy="60" r="45" fill="none" stroke="#dc2626" strokeWidth="16" strokeDasharray={`${changedPercentage} ${100 - changedPercentage}`} pathLength="100" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-800">{changedPercentage.toFixed(1)}%</span>
        <span className="text-[10px] text-slate-500">visual change</span>
      </div>
    </div>
    <div className="w-full space-y-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Changed</span>
        <span className="font-semibold text-slate-800">{changedPixels.toLocaleString()} ({changedPercentage.toFixed(1)}%)</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Unchanged</span>
        <span className="font-semibold text-slate-800">{unchangedPixels.toLocaleString()} ({(100 - changedPercentage).toFixed(1)}%)</span>
      </div>
    </div>
  </div>;
}

export default function AssessmentDetails() {
  const { id } = useParams(); const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null); const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [record, imageResponse] = await Promise.all([getAssessment(id), getAssessmentImages(id)]);
      setAssessment(record);
      setImages(Array.isArray(imageResponse) ? imageResponse : imageResponse.items || imageResponse.images || []);
    } catch (e) { setError(getApiError(e)); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const rerun = async () => {
    if (!window.confirm("Rerun image analysis for this assessment?")) return;
    setBusy(true);
    try { await rerunAssessment(id); await load(); } catch (e) { setError(getApiError(e)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm("Delete this assessment and its related data?")) return;
    setBusy(true);
    try { await deleteAssessment(id); navigate("/disaster-analysis"); }
    catch (e) { setError(getApiError(e)); }
    finally { setBusy(false); }
  };
  const report = async () => {
    setBusy(true);
    try { saveBlob(await downloadReport(id), `disaster-assessment-${id}.pdf`); }
    catch (e) { setError(getApiError(e)); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-10 text-center text-sm text-slate-500">Loading assessment...</div>;
  if (!assessment) return <div className="m-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error || "Assessment not found."}</div>;

  const result = assessment.result || assessment.result_data || {};
  const costEstimate = result.restoration_cost_estimate;
  const imageFor = type => images.find(image => image.image_type === type);
  return <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
    <Link to="/disaster-analysis" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-green-700"><ArrowLeft size={15}/> Back to assessments</Link>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-slate-800">{assessment.assessment_title || `Assessment #${id}`}</h1><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{pretty(assessment.status)}</span></div><p className="mt-1 text-xs text-slate-500">#{assessment.id} · {pretty(assessment.disaster_type)} · Incident date: {dateText(assessment.incident_date)}</p></div>
      <div className="flex gap-2"><button disabled={busy} onClick={rerun} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"><RefreshCw size={14}/> Rerun</button><button disabled={busy} onClick={report} className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white"><Download size={14}/> PDF report</button></div>
    </div>
    {error && <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16}/>{error}</div>}
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Incident details</h2>
        <div className="grid grid-cols-2 gap-4 text-xs">{[["State",assessment.state],["District",assessment.district],["Subdivision",assessment.subdivision],["Block",assessment.block],["Area",assessment.area ?? assessment.Area],["Coordinates",`${assessment.latitude ?? "—"}, ${assessment.longitude ?? "—"}`]].map(([label,value]) => <div key={label}><p className="text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-700">{value || "—"}</p></div>)}</div>
        {assessment.description && <p className="mt-4 border-t pt-3 text-xs leading-5 text-slate-600">{assessment.description}</p>}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Visual comparison metrics</h2>
        <div className="grid grid-cols-3 gap-2">{[["Changed pixels",result.changed_pixels],["Total pixels",result.total_pixels],["Visual change",result.changed_pixel_percentage == null ? "—" : `${result.changed_pixel_percentage}%`]].map(([label,value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-bold text-slate-800">{value == null ? "—" : value}</p></div>)}</div>
        <VisualChangeDonut result={result} />
        {(result.pre_image_width != null || result.post_image_original_width != null) && <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {/* {[["Pre-disaster image size", result.pre_image_width != null && result.pre_image_height != null ? `${result.pre_image_width} × ${result.pre_image_height} px` : "—"], ["Post-disaster image size", result.post_image_original_width != null && result.post_image_original_height != null ? `${result.post_image_original_width} × ${result.post_image_original_height} px` : "—"]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-800">{value}</p></div>)} */}
        </div>}
        {(result.building_damage != null || result.road_damage != null || result.land_damage != null || result.water_affected_area != null) && <div className="mt-4 border-t border-slate-100 pt-4">
          
          {/* <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[["Building damage", result.building_damage], ["Road damage", result.road_damage], ["Land damage", result.land_damage], ["Water affected area", result.water_affected_area]].map(([label, value]) => <div key={label}><p className="text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-700">{value || "—"}</p></div>)}
          </div> */}
        </div>}
        {/* {result.warning && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">{result.warning}</p>} */}
      </section>
    </div>
    {costEstimate && typeof costEstimate === "object" && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div><h2 className="font-semibold text-slate-800">Indicative restoration cost estimate</h2><p className="mt-1 text-xs text-slate-500">A preliminary estimate based on visual pixel changes.</p></div>
        <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{pretty(costEstimate.severity || "unknown")} severity</span>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-800">
        {costEstimate.total_estimated_range_inr || `${formatRupees(costEstimate.total_estimated_min_inr)} – ${formatRupees(costEstimate.total_estimated_max_inr)}`}
      </p>
      {Array.isArray(costEstimate.line_items) && costEstimate.line_items.length > 0 && <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="border-b border-slate-100 text-slate-500"><tr><th className="py-2 pr-3 font-medium">Cost item</th><th className="py-2 px-3 text-right font-medium">Estimated range (INR)</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {costEstimate.line_items.map((item, index) => <tr key={`${item.item || "cost-item"}-${index}`}><td className="py-2 pr-3 text-slate-700">{item.item || "—"}</td><td className="py-2 px-3 text-right text-slate-700">{formatRupees(item.estimated_min_inr)} – {formatRupees(item.estimated_max_inr)}</td></tr>)}
          </tbody>
        </table>
      </div>}
      {/* {costEstimate.disclaimer && <p className="mt-4 text-xs leading-5 text-slate-500">{costEstimate.disclaimer}</p>} */}
    </section>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-slate-800">Pre & post image comparison</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[["pre_disaster","Pre-disaster"],["post_disaster","Post-disaster"],["comparison","Comparison"],["difference_map","Difference map"]].map(([type,label]) => {
          const image = imageFor(type);
          return <div key={type} className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">{label}</p>
            {image ? <AssessmentImage image={image} label={label} onPreview={setPreview} /> : <div className="grid h-52 place-items-center rounded-lg bg-slate-50 text-xs text-slate-400">Image not available</div>}
          </div>;
        })}
      </div>
    </section>
    <section className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"><div><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><FileText size={16}/> Analysis report</div><p className="mt-1 text-xs text-slate-500">Download the generated PDF report.</p></div><button onClick={report} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"><Download size={14}/> Download PDF</button></section>
    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 p-4"><div><p className="text-sm font-semibold text-slate-800">Delete assessment</p><p className="mt-1 text-xs text-slate-500">Delete this assessment and its associated data.</p></div><button disabled={busy} onClick={remove} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600"><Trash2 size={14}/> Delete</button></div>
    {preview && <div onClick={() => setPreview(null)} className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4"><div onClick={e => e.stopPropagation()} className="w-full max-w-5xl rounded-xl bg-white p-4"><div className="mb-3 flex justify-between"><b className="text-sm">{preview.label}</b><button onClick={() => setPreview(null)} className="text-sm">Close</button></div><img src={preview.src} alt={preview.label} className="max-h-[75vh] w-full object-contain"/></div></div>}
  </div>;
}