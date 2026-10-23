import React, { useEffect, useState } from "react";
import {
	MapContainer,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import DistrictLayer from "../../components/map/DistrictLayer";
import {
	createDistrict,
	deleteDistrict,
	listDistricts,
	updateDistrict,
} from "../../services";

import LocationMarker from "../../components/map/LocationMarker";
import { WEST_BENGAL_BOUNDS } from "../../constants/mapBounds";

import {
	Pencil,
	Trash2,
	Check,
	X,
} from "lucide-react";

/*
|--------------------------------------------------------------------------
| District Location
|--------------------------------------------------------------------------
*/

function DistrictLocation() {
	const [form, setForm] = useState({
		name: "",
		address: "",
		latitude: "",
		longitude: "",
		storage_location: "",
	});

	const [position, setPosition] = useState(null);
	const [selectedDistrict, setSelectedDistrict] = useState(null);

	const [districts, setDistricts] = useState([]);
	const [loadingDistricts, setLoadingDistricts] = useState(false);
	const [districtError, setDistrictError] = useState("");

	const [editingDistrictId, setEditingDistrictId] = useState(null);

	const [editForm, setEditForm] = useState({
		name: "",
		address: "",
		latitude: "",
		longitude: "",
		storage_location: "",
	});

	const [updatingDistrict, setUpdatingDistrict] = useState(false);

	const [deleteModal, setDeleteModal] = useState({
		open: false,
		district: null,
	});

	const [deletingDistrict, setDeletingDistrict] = useState(false);

	/*
	|--------------------------------------------------------------------------
	| Form Change
	|--------------------------------------------------------------------------
	|
	| District name, latitude and longitude are NOT manually editable.
	| They are populated from the map.
	|
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
	| Map Position
	|--------------------------------------------------------------------------
	|
	| Used when LocationMarker changes the selected location.
	|
	*/

	const handleMapPosition = (location) => {
		if (!location) {
			return;
		}

		setPosition(location);

		setForm((previous) => ({
			...previous,
			latitude:
				typeof location.lat === "number"
					? location.lat.toFixed(6)
					: "",
			longitude:
				typeof location.lng === "number"
					? location.lng.toFixed(6)
					: "",
		}));
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
		| Explicit frontend validation
		|--------------------------------------------------------------------------
		*/

		if (!selectedDistrict) {
			alert("Please select a district from the map.");
			return;
		}

		if (!form.name.trim()) {
			alert("District name is required.");
			return;
		}

		if (!form.address.trim()) {
			alert("Address is required.");
			return;
		}

		if (!form.latitude || !form.longitude) {
			alert("Please select a location on the map.");
			return;
		}

		if (!form.storage_location.trim()) {
			alert("Storage location is required.");
			return;
		}

		const payload = {
			name: form.name.trim(),
			address: form.address.trim(),
			latitude: form.latitude,
			longitude: form.longitude,
			storage_location: form.storage_location.trim(),
		};

		console.log("District data:", payload);

		try {
			const response = await createDistrict(payload);

			console.log(
				"Create district response:",
				response
			);

			if (response?.success) {
				alert("District created successfully.");

				resetForm();

				await loadDistricts();
			} else {
				alert(
					response?.message ||
					"Failed to create district."
				);
			}
		} catch (error) {
			console.error(
				"Create district error:",
				error
			);

			alert(
				error
			);
		}
	};

	/*
	|--------------------------------------------------------------------------
	| Reset Form
	|--------------------------------------------------------------------------
	*/

	const resetForm = () => {
		setForm({
			name: "",
			address: "",
			latitude: "",
			longitude: "",
			storage_location: "",
		});

		setPosition(null);
		setSelectedDistrict(null);
	};

	/*
	|--------------------------------------------------------------------------
	| Load Districts
	|--------------------------------------------------------------------------
	*/

	const loadDistricts = async () => {
		try {
			setLoadingDistricts(true);
			setDistrictError("");

			const response = await listDistricts();

			console.log(
				"District list response:",
				response
			);

			if (response?.success) {
				setDistricts(response.data || []);
			} else {
				setDistrictError(
					response?.message ||
					"Failed to load districts."
				);
			}
		} catch (error) {
			console.error(
				"District list error:",
				error
			);

			setDistrictError(
				error?.message ||
				"Unable to load district list."
			);
		} finally {
			setLoadingDistricts(false);
		}
	};

	useEffect(() => {
		loadDistricts();
	}, []);

	/*
	|--------------------------------------------------------------------------
	| District Select
	|--------------------------------------------------------------------------
	|
	| District name and coordinates come directly from the
	| selected district returned by DistrictLayer.
	|
	*/

	const handleDistrictSelect = (district) => {
		if (!district) {
			return;
		}

		console.log(
			"Selected district:",
			district
		);

		setSelectedDistrict(district);

		/*
		|--------------------------------------------------------------------------
		| Get coordinates
		|--------------------------------------------------------------------------
		*/

		const latitude = Number(
			district.latitude
		);

		const longitude = Number(
			district.longitude
		);

		/*
		|--------------------------------------------------------------------------
		| Set marker
		|--------------------------------------------------------------------------
		*/

		if (
			!Number.isNaN(latitude) &&
			!Number.isNaN(longitude)
		) {
			setPosition({
				lat: latitude,
				lng: longitude,
			});
		}

		/*
		|--------------------------------------------------------------------------
		| Update form
		|--------------------------------------------------------------------------
		*/

		setForm((previous) => ({
			...previous,

			/*
			 * District name comes from map.
			 */
			name:
				district.name ||
				district.dtname ||
				"",

			address: "",

			/*
			 * Coordinates come from map.
			 */
			latitude:
				!Number.isNaN(latitude)
					? latitude.toFixed(6)
					: "",

			longitude:
				!Number.isNaN(longitude)
					? longitude.toFixed(6)
					: "",
		}));
	};

	/*
	|--------------------------------------------------------------------------
	| Edit District
	|--------------------------------------------------------------------------
	*/

	const handleEditDistrict = (district) => {
		console.log(
			"Edit district:",
			district
		);

		setEditingDistrictId(district.id);

		setEditForm({
			name: district.name || "",
			address: district.address || "",
			latitude: district.latitude || "",
			longitude: district.longitude || "",
			storage_location:
				district.storage_location || "",
		});
	};

	/*
	|--------------------------------------------------------------------------
	| Cancel Edit
	|--------------------------------------------------------------------------
	*/

	const handleCancelEdit = () => {
		setEditingDistrictId(null);

		setEditForm({
			name: "",
			address: "",
			latitude: "",
			longitude: "",
			storage_location: "",
		});
	};

	/*
	|--------------------------------------------------------------------------
	| Edit Change
	|--------------------------------------------------------------------------
	*/

	const handleEditChange = (event) => {
		const { name, value } = event.target;

		setEditForm((previous) => ({
			...previous,
			[name]: value,
		}));
	};

	/*
	|--------------------------------------------------------------------------
	| Update District
	|--------------------------------------------------------------------------
	*/

	const handleUpdateDistrict = async (districtId) => {
		/*
		|--------------------------------------------------------------------------
		| Frontend validation
		|--------------------------------------------------------------------------
		*/

		if (!editForm.address.trim()) {
			alert("Address is required.");
			return;
		}

		if (!editForm.storage_location.trim()) {
			alert("Storage location is required.");
			return;
		}

		try {
			setUpdatingDistrict(true);

			console.log(
				"District ID:",
				districtId
			);

			const payload = {
				/*
				 * Name comes from existing district record.
				 * It is not user editable.
				 */
				name: editForm.name.trim(),

				address:
					editForm.address.trim(),

				latitude:
					editForm.latitude,

				longitude:
					editForm.longitude,

				storage_location:
					editForm.storage_location.trim(),
			};

			console.log(
				"Update district payload:",
				payload
			);

			const response =
				await updateDistrict(
					districtId,
					payload
				);

			console.log(
				"Update district response:",
				response
			);

			if (response?.success) {
				alert(
					"District updated successfully."
				);

				await loadDistricts();

				handleCancelEdit();
			} else {
				alert(
					response?.message ||
					"Failed to update district."
				);
			}
		} catch (error) {
			console.error(
				"Update district error:",
				error
			);

			alert(
				"Unable to update district."
			);
		} finally {
			setUpdatingDistrict(false);
		}
	};

	/*
	|--------------------------------------------------------------------------
	| Delete District
	|--------------------------------------------------------------------------
	*/

	const handleDeleteDistrict = (district) => {
		setDeleteModal({
			open: true,
			district,
		});
	};

	/*
	|--------------------------------------------------------------------------
	| Confirm Delete
	|--------------------------------------------------------------------------
	*/

	const handleConfirmDelete = async () => {
		const district =
			deleteModal.district;

		if (!district) {
			return;
		}

		try {
			setDeletingDistrict(true);

			const response =
				await deleteDistrict(
					district.id
				);

			console.log(
				"Delete district response:",
				response
			);

			if (response?.success) {
				setDeleteModal({
					open: false,
					district: null,
				});

				/*
				|--------------------------------------------------------------------------
				| Clear selected district if deleted
				|--------------------------------------------------------------------------
				*/

				if (
					selectedDistrict?.id ===
					district.id
				) {
					resetForm();
				}

				await loadDistricts();

				alert(
					"District deleted successfully."
				);
			} else {
				alert(
					response?.message ||
					"Failed to delete district."
				);
			}
		} catch (error) {
			console.error(
				"Delete district error:",
				error
			);

			alert(
				error?.message ||
				"Something went wrong while deleting district."
			);
		} finally {
			setDeletingDistrict(false);
		}
	};

	return (
		<div className="w-full min-h-screen bg-gray-50 p-6">

			{/* =====================================================
			    Page Header
			====================================================== */}

			<div className="mb-6">

				<h1 className="text-2xl font-semibold text-gray-800">
					District Location
				</h1>

				<p className="mt-1 text-sm text-gray-500">
					Add and manage district location information.
				</p>

			</div>


			{/* =====================================================
			    Main Content
			====================================================== */}

			<div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">


				{/* ===================================================
				    District Form
				=================================================== */}

				<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

					<h2 className="mb-6 text-lg font-semibold text-gray-800">
						District Details
					</h2>


					<form
						onSubmit={handleSubmit}
						className="space-y-5"
					>


						{/* =================================================
						    District Name
						================================================== */}

						<div>

							<label className="mb-2 block text-sm font-medium text-gray-700">
								District Name
							</label>

							<input
								type="text"
								name="name"
								value={form.name}
								readOnly
								required
								placeholder="Select district from map"
								className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-600 outline-none"
							/>

							{/* <p className="mt-1.5 text-xs text-gray-500">
								District name is automatically selected from the map.
							</p> */}

						</div>


						{/* =================================================
						    Address
						================================================== */}

						<div>

							<label className="mb-2 block text-sm font-medium text-gray-700">
								Address
							</label>

							<textarea
								name="address"
								value={form.address}
								onChange={handleChange}
								placeholder="Enter district address"
								rows={4}
								required
								className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>

						</div>


						{/* =================================================
						    Latitude / Longitude
						================================================== */}

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

							<div>

								<label className="mb-2 block text-sm font-medium text-gray-700">
									Latitude
								</label>

								<input
									type="number"
									step="any"
									name="latitude"
									value={form.latitude}
									readOnly
									required
									placeholder="Select district"
									className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-600 outline-none"
								/>

							</div>


							<div>

								<label className="mb-2 block text-sm font-medium text-gray-700">
									Longitude
								</label>

								<input
									type="number"
									step="any"
									name="longitude"
									value={form.longitude}
									readOnly
									required
									placeholder="Select district"
									className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-600 outline-none"
								/>

							</div>

						</div>


						{/* =================================================
						    Storage Location
						================================================== */}

						<div>

							<label className="mb-2 block text-sm font-medium text-gray-700">
								Storage Location
							</label>

							<input
								type="text"
								name="storage_location"
								value={
									form.storage_location
								}
								onChange={handleChange}
								placeholder="Enter storage location"
								required
								className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>

						</div>


						{/* =================================================
						    Buttons
						================================================== */}

						<div className="flex gap-3 pt-2">

							<button
								type="submit"
								className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
							>
								Save District
							</button>


							<button
								type="button"
								onClick={resetForm}
								className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
							>
								Reset
							</button>

						</div>

					</form>

				</div>


				{/* ===================================================
				    Map
				=================================================== */}

				<div className="relative z-0 isolate overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

					<div className="border-b border-gray-200 px-5 py-4">

						<div className="flex items-center justify-between">

							<div>

								<h2 className="text-lg font-semibold text-gray-800">
									District Location
								</h2>

								<p className="mt-1 text-sm text-gray-500">

									{selectedDistrict
										? `Selected district: ${selectedDistrict.name}`
										: "Select a district from the map."
									}

								</p>

							</div>

						</div>

					</div>


					<div className="relative z-0 h-[600px] w-full">

						<MapContainer
							center={[
								24.2726,
								88.3639,
							]}
							zoom={6.8}
							minZoom={6.5}
							maxZoom={12}
							maxBounds={
								WEST_BENGAL_BOUNDS
							}
							maxBoundsViscosity={1.0}
							scrollWheelZoom={true}
							className="h-full w-full"
						>

							<LocationMarker
								position={position}
								setPosition={
									handleMapPosition
								}
								selectedDistrict={
									selectedDistrict
								}
							/>

							<DistrictLayer
								selectedDistrict={
									selectedDistrict
								}
								onDistrictSelect={
									handleDistrictSelect
								}
							/>

						</MapContainer>

					</div>


					{/* =================================================
					    Coordinate Information
					================================================== */}

					<div className="border-t border-gray-200 bg-gray-50 px-5 py-4">

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

							<div>

								<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
									Latitude
								</p>

								<p className="mt-1 text-sm font-semibold text-gray-800">
									{form.latitude || "--"}
								</p>

							</div>


							<div>

								<p className="text-xs font-medium uppercase tracking-wide text-gray-500">
									Longitude
								</p>

								<p className="mt-1 text-sm font-semibold text-gray-800">
									{form.longitude || "--"}
								</p>

							</div>

						</div>

					</div>

				</div>

			</div>


			{/* =====================================================
			    District List
			====================================================== */}

			<div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">

				{/* Table Header */}

				<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

					<div>

						<h2 className="text-lg font-semibold text-gray-800">
							District List
						</h2>

						<p className="mt-1 text-sm text-gray-500">
							Manage district location records.
						</p>

					</div>


					<button
						type="button"
						onClick={loadDistricts}
						className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
					>
						Refresh
					</button>

				</div>


				{/* Loading */}

				{loadingDistricts && (
					<div className="px-5 py-8 text-center text-sm text-gray-500">
						Loading districts...
					</div>
				)}


				{/* Error */}

				{!loadingDistricts &&
					districtError && (
						<div className="px-5 py-8 text-center text-sm text-red-500">
							{districtError}
						</div>
					)}


				{/* Table */}

				{!loadingDistricts &&
					!districtError && (
						<div className="overflow-x-auto">

							<table className="min-w-[1150px] divide-y divide-gray-200">

								<thead className="bg-gray-50">

									<tr>

										<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											S.No.
										</th>

										<th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
											District
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
											Storage Location
										</th>

										<th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
											Action
										</th>

									</tr>

								</thead>


								<tbody className="divide-y divide-gray-200 bg-white">

									{districts.length > 0 ? (

										districts.map(
											(
												district,
												index
											) => {

												const isEditing =
													editingDistrictId ===
													district.id;

												return (

													<tr
														key={
															district.id
														}
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
																	name="name"
																	value={
																		editForm.name
																	}
																	readOnly
																	className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none"
																/>

															) : (

																<span className="text-sm font-medium text-gray-800">
																	{
																		district.name
																	}
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
																	required
																	className="w-full min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
																/>

															) : (

																<span className="text-sm text-gray-600">
																	{
																		district.address ||
																		"-"
																	}
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
																	className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none"
																/>

															) : (

																<span className="text-sm text-gray-600">
																	{
																		district.latitude ||
																		"-"
																	}
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
																	className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 outline-none"
																/>

															) : (

																<span className="text-sm text-gray-600">
																	{
																		district.longitude ||
																		"-"
																	}
																</span>

															)}

														</td>


														{/* Storage Location */}

														<td className="px-5 py-4">

															{isEditing ? (

																<input
																	type="text"
																	name="storage_location"
																	value={
																		editForm.storage_location
																	}
																	onChange={
																		handleEditChange
																	}
																	required
																	className="w-full min-w-[180px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
																/>

															) : (

																<span className="text-sm text-gray-600">
																	{
																		district.storage_location ||
																		"-"
																	}
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
																				updatingDistrict
																			}
																			onClick={() =>
																				handleUpdateDistrict(
																					district.id
																				)
																			}
																			title="Save Changes"
																			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
																		>

																			<Check
																				size={
																					18
																				}
																				strokeWidth={
																					2.5
																				}
																			/>

																		</button>


																		{/* Cancel */}

																		<button
																			type="button"
																			disabled={
																				updatingDistrict
																			}
																			onClick={
																				handleCancelEdit
																			}
																			title="Cancel"
																			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
																		>

																			<X
																				size={
																					18
																				}
																				strokeWidth={
																					2.5
																				}
																			/>

																		</button>

																	</>

																) : (

																	<>

																		{/* Edit */}

																		<button
																			type="button"
																			onClick={() =>
																				handleEditDistrict(
																					district
																				)
																			}
																			title="Edit District"
																			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
																		>

																			<Pencil
																				size={
																					17
																				}
																				strokeWidth={
																					2
																				}
																			/>

																		</button>


																		{/* Delete */}

																		<button
																			type="button"
																			onClick={() =>
																				handleDeleteDistrict(
																					district
																				)
																			}
																			title="Delete District"
																			className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
																		>

																			<Trash2
																				size={
																					17
																				}
																				strokeWidth={
																					2
																				}
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
												No districts found.
											</td>

										</tr>

									)}

								</tbody>

							</table>

						</div>
					)}

			</div>


			{/* =====================================================
			    Delete Confirmation Modal
			====================================================== */}

			{deleteModal.open && (

				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">

					<div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

						{/* Modal Content */}

						<div className="p-6">

							<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">

								<Trash2
									size={28}
									strokeWidth={2}
									className="text-red-600"
								/>

							</div>


							<h3 className="mt-5 text-center text-lg font-semibold text-gray-900">
								Delete District?
							</h3>


							<p className="mt-2 text-center text-sm leading-6 text-gray-500">

								Are you sure you want to delete{" "}

								<span className="font-semibold text-gray-800">
									"{deleteModal.district?.name}"
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
								onClick={() => {

									if (
										deletingDistrict
									) {
										return;
									}

									setDeleteModal({
										open: false,
										district: null,
									});

								}}
								disabled={
									deletingDistrict
								}
								className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Cancel
							</button>


							<button
								type="button"
								onClick={
									handleConfirmDelete
								}
								disabled={
									deletingDistrict
								}
								className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
							>

								<Trash2
									size={17}
									strokeWidth={2}
								/>

								{deletingDistrict
									? "Deleting..."
									: "Delete District"}

							</button>

						</div>

					</div>

				</div>

			)}

		</div>
	);
}

export default DistrictLocation;