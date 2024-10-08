import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	ResultTooLargeError,
} from "./IInsightFacade";
import JSZip = require("jszip");
import fs from "fs-extra";
import path from "node:path";
import Section from "./Section";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasetsSections: Map<string, Section[]> = new Map<string, Section[]>();
	private insightDatasets: Map<string, InsightDataset> = new Map<string, InsightDataset>();
	private initialized = false;

	constructor() {
		//
	}

	private async readIdsFromFile(): Promise<string[]> {
		let paresedData: string[] = [];
		try {
			await fs.ensureDir(path.join(__dirname, "../../data"));
			const idFilePath = path.join(__dirname, "../../data/id_log.json"); // first
			const fileContent = await fs.readFile(idFilePath, "utf8");
			paresedData = JSON.parse(fileContent);
			return paresedData;
		} catch (_) {
			// console.error("Error reading id_log.json:", err);
			return paresedData;
		}
	}

	private async processStoredZipFiles(ids: string[]): Promise<void> {
		await fs.ensureDir(path.join(__dirname, "../../data"));
		const folderPath = path.join(__dirname, "../../data");
		const promises: Promise<Section[]>[] = [];
		// 读取 data 文件夹中的文件
		try {
			for (const id of ids) {
				promises.push(
					(async (): Promise<Section[]> => {
						const zip = new JSZip();
						// try {
						const buffer = await fs.readFile(path.join(folderPath, `${id}.zip`)); // 拼接路径
						const content = buffer.toString("base64");
						const unzipped = await zip.loadAsync(content, { base64: true });
						const courseFolder = unzipped.folder("courses/");
						if (courseFolder === null) {
							throw new Error(`No courses folder found in ${id}.zip`);
						}
						const sections = await this.parseJsonHelper(courseFolder);
						return sections;

						// } catch (err) {
						// 	// console.error(`Error processing ${id}.zip:`, err);
						// 	throw err;
						// }
					})()
				);
			}
			// 等待所有 Promise 完成
			const arrayOfSectionsArray: Section[][] = await Promise.all(promises);
			// 将结果存入 this.datasets
			for (let i = 0; i < ids.length; i++) {
				this.datasetsSections.set(ids[i], arrayOfSectionsArray[i]);
			}
		} catch (err) {
			console.error("Error during processing zip files:", err);
			throw err; // 抛出错误
		}
		return;
	}

	private async initialization(): Promise<void> {
		try {
			// 读取 ids
			const ids = await this.readIdsFromFile();

			// 处理 zip 文件
			await this.processStoredZipFiles(ids);

			// console.log("Initialization completed successfully.");
		} catch (err) {
			console.error("Initialization failed:", err);
			throw err; // 抛出错误以供外部处理
		}
	}

	private validateAndExtractSectionQueryableFields(data: any[]): Section[] {
		const sections: Section[] = [];
		data.forEach((singleSection) => {
			const valid: boolean =
				typeof singleSection.id === "number" &&
				typeof singleSection.Course === "string" &&
				typeof singleSection.Title === "string" &&
				typeof singleSection.Professor === "string" &&
				typeof singleSection.Subject === "string" &&
				typeof singleSection.Year === "string" &&
				typeof singleSection.Avg === "number" &&
				typeof singleSection.Pass === "number" &&
				typeof singleSection.Fail === "number" &&
				typeof singleSection.Audit === "number";

			let section;
			if (valid === true) {
				section = new Section(
					singleSection.id.toString(),
					singleSection.Course,
					singleSection.Title,
					singleSection.Professor,
					singleSection.Subject,
					parseInt(singleSection.Year, 10),
					singleSection.Avg,
					singleSection.Pass,
					singleSection.Fail,
					singleSection.Audit
				);
				sections.push(section);
			}
		});
		return sections;
	}

	private async parseJsonHelper(courseFolder: JSZip): Promise<Section[]> {
		// Create an array to hold promises for each file
		const promises: Promise<Section[]>[] = [];
		// Iterate through each file in the 'courses/' folder
		courseFolder.forEach((_, file: JSZip.JSZipObject) => {
			// Ensure file starts with courses/ and is not a directory
			if (!file.dir && !file.name.startsWith("courses/.") && file.name.startsWith("courses/")) {
				// Push a promise to the array for processing the file
				promises.push(
					(async (): Promise<Section[]> => {
						try {
							// Read the file content as a string
							const fileContent = await file.async("string");
							// Parse the JSON content
							const parsedData = JSON.parse(fileContent);
							// Check if the parsed JSON contains the 'result' field
							if (parsedData.result === undefined) {
								throw new InsightError("Result is undefined");
							}
							// Validate and extract sections
							const sections = this.validateAndExtractSectionQueryableFields(parsedData.result);
							if (sections.length === 0) {
								throw new InsightError("No valid sections");
							}
							// Return the valid sections
							// console.log(`Successfully parsed: ${file.name}`);
							return sections;
						} catch (err) {
							console.error(`Error parsing file ${file.name}:`, err);
							return []; // Return an empty array if an error occurs to avoid failing Promise.all
						}
					})()
				);
			}
		});
		// Wait for all promises to resolve using Promise.all
		const sectionsArray = await Promise.all(promises);
		// Flatten the array of sections and return the result
		return sectionsArray.flat();
	}

	private async validateID(id: string): Promise<void> {
		if (id === "" || id === " " || id.includes("_")) {
			return Promise.reject(new InsightError("Invalid ID string"));
		}

		if (Array.from(this.datasetsSections.keys()).includes(id)) {
			return Promise.reject(new InsightError("ID is used"));
		}

		return Promise.resolve();
	}

	private async validateKind(kind: InsightDatasetKind): Promise<void> {
		if (kind !== InsightDatasetKind.Sections) {
			return Promise.reject(new InsightError("Invalid Kind"));
		}

		return Promise.resolve();
	}

	private async updateIdToJsonFile(id: string): Promise<void> {
		const filePath = path.join(__dirname, "../../data/id_log.json");
		const paresedData: string[] = await this.readIdsFromFile();
		paresedData.push(id);
		try {
			const two = 2;
			await fs.writeFile(filePath, JSON.stringify(paresedData, null, two), "utf8");
			// console.log(`New id_log has been added successfully: ${id}`);
		} catch (_) {
			return Promise.reject("Failed to updateIdToJsonFile");
		}
		return Promise.resolve();
	}

	private async writeDatasetIntoZip(id: string, courseFolder: JSZip): Promise<void> {
		try {
			await fs.ensureDir(path.join(__dirname, "../../data"));
			const folderPath = path.join(__dirname, "../../data");
			const filePath = path.join(folderPath, `${id}.zip`);
			// console.log("writeDatasetIntoZip start")
			const zipContent = await courseFolder.generateAsync({ type: "nodebuffer" });
			// console.log("writeDatasetIntoZip generateAsync")
			// console.log(__dirname);
			// Write the content to a zip file and update id log
			await this.updateIdToJsonFile(id);
			await fs.writeFile(filePath, zipContent);
			// console.log("writeDatasetIntoZip writeFile")
			// console.log(`Zip file created: ${id}.zip`);
		} catch (err) {
			if (err) {
				return Promise.reject(new InsightError("Failed to save .zip file"));
			}
		}
		return Promise.resolve();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		// check if id is valid
		await this.validateID(id);
		// console.log("id passed");
		// check if kind === InsightDatasetKind.Sections
		await this.validateKind(kind);
		// console.log("kind passed");
		const zip: JSZip = new JSZip();
		try {
			if (this.initialized === false) {
				await this.initialization();
				this.initialized = true;
			}
			const unzipped = await zip.loadAsync(content, { base64: true });
			// console.log('loaded')
			// if no courses folder, throw an error
			const folderName = "courses/";
			// check if courses folder exists
			if (!Object.prototype.hasOwnProperty.call(unzipped.files, folderName)) {
				// console.log("failed");
				return Promise.reject(new InsightError("No courses folder exists"));
			}
			// console.log('courses folder found 1')
			// parse folder file into section[]
			const courseFolder = unzipped.folder(folderName);
			if (courseFolder === null) {
				return Promise.reject(new InsightError());
			}
			// console.log('courses folder found 2')
			const parsedSections: Section[] = await this.parseJsonHelper(courseFolder);
			if (parsedSections.length === 0) {
				return Promise.reject(new InsightError());
			}
			// addDataset and save .zip file for persistence
			// console.log(`length, ${parsedSections.length}`)
			await this.writeDatasetIntoZip(id, courseFolder);
			this.datasetsSections.set(id, parsedSections);
		} catch (_) {
			return Promise.reject(new InsightError());
		}
		const message = Array.from(this.datasetsSections.keys());
		// console.log(`returning message has a length of ${message.length}`);
		return Promise.resolve(message);
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	/**
	 * Perform a query on insightUBC.
	 *
	 * @param query  The query to be performed.
	 *
	 * If a query is incorrectly formatted, references a dataset not added (in memory or on disk),
	 * or references multiple datasets, it should be rejected.
	 *
	 * @return Promise <InsightResult[]>
	 *
	 * The promise should fulfill with an array of results.
	 * The promise should reject with a ResultTooLargeError (if the query returns too many results)
	 * or an InsightError (for any other source of failure) describing the error.
	 */
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// Check if it is valid for EBNF
		if (!this.checkValidEBNF(query)) {
			throw new InsightError("Invalid query format");
		}

		// Check if references exactly one dataset in its query keys.
		if (!this.referencesSingleDataset(query)) {
			throw new InsightError("Query must reference exactly one dataset.");
		}

		// TODO: Execute query and get results
		const results = this.executeQuery(query);

		// TODO: Less than or equal to 5000 results. If this limit is exceeded, reject with a ResultTooLargeError
		if ((await results).length > 1) {
			throw new ResultTooLargeError("Query returned too many results");
		}

		// Return the valid results
		return Promise.resolve(results);

		return [];
	}

	// Helper function to check if it is valid EBNF
	private checkValidEBNF(query: unknown): boolean {
		// Null or Undefined Query
		if (query === null || query === undefined || typeof query !== "object") {
			return false;
		}

		// Check if WHERE exists in the query
		if (!("WHERE" in query)) {
			throw new InsightError("Missing WHERE clause");
		}

		// Check if the format inside WHERE is valid
		if (!this.isValidWhereClause(query.WHERE)) {
			return false;
		}

		// Check if OPTIONS exists in the query
		if (!("OPTIONS" in query)) {
			throw new InsightError("Missing OPTIONS clause");
		}

		// Check if OPTIONS format is valid
		if (!this.isValidOptionsClause(query.OPTIONS)) {
			return false;
		}

		return true;
	}

	// Helper function to check if it is valid format in WHERE
	private isValidWhereClause(WHERE: any): boolean {
		// WHERE can be an empty object
		if (Object.keys(WHERE).length === 0) {
			return true;
		}

		// Check if WHERE clause contains a valid filter
		if (!this.isValidFilter(WHERE)) {
			return false;
		}

		return true;
	}


	private isValidFilter(filter: any): Boolean {
		if (typeof filter !== "object" || filter === null) {
			return false;
		}

		// Check for LOGICCOMPARISON: AND / OR
		if ("AND" in filter || "OR" in filter) {
			const logic = filter.AND || filter.OR;
			if (!Array.isArray(logic) || logic.length === 0) {
				throw new InsightError("LOGIC must be a non-empty array");
			}
			// Recursively check each filter in the FILTER_LIST
			return logic.every((f: any) => this.isValidFilter(f));
		}

		// Check for MCOMPARISON: GT / LT / EQ
		if ("GT" in filter || "LT" in filter || "EQ" in filter) {
			return this.isValidMComparison(filter.GT || filter.LT || filter.EQ);
		}

		// Check for SCOMPARISON: IS
		if ("IS" in filter) {
			return this.isValidSComparison(filter.IS);
		}

		return false;
	}

	private isValidMComparison(mcomp: any): Boolean {
		if (typeof mcomp !== "object" || mcomp === null) {
			throw new InsightError("MCOMPARISON must be a valid object");
		}

		const validMKeys = ["avg", "pass", "fail", "audit", "year"];
		const key = Object.keys(mcomp)[0];
		if (!validMKeys.includes(key.split("_")[1])) {
			return false;
		}

		const value = mcomp[key];
		if (typeof value !== "number") {
			return false;
		}

		return true;
	}

	private isValidSComparison(scomp: any): Boolean {
		if (typeof scomp !== "object" || scomp === null) {
			throw new InsightError("SCOMPARISON must be a valid object");
		}

		const validSKeys = ["dept", "id", "instructor", "title", "uuid"];
		const key = Object.keys(scomp)[0];
		if (!validSKeys.includes(key.split("_")[1])) {
			return false;
		}

		const value = scomp[key];
		if (typeof value !== "string") {
			return false;
		}

		return true;
	}

	// Helper function to check if OPTIONS is valid
	private isValidOptionsClause(options: any): boolean {
		// Validate COLUMNS
		if (!Array.isArray(options.COLUMNS) || options.COLUMNS.length === 0) {
			return false;
		}

		const validKeys = ["avg", "pass", "fail", "audit", "year",
			"dept", "id", "instructor", "title", "uuid"];
		options.COLUMNS.forEach((key: string) => {
			if (!validKeys.includes(key.split("_")[1])) {
				return false;
			}
		});

		// If ORDER exists, it must be included in COLUMNS
		if (options.ORDER && !options.COLUMNS.includes(options.ORDER)) {
			return false;
		}

		return true;
	}

	// Helper function to check if only one dataset is referenced
	private referencesSingleDataset(query: unknown): Boolean {
		// Implement the logic to check if only one dataset is referenced
		const datasetIds = new Set<string>();

		// Recursive function to traverse through the query object
		function traverseObject(obj: any): void {
			if (typeof obj === "object" && obj !== null) {
				for (const key in obj) {
					if (Object.prototype.hasOwnProperty.call(obj, key)) {
						if (typeof obj[key] === "object") {
							traverseObject(obj[key]);
						} else if (typeof key === "string" && key.includes("_")) {
							const datasetId = key.split("_")[0];
							datasetIds.add(datasetId);
						}
					}
				}
			}
		}

		traverseObject(query);

		return datasetIds.size === 1;
	}

	// Helper function to execute the query and return results
	private async executeQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Implement actual query execution logic
		if (query === null) {
			return [];
		}
		return []; // Placeholder
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
