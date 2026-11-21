import React, { useState, useEffect } from "react";

import { Link, useNavigate } from "react-router-dom";

import { ArrowLeft, CloudUpload, AlertCircle } from "lucide-react";

import { createAssessment, getApiError } from "../../services/disasterAnalysisService";

 

const DISASTER_TYPES = ["Flood", "Cyclone", "Landslide", "Earthquake", "Fire"];

 

const initial = {

  assessment_title: "",

  disaster_type: "Flood",

  state: "West Bengal",

  district: "",

  subdivision: "",

  block: "",

  area: "",

  incident_date: "",

  latitude: "",

  longitude: "",

};

 

const fieldClass =

  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

 

function Field({ label, wide = false, children }) {

  return (

    <label

      className={`flex flex-col gap-1.5 text-xs font-semibold text-slate-600 ${wide ? "sm:col-span-2" : ""

        }`}

    >

      {label}

      {children}

    </label>

  );

}

 

function ImageInput({ label, file, onChange }) {

  return (

    <div className="rounded-xl border border-slate-200 p-4">

      <p className="mb-3 text-sm font-semibold text-slate-800">{label}</p>

      <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-green-600">

        <CloudUpload size={28} className="mb-2 text-green-700" />

        <span className="text-sm font-semibold text-slate-700">

          {file?.name || "Choose image"}

        </span>

        <span className="mt-1 text-xs text-slate-400">JPG, PNG, TIFF or WEBP</span>

        <input

          type="file"

          accept="image/*,.tif,.tiff"

          className="hidden"

          onChange={(e) => onChange(e.target.files?.[0] || null)}

        />

      </label>

      {file && (

        <button

          type="button"

          onClick={() => onChange(null)}

          className="mt-2 text-xs font-semibold text-red-600"

        >

          Remove image

        </button>

      )}

    </div>

  );

}

 

