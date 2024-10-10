import { InsightError } from "./IInsightFacade";

export interface Query {
	WHERE: any;
	OPTIONS: {
		COLUMNS: string[];
		ORDER?: any;
	};
}

export default class QueryValidator {
	public checkValidEBNF(query: unknown): boolean {
		// Validate that query is an object and conforms to the Query interface
		if (!this.isQueryObject(query)) {
			throw new InsightError("Invalid query format");
		}

		const queryObj = query as Query;

		// Extract dataset ID from query
		const datasetId = this.getDatasetIdFromQuery(queryObj);

		// Validate OPTIONS clause
		if (!this.isValidOptionsClause(queryObj.OPTIONS, datasetId)) {
			return false;
		}

		// Check if the format inside WHERE is valid
		if (!this.isValidWhereClause(queryObj.WHERE, datasetId)) {
			return false;
		}

		return true;
	}

	private isQueryObject(query: unknown): query is Query {
		return (
			typeof query === "object" &&
			query !== null &&
			"WHERE" in query &&
			"OPTIONS" in query &&
			typeof (query as any).OPTIONS === "object" &&
			(query as any).OPTIONS !== null &&
			Array.isArray((query as any).OPTIONS?.COLUMNS)
		);
	}

	private hasValidColumns(options: Query["OPTIONS"]): boolean {
		if (!Array.isArray(options.COLUMNS) || options.COLUMNS.length === 0) {
			throw new InsightError("OPTIONS must contain a non-empty COLUMNS array.");
		}
		return true;
	}

	private isValidWhereClause(WHERE: any, datasetId: string): boolean {
		// WHERE can be an empty object
		if (Object.keys(WHERE).length === 0) {
			return true;
		}

		// Check if WHERE clause contains a valid filter
		if (!this.isValidFilter(WHERE, datasetId)) {
			return false;
		}

		return true;
	}

	private isValidFilter(filter: any, datasetId: string): boolean {
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
			return logic.every((f: any) => this.isValidFilter(f, datasetId));
		}

		// Check for NEGATION: NOT
		if ("NOT" in filter) {
			if (Object.keys(filter).length !== 1) {
				throw new InsightError("NOT must have exactly one key");
			}
			return this.isValidFilter(filter.NOT, datasetId);
		}

		// Check for MCOMPARISON: GT / LT / EQ
		if ("GT" in filter || "LT" in filter || "EQ" in filter) {
			return this.isValidMComparison(filter.GT || filter.LT || filter.EQ, datasetId);
		}

		// Check for SCOMPARISON: IS
		if ("IS" in filter) {
			return this.isValidSComparison(filter.IS, datasetId);
		}

