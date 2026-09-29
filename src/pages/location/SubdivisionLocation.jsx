import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import SubdivisionLayer from "../../components/map/SubDivisionLayer";
import DistrictLayer from "../../components/map/DistrictLayer";

import {
  createSubdivision,
  listSubdivisions,
} from "../../services";


function SubdivisionLocation() {

  /*
  |--------------------------------------------------------------------------
  | Form
  |--------------------------------------------------------------------------
  */

  const [form, setForm] = useState({
    district_id: "",
    district: "",
    name: "",
    address: "",
    latitude: "",
    longitude: "",
  });


  /*
  |--------------------------------------------------------------------------
  | Map State
  |--------------------------------------------------------------------------
  */

  const [position, setPosition] = useState(null);

  const [selectedDistrict, setSelectedDistrict] =
    useState(null);

  const [selectedSubdivision, setSelectedSubdivision] =
    useState(null);


  /*
  |--------------------------------------------------------------------------
  | Table State
  |--------------------------------------------------------------------------
  */

  const [subdivisions, setSubdivisions] =
    useState([]);

  const [loadingSubdivisions, setLoadingSubdivisions] =
    useState(false);

  const [subdivisionError, setSubdivisionError] =
    useState("");

  const [saving, setSaving] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | Form Change
  |--------------------------------------------------------------------------
  */

  const handleChange = (event) => {

    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

  };


  /*
  |--------------------------------------------------------------------------
  | Load Subdivisions
  |--------------------------------------------------------------------------
  */

  const loadSubdivisions = async () => {

    try {

      setLoadingSubdivisions(true);

      setSubdivisionError("");

      const response =
        await listSubdivisions();

      console.log(
        "Subdivision list response:",
        response
      );


      if (response?.success) {

        setSubdivisions(
          response.data || []
        );

      } else {

        setSubdivisionError(
          response?.message ||
          "Failed to load subdivisions."
        );

      }

    } catch (error) {

      console.error(
        "Subdivision list error:",
        error
      );

      setSubdivisionError(
        "Unable to load subdivision list."
      );

    } finally {

      setLoadingSubdivisions(false);

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Load Table On Page Load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    loadSubdivisions();

  }, []);


  /*
  |--------------------------------------------------------------------------
  | District Selection
  |--------------------------------------------------------------------------
  */

  const handleDistrictSelect = (district) => {

    console.log(
      "Selected district:",
      district
    );

    setSelectedDistrict(district);

    /*
     * Clear previously selected subdivision
     */

    setSelectedSubdivision(null);

    setPosition(null);


    /*
     * Update form
     */

    setForm((previous) => ({

      ...previous,

      district_id: district.id,

      district: district.name,

      name: "",

      latitude: "",

      longitude: "",

    }));

  };


  /*
  |--------------------------------------------------------------------------
  | Subdivision Selection
  |--------------------------------------------------------------------------
  */

  const handleSubdivisionSelect = (
    subdivision
  ) => {

    console.log(
      "Selected subdivision:",
      subdivision
    );


    setSelectedSubdivision(
      subdivision
    );


    /*
     * Update form
     */

    setForm((previous) => ({

      ...previous,

      district_id: subdivision.districtId,

      // Get district name from selected district
      district: selectedDistrict?.name || "",

      // Selected subdivision
      name: subdivision.name || "",

      latitude:
        subdivision.latitude?.toFixed(6) || "",

      longitude:
        subdivision.longitude?.toFixed(6) || "",

    }));


    /*
     * Update marker
     */

    if (
      subdivision.latitude != null &&
      subdivision.longitude != null
    ) {

      setPosition({

        lat: subdivision.latitude,

        lng: subdivision.longitude,

      });

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {

    event.preventDefault();
    console.log("FORM BEFORE SUBMIT:", form);
    console.log("SELECTED DISTRICT:", selectedDistrict);
    console.log("SELECTED SUBDIVISION:", selectedSubdivision);

    /*
     * Basic validation
     */

    if (!form.district_id) {
      alert("Please select a district.");
      return;
    }

    if (!form.district) {

      alert(
        "Please select a district."
      );

      return;

    }


    if (!form.name) {

      alert(
        "Please select a subdivision."
      );

      return;

    }


    if (!form.latitude || !form.longitude) {

      alert(
        "Please select the subdivision location."
      );

      return;

    }


    try {

      setSaving(true);


      console.log(
        "Subdivision data:",
        form
      );


      const response =
        await createSubdivision(form);


      console.log(
        "Create subdivision response:",
        response
      );


      if (response?.success) {

        alert(
          "Subdivision created successfully."
        );


        /*
         * Reset form
         */

        setForm({

          district: "",

          name: "",

          address: "",

          latitude: "",

          longitude: "",

        });


        /*
         * Reset map selection
         */

        setPosition(null);

        setSelectedDistrict(null);

        setSelectedSubdivision(null);


        /*
         * Reload table
         */

        loadSubdivisions();

      } else {

        alert(
          response?.message ||
          "Failed to create subdivision."
        );

      }

    } catch (error) {

      console.error(
        "Create subdivision error:",
        error
      );


      /*
       * Try to show API error message
       */

      const message =
        error?.response?.data?.message ||
        "Something went wrong while creating subdivision.";


      alert(message);

    } finally {

      setSaving(false);

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Reset Form
  |--------------------------------------------------------------------------
  */

  const handleReset = () => {

    setForm({

      district: "",

      name: "",

      address: "",

      latitude: "",

      longitude: "",

    });

    setPosition(null);

    setSelectedDistrict(null);

    setSelectedSubdivision(null);

  };


  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (

    <div className="min-h-screen w-full bg-gray-50 p-6">


      {/* =====================================================
          Header
      ====================================================== */}

      <div className="mb-6">

        <h1 className="text-2xl font-semibold text-gray-800">
          Subdivision Location
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Add and manage subdivision location information.
        </p>

      </div>


      {/* =====================================================
          Main Layout
      ====================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">


        {/* ===================================================
            Form
        ==================================================== */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <h2 className="mb-6 text-lg font-semibold text-gray-800">
            Subdivision Details
          </h2>


          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >


            {/* District */}

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700">
                District
              </label>

              <input
                type="text"
                name="district"
                value={form.district}
                onChange={handleChange}
                readOnly
                placeholder="Select district from map"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            {/* Subdivision Name */}

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700">
                Subdivision Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                readOnly
                placeholder="Select subdivision from map"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            {/* Address */}

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700">
                Address
              </label>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
                placeholder="Subdivision address"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            {/* Latitude / Longitude */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">


              {/* Latitude */}

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Latitude
                </label>

                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="Latitude"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>


              {/* Longitude */}

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Longitude
                </label>

                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="Longitude"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

            </div>


            {/* Buttons */}

            <div className="flex gap-3 pt-2">

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {saving
                  ? "Saving..."
                  : "Save Subdivision"}

              </button>


              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>

            </div>

          </form>

        </div>


        {/* ===================================================
            Map
        ==================================================== */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">


          {/* Map Header */}

          <div className="border-b border-gray-200 px-5 py-4">

            <h2 className="text-lg font-semibold text-gray-800">
              Subdivision Map
            </h2>

            <p className="mt-1 text-sm text-gray-500">

              {selectedDistrict

                ? `Select a subdivision inside ${selectedDistrict.name}.`

                : "Select a district first, then select a subdivision."}

            </p>

          </div>


          {/* Map */}

          <div className="h-[600px] w-full">

            <MapContainer
              center={[22.5726, 88.3639]}
              zoom={7}
              scrollWheelZoom={true}
              className="h-full w-full"
            >

              {/* <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              /> */}


              {/* District */}

              <DistrictLayer
                selectedDistrict={selectedDistrict}
                onDistrictSelect={
                  handleDistrictSelect
                }
              />


              {/* Subdivision */}

              {selectedDistrict && (

                <SubdivisionLayer
                  selectedDistrict={
                    selectedDistrict
                  }
                  onSubdivisionSelect={
                    handleSubdivisionSelect
                  }
                />

              )}


              {/* Marker */}

              {position && (

                <Marker
                  position={[
                    position.lat,
                    position.lng,
                  ]}
                >

                  <Popup>

                    <div className="text-sm">

                      <p className="font-semibold">
                        {form.name}
                      </p>

                      <p>
                        District:{" "}
                        {form.district}
                      </p>

                      <p>
                        Latitude:{" "}
                        {position.lat.toFixed(6)}
                      </p>

                      <p>
                        Longitude:{" "}
                        {position.lng.toFixed(6)}
                      </p>

                    </div>

                  </Popup>

                </Marker>

              )}

            </MapContainer>

          </div>


          {/* Coordinates */}

          <div className="grid grid-cols-2 border-t border-gray-200">

            <div className="px-5 py-4">

              <p className="text-xs text-gray-500">
                Latitude
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {form.latitude || "--"}
              </p>

            </div>


            <div className="border-l border-gray-200 px-5 py-4">

              <p className="text-xs text-gray-500">
                Longitude
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {form.longitude || "--"}
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          Subdivision Table
      ====================================================== */}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">


        {/* Table Header */}

        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

          <div>

            <h2 className="text-lg font-semibold text-gray-800">
              Subdivision List
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Manage subdivision location records.
            </p>

          </div>


          <button
            type="button"
            onClick={loadSubdivisions}
            disabled={loadingSubdivisions}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {loadingSubdivisions
              ? "Loading..."
              : "Refresh"}

          </button>

        </div>


        {/* Loading */}

        {loadingSubdivisions && (

          <div className="px-5 py-8 text-center text-sm text-gray-500">

            Loading subdivisions...

          </div>

        )}


        {/* Error */}

        {!loadingSubdivisions &&
          subdivisionError && (

            <div className="px-5 py-8 text-center text-sm text-red-500">

              {subdivisionError}

            </div>

          )}


        {/* Table */}

        {!loadingSubdivisions &&
          !subdivisionError && (

            <div className="overflow-x-auto">

              <table className="min-w-full divide-y divide-gray-200">


                {/* Header */}

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      ID
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      District
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Subdivision
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Address
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Latitude
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Longitude
                    </th>

                  </tr>

                </thead>


                {/* Body */}

                <tbody className="divide-y divide-gray-200 bg-white">

                  {subdivisions.length > 0 ? (

                    subdivisions.map(
                      (subdivision) => (

                        <tr
                          key={
                            subdivision.id
                          }
                          className="transition hover:bg-gray-50"
                        >


                          {/* ID */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">

                            {subdivision.id}

                          </td>


                          {/* District */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-800">

                            {subdivision.district ||
                              subdivision.district_name ||
                              "-"}

                          </td>


                          {/* Subdivision */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-800">

                            {subdivision.name ||
                              "-"}

                          </td>


                          {/* Address */}

                          <td className="px-5 py-4 text-sm text-gray-600">

                            {subdivision.address ||
                              "-"}

                          </td>


                          {/* Latitude */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">

                            {subdivision.latitude ||
                              "-"}

                          </td>


                          {/* Longitude */}

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">

                            {subdivision.longitude ||
                              "-"}

                          </td>

                        </tr>

                      )
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="7"
                        className="px-5 py-8 text-center text-sm text-gray-500"
                      >

                        No subdivisions found.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          )}

      </div>

    </div>

  );

}

export default SubdivisionLocation;