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
import QueryExecutor from "./QueryExecutor";

export default class InsightFacade implements IInsightFacade {
	private datasetManager: DatasetManager;

	constructor() {
		this.datasetManager = new DatasetManager();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		return this.datasetManager.addDataset(id, content, kind);
	}

	public async removeDataset(id: string): Promise<string> {
		return this.datasetManager.removeDataset(id);
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
		const queryExecutor = new QueryExecutor(this.datasetManager.getDatasetsSections());
		const results = await queryExecutor.executeQuery(query);

		// Less than or equal to 5000 results.
		if (results.length > 1) {
			throw new ResultTooLargeError("Query returned too many results");
		}

		// Return the valid results
		return results;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return this.datasetManager.listDatasets();
	}
}
