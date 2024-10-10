import { InsightError, InsightResult } from "./IInsightFacade";
import DatasetManager from "./DatasetManager"; // Use DatasetManager for handling datasets
import Section from "./Section";

export default class QueryExecutor {
	private datasets: Map<string, Section[]>;
	private datasetId!: string; // Declare datasetId with definite assignment

	constructor(datasetManager: DatasetManager) {
		this.datasets = datasetManager.getDatasets(); // Get datasets from DatasetManager
	}

	public async executeQuery(query: any): Promise<InsightResult[]> {
		// Extract and store the dataset ID from the query
		this.datasetId = this.getDatasetIdFromQuery(query);

		// Check if the dataset exists
		if (!this.datasets.has(this.datasetId)) {
			throw new InsightError(`Dataset with id "${this.datasetId}" does not exist.`);
		}

		// Validate query keys
		this.validateQueryKeys(query, this.datasetId);

		const dataset = this.datasets.get(this.datasetId) as Section[];
		const filteredData = this.applyFilter(dataset, query.WHERE);
		return this.applyOptions(filteredData, query.OPTIONS);
	}

	private getDatasetIdFromQuery(query: any): string {
		// Extract the dataset ID from the first column that includes an underscore
		for (const col of query.OPTIONS.COLUMNS) {
			if (col.includes("_")) {
				return col.split("_")[0];
			}
		}
		throw new InsightError("Could not extract dataset ID from COLUMNS.");
	}

	private applyFilter(data: Section[], where: any): Section[] {
		// If WHERE is empty, return all data
		if (Object.keys(where).length === 0) {
			return data;
		}

		const filterFunction = this.buildFilterFunction(where);
		return data.filter(filterFunction);
	}

	private buildFilterFunction(where: any): (item: Section) => boolean {
		if (where.AND) {
			return this.handleAnd(where.AND);
		}
		if (where.OR) {
			return this.handleOr(where.OR);
		}
		if (where.NOT) {
			return this.handleNot(where.NOT);
		}
		if (where.GT || where.LT || where.EQ) {
			return this.handleComparison(where);
		}
		if (where.IS) {
			return this.handleIs(where.IS);
		}
		throw new InsightError("Invalid WHERE condition.");
	}

	private handleAnd(andConditions: any[]): (item: Section) => boolean {
		const subFilters: ((item: Section) => boolean)[] = andConditions.map((condition: any) =>
			this.buildFilterFunction(condition)
		);
		return (item: Section) => subFilters.every((filterFunc) => filterFunc(item));
	}

	private handleOr(orConditions: any[]): (item: Section) => boolean {
		const subFilters: ((item: Section) => boolean)[] = orConditions.map((condition: any) =>
			this.buildFilterFunction(condition)
		);
		return (item: Section) => subFilters.some((filterFunc) => filterFunc(item));
	}

	private handleNot(notCondition: any): (item: Section) => boolean {
		const subFilter = this.buildFilterFunction(notCondition);
		return (item: Section) => !subFilter(item);
	}

	private handleComparison(where: any): (item: Section) => boolean {
		const operator = where.GT ? "GT" : where.LT ? "LT" : "EQ";
		const comparison = where[operator];
		const key = Object.keys(comparison)[0];
		const value = comparison[key];

		const id = key.split("_")[0]; // Only extract 'id'
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}