export default function CreateAssessment() {

  const navigate = useNavigate();

  const [form, setForm] = useState(initial);

  const [preImage, setPreImage] = useState(null);

  const [postImage, setPostImage] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

 

  // GIS data state

  const [districts, setDistricts] = useState([]);

  const [allSubdivisions, setAllSubdivisions] = useState([]);

  const [allBlocks, setAllBlocks] = useState([]);

  const [subdivisions, setSubdivisions] = useState([]);

  const [blocks, setBlocks] = useState([]);

 

  // Load GIS data once

  useEffect(() => {

    fetch("/gis/districts.geojson")

      .then((r) => r.json())

      .then((data) => {

        const names = [...new Set(

          data.features.map((f) => f.properties.dtname).filter(Boolean)

        )].sort();

        setDistricts(names);

      })

      .catch(() => { });

 

    fetch("/gis/subdivisions.geojson")

      .then((r) => r.json())

      .then((data) => setAllSubdivisions(data.features.map((f) => f.properties)))

      .catch(() => { });

 

    fetch("/gis/blocks.geojson")

      .then((r) => r.json())

      .then((data) => setAllBlocks(data.features.map((f) => f.properties)))

      .catch(() => { });

  }, []);

 

  // Filter subdivisions when district changes

  useEffect(() => {

    if (!form.district) {

      setSubdivisions([]);

      setBlocks([]);

      setForm((old) => ({ ...old, subdivision: "", block: "" }));

      return;

    }

    const filtered = [

      ...new Set(

        allSubdivisions

          .filter((s) => s.district_name === form.district)

          .map((s) => s.subdivision_name)

          .filter(Boolean)

      ),

    ].sort();

    setSubdivisions(filtered);

    setBlocks([]);

    setForm((old) => ({ ...old, subdivision: "", block: "" }));

  }, [form.district, allSubdivisions]);

 

  // Filter blocks when subdivision changes

  useEffect(() => {

    if (!form.subdivision) {

      setBlocks([]);

      setForm((old) => ({ ...old, block: "" }));

      return;

    }

    const filtered = [

      ...new Set(

        allBlocks

          .filter((b) => b.subdivision_name === form.subdivision)

          .map((b) => b.block_name)

          .filter(Boolean)

      ),

    ].sort();

    setBlocks(filtered);

    setForm((old) => ({ ...old, block: "" }));

  }, [form.subdivision, allBlocks]);

 

  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

 

  const submit = async (event) => {

    event.preventDefault();

    setError("");

    if (!preImage || !postImage) {

      setError("Please select both pre-disaster and post-disaster images.");

      return;

    }

    setLoading(true);

    try {

      const payload = {

        ...form,

        area: form.area || "",

        pre_image: preImage,

        post_image: postImage,

      };

      delete payload.Area;

      const result = await createAssessment(payload);

      navigate(`/disaster-analysis/${result.id}`);

    } catch (e) {

      setError(getApiError(e));

    } finally {

      setLoading(false);

    }

  };

 

  return (

    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">

      <Link

        to="/disaster-analysis"

        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-green-700"

      >

        <ArrowLeft size={15} /> Back to assessments

      </Link>

      <div>

        <h1 className="text-2xl font-bold text-slate-800">Create disaster assessment</h1>

        <p className="mt-1 text-sm text-slate-500">

          Provide incident details and upload images of the same location before and after the

          disaster.

        </p>

      </div>

 

      {error && (

        <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">

          <AlertCircle size={16} />

          {error}

        </div>

      )}

 

      <form onSubmit={submit} className="space-y-5">

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="mb-4 font-semibold text-slate-800">Assessment information</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Title */}

            <Field label="Assessment title *" wide>

              <input

                required

                className={fieldClass}

                value={form.assessment_title}

                onChange={(e) => update("assessment_title", e.target.value)}

                placeholder="Enter assessment title"

              />

            </Field>

 

            {/* Disaster type — no "Other" */}

            <Field label="Disaster type *">

              <select

                className={fieldClass}

                value={form.disaster_type}

                onChange={(e) => update("disaster_type", e.target.value)}

              >

                {DISASTER_TYPES.map((x) => (

                  <option key={x}>{x}</option>

                ))}

              </select>

            </Field>

 

            {/* Incident date */}

            <Field label="Incident date *">

              <input

                required

                type="date"

                className={fieldClass}

                value={form.incident_date}

                onChange={(e) => update("incident_date", e.target.value)}

              />

            </Field>

 

            {/* State (fixed) */}

            <Field label="State *">

              <input

                required

                className={fieldClass}

                value={form.state}

                onChange={(e) => update("state", e.target.value)}

              />

            </Field>

 

            {/* District dropdown */}

            <Field label="District *">

              <select

                required

                className={fieldClass}

                value={form.district}

                onChange={(e) => update("district", e.target.value)}

              >

                <option value="">— Select district —</option>

                {districts.map((d) => (

                  <option key={d} value={d}>

                    {d}

                  </option>

                ))}

              </select>

            </Field>

 

            {/* Subdivision dropdown — appears after district is selected */}

            <Field label="Subdivision">

              <select

                className={fieldClass}

                value={form.subdivision}

                onChange={(e) => update("subdivision", e.target.value)}

                disabled={!form.district || subdivisions.length === 0}

              >

                <option value="">

                  {!form.district

                    ? "— Select district first —"

                    : subdivisions.length === 0

                      ? "No subdivisions found"

                      : "— Select subdivision —"}

                </option>

                {subdivisions.map((s) => (

                  <option key={s} value={s}>

                    {s}

                  </option>

                ))}

              </select>

            </Field>

 

            {/* Block dropdown — appears after subdivision is selected */}

            <Field label="Block">

              <select

                className={fieldClass}

                value={form.block}

                onChange={(e) => update("block", e.target.value)}

                disabled={!form.subdivision || blocks.length === 0}

              >

                <option value="">

                  {!form.subdivision

                    ? "— Select subdivision first —"

                    : blocks.length === 0

                      ? "No blocks found"

                      : "— Select block —"}

                </option>

                {blocks.map((b) => (

                  <option key={b} value={b}>

                    {b}

                  </option>

                ))}

              </select>

            </Field>

 

            {/* Area */}

            <Field label="Area">

              <input

                className={fieldClass}

                value={form.area}

                onChange={(e) => update("area", e.target.value)}

              />

            </Field>

 

            {/* Coordinates */}

            <Field label="Latitude *">

              <input

                required

                type="number"

                step="any"

                min="-90"

                max="90"

                className={fieldClass}

                value={form.latitude}

                onChange={(e) => update("latitude", e.target.value)}

              />

            </Field>

            <Field label="Longitude *">

              <input

                required

                type="number"

                step="any"

                min="-180"

                max="180"

                className={fieldClass}

                value={form.longitude}

                onChange={(e) => update("longitude", e.target.value)}

              />

            </Field>

          </div>

        </section>

 

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="mb-1 font-semibold text-slate-800">Pre & post disaster images</h2>

          <p className="mb-4 text-xs text-slate-500">

            For a meaningful comparison, use images with similar coverage, angle and resolution.

          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <ImageInput label="Pre-disaster image *" file={preImage} onChange={setPreImage} />

            <ImageInput label="Post-disaster image *" file={postImage} onChange={setPostImage} />

          </div>

        </section>

 

        <div className="flex justify-end gap-2">

          <Link

            to="/disaster-analysis"

            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"

          >

            Cancel

          </Link>

          <button

            disabled={loading}

            className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"

          >

            <CloudUpload size={16} />

            {loading ? "Uploading..." : "Upload & analyse"}

          </button>

        </div>

      </form>

    </div>

  );

}