		return false;
	}

	private isValidMComparison(mcomp: any, datasetId: string): boolean {
		if (typeof mcomp !== "object" || mcomp === null) {
			throw new InsightError("MCOMPARISON must be a valid object");
		}

		const validMKeys = ["avg", "pass", "fail", "audit", "year"];
		const keys = Object.keys(mcomp);
		if (keys.length !== 1) {
			throw new InsightError("MCOMPARISON must have exactly one key");
		}

		const key = keys[0];

		// Ensure the key follows the format: dataset_field
		if (!key.includes("_")) {
			return false;
		}
		const [keyId, field] = key.split("_");
		if (keyId !== datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}
		if (!validMKeys.includes(field)) {
			return false;
		}

		const value = mcomp[key];
		if (typeof value !== "number") {
			throw new InsightError("GT, LT, EQ require numeric values");
		}

		return true;
	}

	private isValidSComparison(scomp: any, datasetId: string): boolean {
		if (typeof scomp !== "object" || scomp === null) {
			throw new InsightError("SCOMPARISON must be a valid object");
		}

		const validSKeys = ["dept", "id", "instructor", "title", "uuid"];
		const keys = Object.keys(scomp);
		if (keys.length !== 1) {
			throw new InsightError("SCOMPARISON must have exactly one key");
		}

		const key = keys[0];

		// Ensure the key follows the format: dataset_field
		if (!key.includes("_")) {
			return false;
		}
		const [keyId, field] = key.split("_");
		if (keyId !== datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}
		if (!validSKeys.includes(field)) {
			return false;
		}

		const value = scomp[key];
		if (typeof value !== "string") {
			throw new InsightError("IS operator requires string values");
		}

		return true;
	}

	private isValidOptionsClause(options: Query["OPTIONS"], datasetId: string): boolean {
		if (typeof options !== "object" || options === null) {
			throw new InsightError("OPTIONS must be a valid object");
		}

		// Validate COLUMNS
		this.validateColumns(options.COLUMNS, datasetId);

		// If ORDER exists, check if it's valid
		if ("ORDER" in options) {
			if (!this.isValidOrder(options.ORDER, options.COLUMNS)) {
				return false;
			}
		}

		return true;
	}

	private validateColumns(columns: string[], datasetId: string): void {
		if (!Array.isArray(columns) || columns.length === 0) {
			throw new InsightError("OPTIONS must contain a non-empty COLUMNS array.");
		}

		const validKeys = [
			"avg",
			"pass",
			"fail",
			"audit",
			"year",
			"dept",
			"id",
			"instructor",
			"title",
			"uuid",
		];
		for (const key of columns) {
			if (!key.includes("_")) {
				throw new InsightError(`Invalid key in COLUMNS: ${key}`);
			}
			const [keyId, field] = key.split("_");
			if (keyId !== datasetId) {
				throw new InsightError(`Key does not match dataset ID: ${key}`);
			}
			if (!validKeys.includes(field)) {
				throw new InsightError(`Invalid field in COLUMNS: ${field}`);
			}
		}
	}

	private isValidOrder(order: any, columns: string[]): boolean {
		if (typeof order === "string") {
			if (!columns.includes(order)) {
				throw new InsightError("ORDER key must be in COLUMNS.");
			}
		} else if (typeof order === "object") {
			if (!order.keys || !Array.isArray(order.keys) || order.keys.length === 0) {
				throw new InsightError("ORDER keys must be a non-empty array.");
			}
			for (const key of order.keys) {
				if (!columns.includes(key)) {
					throw new InsightError(`ORDER key ${key} must be in COLUMNS.`);
				}
			}
			if (order.dir && !["UP", "DOWN"].includes(order.dir)) {
				throw new InsightError("ORDER dir must be 'UP' or 'DOWN'.");
			}
		} else {
			throw new InsightError("Invalid ORDER format.");
		}
		return true;
	}

	public referencesSingleDataset(query: unknown): boolean {
		const datasetIds = new Set<string>();

		// Ensure OPTIONS and COLUMNS exist
		if (
			!("OPTIONS" in (query as any)) ||
			!Array.isArray((query as any).OPTIONS?.COLUMNS) ||
			(query as any).OPTIONS.COLUMNS.length === 0
		) {
			throw new InsightError("OPTIONS must contain a non-empty COLUMNS array.");
		}

		// Recursive function to traverse through the query object
		const traverseObject = (obj: any): void => {
			if (typeof obj === "object" && obj !== null) {
				for (const key in obj) {
					if (Object.prototype.hasOwnProperty.call(obj, key)) {
						if (typeof obj[key] === "object" && obj[key] !== null) {
							traverseObject(obj[key]);
						} else if (typeof key === "string" && key.includes("_")) {
							const datasetId = key.split("_")[0];
							datasetIds.add(datasetId);
						}
					}
				}
			}
		};

		traverseObject(query);

		return datasetIds.size === 1;
	}

	public getDatasetIdFromQuery(query: Query): string {
		if (
			!Array.isArray(query.OPTIONS?.COLUMNS) ||
			query.OPTIONS.COLUMNS.length === 0
		) {
			throw new InsightError("OPTIONS must contain a non-empty COLUMNS array.");
		}

		for (const col of query.OPTIONS.COLUMNS) {
			if (col.includes("_")) {
				return col.split("_")[0];
			}
		}

		throw new InsightError("Could not extract dataset ID from COLUMNS.");
	}
}