		return (item: Section) => {
			const itemValue = this.getItemValueByKey(item, key);

			if (typeof itemValue !== "number" || typeof value !== "number") {
				throw new InsightError("Comparison requires numeric values.");
			}

			if (operator === "GT") {
				return itemValue > value;
			}
			if (operator === "LT") {
				return itemValue < value;
			}
			if (operator === "EQ") {
				return itemValue === value;
			}

			return false;
		};
	}

	private handleIs(isCondition: any): (item: Section) => boolean {
		const key = Object.keys(isCondition)[0];
		const value = isCondition[key];

		const id = key.split("_")[0];
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}

		if (typeof value !== "string") {
			throw new InsightError("IS operator requires a string value.");
		}

		// Validate wildcard pattern
		if (this.hasInvalidWildcardPattern(value)) {
			throw new InsightError("Invalid wildcard pattern in IS operator.");
		}

		// Escape special characters except '*'
		const specialChars = /[.+?^${}()|[\]\\]/g; // Exclude '*'
		const escapedValue = value.replace(specialChars, "\\$&");

		// Replace '*' with '.*'
		const regexPattern = `^${escapedValue.replace(/\*/g, ".*")}$`;
		const regex = new RegExp(regexPattern);

		return (item: Section) => {
			const itemValue = this.getItemValueByKey(item, key);

			if (typeof itemValue !== "string") {
				throw new InsightError("IS operator requires string fields.");
			}

			return regex.test(itemValue);
		};
	}

	private hasInvalidWildcardPattern(value: string): boolean {
		// Valid patterns: '*abc', 'abc*', '*abc*', 'abc', '*'
		// Invalid patterns: 'ab*cd', 'a*b*c', '*ab*cd*', etc.
		const firstIndex = value.indexOf("*");
		const lastIndex = value.lastIndexOf("*");

		if (firstIndex === -1) {
			// No wildcards, valid pattern
			return false;
		}

		if (value.replace(/\*/g, "").length === 0) {
			// Value is only '*', valid pattern
			return false;
		}

		if (firstIndex !== 0 && lastIndex !== value.length - 1) {
			// '*' is in the middle, invalid pattern
			return true;
		}

		if (firstIndex !== lastIndex && (firstIndex !== 0 || lastIndex !== value.length - 1)) {
			// Multiple '*' not at both ends, invalid pattern
			return true;
		}

		return false;
	}

	/**
	 * Helper function to map the string key to the corresponding Section getter.
	 * @param item The Section object.
	 * @param key The key used in the query (e.g., 'uuid', 'title', etc.).
	 * @returns The value from the Section object.
	 */
	private getItemValueByKey(item: Section, key: string): string | number {
		const [id, field] = key.split("_");
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}
		switch (field) {
			case "uuid":
				return item.getUuid();
			case "id":
				return item.getId();
			case "title":
				return item.getTitle();
			case "instructor":
				return item.getInstructor();
			case "dept":
				return item.getDept();
			case "year":
				return this.adjustYear(item); // Pass the entire item
			case "avg":
				return item.getAvg();
			case "pass":
				return item.getPass();
			case "fail":
				return item.getFail();
			case "audit":
				return item.getAudit();
			default:
				throw new InsightError(`Invalid column: ${key}`);
		}
	}

	private adjustYear(item: Section): number {
		// If instructor is empty, it's an 'overall' section; set year to 1900
		if (item.getInstructor() === "") {
			const result = 1900;
			return result;
		}
		return item.getYear();
	}

	private applyOptions(data: Section[], options: any): InsightResult[] {
		if (!options.COLUMNS || !Array.isArray(options.COLUMNS)) {
			throw new InsightError("OPTIONS must contain COLUMNS array.");
		}

		const columns = options.COLUMNS;
		let result = data.map((item) => {
			const res: any = {};
			for (const col of columns) {
				res[col] = this.getItemValueByKey(item, col); // Use helper function here
			}
			return res;
		});

		if (options.ORDER) {
			result = this.applyOrder(result, options.ORDER);
		}

		return result;
	}

	private applyOrder(data: InsightResult[], order: any): InsightResult[] {
		if (typeof order === "string") {
			const key = order;
			return data.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0));
		} else if (typeof order === "object" && order.keys && Array.isArray(order.keys)) {
			const keys = order.keys;
			const dir = order.dir === "DOWN" ? -1 : 1;

			return data.sort((a, b) => {
				for (const key of keys) {
					if (a[key] > b[key]) {
						return dir;
					}
					if (a[key] < b[key]) {
						return -dir;
					}
				}
				return 0;
			});
		} else {
			throw new InsightError("Invalid ORDER format.");
		}
	}

	// Refactored to reduce method length
	private validateQueryKeys(query: any, datasetId: string): void {
		const validFields = ["uuid", "id", "title", "instructor", "dept", "year", "avg", "pass", "fail", "audit"];

		const queryKeys = this.extractKeys(query);

		for (const key of queryKeys) {
			this.validateKey(key, validFields, datasetId);
		}
	}

	private extractKeys(obj: any): string[] {
		let keys: string[] = [];
		if (typeof obj === "object" && obj !== null) {
			for (const key in obj) {
				if (["AND", "OR", "NOT", "GT", "LT", "EQ", "IS"].includes(key)) {
					keys = keys.concat(this.extractKeys(obj[key]));
				} else if (key.includes("_")) {
					keys.push(key);
				}
			}
		}
		return keys;
	}

	private validateKey(key: string, validFields: string[], datasetId: string): void {
		const [keyId, field] = key.split("_");
		if (!validFields.includes(field)) {
			throw new InsightError(`Invalid key in query: ${key}`);
		}
		if (keyId !== datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}
	}
}
