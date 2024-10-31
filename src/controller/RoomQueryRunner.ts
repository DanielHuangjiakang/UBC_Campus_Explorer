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
	public async execute(query: any): Promise<InsightResult[]> {
		this.datasetId = this.extractDatasetId(query);

		if (!this.datasetMap.has(this.datasetId)) {
			throw new InsightError(`Dataset with id "${this.datasetId}" does not exist.`);
		}

		const dataset = this.datasetMap.get(this.datasetId) as Room[];
		const filteredData = this.applyFilters(dataset, query.WHERE);

		const transformedData: InsightResult[] = query.TRANSFORMATIONS
			? this.applyTransformations(filteredData, query.TRANSFORMATIONS)
			: (filteredData as unknown as InsightResult[]);

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

	private applyFilters(data: Room[], where: any): Room[] {
		if (Object.keys(where).length === 0) {
			return data;
		}
		const filterFunction = this.createFilterFunction(where);
		return data.filter(filterFunction);
	}

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

	private handleAnd(andConditions: any[]): (item: Room) => boolean {
		const subFilters = andConditions.map((condition) => this.createFilterFunction(condition));
		return (item: Room) => subFilters.every((filterFunc) => filterFunc(item));
	}

	private handleOr(orConditions: any[]): (item: Room) => boolean {
		const subFilters = orConditions.map((condition) => this.createFilterFunction(condition));
		return (item: Room) => subFilters.some((filterFunc) => filterFunc(item));
	}

	private handleNot(notCondition: any): (item: Room) => boolean {
		const subFilter = this.createFilterFunction(notCondition);
		return (item: Room) => !subFilter(item);
	}

	private handleComparison(where: any): (item: Room) => boolean {
		const operator = where.GT ? "GT" : where.LT ? "LT" : "EQ";
		const comparison = where[operator];
		const key = Object.keys(comparison)[0];
		const value = comparison[key];

		const id = key.split("_")[0];
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}

		return (item: Room) => {
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
			return itemValue === value;
		};
	}

	private handleIs(isCondition: any): (item: Room) => boolean {
		const key = Object.keys(isCondition)[0];
		const value = isCondition[key];

		const id = key.split("_")[0];
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}

		if (typeof value !== "string") {
			throw new InsightError("IS operator requires a string value.");
		}

		if (this.hasInvalidWildcardPattern(value)) {
			throw new InsightError("Invalid wildcard pattern in IS operator.");
		}

		const regexPattern = this.buildRegexPattern(value);
		const regex = new RegExp(regexPattern);

		return (item: Room) => {
			const itemValue = this.getValueByKey(item, key);

			if (typeof itemValue !== "string") {
				throw new InsightError("IS operator requires string fields.");
			}

			return regex.test(itemValue);
		};
	}

	private hasInvalidWildcardPattern(value: string): boolean {
		const firstIndex = value.indexOf("*");
		const lastIndex = value.lastIndexOf("*");
		return firstIndex !== 0 && lastIndex !== value.length - 1;
	}

	private buildRegexPattern(value: string): string {
		const specialChars = /[.+?^${}()|[\]\\]/g;
		const escapedValue = value.replace(specialChars, "\\$&");
		return `^${escapedValue.replace(/\*/g, ".*")}$`;
	}

	private getValueByKey(item: Room | InsightResult, key: string): any {
		if (!(item instanceof Room)) {
			return item[key];
		}

		const [id, field] = key.split("_");
		if (id !== this.datasetId) {
			throw new InsightError(`Key does not match dataset ID: ${key}`);
		}

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
				return item.getSeats();
			case "lat":
				return item.getLat();
			case "lon":
				return item.getLon();
			default:
				throw new InsightError(`Invalid column: ${key}`);
		}
	}

	private applyTransformations(data: Room[], transformations: any): InsightResult[] {
		const groupKeys = transformations.GROUP;
		this.groupedData = this.groupBy(data, groupKeys);
		return this.applyAggregations(transformations.APPLY, groupKeys);
	}

	private groupBy(data: Room[], groupKeys: string[]): Map<string, Room[]> {
		data.forEach((item) => {
			const groupKey = groupKeys.map((key) => this.getValueByKey(item, key)).join("_");
			if (!this.groupedData.has(groupKey)) {
				this.groupedData.set(groupKey, []);
			}
			this.groupedData.get(groupKey)!.push(item);
		});

		return this.groupedData;
	}

	private applyAggregations(applyRules: any[], groupKeys: string[]): InsightResult[] {
		const results: InsightResult[] = [];

		this.groupedData.forEach((group) => {
			const result: any = {};

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

	private performAggregation(type: string, group: Room[], field: string): number {
		// Check if the field is numeric for AVG and SUM operations
		const isNumeric = group.every((item) => typeof this.getValueByKey(item, field) === "number");

		switch (type) {
			case "MAX":
				return Math.max(...group.map((item) => this.getValueByKey(item, field) as number));
			case "MIN":
				return Math.min(...group.map((item) => this.getValueByKey(item, field) as number));
			case "AVG": {
				if (!isNumeric) {
					throw new InsightError("AVG aggregation requires a numeric field");
				}
				const total = group.reduce(
					(acc, item) => acc.add(new Decimal(this.getValueByKey(item, field) as number)),
					new Decimal(0)
				);
				const avg = total.toNumber() / group.length;
				return Number(avg.toFixed(DECIMAL_PRECISION));
			}
			case "SUM": {
				const sum = group.reduce((acc, item) => {
					const value = this.getValueByKey(item, field) as number;
					return acc + value;
				}, 0);

				return parseFloat(sum.toFixed(DECIMAL_PRECISION));
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
}
