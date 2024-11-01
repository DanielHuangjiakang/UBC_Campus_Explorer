import { InsightError } from "./IInsightFacade";

export default class QuerySingleIdChecker {
	// Ensure the query references a single dataset
	public checkSingleDataset(query: unknown): boolean {
		const datasetIds = new Set<string>();

		// Ensure OPTIONS and COLUMNS exist and are valid
		this.validateOptionsAndColumns(query);

		// Collect dataset IDs throughout the query
		this.collectDatasetIds(query, datasetIds);
		return datasetIds.size === 1;
	}

	// Validate that OPTIONS and COLUMNS are present and correctly formatted
	private validateOptionsAndColumns(query: unknown): void {
		if (
			!query ||
			typeof query !== "object" ||
			!Array.isArray((query as any).OPTIONS?.COLUMNS) ||
			(query as any).OPTIONS.COLUMNS.length === 0
		) {
			throw new InsightError("OPTIONS must contain a non-empty COLUMNS array.");
		}

		// Collect custom APPLY keys if TRANSFORMATIONS exists
		const customApplyKeys = this.getCustomApplyKeys(query);

		// Validate each column in COLUMNS but ignore custom APPLY keys
		for (const column of (query as any).OPTIONS.COLUMNS) {
			// Check if column has "_" (indicating dataset ID) and is not in customApplyKeys
			if (!customApplyKeys.has(column) && column.includes("_")) {
				this.extractDatasetIdFromKey(column, new Set([column]));
			}
		}
	}

	// Extract custom APPLY keys from TRANSFORMATIONS
	private getCustomApplyKeys(query: unknown): Set<string> {
		const customKeys = new Set<string>();
		const transformations = (query as any).TRANSFORMATIONS;

		if (transformations && Array.isArray(transformations.APPLY)) {
			for (const applyRule of transformations.APPLY) {
				for (const key in applyRule) {
					customKeys.add(key);
				}
			}
		}
		return customKeys;
	}

	// Recursive function to traverse through the query object and collect dataset IDs
	private collectDatasetIds(obj: any, datasetIds: Set<string>): void {
		if (typeof obj === "object" && obj !== null) {
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key)) {
					if (key.includes("_")) {
						this.extractDatasetIdFromKey(key, datasetIds);
					} else if (key === "APPLY") {
						this.collectDatasetIdsFromApply(obj[key], datasetIds);
					} else if (key === "COLUMNS" && Array.isArray(obj[key])) {
						// Specifically handle columns as an array
						this.collectDatasetIdsFromArray(obj[key], datasetIds);
					} else if (typeof obj[key] === "object" && obj[key] !== null) {
						this.collectDatasetIds(obj[key], datasetIds);
					} else if (Array.isArray(obj[key])) {
						this.collectDatasetIdsFromArray(obj[key], datasetIds);
					}
				}
			}
		}
	}

	// Extract and add dataset ID from a key that contains "_"
	private extractDatasetIdFromKey(key: string, datasetIds: Set<string>): void {
		const datasetId = key.split("_")[0];
		datasetIds.add(datasetId);
	}

	// Collect dataset IDs from an array of objects or strings
	private collectDatasetIdsFromArray(array: any[], datasetIds: Set<string>): void {
		for (const item of array) {
			if (typeof item === "string" && item.includes("_")) {
				this.extractDatasetIdFromKey(item, datasetIds);
			} else if (typeof item === "object" && item !== null) {
				this.collectDatasetIds(item, datasetIds);
			}
		}
	}

	// Special handling to collect dataset IDs from APPLY rules
	private collectDatasetIdsFromApply(applyRules: any[], datasetIds: Set<string>): void {
		for (const applyRule of applyRules) {
			for (const operation in applyRule) {
				const applyObj = applyRule[operation];
				for (const applyKey in applyObj) {
					if (applyObj[applyKey].includes("_")) {
						// Only consider fields with "_"
						const datasetId = applyObj[applyKey].split("_")[0];
						datasetIds.add(datasetId);
					}
				}
			}
		}
	}
}
