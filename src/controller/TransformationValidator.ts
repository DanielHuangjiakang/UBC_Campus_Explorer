import { InsightError } from "./IInsightFacade";

export default class TransformationValidator {
	private validKeys: Set<string>;

	constructor(validKeys: Set<string>) {
		this.validKeys = validKeys;
	}

	public checkTransClause(transformations: any, datasetId: string): boolean {
		if (!transformations?.GROUP || !transformations?.APPLY) {
			throw new InsightError("TRANSFORMATIONS must contain GROUP and APPLY.");
		}

		// Ensure no extra keys in TRANSFORMATIONS
		const allowedKeys = ["GROUP", "APPLY"];
		for (const key in transformations) {
			if (!allowedKeys.includes(key)) {
				throw new InsightError(`Extra keys in TRANSFORMATIONS: ${key} is not allowed`);
			}
		}


		this.validateGroupClause(transformations.GROUP, datasetId);
		this.validateApplyClause(transformations.APPLY, datasetId);
		return true;
	}

	public extractDatasetIdFromTransformation(trans: any): string {
		if (Array.isArray(trans.GROUP)) {
			for (const groupKey of trans.GROUP) {
				if (typeof groupKey === "string" && groupKey.includes("_")) {
					return groupKey.split("_")[0];
				}
			}
		}

		if (Array.isArray(trans.APPLY)) {
			for (const applyRule of trans.APPLY) {
				if (typeof applyRule === "object" && applyRule !== null) {
					const applyKey = Object.values(applyRule)[0];
					if (typeof applyKey === "object" && applyKey !== null) {
						const targetField = Object.values(applyKey)[0];
						if (typeof targetField === "string" && targetField.includes("_")) {
							return targetField.split("_")[0];
						}
					}
				}
			}
		}

		throw new InsightError("Could not extract dataset ID from TRANSFORMATIONS.");
	}

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

	private validateApplyClause(apply: Record<string, Record<string, string>>[], datasetId: string): void {
		if (!Array.isArray(apply)) {
			throw new InsightError("APPLY must be an array.");
		}

		const seenApplyKeys = new Set<string>();
		for (const applyRule of apply) {
			this.validateApplyRule(applyRule, datasetId);

			const applyKey = Object.keys(applyRule)[0];
			if (seenApplyKeys.has(applyKey)) {
				throw new InsightError(`Duplicate APPLY key: ${applyKey}`);
			}
			seenApplyKeys.add(applyKey);
		}
	}

	private validateApplyRule(applyRule: Record<string, Record<string, string>>, datasetId: string): void {
		const keys = Object.keys(applyRule);
		if (keys.length !== 1) {
			throw new InsightError("Each APPLY rule must have exactly one key.");
		}

		const applyKey = keys[0];
		const operationObject = applyRule[applyKey];

		// Check for underscores in applyKey
		if (applyKey.includes("_")) {
			throw new InsightError("APPLY key cannot contain underscores.");
		}

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
			throw new InsightError(`Invalid APPLY operation: ${operation}`);
		}
		if (typeof targetField !== "string" || !targetField.includes("_")) {
			throw new InsightError("APPLY operation target must be a string in the format 'dataset_field'.");
		}

		const [targetDatasetId] = targetField.split("_");
		if (targetDatasetId !== datasetId) {
			throw new InsightError(`APPLY target field ${targetField} does not match dataset ID: ${datasetId}.`);
		}
	}
}
