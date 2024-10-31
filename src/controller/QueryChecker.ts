import { InsightError } from "./IInsightFacade";

export interface Query {
	WHERE: any;
	OPTIONS: {
		COLUMNS: string[];
		ORDER?: any;
	};
	TRANSFORMATIONS?: {
		GROUP: string[];
		APPLY: Record<string, Record<string, string>>[];
	};
}

// Define valid dataset fields
const validKeys = new Set([
	'avg', 'pass', 'fail', 'audit', 'year', 'lat', 'lon', 'seats', 'dept', 'id',
	'instructor', 'title', 'uuid', 'fullname', 'shortname', 'number', 'name', 'address', 'type', 'furniture', 'href'
]);

export default class QueryChecker {
	// Validate the basic format of the query object
	public validateQueryFormat(query: unknown): boolean {
		// Check if the input is a valid query object
		if (!this.isValidQueryObject(query)) {
			throw new InsightError("Invalid query format");
		}

		const queryObj = query as Query;

		// Extract dataset ID from the query
		const datasetId = this.extractDatasetId(queryObj);

		// Validate the Transformation clause
		if (queryObj.TRANSFORMATIONS &&
			!this.checkTransClause(queryObj.TRANSFORMATIONS, datasetId)) {
			return false;
		}

		// Validate the OPTIONS clause
		if (!this.checkOptionsClause(queryObj.OPTIONS, datasetId, queryObj.TRANSFORMATIONS)) {
			return false;
		}

		// Validate the WHERE clause format
		if (!this.checkWhereClause(queryObj.WHERE, datasetId)) {
			return false;
		}

		return true;
	}

