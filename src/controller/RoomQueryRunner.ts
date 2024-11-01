import { InsightError, InsightResult } from "./IInsightFacade";
import DatasetManager from "./DatasetManager";
import Room from "./Room";
import Decimal from "decimal.js";

type DatasetEntry = Room;

const DECIMAL_PRECISION = 2;

export default class RoomQueryRunner {
	private datasetMap: Map<string, DatasetEntry[]>;
	private datasetId!: string;
	private groupedData: Map<string, Room[]>;

	constructor(datasetManager: DatasetManager) {
		this.datasetMap = datasetManager.getDatasets() as Map<string, Room[]>;
		this.groupedData = new Map<string, Room[]>();
	}

	// Execute the query and return the results
	// Execute the query and return the results
	public async execute(query: any): Promise<InsightResult[]> {
		this.datasetId = this.extractDatasetId(query);

		if (!this.datasetMap.has(this.datasetId)) {
			throw new InsightError(`Dataset with id "${this.datasetId}" does not exist.`);
		}

		// Step 1: Apply filters to get the filtered data
		const dataset = this.datasetMap.get(this.datasetId) as Room[];
		const filteredData = this.applyFilters(dataset, query.WHERE);

		// Step 2: Perform transformations only on the filtered data
		const transformedData: InsightResult[] = query.TRANSFORMATIONS
			? this.applyTransformations(filteredData, query.TRANSFORMATIONS) // Pass filteredData here
			: (filteredData as unknown as InsightResult[]);

		// Validate columns against GROUP and APPLY if TRANSFORMATIONS exist
		if (query.TRANSFORMATIONS) {
			const groupKeys = new Set(query.TRANSFORMATIONS.GROUP);
			const applyKeys = new Set(query.TRANSFORMATIONS.APPLY.map((applyRule: any) => Object.keys(applyRule)[0]));
			for (const col of query.OPTIONS.COLUMNS) {
				if (!groupKeys.has(col) && !applyKeys.has(col)) {
					throw new InsightError(`Key ${col} in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS`);
				}
			}
		}

		return this.applyOptions(transformedData, query.OPTIONS);
	}

	private extractDatasetId(query: any): string {
		for (const col of query.OPTIONS.COLUMNS) {
			if (col.includes("_")) {
				return col.split("_")[0];
			}
		}
		throw new InsightError("Could not extract dataset ID from COLUMNS.");
	}

	private applyFilters<T extends Room>(data: T[], where: any): T[] {
		if (Object.keys(where).length === 0) {
			return data;
		}

		const filterFunction = this.createFilterFunction(where);

		const filteredData = data.filter(filterFunction);

		return filteredData;
	}

	// Create a filter function based on WHERE conditions
	private createFilterFunction(where: any): (item: Room) => boolean {
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
	private handleAnd(andConditions: any[]): (item: Room) => boolean {
		const subFilters = andConditions.map((condition) => this.createFilterFunction(condition));
		return (item) => subFilters.every((filterFunc) => filterFunc(item));
	}

	// Handle OR logic for filters
	private handleOr(orConditions: any[]): (item: Room) => boolean {
		const subFilters = orConditions.map((condition) => this.createFilterFunction(condition));
		return (item) => subFilters.some((filterFunc) => filterFunc(item));
	}

	// Handle NOT logic for filters
	private handleNot(notCondition: any): (item: Room) => boolean {
		const subFilter = this.createFilterFunction(notCondition);
		return (item) => !subFilter(item);
	}

	// Handle comparison operators like GT, LT, EQ
	private handleComparison(where: any): (item: Room) => boolean {
		const operator = where.GT ? "GT" : where.LT ? "LT" : "EQ";
		const comparison = where[operator];
		const key = Object.keys(comparison)[0];
		const value = comparison[key];

		return (item) => {
			const itemValue = this.getValueByKey(item, key);

			if (typeof itemValue !== "number" || typeof value !== "number") {
				throw new InsightError("Comparison requires numeric values.");
			}

			switch (operator) {
				case "GT":
					return itemValue > value;
				case "LT":
					return itemValue < value;
				case "EQ":
					return itemValue === value;
				default:
					return false;
			}
		};
	}

	// Handle the IS operator for string comparisons in the WHERE clause
	private handleIs(isCondition: any): (item: Room) => boolean {
		const key = Object.keys(isCondition)[0];
		const value = isCondition[key];
		if (typeof value !== "string") {
			throw new InsightError("IS operator requires a string value.");
		}
		const regexPattern = this.buildRegexPattern(value);
		const regex = new RegExp(regexPattern);

		return (item) => {
			const itemValue = this.getValueByKey(item, key);
			if (typeof itemValue !== "string") {
				throw new InsightError("IS operator requires string fields.");
			}
			return regex.test(itemValue);
		};
	}

	// Helper to build regex pattern for IS operator
	private buildRegexPattern(value: string): string {
		const specialChars = /[.+?^${}()|[\]\\]/g;
		const escapedValue = value.replace(specialChars, "\\$&");
		return `^${escapedValue.replace(/\*/g, ".*")}$`;
	}

	private getValueByKey(item: Room | InsightResult, key: string): any {
		// If item is already an InsightResult, return the value directly
		if (!(item instanceof Room)) {
			return item[key];
		}

		// Split the key to get the dataset identifier and field
		const [id, field] = key.split("_");

		// Verify the dataset ID matches
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}

		// Access fields based on the field name
		switch (field) {
			case "fullname":
				return String(item.getFullname());
			case "shortname":
				return String(item.getShortname());
			case "number":
				return String(item.getNumber());
			case "name":
				return String(item.getName());
			case "address":
				return String(item.getAddress());
			case "type":
				return String(item.getType());
			case "furniture":
				return String(item.getFurniture());
			case "seats":
				return item.getSeats() !== undefined ? item.getSeats() : undefined;
			case "lat":
				return item.getLat();
			case "lon":
				return item.getLon();
			case "href": // Added handling for rooms_href
				return String(item.getHref());
			default:
				// Handle any unexpected field by throwing an error or returning undefined
				throw new InsightError(`Invalid or unexpected column: ${key}`);
		}
	}

