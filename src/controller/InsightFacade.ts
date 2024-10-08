
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError,
} from "./IInsightFacade";
import DatasetManager from "./DatasetManager";
import QueryValidator from "./QueryValidator";
import JSZip from "jszip";

export default class InsightFacade implements IInsightFacade {
	private datasetManager: DatasetManager;

	constructor() {
		this.datasetManager = new DatasetManager();

	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await this.datasetManager.validateID(id);
		await this.datasetManager.validateKind(kind);

		const zip = new JSZip();
		try {
			// if (this.initialized === false){
			//  await this.datasetManager.initialize();
			//  this.initialized = true;
			// }
			await this.datasetManager.initialize();
			const unzipped = await zip.loadAsync(content, { base64: true });
			const folderName = "courses/";
			const courseFolder = unzipped.folder(folderName);

			if (courseFolder === null) {
				throw new InsightError("No courses folder exists");
			}

			const parsedSections = await this.datasetManager.parseJson(courseFolder);
			if (parsedSections.length === 0) {
				throw new InsightError();
			}

			await this.datasetManager.writeDatasetToZip(id, unzipped);
			this.datasetManager.setDatasetSections(id, parsedSections);
		} catch (_) {
			throw new InsightError();
		}

		return this.datasetManager.getDatasetIDs();
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Check if it is valid for EBNF
		const queryValidator = new QueryValidator();
		if (!queryValidator.checkValidEBNF(query)) {
			throw new InsightError("Invalid query format");
		}

		// Check if references exactly one dataset in its query keys.
		if (!queryValidator.referencesSingleDataset(query)) {
			throw new InsightError("Query must reference exactly one dataset.");
		}

		// Execute query and get results
		// const queryExecutor = new QueryExecutor(this.datasetManager.getDatasets());
		// const results = await queryExecutor.executeQuery(query);

		// Less than or equal to 5000 results.
		if ([].length > 1) {
			throw new ResultTooLargeError("Query returned too many results");
		}

		// Return the valid results
		return [];
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
