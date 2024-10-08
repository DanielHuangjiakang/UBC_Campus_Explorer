import { InsightResult } from "./IInsightFacade";
import Section from "./Section";

export default class QueryExecutor {
	private datasetsSections: Map<string, Section[]>;

	constructor(datasetsSections: Map<string, Section[]>) {
		this.datasetsSections = datasetsSections;
	}

	public async executeQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Execute query and get results
		if (query === null) {
			return [];
		}
		return []; // Placeholder
	}
}
