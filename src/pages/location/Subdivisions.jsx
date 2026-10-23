import React, { useEffect, useState } from "react";
import {
	MapContainer,
	Marker,
	Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import SubdivisionLayer from "../../components/map/SubDivisionLayer";
import DistrictLayer from "../../components/map/DistrictLayer";

import {
	createSubdivision,
	deleteSubdivision,
	listDistricts,
	listSubdivisions,
	updateSubdivision,
} from "../../services";

import { WEST_BENGAL_BOUNDS } from "../../constants/mapBounds";
import { Check, Pencil, Trash2, X } from "lucide-react";


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

	const [districts, setDistricts] = useState([]);
	const [subdivisions, setSubdivisions] =
		useState([]);

	const [loadingSubdivisions, setLoadingSubdivisions] =
		useState(false);

	const [subdivisionError, setSubdivisionError] =
		useState("");

	const [saving, setSaving] =
		useState(false);

	const [editingSubdivisionId, setEditingSubdivisionId] = useState(null);
	const [editForm, setEditForm] = useState({
		district_id: "",
		district: "",
		name: "",
		address: "",
		latitude: "",
		longitude: "",
	});
	const [updatingSubdivision, setUpdatingSubdivision] = useState(false);

	const [deleteModal, setDeleteModal] = useState({
		open: false,
		subdivision: null
	});
	const [deletingSubdivision, setDeletingSubdivision] = useState(false);

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
	| Load Districts and Subdivisions
	|--------------------------------------------------------------------------
	*/
	const loadDistricts = async () => {
		try {
			const response = await listDistricts();

			if (response?.success) {
				setDistricts(response.data || []);
			}
		} catch (error) {
			console.error(
				"Load districts error:",
				error
			);
		}
	};

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
		loadDistricts();
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


		/*
		|--------------------------------------------------------------------------
		| Store selected district
		|--------------------------------------------------------------------------
		*/

		setSelectedDistrict(district);


		/*
		|--------------------------------------------------------------------------
		| Clear previous subdivision
		|--------------------------------------------------------------------------
		*/

		setSelectedSubdivision(null);

		setPosition(null);


		/*
		|--------------------------------------------------------------------------
		| Update form
		|--------------------------------------------------------------------------
		*/

		setForm((previous) => ({

			...previous,

			district_id:
				district.id || "",

			district:
				district.name || "",

			name: "",

			address: "",

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
		const latitude =
			subdivision.latitude == null ||
			subdivision.latitude === ""
				? null
				: Number(subdivision.latitude);

		const longitude =
			subdivision.longitude == null ||
			subdivision.longitude === ""
				? null
				: Number(subdivision.longitude);

		const hasCoordinates =
			Number.isFinite(latitude) &&
			Number.isFinite(longitude);

		console.log(
			"Selected subdivision:",
			subdivision
		);
		console.log("Selected district:", selectedDistrict);

		/*
		|--------------------------------------------------------------------------
		| Store selected subdivision
		|--------------------------------------------------------------------------
		*/

		setSelectedSubdivision(
			subdivision
		);


		/*
		|--------------------------------------------------------------------------
		| Update form
		|--------------------------------------------------------------------------
		|
		| Latitude and longitude come directly
		| from the exact mouse click.
		|
		*/

		setForm((previous) => ({

			...previous,

			district_id:
				// subdivision.districtId ||
				selectedDistrict?.id ||
				"",

			district:
				selectedDistrict?.name ||
				subdivision.districtName ||
				"",

			name:
				subdivision.name ||
				"",

			address: "",

			latitude:
				hasCoordinates
					? latitude.toFixed(6)
					: "",

			longitude:
				hasCoordinates
					? longitude.toFixed(6)
					: "",

		}));
		console.log(selectedDistrict?.id);

		/*
		|--------------------------------------------------------------------------
		| Place Marker
		|--------------------------------------------------------------------------
		|
		| Marker is placed at the exact location
		| where the subdivision polygon was clicked.
		|
		*/

		if (hasCoordinates) {

			setPosition({

				lat:
					latitude,

				lng:
					longitude,

			});

		} else {

			setPosition(null);

		}

	};


	/*
	|--------------------------------------------------------------------------
	| Submit
	|--------------------------------------------------------------------------
	*/

	const handleSubmit = async (event) => {

		event.preventDefault();


		/*
		|--------------------------------------------------------------------------
		| Validation
		|--------------------------------------------------------------------------
		*/

		if (!form.district_id) {

			alert(
				"Please select a district."
			);

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
				|--------------------------------------------------------------------------
				| Reset Form
				|--------------------------------------------------------------------------
				*/

				setForm({

					district_id: "",

					district: "",

					name: "",

					address: "",

					latitude: "",

					longitude: "",

				});


				/*
				|--------------------------------------------------------------------------
				| Reset Map Selection
				|--------------------------------------------------------------------------
				*/

				setPosition(null);

				setSelectedDistrict(null);

				setSelectedSubdivision(null);


				/*
				|--------------------------------------------------------------------------
				| Reload Table
				|--------------------------------------------------------------------------
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

			district_id: "",

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

	const handleEditSubdivision = (subdivision) => {

		console.log(
			"Edit subdivision:",
			subdivision
		);

		setEditingSubdivisionId(
			subdivision.id
		);

		setEditForm({
			district_id:
				subdivision.district_id ||
				subdivision.districtId ||
				"",

			district:
				subdivision.district ||
				subdivision.district_name ||
				"",

			name:
				subdivision.name ||
				"",

			address:
				subdivision.address ||
				"",

			latitude:
				subdivision.latitude ??
				"",

			longitude:
				subdivision.longitude ??
				"",
		});
	};

	const handleCancelEdit = () => {

		setEditingSubdivisionId(null);

		setEditForm({
			district_id: "",
			district: "",
			name: "",
			address: "",
			latitude: "",
			longitude: "",
		});
	};

	const handleEditChange = (event) => {

		const {
			name,
			value,
		} = event.target;

		setEditForm((previous) => ({
			...previous,
			[name]: value,
		}));
	};

	const handleUpdateSubdivision = async (
		subdivisionId
	) => {

		try {

			setUpdatingSubdivision(true);

			const payload = {
				district_id:
					editForm.district_id,

				district:
					editForm.district.trim(),

				name:
					editForm.name.trim(),

				address:
					editForm.address.trim(),

				latitude:
					editForm.latitude,

				longitude:
					editForm.longitude,
			};

			console.log(
				"Update subdivision ID:",
				subdivisionId
			);

			console.log(
				"Update subdivision payload:",
				payload
			);

			const response =
				await updateSubdivision(
					subdivisionId,
					payload
				);

			console.log(
				"Update subdivision response:",
				response
			);

			if (response?.success) {

				alert(
					"Subdivision updated successfully."
				);

				await loadSubdivisions();

				handleCancelEdit();

			} else {

				alert(
					response?.message ||
					"Failed to update subdivision."
				);

			}

		} catch (error) {

			console.error(
				"Update subdivision error:",
				error
			);

			alert(
				error?.message ||
				"Unable to update subdivision."
			);

		} finally {

			setUpdatingSubdivision(false);

		}
	};

	const handleDeleteSubdivision = (
		subdivision
	) => {

		setDeleteModal({
			open: true,
			subdivision,
		});
	};

	const handleConfirmDelete = async () => {

		const subdivision =
			deleteModal.subdivision;

		if (!subdivision) {
			return;
		}

		try {

			setDeletingSubdivision(true);

			const response =
				await deleteSubdivision(
					subdivision.id
				);

			console.log(
				"Delete subdivision response:",
				response
			);

			if (response?.success) {

				setDeleteModal({
					open: false,
					subdivision: null,
				});

				if (
					editingSubdivisionId ===
					subdivision.id
				) {
					handleCancelEdit();
				}

				await loadSubdivisions();

				alert(
					"Subdivision deleted successfully."
				);

			} else {

				alert(
					response?.message ||
					"Failed to delete subdivision."
				);

			}

		} catch (error) {

			console.error(
				"Delete subdivision error:",
				error
			);

			alert(
				error?.message ||
				"Something went wrong while deleting subdivision."
			);

		} finally {

			setDeletingSubdivision(false);

		}
	};


	/*
	|--------------------------------------------------------------------------
	| Render
	|--------------------------------------------------------------------------
	*/

	return (

		<div className="relative min-h-screen w-full bg-gray-50 p-6">


			{/* =====================================================
                Page Header
            ====================================================== */}

			<div className="relative z-20 mb-6">

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

			<div className="relative z-0 grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">


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
								readOnly
								placeholder="Select district from map"
								className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
							/>

						</div>


						{/* Subdivision */}

						<div>

							<label className="mb-1 block text-sm font-medium text-gray-700">
								Subdivision Name
							</label>

							<input
								type="text"
								name="name"
								value={form.name}
								readOnly
								placeholder="Select subdivision from map"
								className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
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
									readOnly
									placeholder="Select subdivision"
									className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
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
									readOnly
									placeholder="Select subdivision"
									className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
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

				<div className="relative z-0 isolate overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">


					{/* Map Header */}

					<div className="relative z-20 border-b border-gray-200 bg-white px-5 py-4">

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

					<div className="relative z-0 h-[600px] w-full">

						<MapContainer
							center={[22.5726, 88.3639]}
							zoom={7}
							minZoom={6.5}
							maxZoom={12}
							maxBounds={WEST_BENGAL_BOUNDS}
							maxBoundsViscosity={1.0}
							scrollWheelZoom={true}
							className="h-full w-full"
						>


							{/* =================================================
                                District Layer
                            ================================================== */}

							<DistrictLayer
								selectedDistrict={selectedDistrict}
								databaseDistricts={districts}
								requireDatabaseDistrict={true}
								onDistrictSelect={handleDistrictSelect}
							/>


							{/* =================================================
                                Subdivision Layer
                            ================================================== */}

							{selectedDistrict && (

								<SubdivisionLayer
									selectedDistrict={selectedDistrict}
									databaseDistricts={districts}
									databaseSubdivisions={subdivisions}
									requireDatabaseDistrict={true}
									requireDatabaseSubdivision={false}
									onSubdivisionSelect={handleSubdivisionSelect}
								/>

							)}


							{/* =================================================
                                Marker
                            ================================================== */}

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
												{form.name ||
													"Selected Subdivision"}
											</p>

											<p>
												District:{" "}
												{form.district || "-"}
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


					{/* =================================================
                        Coordinates
                    ================================================== */}

					<div className="relative z-20 grid grid-cols-2 border-t border-gray-200 bg-white">

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

			<div className="relative z-0 mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">


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
											S.No.
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

										<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											Action
										</th>

									</tr>

								</thead>


								{/* Body */}

								<tbody className="divide-y divide-gray-200 bg-white">

									{subdivisions.length > 0 ? (

										subdivisions.map(
											(subdivision, index) => {

												const isEditing =
													editingSubdivisionId ===
													subdivision.id;

												return (

													<tr
														key={subdivision.id}
														className="transition hover:bg-gray-50"
													>

														{/* S.No. */}

														<td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">

															{index + 1}

														</td>


														{/* District */}

														<td className="whitespace-nowrap px-5 py-4">

															{isEditing ? (

																<input
																	type="text"
																	name="district"
																	value={
																		editForm.district
																	}
																	readOnly
																	className="w-full min-w-[150px] rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none"
																/>

															) : (

																<span className="text-sm font-medium text-gray-800">

																	{subdivision.district ||
																		subdivision.district_name ||
																		"-"}

																</span>

															)}

														</td>


														{/* Subdivision */}

														<td className="whitespace-nowrap px-5 py-4">

															{isEditing ? (

																<input
																	type="text"
																	name="name"
																	value={
																		editForm.name
																	}
																	readOnly
																	className="w-full min-w-[180px] rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none"
																/>

															) : (

																<span className="text-sm font-medium text-gray-800">

																	{subdivision.name ||
																		"-"}

																</span>

															)}

														</td>


														{/* Address */}

														<td className="px-5 py-4">

															{isEditing ? (

																<input
																	type="text"
																	name="address"
																	value={
																		editForm.address
																	}
																	onChange={
																		handleEditChange
																	}
																	className="w-full min-w-[250px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
																/>

															) : (

																<span className="text-sm text-gray-600">

																	{subdivision.address ||
																		"-"}

																</span>

															)}

														</td>


														{/* Latitude */}

														<td className="whitespace-nowrap px-5 py-4">

															{isEditing ? (

																<input
																	type="text"
																	name="latitude"
																	value={
																		editForm.latitude
																	}
																	readOnly
																	className="w-full min-w-[120px] rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none"
																/>

															) : (

																<span className="text-sm text-gray-600">

																	{subdivision.latitude ||
																		"-"}

																</span>

															)}

														</td>


														{/* Longitude */}

														<td className="whitespace-nowrap px-5 py-4">

															{isEditing ? (

																<input
																	type="text"
																	name="longitude"
																	value={
																		editForm.longitude
																	}
																	readOnly
																	className="w-full min-w-[120px] rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none"
																/>

															) : (

																<span className="text-sm text-gray-600">

																	{subdivision.longitude ||
																		"-"}

																</span>

															)}

														</td>


														{/* Action */}

														<td className="whitespace-nowrap px-5 py-4">

															<div className="flex items-center justify-center gap-2">

																{isEditing ? (

																	<>

																		{/* Save */}

																		<button
																			type="button"
																			disabled={
																				updatingSubdivision
																			}
																			onClick={() =>
																				handleUpdateSubdivision(
																					subdivision.id
																				)
																			}
																			title="Save Changes"
																			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
																		>

																			<Check
																				size={18}
																				strokeWidth={2.5}
																			/>

																		</button>


																		{/* Cancel */}

																		<button
																			type="button"
																			disabled={
																				updatingSubdivision
																			}
																			onClick={
																				handleCancelEdit
																			}
																			title="Cancel"
																			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
																		>

																			<X
																				size={18}
																				strokeWidth={2.5}
																			/>

																		</button>

																	</>

																) : (

																	<>

																		{/* Edit */}

																		<button
																			type="button"
																			onClick={() =>
																				handleEditSubdivision(
																					subdivision
																				)
																			}
																			title="Edit Subdivision"
																			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
																		>

																			<Pencil
																				size={17}
																				strokeWidth={2}
																			/>

																		</button>


																		{/* Delete */}

																		<button
																			type="button"
																			onClick={() =>
																				handleDeleteSubdivision(
																					subdivision
																				)
																			}
																			title="Delete Subdivision"
																			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
																		>

																			<Trash2
																				size={17}
																				strokeWidth={2}
																			/>

																		</button>

																	</>

																)}

															</div>

														</td>

													</tr>

												);

											}

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

			{deleteModal.open && (

				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">

					<div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

						{/* Modal Content */}

						<div className="p-6">

							{/* Delete Icon */}

							<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">

								<Trash2
									size={28}
									strokeWidth={2}
									className="text-red-600"
								/>

							</div>


							{/* Title */}

							<h3 className="mt-5 text-center text-lg font-semibold text-gray-900">

								Delete Subdivision?

							</h3>


							{/* Description */}

							<p className="mt-2 text-center text-sm leading-6 text-gray-500">

								Are you sure you want to delete{" "}

								<span className="font-semibold text-gray-800">

									"{deleteModal.subdivision?.name}"

								</span>

								?

								<br />

								This action cannot be undone.

							</p>

						</div>


						{/* Modal Actions */}

						<div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">

							<button
								type="button"
								disabled={
									deletingSubdivision
								}
								onClick={() => {

									if (
										deletingSubdivision
									) {
										return;
									}

									setDeleteModal({
										open: false,
										subdivision: null,
									});

								}}
								className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
							>

								Cancel

							</button>


							<button
								type="button"
								disabled={
									deletingSubdivision
								}
								onClick={
									handleConfirmDelete
								}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
							>

								<Trash2
									size={17}
									strokeWidth={2}
								/>

								{deletingSubdivision
									? "Deleting..."
									: "Delete Subdivision"}

							</button>

						</div>

					</div>

				</div>

			)}

		</div>

	);

}

export default SubdivisionLocation;