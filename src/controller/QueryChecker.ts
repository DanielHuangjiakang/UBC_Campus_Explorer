import { InsightError } from "./IInsightFacade";
import TransformationValidator from "./TransformationValidator";

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

const validKeys = new Set([
	"avg",
	"pass",
	"fail",
	"audit",
	"year",
	"lat",
	"lon",
	"seats",
	"dept",
	"id",
	"instructor",
	"title",
	"uuid",
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"type",
	"furniture",
	"href",
]);

export default class QueryValidator {
	private transformationValidator: TransformationValidator;

	constructor() {
		this.transformationValidator = new TransformationValidator(validKeys);
	}

	// Validate the basic format of the query object
	public validateQueryFormat(query: unknown): boolean {
		if (!this.isValidQueryObject(query)) {
			throw new InsightError("Invalid query format");
		}

		const queryObj = query as Query;
		this.checkUnexpectedKeys(queryObj, ["WHERE", "OPTIONS", "TRANSFORMATIONS"]);
		const datasetId = this.extractDatasetId(queryObj);

		if (queryObj.TRANSFORMATIONS) {
			this.transformationValidator.checkTransClause(queryObj.TRANSFORMATIONS, datasetId);
		}
		this.checkOptionsClause(queryObj.OPTIONS, datasetId, queryObj.TRANSFORMATIONS);
		this.checkWhereClause(queryObj.WHERE, datasetId);

		return true;
	}

	private checkUnexpectedKeys(obj: any, allowedKeys: string[]): void {
		for (const key in obj) {
			if (!allowedKeys.includes(key)) {
				throw new InsightError(`Excess keys in query: ${key} is not allowed`);
			}
		}
	}

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

	public extractDatasetId(query: Query): string {
		for (const col of query.OPTIONS?.COLUMNS || []) {
			if (col.includes("_")) {
				return col.split("_")[0];
			}
		}
		if (query.TRANSFORMATIONS) {
			return this.transformationValidator.extractDatasetIdFromTransformation(query.TRANSFORMATIONS);
		}
		throw new InsightError("Could not extract dataset ID from COLUMNS or TRANSFORMATIONS.");
	}

	private checkOptionsClause(
		options: Query["OPTIONS"],
		datasetId: string,
		transformations?: Query["TRANSFORMATIONS"]
	): boolean {
		if (typeof options !== "object" || options === null) {
			throw new InsightError("OPTIONS must be a valid object");
		}

		if (transformations?.APPLY) {
			for (const applyRule of transformations.APPLY) {
				const applyKey = Object.keys(applyRule)[0];
				if (applyKey === "" || applyKey.includes("_")) {
					throw new InsightError("Apply key cannot be an empty string or _");
				}
				validKeys.add(applyKey);
			}
		}

		this.validateColumns(options.COLUMNS, datasetId);

		if ("ORDER" in options) {
			this.checkOrderClause(options.ORDER, options.COLUMNS);
		}

		return true;
	}

	private validateColumns(columns: string[], datasetId: string): void {
		if (!Array.isArray(columns) || columns.length === 0) {
			throw new InsightError("OPTIONS must contain a non-empty COLUMNS array.");
		}

		for (const key of columns) {
			if (validKeys.has(key)) {
				continue;
			}
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

	private checkOrderClause(order: any, columns: string[]): boolean {
		if (typeof order === "string") {
			// Single string ORDER must be in COLUMNS
			if (!columns.includes(order)) {
				throw new InsightError("ORDER key must be in COLUMNS.");
			}
		} else if (typeof order === "object") {
			// Multi-key ORDER validation
			const allowedOrderKeys = ["keys", "dir"];
			for (const key in order) {
				if (!allowedOrderKeys.includes(key)) {
					throw new InsightError(`Invalid key in ORDER: ${key}.`);
				}
			}

			if (!order.keys || !Array.isArray(order.keys) || order.keys.length === 0) {
				throw new InsightError("ORDER keys must be a non-empty array.");
			}
			for (const key of order.keys) {
				if (!columns.includes(key)) {
					throw new InsightError(`ORDER key ${key} must be in COLUMNS.`);
				}
			}
			if (!order.dir || !["UP", "DOWN"].includes(order.dir)) {
				throw new InsightError("ORDER dir must be 'UP' or 'DOWN'.");
			}
		} else {
			throw new InsightError("Invalid ORDER format.");
		}
		return true;
	}

	private checkWhereClause(WHERE: any, datasetId: string): boolean {
		if (Object.keys(WHERE).length === 0) {
			return true;
		}
		return this.checkFilter(WHERE, datasetId);
	}

	private checkFilter(filter: any, datasetId: string): boolean {
		if (typeof filter !== "object" || filter === null) {
			return false;
		}

		if ("AND" in filter || "OR" in filter) {
			const logic = filter.AND || filter.OR;
			if (!Array.isArray(logic) || logic.length === 0) {
				throw new InsightError("LOGIC must be a non-empty array");
			}
			return logic.every((f: any) => this.checkFilter(f, datasetId));
		}

		if ("NOT" in filter) {
			if (Object.keys(filter).length !== 1) {
				throw new InsightError("NOT must have exactly one key");
			}
			return this.checkFilter(filter.NOT, datasetId);
		}

		if ("GT" in filter || "LT" in filter || "EQ" in filter) {
			return this.checkMComparison(filter.GT || filter.LT || filter.EQ, datasetId);
		}

		if ("IS" in filter) {
			return this.checkSComparison(filter.IS, datasetId);
		}

		return false;
	}

	private checkMComparison(mcomp: any, datasetId: string): boolean {
		const keys = Object.keys(mcomp);
		if (keys.length !== 1) {
			throw new InsightError("MCOMPARISON must have exactly one key");
		}

		const key = keys[0];
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

	private checkSComparison(scomp: any, datasetId: string): boolean {
		const keys = Object.keys(scomp);
		if (keys.length !== 1) {
			throw new InsightError("SCOMPARISON must have exactly one key");
		}

		const key = keys[0];
		if (!key.includes("_")) {
			throw new InsightError("Invalid key format in SCOMPARISON");
		}

		const [keyId, field] = key.split("_");
		if (keyId !== datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}
		if (!validKeys.has(field)) {
			throw new InsightError(`Invalid field in SCOMPARISON: ${field}`);
		}

		const value = scomp[key];
		if (typeof value !== "string") {
			throw new InsightError("IS operator requires string values");
		}

		// Enhanced validation for wildcard patterns
		if (value.includes("*")) {
			const firstIndex = value.indexOf("*");
			const lastIndex = value.lastIndexOf("*");

			// Check for invalid patterns like input*string
			if (firstIndex !== 0 && lastIndex !== value.length - 1) {
				throw new InsightError("Asterisks (*) can only be the first or last characters of input strings");
			}

			// Check for disallowed patterns with multiple asterisks not at the edges
			const isValidPattern = firstIndex === lastIndex || (firstIndex === 0 && lastIndex === value.length - 1);

			if (!isValidPattern) {
				throw new InsightError("Invalid wildcard pattern in IS operator");
			}
		}

		return true;
	}
}
