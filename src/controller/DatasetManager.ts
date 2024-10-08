import JSZip from "jszip";
import fs from "fs-extra";
import path from "node:path";
import Section from "./Section";
import { InsightError, InsightDatasetKind } from "./IInsightFacade"; // Adjust the imports as needed

export default class DatasetManager {
	private datasetsSections: Map<string, Section[]> = new Map<string, Section[]>();

	public async initialize(): Promise<void> {
		// try {
		const ids = await this.readIdsFromFile();
		await this.processStoredZipFiles(ids);
		// } catch (err) {
		// 	console.error("Initialization failed:", err);
		// 	throw err;
		// }
	}

	public getDatasets(): Map<string, Section[]> {
		return this.datasetsSections;
	}

	// Setter for datasetsSections
	public setDatasetSections(id: string, sections: Section[]): void {
		this.datasetsSections.set(id, sections);
	}

	// Getter for datasetsSections
	public getDatasetSections(id: string): Section[] | undefined {
		return this.datasetsSections.get(id);
	}

	// Getter for datasetsSections (optional, if you need to read the data externally)
	public getDatasetIDs(): string[] {
		return Array.from(this.datasetsSections.keys());
	}

	public async readIdsFromFile(): Promise<string[]> {
		let parsedData: string[] = [];
		try {
			await fs.ensureDir(path.join(__dirname, "../../data"));
			const idFilePath = path.join(__dirname, "../../data/id_log.json");
			const fileContent = await fs.readFile(idFilePath, "utf8");
			parsedData = JSON.parse(fileContent);
			return parsedData;
		} catch (_) {
			return parsedData;
		}
	}

	public async processStoredZipFiles(ids: string[]): Promise<void> {
		await fs.ensureDir(path.join(__dirname, "../../data"));
		const folderPath = path.join(__dirname, "../../data");
		const promises: Promise<Section[]>[] = ids.map(async (id) =>
			(async (): Promise<Section[]> => {
				const zip = new JSZip();
				const buffer = await fs.readFile(path.join(folderPath, `${id}.zip`));
				const content = buffer.toString("base64");
				const unzipped = await zip.loadAsync(content, { base64: true });
				const courseFolder = unzipped.folder("courses/");
				if (courseFolder === null) {
					throw new Error(`No courses folder found in ${id}.zip`);
				}
				const sections = await this.parseJson(courseFolder);
				return sections;
			})()
		);

		const arrayOfSectionsArray: Section[][] = await Promise.all(promises);
		for (let i = 0; i < ids.length; i++) {
			this.datasetsSections.set(ids[i], arrayOfSectionsArray[i]);
		}
	}

	public async validateID(id: string): Promise<void> {
		if (id === "" || id === " " || id.includes("_")) {
			throw new InsightError("Invalid ID string");
		}

		if (this.datasetsSections.has(id)) {
			throw new InsightError("ID is used");
		}
	}

	public async validateKind(kind: InsightDatasetKind): Promise<void> {
		if (kind !== InsightDatasetKind.Sections) {
			throw new InsightError("Invalid Kind");
		}
	}

	public async writeDatasetToZip(id: string, courseFolder: JSZip): Promise<void> {
		try {
			await fs.ensureDir(path.join(__dirname, "../../data"));
			const folderPath = path.join(__dirname, "../../data");
			const filePath = path.join(folderPath, `${id}.zip`);
			const zipContent = await courseFolder.generateAsync({ type: "nodebuffer" });
			await this.updateIdToJsonFile(id);
			await fs.writeFile(filePath, zipContent);
		} catch (_) {
			throw new InsightError("Failed to save .zip file");
		}
	}

	public async parseJson(courseFolder: JSZip): Promise<Section[]> {
		const promises: Promise<Section[]>[] = [];
		courseFolder.forEach((_, file: JSZip.JSZipObject) => {
			if (!file.dir && !file.name.startsWith("courses/.") && file.name.startsWith("courses/")) {
				promises.push(
					(async (): Promise<Section[]> => {
						try {
							const fileContent = await file.async("string");
							const parsedData = JSON.parse(fileContent);
							if (parsedData.result === undefined) {
								throw new InsightError("Result is undefined");
							}
							return this.validateAndExtractSectionQueryableFields(parsedData.result);
						} catch (err) {
							// console.error(`Error parsing file ${file.name}:`, err);
							if (err) {
								//
							}
							const empty: Section[] = [];
							return Promise.resolve(empty);
						}
					})()
				);
			}
		});
		const sectionsArray = await Promise.all(promises);
		return sectionsArray.flat();
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
			if (valid) {
				const section = new Section(
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

	private async updateIdToJsonFile(id: string): Promise<void> {
		const filePath = path.join(__dirname, "../../data/id_log.json");
		const parsedData: string[] = await this.readIdsFromFile();
		parsedData.push(id);
		try {
			const two = 2;
			await fs.writeFile(filePath, JSON.stringify(parsedData, null, two), "utf8");
		} catch (_) {
			throw new InsightError("Failed to updateIdToJsonFile");
		}
	}
}
