import { InsightError, InsightResult } from "./IInsightFacade";
import DatasetManager from "./DatasetManager";
import Room from "./Room";

export default class RoomQueryRunner {
    private datasetMap: Map<string, Room[]>;
    private datasetId!: string;

    constructor(datasetManager: DatasetManager) {
        this.datasetMap = datasetManager.getDatasets() as Map<string, Room[]>; // Cast to Map<string, Room[]>
    }

    public async execute(query: any): Promise<InsightResult[]> {
        console.log("Rooms")
        this.datasetId = this.extractDatasetId(query);

        if (!this.datasetMap.has(this.datasetId)) {
            throw new InsightError(`Dataset with id "${this.datasetId}" does not exist.`);
        }

        this.validateQuery(query, this.datasetId);
        const dataset = this.datasetMap.get(this.datasetId) as Room[];

        const filteredData = this.applyFilters(dataset, query.WHERE);
        let resultData = this.applyOptions(filteredData, query.OPTIONS);

        if (query.TRANSFORMATIONS) {
            resultData = this.applyTransformations(resultData, query.TRANSFORMATIONS);
        }

        return resultData;
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
            return this.handleAnd(where.AND);}
        if (where.OR) {
            return this.handleOr(where.OR);}
        if (where.NOT) {
            return this.handleNot(where.NOT);}
        if (where.GT || where.LT || where.EQ) {
            return this.handleComparison(where);}
        if (where.IS) {
            return this.handleIs(where.IS);}
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

        if (key.split("_")[0] !== this.datasetId) {
            throw new InsightError(`Key does not match dataset ID: ${key}`);
        }

        return (item: Room) => {
            const itemValue = this.getValueByKey(item, key);
            if (typeof itemValue !== "number" || typeof value !== "number") {
                throw new InsightError("Comparison requires numeric values.");
            }

            return operator === "GT" ? itemValue > value : operator === "LT" ? itemValue < value : itemValue === value;
        };
    }

    private handleIs(isCondition: any): (item: Room) => boolean {
        const key = Object.keys(isCondition)[0];
        const value = isCondition[key];
        if (key.split("_")[0] !== this.datasetId) {
            throw new InsightError(`Key does not match dataset ID: ${key}`);
        }

        if (typeof value !== "string") {
            throw new InsightError("IS operator requires a string value.");
        }

        const regexPattern = this.buildRegexPattern(value);
        const regex = new RegExp(regexPattern);

        return (item: Room) => {
            const itemValue = this.getValueByKey(item, key);
            return typeof itemValue === "string" && regex.test(itemValue);
        };
    }

    private buildRegexPattern(value: string): string {
        const specialChars = /[.+?^${}()|[\]\\]/g;
        const escapedValue = value.replace(specialChars, "\\$&");
        return `^${escapedValue.replace(/\*/g, ".*")}$`;
    }

    private getValueByKey(item: Room, key: string): string | number {
        const [id, field] = key.split("_");
        if (id !== this.datasetId) {
            throw new InsightError(`Key does not match dataset ID: ${key}`);
        }

        switch (field) {
            case "fullname": return item.getFullname();
            case "shortname": return item.getShortname();
            case "number": return item.getNumber();
            case "name": return item.getName();
            case "address": return item.getAddress();
            case "lat": return item.getLat();
            case "lon": return item.getLon();
            case "seats": return item.getSeats();
            case "type": return item.getType();
            case "furniture": return item.getFurniture();
            case "href": return item.getHref();
            default: throw new InsightError(`Invalid column: ${key}`);
        }
    }

    private applyOptions(data: Room[], options: any): InsightResult[] {
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
        } else if (order.keys && Array.isArray(order.keys)) {
            const dir = order.dir === "DOWN" ? -1 : 1;
            return data.sort((a, b) => {
                for (const key of order.keys) {
                    if (a[key] > b[key]) {
                        return dir;
                    }
                    if (a[key] < b[key]) {
                        return -dir;
                    }
                }
                return 0;
            });
        }
        throw new InsightError("Invalid ORDER format.");
    }

    private applyTransformations(data: InsightResult[], transformations: any): InsightResult[] {
        const groups = this.groupByKeys(data, transformations.GROUP);
        return this.applyAggregation(groups, transformations.APPLY);
    }

    private groupByKeys(data: InsightResult[], groupKeys: string[]): Map<string, InsightResult[]> {
        const groups = new Map<string, InsightResult[]>();

        for (const item of data) {
            const groupKey = groupKeys.map((key) => item[key]).join("_");
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey)!.push(item);
        }

        return groups;
    }

    private applyAggregation(groups: Map<string, InsightResult[]>, applyRules: any[]): InsightResult[] {
        const result: InsightResult[] = [];

        for (const groupItems of groups.values()) {
            const aggregatedItem: any = { ...groupItems[0] };

            for (const rule of applyRules) {
                const applyKey = Object.keys(rule)[0];
                const operationObj = rule[applyKey];
                const operation = Object.keys(operationObj)[0];
                const targetKey = operationObj[operation];
                const values = groupItems.map((item) => item[targetKey]);

                aggregatedItem[applyKey] = this.applyOperation(operation, values);
            }

            result.push(aggregatedItem);
        }

        return result;
    }

    private applyOperation(operation: string, values: (string | number)[]): number {
        const numericValues = values.filter((v): v is number => typeof v === "number");

        switch (operation) {
            case "MAX": return Math.max(...numericValues);
            case "MIN": return Math.min(...numericValues);
            case "AVG": return parseFloat((numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(1));
            case "SUM": return parseFloat(numericValues.reduce((a, b) => a + b, 0).toFixed(1));
            case "COUNT": return new Set(numericValues).size;
            default: throw new InsightError(`Invalid APPLY operation: ${operation}`);
        }
    }

    private validateQuery(query: any, datasetId: string): void {
        const validFields = ["fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type", "furniture", "href"];

        const queryKeys = this.collectKeys(query);

        for (const key of queryKeys) {
            this.checkKeyValidity(key, validFields, datasetId);
        }
    }

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
