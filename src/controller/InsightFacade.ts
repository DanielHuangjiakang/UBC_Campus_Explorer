import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError,
	NotFoundError,
} from "./IInsightFacade";
import DatasetManager from "./DatasetManager";
import QueryChecker, { Query } from "./QueryChecker"; // Import Query interface
import SectionQueryRunner from "./SectionQueryRunner";
import JSZip from "jszip";
import QuerySingleIdChecker from "./QuerySingleIdChecker";
import RoomQueryRunner from "./RoomQueryRunner";

export default class InsightFacade implements IInsightFacade {
	private datasetManager: DatasetManager;
	private isInitialized: boolean; // Flag to track if initialization has been completed
	private queryChecker: QueryChecker;
	private sectionQueryRunner: SectionQueryRunner;
	private querySingleIdChecker: QuerySingleIdChecker;
	private roomQueryRunner: RoomQueryRunner;

	constructor() {
		this.datasetManager = new DatasetManager();
		this.isInitialized = false; // Ensure the initialized flag is set to false initially
		this.sectionQueryRunner = new SectionQueryRunner(this.datasetManager);
		this.roomQueryRunner = new RoomQueryRunner(this.datasetManager);
		this.queryChecker = new QueryChecker();
		this.querySingleIdChecker = new QuerySingleIdChecker();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Validate dataset ID and kind
		await this.datasetManager.validateID(id);
		await this.datasetManager.idExisted(id); // Check if the ID already exists
		await this.datasetManager.validateKind(kind);
		try {
			// Initialize dataset manager if not already initialized
			if (!this.isInitialized) {
				await this.datasetManager.initialize();
				this.isInitialized = true; // Set initialized to true after successful initialization
			}
			const unzipped = await new JSZip().loadAsync(content, { base64: true });
			let parsedEntries: any[];

			if (kind === InsightDatasetKind.Sections) {
				// const folderName = "courses/";
				// const courseFolder = unzipped.folder(folderName);
				// if (courseFolder === null) {
				// 	throw new InsightError("No courses folder exists");
				// }
				// // Parse sections from the course folder
				// parsedEntries = await this.datasetManager.parseSectionsJson(courseFolder);
				parsedEntries = await this.datasetManager.parseSections(unzipped);
			} else {
				// kind === InsightDatasetKind.Rooms
				// const indexFile = Object.values(unzipped.files).find(file => file.name.endsWith('index.htm'));
				// if (!indexFile) {
				// 	throw new InsightError("No index.htm file exists");
				// }
				// // Extract the folder path correctly
				// const folderPath = indexFile.name.substring(0, indexFile.name.lastIndexOf('/') + 1);
				// // Get the folder JSZip object
				// const folder = unzipped.folder(folderPath);
				// if (!folder) {
				// 	throw new InsightError(`Folder not found: ${folderPath}`);
				// }
				// // Parse the rooms HTML
				// parsedEntries = await this.datasetManager.parseRoomsHTML(folder, indexFile);
				parsedEntries = await this.datasetManager.parseRooms(unzipped);
			}
			if (parsedEntries.length === 0) {
				throw new InsightError("No valid sections found in dataset");
			}
			// Write the dataset to disk and update internal maps
			await this.datasetManager.writeDatasetToZip(id, kind, parsedEntries.length, unzipped);
			this.datasetManager.setDatasetMaps(id, kind, parsedEntries);
			// this.datasetManager.printEntries();//to do
		} catch (_) {
			// Log error for debugging and throw a general error
			//  console.error(`Failed to add dataset: ${err}`);
			throw new InsightError("Failed to add dataset");
			// throw err;
		}

		return this.datasetManager.getDatasetIDs(); // Return the list of dataset IDs
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Initialize the dataset manager if it hasn't been initialized yet
		if (!this.isInitialized) {
			await this.datasetManager.initialize();
			this.isInitialized = true;
		}

		try {
			// Validate the query structure using the query validator
			if (!this.queryChecker.validateQueryFormat(query)) {
				throw new InsightError("Invalid query format");
			}

			// Assert that the query is of type Query at this point
			const queryObject = query as Query;

			// Ensure the query references exactly one dataset
			if (!this.querySingleIdChecker.checkSingleDataset(queryObject)) {
				throw new InsightError("Query must reference exactly one dataset.");
			}

			// Retrieve available datasets and check if the required dataset exists
			const datasetMap = this.datasetManager.getDatasets();
			const datasetId = this.queryChecker.extractDatasetId(queryObject);
			if (!datasetMap.has(datasetId)) {
				throw new InsightError(`Dataset with id "${datasetId}" does not exist.`);
			}

			const datasetKind = this.datasetManager.getKind(datasetId);

			// Ensure the dataset is of the correct kind
			if (datasetKind !== InsightDatasetKind.Sections && datasetKind !== InsightDatasetKind.Rooms) {
				throw new InsightError(`Invalid dataset kind for dataset id ${datasetId}`);
			}

			// Select the appropriate query runner based on the dataset kind
			const queryRunner = datasetKind === InsightDatasetKind.Sections ?
				this.sectionQueryRunner : this.roomQueryRunner;

			// Execute the query using the selected query runner
			const queryResults = await queryRunner.execute(queryObject);

			// Ensure that the result set is within the acceptable size limit
			const maxResults = 5000;
			if (queryResults.length > maxResults) {
				throw new ResultTooLargeError();
			}


			return queryResults; // Return the query results
		} catch (error) {
			if (error instanceof InsightError || error instanceof ResultTooLargeError) {
				throw error;
			} else {
				throw new InsightError("Failed to perform query");
			}
		}
	}

	public async removeDataset(id: string): Promise<string> {
		// Initialize dataset manager if not already initialized
		if (!this.isInitialized) {
			await this.datasetManager.initialize();
			this.isInitialized = true;
		}

		// Validate the dataset ID
		await this.datasetManager.validateID(id);

		try {
			// Check if the dataset exists before removing
			await this.datasetManager.idExisted(id);
			return Promise.reject(new NotFoundError());
		} catch (_) {
			// Remove dataset from disk and internal maps
			await this.datasetManager.removeDatasetFromFacadeAndDisk(id);
		}

		return Promise.resolve(id); // Return the removed dataset ID
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// Initialize dataset manager if not already initialized
		if (!this.isInitialized) {
			await this.datasetManager.initialize();
			this.isInitialized = true;
		}

		// Return the list of available datasets
		// console.log(this.datasetManager.getInsightDataset());
		return this.datasetManager.getInsightDataset();
	}
}
