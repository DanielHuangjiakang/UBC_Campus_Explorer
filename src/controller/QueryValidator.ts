import { InsightError } from "./IInsightFacade";

export default class QueryValidator {
	public checkValidEBNF(query: unknown): boolean {
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
		if (!validMKeys.includes(key.split("_")[1])) {
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
		if (!validSKeys.includes(key.split("_")[1])) {
			return false;
		}

		const value = scomp[key];
		if (typeof value !== "string") {
			return false;
		}

		return true;
	}

	private isValidOptionsClause(options: any): boolean {
		// Validate COLUMNS
		if (!Array.isArray(options.COLUMNS) || options.COLUMNS.length === 0) {
			return false;
		}

		const validKeys = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
		options.COLUMNS.forEach((key: string) => {
			if (!validKeys.includes(key.split("_")[1])) {
				return false;
			}
		});

		// If ORDER exists, it must be included in COLUMNS
		if (options.ORDER && !options.COLUMNS.includes(options.ORDER)) {
			return false;
		}

		return true;
	}

	public referencesSingleDataset(query: unknown): Boolean {
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
}
