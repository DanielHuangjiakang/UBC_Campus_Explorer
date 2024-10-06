import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError
} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(
			`InsightFacadeImpl::addDataset() is unimplemented! - id=${id}; content=${content?.length}; kind=${kind}`
		);
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}








	/**
	 * Perform a query on insightUBC.
	 *
	 * @param query  The query to be performed.
	 *
	 * If a query is incorrectly formatted, references a dataset not added (in memory or on disk),
	 * or references multiple datasets, it should be rejected.
	 *
	 * @return Promise <InsightResult[]>
	 *
	 * The promise should fulfill with an array of results.
	 * The promise should reject with a ResultTooLargeError (if the query returns too many results)
	 * or an InsightError (for any other source of failure) describing the error.
	 */
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Check if it is valid for EBNF
		if (!this.checkValidEBNF(query)) {
			throw new InsightError("Invalid query format");
		}

		// Check if references exactly one dataset in its query keys.
		if (!this.referencesSingleDataset(query)) {
			throw new InsightError("Query must reference exactly one dataset.");
		}
		
		// TODO: Execute query and get results
		const results = this.executeQuery(query);

		// TODO: Less than or equal to 5000 results. If this limit is exceeded, reject with a ResultTooLargeError
		if ((await results).length > 1) {
			throw new ResultTooLargeError("Query returned too many results");
		}

		// Return the valid results
		return Promise.resolve(results);


		return [];
	}

	// Helper function to check if it is valid EBNF
	private checkValidEBNF(query: unknown): boolean {
		// Null or Undefined Query
		if (query === null || query === undefined || typeof query !== "object") {
			return false;
		}

		// Check if WHERE exists in the query
		if (!("WHERE" in query)) {
			throw new InsightError("Missing WHERE clause");
		}

		// Check if the format inside WHERE is valid
		if (!this.isValidWhereClause(query.WHERE)) {
			return false;
		}

		// Check if OPTIONS exists in the query
		if (!("OPTIONS" in query)) {
			throw new InsightError("Missing OPTIONS clause");
		}

		// Check if OPTIONS format is valid
		if (!this.isValidOptionsClause(query.OPTIONS)) {
			return false;
		}

		return true;
	}

	// Helper function to check if it is valid format in WHERE
	private isValidWhereClause(WHERE: any): boolean {
		// WHERE can be an empty object
		if (Object.keys(WHERE).length === 0) {
			return true;
		}

		// Check if WHERE clause contains a valid filter
		if (!this.isValidFilter(WHERE)) {
			return false;
		}

		return true;
	}

	private isValidFilter(filter: any): Boolean {
		if (typeof filter !== "object" || filter === null) {
			return false;
		}

		// Check for LOGICCOMPARISON: AND / OR
		if ("AND" in filter || "OR" in filter) {
			const logic = filter.AND || filter.OR;
			if (!Array.isArray(logic) || logic.length === 0) {
				throw new InsightError("LOGIC must be a non-empty array");
			}
			// Recursively check each filter in the FILTER_LIST
			return logic.every((f: any) => this.isValidFilter(f));
		}

		// Check for MCOMPARISON: GT / LT / EQ
		if ("GT" in filter || "LT" in filter || "EQ" in filter) {
			return this.isValidMComparison(filter.GT || filter.LT || filter.EQ);
		}

		// Check for SCOMPARISON: IS
		if ("IS" in filter) {
			return this.isValidSComparison(filter.IS);
		}

		return false;
	}

	private isValidMComparison(mcomp: any): Boolean {
		if (typeof mcomp !== "object" || mcomp === null) {
			throw new InsightError("MCOMPARISON must be a valid object");
		}

		const validMKeys = ["avg", "pass", "fail", "audit", "year"];
		const key = Object.keys(mcomp)[0];
		if (!validMKeys.includes(key.split('_')[1])) {
			return false;
		}

		const value = mcomp[key];
		if (typeof value !== "number") {
			return false;
		}

		return true;
	}

	private isValidSComparison(scomp: any): Boolean {
		if (typeof scomp !== "object" || scomp === null) {
			throw new InsightError("SCOMPARISON must be a valid object");
		}

		const validSKeys = ["dept", "id", "instructor", "title", "uuid"];
		const key = Object.keys(scomp)[0];
		if (!validSKeys.includes(key.split('_')[1])) {
			return false;
		}

		const value = scomp[key];
		if (typeof value !== "string") {
			return false;
		}

		return true;
	}

	// Helper function to check if OPTIONS is valid
	private isValidOptionsClause(options: any): boolean {
		// Validate COLUMNS
		if (!Array.isArray(options.COLUMNS) || options.COLUMNS.length === 0) {
			return false;
		}

		const validKeys = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
		options.COLUMNS.forEach((key: string) => {
			if (!validKeys.includes(key.split('_')[1])) {
				return false;
			}
		});

		// If ORDER exists, it must be included in COLUMNS
		if (options.ORDER && !options.COLUMNS.includes(options.ORDER)) {
			return false;
		}

		return true;
	}


	// Helper function to check if only one dataset is referenced
	private referencesSingleDataset(query: unknown): Boolean {
		// Implement the logic to check if only one dataset is referenced
		const datasetIds = new Set<string>();

		// Recursive function to traverse through the query object
		function traverseObject(obj: any): void {
			if (typeof obj === "object" && obj !== null) {
				for (const key in obj) {
					if (Object.prototype.hasOwnProperty.call(obj, key)) {
						if (typeof obj[key] === "object") {
							traverseObject(obj[key]);
						} else if (typeof key === "string" && key.includes("_")) {
							const datasetId = key.split("_")[0];
							datasetIds.add(datasetId);
						}
					}
				}
			}
		}

		traverseObject(query);

		return datasetIds.size === 1;
	}


	// Helper function to execute the query and return results
	private async executeQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Implement actual query execution logic
		if (query === null) {
			return [];
		}
		return []; // Placeholder
	}



	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}

}
