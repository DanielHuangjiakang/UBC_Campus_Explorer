import { InsightError, InsightResult } from "./IInsightFacade";
import DatasetManager from "./DatasetManager"; // Use DatasetManager for handling datasets
import Section from "./Section";
// change1
import Room from "./Room";
type DatasetEntry = Section | Room;

export default class QueryRunner {
	private datasetMap: Map<string, DatasetEntry[]>;
	private datasetId!: string; // Declare datasetId with definite assignment

	constructor(datasetManager: DatasetManager) {
		this.datasetMap = datasetManager.getDatasets(); // Initialize datasets
	}

	// Execute the query and return the results
	public async execute(query: any): Promise<InsightResult[]> {
		// Extract the dataset ID from the query
		this.datasetId = this.extractDatasetId(query);

		// Check if the dataset exists
		if (!this.datasetMap.has(this.datasetId)) {
			throw new InsightError(`Dataset with id "${this.datasetId}" does not exist.`);
		}

		// Validate query keys
		this.validateQuery(query, this.datasetId);

		const dataset = this.datasetMap.get(this.datasetId) as Section[];
		const filteredData = this.applyFilters(dataset, query.WHERE);
		return this.applyOptions(filteredData, query.OPTIONS);
	}

	// Extract dataset ID from query COLUMNS
	private extractDatasetId(query: any): string {
		for (const col of query.OPTIONS.COLUMNS) {
			if (col.includes("_")) {
				return col.split("_")[0];
			}
		}
		throw new InsightError("Could not extract dataset ID from COLUMNS.");
	}

	// Apply the filter conditions specified in WHERE clause
	private applyFilters(data: Section[], where: any): Section[] {
		if (Object.keys(where).length === 0) {
			return data;
		}

		const filterFunction = this.createFilterFunction(where);
		return data.filter(filterFunction);
	}

	// Create a filter function based on WHERE conditions
	private createFilterFunction(where: any): (item: Section) => boolean {
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

	// Handle AND logic for filters
	private handleAnd(andConditions: any[]): (item: Section) => boolean {
		const subFilters = andConditions.map((condition) => this.createFilterFunction(condition));
		return (item: Section) => subFilters.every((filterFunc) => filterFunc(item));
	}

	// Handle OR logic for filters
	private handleOr(orConditions: any[]): (item: Section) => boolean {
		const subFilters = orConditions.map((condition) => this.createFilterFunction(condition));
		return (item: Section) => subFilters.some((filterFunc) => filterFunc(item));
	}

	// Handle NOT logic for filters
	private handleNot(notCondition: any): (item: Section) => boolean {
		const subFilter = this.createFilterFunction(notCondition);
		return (item: Section) => !subFilter(item);
	}

	// Handle comparison operators like GT, LT, EQ
	private handleComparison(where: any): (item: Section) => boolean {
		const operator = where.GT ? "GT" : where.LT ? "LT" : "EQ";
		const comparison = where[operator];
		const key = Object.keys(comparison)[0];
		const value = comparison[key];

		const id = key.split("_")[0]; // Extract dataset ID part
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}

		return (item: Section) => {
			const itemValue = this.getValueByKey(item, key);

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

	// Handle the IS operator for string comparisons in the WHERE clause
	private handleIs(isCondition: any): (item: Section) => boolean {
		const key = Object.keys(isCondition)[0];
		const value = isCondition[key];

		// Extract dataset ID from the query key
		const id = key.split("_")[0];
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}

		// Ensure the value provided to IS a string
		if (typeof value !== "string") {
			throw new InsightError("IS operator requires a string value.");
		}

		// Check if the wildcard pattern is invalid, throw InsightError if true
		if (this.hasInvalidWildcardPattern(value)) {
			throw new InsightError("Invalid wildcard pattern in IS operator.");
		}

		// Convert wildcard pattern into a regular expression for matching
		const regexPattern = this.buildRegexPattern(value);
		const regex = new RegExp(regexPattern);

		// Return a function that tests the string value from the Section object
		return (item: Section) => {
			const itemValue = this.getValueByKey(item, key);

			if (typeof itemValue !== "string") {
				throw new InsightError("IS operator requires string fields.");
			}

			return regex.test(itemValue);
		};
	}

	// Check if the wildcard pattern in the IS clause is invalid
	private hasInvalidWildcardPattern(value: string): boolean {
		const firstIndex = value.indexOf("*");
		const lastIndex = value.lastIndexOf("*");

		// If there are no wildcards, the pattern is valid
		if (firstIndex === -1) {
			return false;
		}

		// The pattern is only valid if the wildcard appears at the start or end
		// Invalid patterns include: 'ab*cd' or 'a*b*c'
		return firstIndex !== 0 && lastIndex !== value.length - 1;
	}

	// Build regex pattern for handling wildcard in IS operator
	private buildRegexPattern(value: string): string {
		const specialChars = /[.+?^${}()|[\]\\]/g; // Exclude '*'
		const escapedValue = value.replace(specialChars, "\\$&");
		return `^${escapedValue.replace(/\*/g, ".*")}$`;
	}

	// Get value from Section object based on key
	private getValueByKey(item: Section, key: string): string | number {
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
				return this.checkYear(item);
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

	// Adjust year based on the instructor field
	private checkYear(item: Section): number {
		if (item.getInstructor() === "") {
			const num = 1900;
			return num;
		}
		return item.getYear();
	}

	// Apply options like COLUMNS and ORDER to the filtered data
	private applyOptions(data: Section[], options: any): InsightResult[] {
		if (!options.COLUMNS || !Array.isArray(options.COLUMNS)) {
			throw new InsightError("OPTIONS must contain COLUMNS array.");
		}

		const columns = options.COLUMNS;
		let result = data.map((item) => {
			const res: any = {};
			for (const col of columns) {
				res[col] = this.getValueByKey(item, col);
			}
			return res;
		});

		if (options.ORDER) {
			result = this.applyOrdering(result, options.ORDER);
		}

		return result;
	}

	// Apply ordering based on the ORDER field in query
	private applyOrdering(data: InsightResult[], order: any): InsightResult[] {
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

	// Validate the keys and fields in the query
	private validateQuery(query: any, datasetId: string): void {
		const validFields = ["uuid", "id", "title", "instructor", "dept", "year", "avg", "pass", "fail", "audit"];

		const queryKeys = this.collectKeys(query);

		for (const key of queryKeys) {
			this.checkKeyValidity(key, validFields, datasetId);
		}
	}

	// Recursively collect all keys from query
	private collectKeys(obj: any): string[] {
		let keys: string[] = [];
		if (typeof obj === "object" && obj !== null) {
			for (const key in obj) {
				if (["AND", "OR", "NOT", "GT", "LT", "EQ", "IS"].includes(key)) {
					keys = keys.concat(this.collectKeys(obj[key]));
				} else if (key.includes("_")) {
					keys.push(key);
				}
			}
		}
		return keys;
	}

	// Check if the key is valid
	private checkKeyValidity(key: string, validFields: string[], datasetId: string): void {
		const [keyId, field] = key.split("_");
		if (!validFields.includes(field)) {
			throw new InsightError(`Invalid key in query: ${key}`);
		}
		if (keyId !== datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}
	}
}