	// Check if the input is a valid query object
	private isValidQueryObject(query: unknown): query is Query {
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

	// Extract dataset ID from COLUMNS
	public extractDatasetId(query: Query): string {
		if (!Array.isArray(query.OPTIONS?.COLUMNS) || query.OPTIONS.COLUMNS.length === 0) {
			throw new InsightError("OPTIONS must contain a non-empty COLUMNS array.");
		}

		for (const col of query.OPTIONS.COLUMNS) {
			if (col.includes("_")) {
				return col.split("_")[0];
			}
		}

		throw new InsightError("Could not extract dataset ID from COLUMNS.");
	}

	// Validate the Transformation clause
	private checkTransClause(transformations: Query["TRANSFORMATIONS"], datasetId: string): boolean {
		if (!transformations?.GROUP || !transformations?.APPLY) {
			throw new InsightError("TRANSFORMATIONS must contain GROUP and APPLY.");
		}
		this.validateGroupClause(transformations.GROUP, datasetId);
		this.validateApplyClause(transformations.APPLY, datasetId);
		return true;
	}

	// Validate the Transformation Group clause
	private validateGroupClause(group: string[], datasetId: string): void {
		if (!Array.isArray(group) || group.length === 0) {
			throw new InsightError("GROUP must be a non-empty array.");
		}
		for (const field of group) {
			if (typeof field !== "string" || !field.includes("_")) {
				throw new InsightError("Each GROUP entry must be a string in the format 'dataset_field'.");
			}
			const [keyId] = field.split("_");
			if (keyId !== datasetId) {
				throw new InsightError(`GROUP field ${field} does not match dataset ID: ${datasetId}.`);
			}
		}
	}

	// Validate the Transformation Apply clause
	private validateApplyClause(apply: Record<string, Record<string, string>>[], datasetId: string): void {
		if (!Array.isArray(apply)) {
			throw new InsightError("APPLY must be an array.");
		}
		for (const applyRule of apply) {
			this.validateApplyRule(applyRule, datasetId);
		}
	}

	// Validate the Transformation Apply clause Rule
	private validateApplyRule(applyRule: Record<string, Record<string, string>>, datasetId: string): void {
		const keys = Object.keys(applyRule);
		if (keys.length !== 1) {
			throw new InsightError("Each APPLY rule must have exactly one key.");
		}

		const applyKey = keys[0];
		const operationObject = applyRule[applyKey];

		if (typeof applyKey !== "string") {
			throw new InsightError("APPLY key must be a string.");
		}
		if (typeof operationObject !== "object" || operationObject === null) {
			throw new InsightError("Each APPLY rule must map to an operation object.");
		}

		const operationKeys = Object.keys(operationObject);
		if (operationKeys.length !== 1) {
			throw new InsightError("Each APPLY operation must contain exactly one operation.");
		}

		const operation = operationKeys[0];
		const targetField = operationObject[operation];

		if (!["MAX", "MIN", "AVG", "COUNT", "SUM"].includes(operation)) {
			throw new InsightError(`Invalid APPLY operation: ${operation}.
			Allowed operations are MAX, MIN, AVG, COUNT, SUM.`);
		}
		if (typeof targetField !== "string" || !targetField.includes("_")) {
			throw new InsightError("APPLY operation target must be a string in the format 'dataset_field'.");
		}

		const [targetDatasetId] = targetField.split("_");
		if (targetDatasetId !== datasetId) {
			throw new InsightError(`APPLY target field ${targetField} does not match dataset ID: ${datasetId}.`);
		}
	}

	// Validate OPTIONS clause
	private checkOptionsClause(options: Query["OPTIONS"], datasetId: string, transformations?: Query["TRANSFORMATIONS"]): boolean {
		if (typeof options !== "object" || options === null) {
			throw new InsightError("OPTIONS must be a valid object");
		}

		// Collect custom field names defined in TRANSFORMATIONS.APPLY
		if (transformations?.APPLY) {
			for (const applyRule of transformations.APPLY) {
				const applyKey = Object.keys(applyRule)[0];
				validKeys.add(applyKey);
			}
		}

		// Validate COLUMNS array with the expanded validKeys set
		this.validateColumns(options.COLUMNS, datasetId);

		// Validate ORDER if present
		if ("ORDER" in options) {
			if (!this.checkOrderClause(options.ORDER, options.COLUMNS)) {
				return false;
			}
		}

		return true;
	}

	// Validate COLUMNS array
	private validateColumns(columns: string[], datasetId: string): void {
		if (!Array.isArray(columns) || columns.length === 0) {
			throw new InsightError("OPTIONS must contain a non-empty COLUMNS array.");
		}

		for (const key of columns) {
			// Check if key is a custom apply key or a valid dataset field
			if (validKeys.has(key)) {
				continue;
			}

			// If it's not a custom key, ensure it follows the "dataset_field" format
			if (!key.includes("_")) {
				throw new InsightError(`Invalid key in COLUMNS: ${key}`);
			}

			const [keyId, field] = key.split("_");
			if (keyId !== datasetId) {
				throw new InsightError(`Key does not match dataset ID: ${key}`);
			}
			if (!validKeys.has(field)) {
				throw new InsightError(`Invalid field in COLUMNS: ${field}`);
			}
		}
	}

	// Validate ORDER clause
	private checkOrderClause(order: any, columns: string[]): boolean {
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

	// Check if the WHERE clause is valid
	private checkWhereClause(WHERE: any, datasetId: string): boolean {
		// WHERE can be an empty object
		if (Object.keys(WHERE).length === 0) {
			return true;
		}

		// Validate the filter in WHERE clause
		if (!this.checkFilter(WHERE, datasetId)) {
			return false;
		}

		return true;
	}

	// Validate filter conditions
	private checkFilter(filter: any, datasetId: string): boolean {
		if (typeof filter !== "object" || filter === null) {
			return false;
		}

		// Check for logic comparisons: AND / OR
		if ("AND" in filter || "OR" in filter) {
			const logic = filter.AND || filter.OR;
			if (!Array.isArray(logic) || logic.length === 0) {
				throw new InsightError("LOGIC must be a non-empty array");
			}
			// Recursively check each filter in the filter list
			return logic.every((f: any) => this.checkFilter(f, datasetId));
		}

		// Check for negation: NOT
		if ("NOT" in filter) {
			if (Object.keys(filter).length !== 1) {
				throw new InsightError("NOT must have exactly one key");
			}
			return this.checkFilter(filter.NOT, datasetId);
		}

		// Check for MCOMPARISON: GT / LT / EQ
		if ("GT" in filter || "LT" in filter || "EQ" in filter) {
			return this.checkMComparison(filter.GT || filter.LT || filter.EQ, datasetId);
		}

		// Check for SCOMPARISON: IS
		if ("IS" in filter) {
			return this.checkSComparison(filter.IS, datasetId);
		}

		return false;
	}

	// Validate MCOMPARISON (numeric comparison)
	private checkMComparison(mcomp: any, datasetId: string): boolean {
		if (typeof mcomp !== "object" || mcomp === null) {
			throw new InsightError("MCOMPARISON must be a valid object");
		}

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
		if (!validKeys.has(field)) {
			return false;
		}

		const value = mcomp[key];
		if (typeof value !== "number") {
			throw new InsightError("GT, LT, EQ require numeric values");
		}

		return true;
	}

	// Validate SCOMPARISON (string comparison)
	private checkSComparison(scomp: any, datasetId: string): boolean {
		if (typeof scomp !== "object" || scomp === null) {
			throw new InsightError("SCOMPARISON must be a valid object");
		}

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
		if (!validKeys.has(field)) {
			return false;
		}

		const value = scomp[key];
		if (typeof value !== "string") {
			throw new InsightError("IS operator requires string values");
		}

		return true;
	}
}
