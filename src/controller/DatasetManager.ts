import JSZip from "jszip";
import fs from "fs-extra";
import path from "node:path";
import Section from "./Section";
import { InsightError, InsightDatasetKind, InsightDataset } from "./IInsightFacade"; // Adjust the imports as needed

export default class DatasetManager {
	private datasetsSections: Map<string, Section[]> = new Map<string, Section[]>();
	private datasetsKinds: Map<string, [InsightDatasetKind, number]> = new Map<string, [InsightDatasetKind, number]>();
	private folderPath = path.join(__dirname, "../../data");

	public async initialize(): Promise<void> {
		const idsAndKinds = await this.readIdsFromFile();
		await this.processStoredZipFiles(idsAndKinds);
	}

	public getDatasets(): Map<string, Section[]> {
		return this.datasetsSections;
	}

	// Setter for datasetsSections
	public setDatasetMaps(id: string, kind: InsightDatasetKind, sections: Section[]): void {
		this.datasetsSections.set(id, sections);
		this.datasetsKinds.set(id, [kind, sections.length]);
	}

	// Getter for datasetsSections IDS
	public getDatasetIDs(): string[] {
		return Array.from(this.datasetsSections.keys());
	}

	public getInsightDataset(): InsightDataset[] {
		const InsightDatasets: InsightDataset[] = [];
		const ids: string[] = this.getDatasetIDs();
		for (const id of ids) {
			const kindAndRowNum: [InsightDatasetKind, number] | undefined = this.datasetsKinds.get(id);
			const kind: InsightDatasetKind = kindAndRowNum![0];
			const numRows: number = kindAndRowNum![1];
			InsightDatasets.push({ id, kind, numRows });
		}
		return InsightDatasets;
	}

	public async readIdsFromFile(): Promise<[string, [InsightDatasetKind, number]][]> {
		let parsedData: [string, [InsightDatasetKind, number]][] = [];
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

	public async processStoredZipFiles(idsAndKinds: [string, [InsightDatasetKind, number]][]): Promise<void> {
		await fs.ensureDir(this.folderPath);
		const promises: Promise<Section[]>[] = idsAndKinds.map(async (idAndKind) =>
			(async (): Promise<Section[]> => {
				const zip = new JSZip();
				const buffer = await fs.readFile(path.join(this.folderPath, `${idAndKind[0]}.zip`));
				const content = buffer.toString("base64");
				const unzipped = await zip.loadAsync(content, { base64: true });
				const courseFolder = unzipped.folder("courses/");
				if (courseFolder === null) {
					throw new Error(`No courses folder found in ${idAndKind[0]}.zip`);
				}
				const sections = await this.parseJson(courseFolder);
				return sections;
			})()
		);
		const arrayOfSectionsArray: Section[][] = await Promise.all(promises);
		for (let i = 0; i < idsAndKinds.length; i++) {
			if (!this.datasetsSections.has(idsAndKinds[i][0])) {
				this.datasetsSections.set(idsAndKinds[i][0], arrayOfSectionsArray[i]);
				this.datasetsKinds.set(idsAndKinds[i][0], [idsAndKinds[i][1][0], idsAndKinds[i][1][1]]);
			}
		}
	}

	public async validateID(id: string): Promise<void> {
		if (id === "" || id === " " || id.includes("_")) {
			throw new InsightError("Invalid ID string");
		}
	}

	public async idExisted(id: string): Promise<void> {
		if (this.datasetsSections.has(id)) {
			throw new InsightError("ID is used");
		}
	}

	public async validateKind(kind: InsightDatasetKind): Promise<void> {
		if (kind !== InsightDatasetKind.Sections) {
			throw new InsightError("Invalid Kind");
		}
	}

	public async writeDatasetToZip(
		id: string,
		kind: InsightDatasetKind,
		rowNum: number,
		courseFolder: JSZip
	): Promise<void> {
		try {
			await fs.ensureDir(this.folderPath);
			const filePath = path.join(this.folderPath, `${id}.zip`);
			const zipContent = await courseFolder.generateAsync({ type: "nodebuffer" });
			await this.updateIdToJsonFile(id, kind, rowNum);
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

	public async removeDatasetFromFacadeAndDisk(id: string): Promise<void> {
		await fs.ensureDir(this.folderPath);
		const filePath = path.join(this.folderPath, `${id}.zip`);
		fs.unlink(filePath, (err) => {
			if (err) {
				//
			}
		});
		await this.updateIdToJsonFile(id, null, -1);
		this.datasetsKinds["delete"](id);
		this.datasetsSections["delete"](id);
	}

	private async updateIdToJsonFile(id: string, kind: InsightDatasetKind | null, rowNum: number): Promise<void> {
		const filePath = path.join(__dirname, "../../data/id_log.json");
		let parsedData: [string, [InsightDatasetKind, number]][] = await this.readIdsFromFile();
		if (kind !== null) {
			parsedData.push([id, [kind, rowNum]]);
		} else {
			parsedData = parsedData.filter((data) => data[0] !== id);
		}

		try {
			const two = 2;
			await fs.writeFile(filePath, JSON.stringify(parsedData, null, two), "utf8");
		} catch (_) {
			throw new InsightError("Failed to updateIdToJsonFile");
		}
	}
}
