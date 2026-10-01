import React, { useEffect, useState } from "react";

import {
	MapContainer,
	Marker,
	Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import DistrictLayer from "../../components/map/DistrictLayer";
import SubdivisionLayer from "../../components/map/SubDivisionLayer";
import BlocksLayer from "../../components/map/BlocksLayer";

import { WEST_BENGAL_BOUNDS } from "../../constants/mapBounds";

import {
	Pencil,
	Trash2,
	Check,
	X,
} from "lucide-react";
import { createBlock, deleteBlock, listBlocks, updateBlock } from "../../services/blockService";
import { listDistricts, listSubdivisions } from "../../services";


function BlocksLocation() {

	/*
	|--------------------------------------------------------------------------
	| Form
	|--------------------------------------------------------------------------
	*/

	const [form, setForm] = useState({
		district_id: "",
		district: "",

		subdivision_id: "",
		subdivision: "",

		name: "",
		address: "",
		latitude: "",
		longitude: "",
	});


	/*
	|--------------------------------------------------------------------------
	| Database Block List
	|--------------------------------------------------------------------------
	*/

	const [blocks, setBlocks] = useState([]);

	const [loadingBlocks, setLoadingBlocks] =
		useState(false);

	const [savingBlock, setSavingBlock] =
		useState(false);


	/*
	|--------------------------------------------------------------------------
	| Edit State
	|--------------------------------------------------------------------------
	*/

	const [editingBlockId, setEditingBlockId] =
		useState(null);

	const [editForm, setEditForm] = useState({
		name: "",
		address: "",
	});

	const [updatingBlock, setUpdatingBlock] =
		useState(false);


	/*
	|--------------------------------------------------------------------------
	| Delete State
	|--------------------------------------------------------------------------
	*/

	const [deleteModal, setDeleteModal] =
		useState({
			open: false,
			block: null,
		});

	const [deletingBlock, setDeletingBlock] =
		useState(false);


	/*
	|--------------------------------------------------------------------------
	| Map State
	|--------------------------------------------------------------------------
	*/

	const [position, setPosition] =
		useState(null);

	const [selectedDistrict, setSelectedDistrict] =
		useState(null);

	const [selectedSubdivision, setSelectedSubdivision] =
		useState(null);

	const [selectedBlock, setSelectedBlock] =
		useState(null);

	const [subdivisions, setSubdivisions] = useState([]);
	const [districts, setDistricts] = useState([]);

	/*
	|--------------------------------------------------------------------------
	| Load Blocks
	|--------------------------------------------------------------------------
	*/

	const loadBlocks = async () => {

		try {

			setLoadingBlocks(true);

			const response =
				await listBlocks();

			if (response?.success) {

				setBlocks(
					response.data || []
				);

			} else {

				console.error(
					response?.message ||
					"Failed to load blocks."
				);

				setBlocks([]);

			}

		} catch (error) {

			console.error(
				"Load blocks error:",
				error
			);

			setBlocks([]);

		} finally {

			setLoadingBlocks(false);

		}

	};


	useEffect(() => {

		loadBlocks();

	}, []);

	const loadSubdivisions = async () => {

		try {

			const response =
				await listSubdivisions();

			if (response?.success) {

				setSubdivisions(
					response.data || []
				);

			}

		} catch (error) {

			console.error(
				"Load subdivisions error:",
				error
			);

		}

	};

	const loadDistricts = async () => {
		try {
			const response = await listDistricts();

			if (response?.success) {
				setDistricts(response.data || []);
			}
		} catch (error) {
			console.error("Load districts error:", error);
		}
	};

	useEffect(() => {
		loadDistricts();
		loadSubdivisions();

	}, []);

	/*
	|--------------------------------------------------------------------------
	| Form Change
	|--------------------------------------------------------------------------
	*/

	const handleChange = (event) => {

		const {
			name,
			value,
		} = event.target;

		setForm((previous) => ({
			...previous,
			[name]: value,
		}));

	};


	/*
	|--------------------------------------------------------------------------
	| District Selection
	|--------------------------------------------------------------------------
	*/

	const handleDistrictSelect = (
		district
	) => {

		console.log(
			"Selected district:",
			district
		);


		setSelectedDistrict(
			district
		);

		setSelectedSubdivision(
			null
		);

		setSelectedBlock(
			null
		);

		setPosition(
			null
		);


		setForm((previous) => ({

			...previous,

			/*
			 * DATABASE district ID
			 */

			district_id:
				district.id || "",

			district:
				district.name || "",

			subdivision_id:
				"",

			subdivision:
				"",

			name:
				"",

			address:
				"",

			latitude:
				"",

			longitude:
				"",

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

		setSelectedBlock(
			null
		);

		setPosition(
			null
		);


		setForm((previous) => ({

			...previous,

			/*
			 * DATABASE district ID
			 */

			district_id:
				selectedDistrict?.id ||
				"",

			district:
				selectedDistrict?.name ||
				subdivision.districtName ||
				"",

			/*
			 * IMPORTANT:
			 *
			 * If subdivision.id is currently
			 * GeoJSON ID, this will be changed
			 * once SubdivisionLayer is mapped
			 * to the database subdivision.
			 */

			subdivision_id:
				subdivision.id ||
				"",

			subdivision:
				subdivision.name ||
				"",

			name:
				"",

			address:
				"",

			latitude:
				"",

			longitude:
				"",

		}));

	};


	/*
	|--------------------------------------------------------------------------
	| Block Selection From Map
	|--------------------------------------------------------------------------
	*/

	const handleBlockSelect = (
		block
	) => {

		console.log(
			"Selected block from map:",
			block
		);


		/*
		 * Find corresponding DB block.
		 *
		 * BlocksLayer should eventually
		 * provide databaseBlockId directly.
		 */

		const databaseBlock =
			blocks.find(
				(item) => {

					/*
					 * First preference:
					 * database ID already attached
					 */

					if (
						block.databaseBlockId &&
						Number(item.id) ===
						Number(
							block.databaseBlockId
						)
					) {
						return true;
					}


					/*
					 * Fallback:
					 *
					 * Match using:
					 * district
					 * subdivision
					 * block name
					 */

					return (
						Number(
							item.district_id
						) ===
						Number(
							selectedDistrict?.id
						) &&

						Number(
							item.subdivision_id
						) ===
						Number(
							selectedSubdivision?.id
						) &&

						String(
							item.name
						).trim().toLowerCase() ===
						String(
							block.name
						).trim().toLowerCase()
					);

				}
			);


		console.log(
			"Matching database block:",
			databaseBlock
		);


		/*
		 * Keep selected block.
		 *
		 * Database ID becomes the main ID.
		 */

		const finalBlock = {

			...block,

			id:
				databaseBlock?.id ||
				block.databaseBlockId ||
				null,

			databaseBlockId:
				databaseBlock?.id ||
				block.databaseBlockId ||
				null,

			databaseBlock,

		};


		setSelectedBlock(
			finalBlock
		);


		/*
		 * Update form
		 */

		setForm((previous) => ({

			...previous,

			district_id:
				selectedDistrict?.id ||
				"",

			district:
				selectedDistrict?.name ||
				block.districtName ||
				"",

			subdivision_id:
				databaseBlock?.subdivision_id ||
				selectedSubdivision?.id ||
				"",

			subdivision:
				databaseBlock?.subdivision_name ||
				selectedSubdivision?.name ||
				block.subdivisionName ||
				"",

			name:
				databaseBlock?.name ||
				block.name ||
				"",

			address:
				databaseBlock?.address ||
				"",

			latitude:
				block.latitude != null
					? block.latitude.toFixed(6)
					: "",

			longitude:
				block.longitude != null
					? block.longitude.toFixed(6)
					: "",

		}));


		/*
		 * Exact clicked position
		 */

		if (
			block.latitude != null &&
			block.longitude != null
		) {

			setPosition({

				lat:
					block.latitude,

				lng:
					block.longitude,

			});

		} else {

			setPosition(null);

		}

	};


	/*
	|--------------------------------------------------------------------------
	| Create Block
	|--------------------------------------------------------------------------
	*/

	const handleSubmit = async (
		event
	) => {

		event.preventDefault();


		if (
			!selectedDistrict ||
			!selectedSubdivision ||
			!selectedBlock
		) {

			alert(
				"Please select district, subdivision and block from the map."
			);

			return;

		}


		try {

			setSavingBlock(true);


			const payload = {

				/*
				 * DATABASE IDs
				 */

				district_id:
					form.district_id,

				subdivision_id:
					form.subdivision_id,

				name:
					form.name.trim(),

				address:
					form.address.trim(),

				latitude:
					form.latitude,

				longitude:
					form.longitude,

			};


			console.log(
				"Create block payload:",
				payload
			);


			const response =
				await createBlock(
					payload
				);


			if (
				response?.success
			) {

				alert(
					"Block created successfully."
				);


				await loadBlocks();


				/*
				 * Reset only block-specific
				 * selection.
				 */

				setSelectedBlock(
					null
				);

				setPosition(
					null
				);

				setForm((previous) => ({

					...previous,

					name: "",
					address: "",
					latitude: "",
					longitude: "",

				}));

			} else {

				alert(
					response?.message ||
					"Failed to create block."
				);

			}

		} catch (error) {

			console.error(
				"Create block error:",
				error
			);

			alert(
				error?.message ||
				"Unable to create block."
			);

		} finally {

			setSavingBlock(false);

		}

	};


	/*
	|--------------------------------------------------------------------------
	| Edit Block
	|--------------------------------------------------------------------------
	*/

	const handleEditBlock = (
		block
	) => {

		setEditingBlockId(
			block.id
		);


		setEditForm({

			name:
				block.name || "",

			address:
				block.address || "",

		});

	};


	/*
	|--------------------------------------------------------------------------
	| Cancel Edit
	|--------------------------------------------------------------------------
	*/

	const handleCancelEdit = () => {

		setEditingBlockId(
			null
		);

		setEditForm({

			name: "",

			address: "",

		});

	};


	/*
	|--------------------------------------------------------------------------
	| Edit Form Change
	|--------------------------------------------------------------------------
	*/

	const handleEditChange = (
		event
	) => {

		const {
			name,
			value,
		} = event.target;


		setEditForm((previous) => ({

			...previous,

			[name]:
				value,

		}));

	};


	/*
	|--------------------------------------------------------------------------
	| Update Block
	|--------------------------------------------------------------------------
	*/

	const handleUpdateBlock = async (
		blockId
	) => {

		try {

			setUpdatingBlock(
				true
			);


			const payload = {

				name:
					editForm.name.trim(),

				address:
					editForm.address.trim(),

			};


			const response =
				await updateBlock(
					blockId,
					payload
				);


			if (
				response?.success
			) {

				alert(
					"Block updated successfully."
				);


				await loadBlocks();


				handleCancelEdit();

			} else {

				alert(
					response?.message ||
					"Failed to update block."
				);

			}

		} catch (error) {

			console.error(
				"Update block error:",
				error
			);

			alert(
				"Unable to update block."
			);

		} finally {

			setUpdatingBlock(
				false
			);

		}

	};


	/*
	|--------------------------------------------------------------------------
	| Delete Block
	|--------------------------------------------------------------------------
	*/

	const handleDeleteBlock = (
		block
	) => {

		setDeleteModal({

			open: true,

			block,

		});

	};


	/*
	|--------------------------------------------------------------------------
	| Confirm Delete
	|--------------------------------------------------------------------------
	*/

	const handleConfirmDelete = async () => {

		const block =
			deleteModal.block;


		if (!block) {
			return;
		}


		try {

			setDeletingBlock(
				true
			);


			const response =
				await deleteBlock(
					block.id
				);


			if (
				response?.success
			) {

				setDeleteModal({

					open: false,

					block: null,

				});


				/*
				 * If deleted block is currently
				 * selected on map, clear it.
				 */

				if (
					selectedBlock?.id ===
					block.id
				) {

					setSelectedBlock(
						null
					);

					setPosition(
						null
					);

				}


				await loadBlocks();


				alert(
					"Block deleted successfully."
				);

			} else {

				alert(
					response?.message ||
					"Failed to delete block."
				);

			}

		} catch (error) {

			console.error(
				"Delete block error:",
				error
			);

			alert(
				error?.message ||
				"Unable to delete block."
			);

		} finally {

			setDeletingBlock(
				false
			);

		}

	};


	return (

		<div className="relative min-h-screen w-full bg-gray-50 p-6">


			{/* =====================================================
                HEADER
            ====================================================== */}

			<div className="relative z-20 mb-6">

				<h1 className="text-2xl font-semibold text-gray-800">
					Block Location
				</h1>

				<p className="mt-1 text-sm text-gray-500">
					Add and manage block location information.
				</p>

			</div>


			{/* =====================================================
                FORM + MAP
            ====================================================== */}

			<div className="relative z-0 grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">


				{/* =================================================
                    FORM
                ================================================== */}

				<div className="relative z-0 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

					<h2 className="mb-6 text-lg font-semibold text-gray-800">
						Block Details
					</h2>


					<form
						onSubmit={handleSubmit}
						className="space-y-5"
					>


						{/* DISTRICT */}

						<div>

							<label className="mb-1 block text-sm font-medium text-gray-700">
								District
							</label>

							<input
								type="text"
								value={form.district}
								readOnly
								placeholder="Select district from map"
								className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
							/>

						</div>


						{/* SUBDIVISION */}

						<div>

							<label className="mb-1 block text-sm font-medium text-gray-700">
								Subdivision
							</label>

							<input
								type="text"
								value={form.subdivision}
								readOnly
								placeholder="Select subdivision from map"
								className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
							/>

						</div>


						{/* BLOCK */}

						<div>

							<label className="mb-1 block text-sm font-medium text-gray-700">
								Block Name
							</label>

							<input
								type="text"
								value={form.name}
								readOnly
								placeholder="Select block from map"
								className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
							/>

						</div>


						{/* ADDRESS */}

						<div>

							<label className="mb-1 block text-sm font-medium text-gray-700">
								Address
							</label>

							<textarea
								name="address"
								value={form.address}
								onChange={handleChange}
								rows={3}
								placeholder="Block address"
								className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
							/>

						</div>


						{/* LATITUDE */}

						<div>

							<label className="mb-1 block text-sm font-medium text-gray-700">
								Latitude
							</label>

							<input
								type="text"
								value={form.latitude}
								readOnly
								className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
							/>

						</div>


						{/* LONGITUDE */}

						<div>

							<label className="mb-1 block text-sm font-medium text-gray-700">
								Longitude
							</label>

							<input
								type="text"
								value={form.longitude}
								readOnly
								className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none"
							/>

						</div>


						{/* SUBMIT */}

						<button
							type="submit"
							disabled={
								savingBlock ||
								!selectedDistrict ||
								!selectedSubdivision ||
								!selectedBlock
							}
							className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>

							{savingBlock
								? "Saving..."
								: "Save Block"}

						</button>

					</form>

				</div>


				{/* =================================================
                    MAP
                ================================================== */}

				<div className="relative z-0 isolate overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">


					<div className="relative z-20 border-b border-gray-200 px-5 py-4">

						<h2 className="text-lg font-semibold text-gray-800">
							Block Map
						</h2>

						<p className="mt-1 text-sm text-gray-500">
							Select a district first, then select a subdivision, and finally click a block.
						</p>

					</div>


					<div className="relative z-0 h-[600px] w-full">

						<MapContainer
							center={[
								22.5726,
								88.3639,
							]}
							zoom={7}
							minZoom={6.5}
							maxZoom={12}
							maxBounds={
								WEST_BENGAL_BOUNDS
							}
							maxBoundsViscosity={1.0}
							scrollWheelZoom={true}
							className="h-full w-full"
						>

							<DistrictLayer
								selectedDistrict={
									selectedDistrict
								}
								databaseDistricts={districts}
								requireDatabaseDistrict={true}
								onDistrictSelect={
									handleDistrictSelect
								}
							/>

							{selectedDistrict && (

								<SubdivisionLayer
									selectedDistrict={
										selectedDistrict
									}
									databaseDistricts={districts}
									databaseSubdivisions={subdivisions}
									requireDatabaseDistrict={true}
									requireDatabaseSubdivision={true}
									onSubdivisionSelect={
										handleSubdivisionSelect
									}
								/>

							)}

							{selectedDistrict &&
								selectedSubdivision && (

									<BlocksLayer
										selectedDistrict={selectedDistrict}
										selectedSubdivision={selectedSubdivision}
										databaseBlocks={blocks}
										onBlockSelect={handleBlockSelect}
									/>

								)}


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
												Subdivision:{" "}
												{form.subdivision}
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


					{/* COORDINATES */}

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
                BLOCK TABLE
            ====================================================== */}

			<div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">

				<div className="border-b border-gray-200 px-5 py-4">

					<h2 className="text-lg font-semibold text-gray-800">
						Block List
					</h2>

					<p className="mt-1 text-sm text-gray-500">
						Manage blocks stored in the database.
					</p>

				</div>


				<div className="overflow-x-auto">

					<table className="w-full text-left text-sm">

						<thead className="bg-gray-50 text-xs uppercase text-gray-500">

							<tr>

								<th className="px-5 py-3">
									ID
								</th>

								<th className="px-5 py-3">
									District
								</th>

								<th className="px-5 py-3">
									Subdivision
								</th>

								<th className="px-5 py-3">
									Block
								</th>

								<th className="px-5 py-3">
									Address
								</th>

								<th className="px-5 py-3">
									Latitude
								</th>

								<th className="px-5 py-3">
									Longitude
								</th>

								<th className="px-5 py-3 text-center">
									Action
								</th>

							</tr>

						</thead>


						<tbody className="divide-y divide-gray-100">

							{loadingBlocks ? (

								<tr>

									<td
										colSpan={8}
										className="px-5 py-8 text-center text-gray-500"
									>
										Loading blocks...
									</td>

								</tr>

							) : blocks.length === 0 ? (

								<tr>

									<td
										colSpan={8}
										className="px-5 py-8 text-center text-gray-500"
									>
										No blocks found.
									</td>

								</tr>

							) : (

								blocks.map((block) => (

									<tr
										key={block.id}
										className="hover:bg-gray-50"
									>

										<td className="px-5 py-3 font-medium text-gray-800">
											{block.id}
										</td>


										<td className="px-5 py-3 text-gray-700">
											{block.district_name}
										</td>


										<td className="px-5 py-3 text-gray-700">
											{block.subdivision_name}
										</td>


										<td className="px-5 py-3 text-gray-700">

											{editingBlockId ===
												block.id ? (

												<input
													type="text"
													name="name"
													value={
														editForm.name
													}
													onChange={
														handleEditChange
													}
													className="w-full rounded border border-gray-300 px-2 py-1"
												/>

											) : (

												block.name

											)}

										</td>


										<td className="px-5 py-3 text-gray-700">

											{editingBlockId ===
												block.id ? (

												<input
													type="text"
													name="address"
													value={
														editForm.address
													}
													onChange={
														handleEditChange
													}
													className="w-full min-w-[220px] rounded border border-gray-300 px-2 py-1"
												/>

											) : (

												block.address || "--"

											)}

										</td>


										<td className="px-5 py-3 text-gray-700">
											{block.latitude}
										</td>


										<td className="px-5 py-3 text-gray-700">
											{block.longitude}
										</td>


										<td className="px-5 py-3">

											<div className="flex items-center justify-center gap-2">

												{editingBlockId ===
													block.id ? (

													<>

														<button
															type="button"
															onClick={() =>
																handleUpdateBlock(
																	block.id
																)
															}
															disabled={
																updatingBlock
															}
															className="rounded-lg p-2 text-green-600 hover:bg-green-50 disabled:opacity-50"
															title="Save"
														>

															<Check
																size={17}
															/>

														</button>


														<button
															type="button"
															onClick={
																handleCancelEdit
															}
															className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
															title="Cancel"
														>

															<X
																size={17}
															/>

														</button>

													</>

												) : (

													<>

														<button
															type="button"
															onClick={() =>
																handleEditBlock(
																	block
																)
															}
															className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
															title="Edit"
														>

															<Pencil
																size={17}
															/>

														</button>


														<button
															type="button"
															onClick={() =>
																handleDeleteBlock(
																	block
																)
															}
															className="rounded-lg p-2 text-red-600 hover:bg-red-50"
															title="Delete"
														>

															<Trash2
																size={17}
															/>

														</button>

													</>

												)}

											</div>

										</td>

									</tr>

								))

							)}

						</tbody>

					</table>

				</div>

			</div>


			{/* =====================================================
                DELETE MODAL
            ====================================================== */}

			{deleteModal.open && (

				<div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">

					<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

						<div className="flex items-start gap-4">

							<div className="rounded-full bg-red-100 p-3">

								<Trash2
									size={22}
									className="text-red-600"
								/>

							</div>


							<div>

								<h3 className="text-lg font-semibold text-gray-800">
									Delete Block
								</h3>

								<p className="mt-1 text-sm text-gray-500">
									Are you sure you want to delete{" "}
									<span className="font-medium text-gray-800">
										{deleteModal.block?.name}
									</span>
									?
								</p>

							</div>

						</div>


						<div className="mt-6 flex justify-end gap-3">

							<button
								type="button"
								onClick={() =>
									setDeleteModal({
										open: false,
										block: null,
									})
								}
								disabled={
									deletingBlock
								}
								className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
							>
								Cancel
							</button>


							<button
								type="button"
								onClick={
									handleConfirmDelete
								}
								disabled={
									deletingBlock
								}
								className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
							>

								{deletingBlock
									? "Deleting..."
									: "Delete"}

							</button>

						</div>

					</div>

				</div>

			)}

		</div>

	);

}


export default BlocksLocation;