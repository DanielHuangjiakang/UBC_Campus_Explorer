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
import QueryValidator, { Query } from "./QueryValidator"; // Import Query interface
import QueryExecutor from "./QueryExecutor";
import JSZip from "jszip";

export default class InsightFacade implements IInsightFacade {
	private datasetManager: DatasetManager;
	private initialized: boolean; // Flag to track initialization
	private queryValidator: QueryValidator;
	private queryExecutor: QueryExecutor;

	constructor() {
		this.datasetManager = new DatasetManager();
		this.initialized = false; // Ensure initialization flag is set to false initially
		this.queryExecutor = new QueryExecutor(this.datasetManager);
		this.queryValidator = new QueryValidator();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// Validate dataset ID and kind
		await this.datasetManager.validateID(id);
		await this.datasetManager.idExisted(id); // Check if the ID already exists
		await this.datasetManager.validateKind(kind);

		const zip = new JSZip();
		try {
			// Initialize dataset manager if not already initialized
			if (!this.initialized) {
				await this.datasetManager.initialize();
				this.initialized = true; // Set initialized to true after successful initialization
			}

			const unzipped = await zip.loadAsync(content, { base64: true });
			const folderName = "courses/";
			const courseFolder = unzipped.folder(folderName);

			if (courseFolder === null) {
				throw new InsightError("No courses folder exists");
			}

			// Parse sections from the course folder
			const parsedSections = await this.datasetManager.parseJson(courseFolder);
			const rowNum = parsedSections.length;
			if (rowNum === 0) {
				throw new InsightError("No valid sections found in dataset");
			}

			// Write the dataset to disk and update internal maps
			await this.datasetManager.writeDatasetToZip(id, kind, rowNum, unzipped);
			this.datasetManager.setDatasetMaps(id, kind, parsedSections);
		} catch (err) {
			// Log error for debugging and throw a general error
			console.error(`Failed to add dataset: ${err}`);
			throw new InsightError("Failed to add dataset");
		}

		return this.datasetManager.getDatasetIDs(); // Return the list of dataset IDs
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Initialize dataset manager if not already initialized
		if (!this.initialized) {
			await this.datasetManager.initialize();
			this.initialized = true;
		}

		try {
			// Validate the query structure
			if (!this.queryValidator.checkValidEBNF(query)) {
				throw new InsightError("Invalid query format");
			}

			// At this point, we can assert that query is of type Query
			const queryObj = query as Query;

			// Ensure the query references exactly one dataset
			if (!this.queryValidator.referencesSingleDataset(queryObj)) {
				throw new InsightError("Query must reference exactly one dataset.");
			}

			// Check if the required dataset exists
			const availableDatasets = this.datasetManager.getDatasets();
			const datasetId = this.queryValidator.getDatasetIdFromQuery(queryObj);
			if (!availableDatasets.has(datasetId)) {
				throw new InsightError(`Dataset with id "${datasetId}" does not exist.`);
			}

			// Execute the query using QueryExecutor
			const results = await this.queryExecutor.executeQuery(queryObj);

			// Ensure that the result set is within the acceptable size
			const maxLength = 5000;
			if (results.length > maxLength) {
				throw new ResultTooLargeError();
			}

			return results; // Return the query results
		} catch (err) {
			if (err instanceof InsightError || err instanceof ResultTooLargeError) {
				throw err;
			} else {
				throw new InsightError("Failed to perform query");
			}
		}
	}

	public async removeDataset(id: string): Promise<string> {
		// Initialize dataset manager if not already initialized
		if (!this.initialized) {
			await this.datasetManager.initialize();
			this.initialized = true;
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
		if (!this.initialized) {
			await this.datasetManager.initialize();
			this.initialized = true;
		}

		// Return the list of available datasets
		return this.datasetManager.getInsightDataset();
	}
}
