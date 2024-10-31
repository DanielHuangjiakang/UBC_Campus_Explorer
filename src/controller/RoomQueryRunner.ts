import { InsightError, InsightResult } from "./IInsightFacade";
import DatasetManager from "./DatasetManager"; // Use DatasetManager for handling datasets
import Room from "./Room";

export default class RoomQueryRunner {
    private datasetMap: Map<string, Room[]>;
    private datasetId!: string;

    constructor(datasetManager: DatasetManager) {
        this.datasetMap = new Map(
            [...datasetManager.getDatasets()].filter(([_, entries]) =>
                entries.every((entry) => entry instanceof Room)
            ) as [string, Room[]][]
        );
    }

    // Execute the query and return the results
    public async execute(query: any): Promise<InsightResult[]> {
        this.datasetId = this.extractDatasetId(query);

        const dataset = this.datasetMap.get(this.datasetId);
        if (!dataset) {
            throw new InsightError(`Dataset with id ${this.datasetId} not found or is not a Room dataset.`);
        }

        const filteredData = this.applyFilters(dataset, query.WHERE);

        let resultData = this.applyOptions(filteredData, query.OPTIONS);

        if (query.TRANSFORMATIONS) {
            resultData = this.applyTransformations(resultData, query.TRANSFORMATIONS);
        }

        return resultData;
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
            case "shortname":
                return item.getShortname();
            case "fullname":
                return item.getFullname();
            case "address":
                return item.getAddress();
            case "lat":
                return item.getLat();
            case "lon":
                return item.getLon();
            case "seats":
                return item.getSeats();
            case "type":
                return item.getType();
            case "furniture":
                return item.getFurniture();
            case "href":
                return item.getHref();
            default:
                throw new InsightError(`Invalid column: ${key}`);
        }
    }

    // Apply options like COLUMNS and ORDER to the filtered data
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

    // Apply transformations such as GROUP and APPLY
    private applyTransformations(data: InsightResult[], transformations: any): InsightResult[] {
        const groups = this.groupByKeys(data, transformations.GROUP);
        return this.applyAggregation(groups, transformations.APPLY);
    }

    private groupByKeys(data: InsightResult[], groupKeys: string[]): Map<string, InsightResult[]> {
        const groups = new Map<string, InsightResult[]>();

        for (const item of data) {
            const _groupKey = groupKeys.map((key) => item[key]).join("_");
            if (!groups.has(_groupKey)) {
                groups.set(_groupKey, []);
            }
            groups.get(_groupKey)!.push(item);
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
            case "MAX":
                return Math.max(...numericValues);
            case "MIN":
                return Math.min(...numericValues);
            case "AVG":
                return parseFloat((numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2));
            case "SUM":
                return parseFloat(numericValues.reduce((a, b) => a + b, 0).toFixed(2));
            case "COUNT":
                return new Set(numericValues).size;
            default:
                throw new InsightError(`Invalid APPLY operation: ${operation}`);
        }
    }
}
