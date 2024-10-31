import { InsightError, InsightResult } from "./IInsightFacade";
import DatasetManager from "./DatasetManager"; // Use DatasetManager for handling datasets
import Section from "./Section";
import Room from "./Room";
import Decimal from "decimal.js";
type DatasetEntry = Section | Room;

// Define a constant for the decimal precision
const DECIMAL_PRECISION = 2;

export default class SectionQueryRunner {
	private datasetMap: Map<string, DatasetEntry[]>;
	private datasetId!: string; // Declare datasetId with definite assignment

	constructor(datasetManager: DatasetManager) {
		this.datasetMap = datasetManager.getDatasets(); // Initialize datasets
	}

	// Execute the query and return the results
	public async execute(query: any): Promise<InsightResult[]> {
		this.datasetId = this.extractDatasetId(query);

		if (!this.datasetMap.has(this.datasetId)) {
			throw new InsightError(`Dataset with id "${this.datasetId}" does not exist.`);
		}

		const dataset = this.datasetMap.get(this.datasetId) as Section[];
		const filteredData = this.applyFilters(dataset, query.WHERE);

		// Validate columns against GROUP and APPLY if TRANSFORMATIONS is present
		if (query.TRANSFORMATIONS) {
			const groupKeys = new Set(query.TRANSFORMATIONS.GROUP);
			const applyKeys = new Set(query.TRANSFORMATIONS.APPLY.map((applyRule: any) => Object.keys(applyRule)[0]));
			for (const col of query.OPTIONS.COLUMNS) {
				if (!groupKeys.has(col) && !applyKeys.has(col)) {
					throw new InsightError(`Key ${col} in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS.`);
				}
			}
		}

		const transformedData: InsightResult[] = query.TRANSFORMATIONS
			? this.applyTransformations(filteredData, query.TRANSFORMATIONS)
			: (filteredData as unknown as InsightResult[]);

		return this.applyOptions(transformedData, query.OPTIONS);
	}

