import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightResult, InsightError } from "./IInsightFacade";
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

			console.log("Initialization completed successfully.");
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
			// } else {
			// 	// testing
			// 	const isIdValid: boolean = typeof singleSection.id === 'number';
			// 	const isCourseValid: boolean = typeof singleSection.Course === 'string';
			// 	const isTitleValid: boolean = typeof singleSection.Title === 'string';
			// 	const isProfessorValid: boolean = typeof singleSection.Professor === 'string';
			// 	const isSubjectValid: boolean = typeof singleSection.Subject === 'string';
			// 	const isYearValid: boolean = typeof singleSection.Year === 'string';
			// 	const isAvgValid: boolean = typeof singleSection.Avg === 'number';
			// 	const isPassValid: boolean = typeof singleSection.Pass === 'number';
			// 	const isFailValid: boolean = typeof singleSection.Fail === 'number';
			// 	const isAuditValid: boolean = typeof singleSection.Audit === 'number';
			// 	console.log("start");
			// 	console.log('id is valid:', isIdValid);
			// 	console.log('Course is valid:', isCourseValid);
			// 	console.log('Title is valid:', isTitleValid);
			// 	console.log('Professor is valid:', isProfessorValid);
			// 	console.log('Subject is valid:', isSubjectValid);
			// 	console.log('Year is valid:', isYearValid);
			// 	console.log('Avg is valid:', isAvgValid);
			// 	console.log('Pass is valid:', isPassValid);
			// 	console.log('Fail is valid:', isFailValid);
			// 	console.log('Audit is valid:', isAuditValid);
			// }
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
							console.log(`Successfully parsed: ${file.name}`);
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
			console.log(`New id_log has been added successfully: ${id}`);
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
		console.log("id passed");
		// check if kind === InsightDatasetKind.Sections
		await this.validateKind(kind);
		console.log("kind passed");
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
				console.log("failed");
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
		console.log(`returning message has a length of ${message.length}`);
		return Promise.resolve(Array.from(this.datasetsSections.keys()));
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