	private applyTransformations(data: Room[], transformations: any): InsightResult[] {
		const groupKeys = transformations.GROUP;

		// Ensure groupBy is called only on the filtered data passed as 'data'
		this.groupedData = this.groupBy(data, groupKeys);

		return this.applyAggregations(transformations.APPLY, groupKeys);
	}

	private groupBy(data: Room[], groupKeys: string[]): Map<string, Room[]> {
		const groupedData = new Map<string, Room[]>(); // Temporary map for grouping

		data.forEach((item) => {
			const groupKey = groupKeys.map((key) => this.getValueByKey(item, key)).join("_");
			if (!groupedData.has(groupKey)) {
				groupedData.set(groupKey, []);
			}
			groupedData.get(groupKey)!.push(item);
		});

		return groupedData; // Return the local grouped data map
	}

	private applyAggregations(applyRules: any[], groupKeys: string[]): InsightResult[] {
		const results: InsightResult[] = [];

		this.groupedData.forEach((group) => {
			const result: any = {};

			// Set group key values in the result
			groupKeys.forEach((key) => {
				result[key] = this.getValueByKey(group[0], key);
			});

			// Apply each rule in APPLY to calculate the aggregation
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
	private performAggregation(type: string, group: Room[], field: string): number {
		const isNumeric = group.every((item) => {
			const value = this.getValueByKey(item, field);
			return typeof value === "number" && !isNaN(value);
		});

		if (!isNumeric && type !== "COUNT") {
			throw new InsightError(`${type} requires a numeric field`);
		}

		switch (type) {
			case "MAX":
				return Math.max(...group.map((item) => this.getValueByKey(item, field) as number));
			case "MIN":
				return Math.min(...group.map((item) => this.getValueByKey(item, field) as number));
			case "AVG": {
				const total = group.reduce(
					(acc, item) => acc.add(new Decimal(this.getValueByKey(item, field) as number)),
					new Decimal(0)
				);
				const avg = total.toNumber() / group.length;
				return Number(avg.toFixed(DECIMAL_PRECISION));
			}
			case "SUM": {
				const total = group.reduce((acc, item) => (acc + this.getValueByKey(item, field)) as number, 0);
				return Number(total.toFixed(DECIMAL_PRECISION));
			}
			case "COUNT":
				return new Set(group.map((item) => this.getValueByKey(item, field))).size;
			default:
				throw new InsightError("Invalid aggregation type");
		}
	}

	private applyOptions(data: Room[] | InsightResult[], options: any): InsightResult[] {
		if (!options.COLUMNS || !Array.isArray(options.COLUMNS)) {
			throw new InsightError("OPTIONS must contain COLUMNS array.");
		}

		const columns: string[] = options.COLUMNS;
		const result = data.map((item) => {
			const res: any = {};
			columns.forEach((col: string) => {
				res[col] = this.getValueByKey(item, col);
			});
			return res;
		});

		if (options.ORDER) {
			return this.applyOrdering(result, options.ORDER);
		}
		return result;
	}

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