	// Extract dataset ID from query COLUMNS
	private extractDatasetId(query: any): string {
		// Check COLUMNS for dataset ID
		for (const col of query.OPTIONS?.COLUMNS || []) {
			if (col.includes("_")) {
				return col.split("_")[0];
			}
		}

		// If COLUMNS don't contain dataset ID, check GROUP keys in TRANSFORMATIONS
		for (const groupKey of query.TRANSFORMATIONS?.GROUP || []) {
			if (groupKey.includes("_")) {
				return groupKey.split("_")[0];
			}
		}

		throw new InsightError("Could not extract dataset ID from COLUMNS or TRANSFORMATIONS GROUP.");
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

	private hasInvalidWildcardPattern(value: string): boolean {
		// Skip validation if there’s no wildcard character.
		if (!value.includes("*")) {
			return false;
		}

		const firstIndex = value.indexOf("*");
		const lastIndex = value.lastIndexOf("*");
		// The pattern is only valid if the wildcard appears at the start or end
		return firstIndex !== 0 && lastIndex !== value.length - 1;
	}

	// Build regex pattern for handling wildcard in IS operator
	private buildRegexPattern(value: string): string {
		const specialChars = /[.+?^${}()|[\]\\]/g; // Exclude '*'
		const escapedValue = value.replace(specialChars, "\\$&");
		return `^${escapedValue.replace(/\*/g, ".*")}$`;
	}

	// Get value from Section or InsightResult based on key
	private getValueByKey(item: Section | InsightResult, key: string): any {
		// If item is already an InsightResult, return the value directly
		if (!(item instanceof Section)) {
			return item[key];
		}

		// Otherwise, it's a Section and we access its fields
		const [id, field] = key.split("_");
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}
		switch (field) {
			case "uuid":
				return String(item.getUuid());
			case "id":
				return String(item.getId());
			case "title":
				return String(item.getTitle());
			case "instructor":
				return String(item.getInstructor());
			case "dept":
				return String(item.getDept());
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

	// Apply transformations for GROUP and APPLY
	private applyTransformations(data: Section[], transformations: any): InsightResult[] {
		const groupKeys = transformations.GROUP;
		const groupedData = this.groupBy(data, groupKeys);
		return this.applyAggregations(groupedData, transformations.APPLY, groupKeys);
	}

	// Group data by specified keys
	private groupBy(data: Section[], groupKeys: string[]): Map<string, Section[]> {
		const groupedData = new Map<string, Section[]>();

		data.forEach((item) => {
			const groupKey = groupKeys.map((key) => this.getValueByKey(item, key)).join("_");
			if (!groupedData.has(groupKey)) {
				groupedData.set(groupKey, []);
			}
			groupedData.get(groupKey)!.push(item);
		});

		return groupedData;
	}

	// Apply aggregation rules to each group
	private applyAggregations(
		groupedData: Map<string, Section[]>,
		applyRules: any[],
		groupKeys: string[]
	): InsightResult[] {
		const results: InsightResult[] = [];

		groupedData.forEach((group) => {
			const result: any = {};

			// Include group keys (like sections_title) in each result
			groupKeys.forEach((key) => {
				result[key] = this.getValueByKey(group[0], key);
			});

			for (const rule of applyRules) {
				const applyKey = Object.keys(rule)[0];
				const applyToken = rule[applyKey];
				const aggregationField = Object.values(applyToken)[0] as string;
				const aggregationType = Object.keys(applyToken)[0] as string;

				result[applyKey] = this.performAggregation(aggregationType, group, aggregationField);
			}

			results.push(result);
		});

		return results;
	}

	// Perform aggregation operations
	private performAggregation(type: string, group: Section[], field: string): number {
		const isNumeric = group.every((item) => {
			const value = this.getValueByKey(item, field);
			return typeof value === "number" && !isNaN(value);
		});

		if (!isNumeric) {
			throw new InsightError(`${type} requires a numeric field`);
		}
		switch (type) {
			case "MAX":
				return Math.max(...group.map((item) => this.getValueByKey(item, field) as number));
			case "MIN":
				return Math.min(...group.map((item) => this.getValueByKey(item, field) as number));
			case "AVG": {
				// Ensure each value is converted to a Decimal and add them up
				const total = group.reduce(
					(acc, item) => acc.add(new Decimal(this.getValueByKey(item, field) as number)),
					new Decimal(0)
				);

				// Calculate the average by dividing total by the number of items (numRows)
				const avg = total.toNumber() / group.length;

				// Round the result to two decimal places and cast it to a number
				return Number(avg.toFixed(DECIMAL_PRECISION));
			}

			case "SUM": {
				// Use Decimal for precision, and round the final result
				const total = group.reduce(
					(acc, item) => acc.add(new Decimal(this.getValueByKey(item, field) as number)),
					new Decimal(0)
				);
				return Number(total.toFixed(DECIMAL_PRECISION));
			}
			case "COUNT":
				return new Set(group.map((item) => this.getValueByKey(item, field))).size;
			default:
				throw new InsightError("Invalid aggregation type");
		}
	}

	// Apply options like COLUMNS and ORDER to the filtered or transformed data
	private applyOptions(data: Section[] | InsightResult[], options: any): InsightResult[] {
		if (!options.COLUMNS || !Array.isArray(options.COLUMNS)) {
			throw new InsightError("OPTIONS must contain COLUMNS array.");
		}

		const columns = options.COLUMNS;
		let result = data.map((item) => {
			const res: any = {};
			for (const col of columns) {
				// Check if item is a Section or InsightResult before accessing values
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
			// Single string ORDER
			const key = order;
			return data.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0));
		} else if (typeof order === "object") {
			// Multi-key ORDER
			if (!order.keys || !Array.isArray(order.keys) || order.keys.length === 0) {
				// Throw error if `keys` is missing or not an array or empty
				throw new InsightError("ORDER must contain a non-empty 'keys' array.");
			}

			const keys = order.keys;
			const dir = order.dir === "DOWN" ? -1 : 1; // Default to "UP" if `dir` is undefined

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
}
