import JSZip from "jszip";
import fs from "fs-extra";
import path from "node:path";
import Section from "./Section";
import Room from "./Room";
import { InsightDataset, InsightDatasetKind, InsightError } from "./IInsightFacade"; // Adjust the imports as needed
import * as parse5 from "parse5";

type DatasetEntry = Section | Room;

export default class DatasetManager {
	private datasetsEntries: Map<string, DatasetEntry[]> = new Map<string, DatasetEntry[]>();
	private datasetsKinds: Map<string, [InsightDatasetKind, number]> = new Map<string, [InsightDatasetKind, number]>();
	private folderPath = path.join(__dirname, "../../data");

	// public printEntries(): void {
	// 	console.log(this.datasetsEntries);
	// }// to do

	public async initialize(): Promise<void> {
		const idsAndKinds = await this.readIdsFromFile();
		await this.processStoredZipFiles(idsAndKinds);
	}

	public getDatasets(): Map<string, DatasetEntry[]> {
		return this.datasetsEntries;
	}

	// Setter for datasetsEntries
	public setDatasetMaps(id: string, kind: InsightDatasetKind, entries: DatasetEntry[]): void {
		this.datasetsEntries.set(id, entries);
		this.datasetsKinds.set(id, [kind, entries.length]);
	}

	// Getter for datasetsEntries IDS
	public getDatasetIDs(): string[] {
		return Array.from(this.datasetsEntries.keys());
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
		const promises: Promise<DatasetEntry[]>[] = idsAndKinds.map(async (idAndKind) =>
			(async (): Promise<DatasetEntry[]> => {
				const zip = new JSZip();
				const buffer = await fs.readFile(path.join(this.folderPath, `${idAndKind[0]}.zip`));
				const content = buffer.toString("base64");
				const unzipped = await zip.loadAsync(content, { base64: true });
				if (idAndKind[1][0] === InsightDatasetKind.Sections) {
					const sections = await this.parseSections(unzipped);
					return sections;
				} else {
					const rooms = await this.parseRooms(unzipped);
					return rooms;
				}
			})()
		);
		const arrayOfSectionsArray: DatasetEntry[][] = await Promise.all(promises);
		for (let i = 0; i < idsAndKinds.length; i++) {
			if (!this.datasetsEntries.has(idsAndKinds[i][0])) {
				// check if id exists
				this.datasetsEntries.set(idsAndKinds[i][0], arrayOfSectionsArray[i]);
				this.datasetsKinds.set(idsAndKinds[i][0], [idsAndKinds[i][1][0], idsAndKinds[i][1][1]]);
			}
		}
	}

	public async parseRooms(unzipped: JSZip): Promise<Room[]> {
		const indexFile = Object.values(unzipped.files).find((file) => file.name.endsWith("index.htm"));
		if (!indexFile) {
			throw new InsightError("No index.htm file exists");
		}
		// Extract the folder path correctly
		const folderPath = indexFile.name.substring(0, indexFile.name.lastIndexOf("/") + 1);
		// Get the folder JSZip object
		const folder = unzipped.folder(folderPath);
		if (!folder) {
			throw new InsightError(`Folder not found: ${folderPath}`);
		}
		// Parse the rooms HTML
		const rooms = await this.parseRoomsHTML(folder, indexFile);
		return rooms;
	}

	public async parseSections(unzipped: JSZip): Promise<Section[]> {
		const courseFolder = unzipped.folder("courses/");
		if (courseFolder === null) {
			throw new Error(`No courses folder found in the zip file`);
		}
		const sections = await this.parseSectionsJson(courseFolder);
		return sections;
	}

	public async validateID(id: string): Promise<void> {
		if (id === "" || id === " " || id.includes("_")) {
			throw new InsightError("Invalid ID string");
		}
	}

	public async idExisted(id: string): Promise<void> {
		if (this.datasetsEntries.has(id)) {
			throw new InsightError("ID is used");
		}
	}

	public async validateKind(kind: InsightDatasetKind): Promise<void> {
		if (kind !== InsightDatasetKind.Sections && kind !== InsightDatasetKind.Rooms) {
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

	public async parseSectionsJson(courseFolder: JSZip): Promise<Section[]> {
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
							// return this.validateAndExtractSectionQueryableFields(parsedData.result);
							return Section.validateAndExtract(parsedData.result);
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

	public async removeDatasetFromFacadeAndDisk(id: string): Promise<void> {
		await fs.ensureDir(this.folderPath);
		const filePath = path.join(this.folderPath, `${id}.zip`);
		fs.unlink(filePath, (err) => {
			if (err) {
				//
			}
		});
		await this.updateIdToJsonFile(id, null, -1);
		this.datasetsKinds.delete(id);
		this.datasetsEntries.delete(id);
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

	public async parseRoomsHTML(unzipped: JSZip, indexFile: JSZip.JSZipObject | undefined): Promise<Room[]> {
		if (indexFile === undefined) {
			return Promise.resolve([]);
		}
		const indexContent = await indexFile.async("string");
		const parsedIndex = parse5.parse(indexContent);

		const buildingsTable = this.findValidTable(parsedIndex);
		if (buildingsTable === null) {
			throw new InsightError("No building table");
		}

		const promises: Promise<Room[]>[] = this.extractBuildingPromises(buildingsTable, unzipped);

		// Use Promise.all() to resolve all room extraction promises concurrently
		const buildings = (await Promise.all(promises)).flat();

		return buildings;
	}

	private findValidTable(document: any): any | null {
		// Recursive function to traverse the HTML tree and find the table with <td> elements of specific classes
		return this.traverseTable(document);
	}

	private traverseTable(node: any): any | null {
		if (node.nodeName === "table") {
			const tbody = node.childNodes.find((child: any) => child.nodeName === "tbody");
			if (tbody && this.hasRequiredBuildingTdElements(tbody)) {
				return node; // Found a valid table
			}
		}
		if (node.childNodes) {
			for (const child of node.childNodes) {
				const result = this.traverseTable(child);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}

	private hasRequiredBuildingTdElements(tbody: any): boolean {
		const requiredClasses = new Set([
			"views-field views-field-title",
			"views-field views-field-field-building-address",
		]);

		const tdElements = tbody.childNodes
			.filter((node: any) => node.nodeName === "tr")
			.flatMap((tr: any) => tr.childNodes.filter((td: any) => td.nodeName === "td"));

		// Collect the class values from the <td> elements
		const tdClasses = tdElements.map((td: any) => td.attrs?.find((attr: any) => attr.name === "class")?.value || "");

		// Check if the required classes are present
		for (const requiredClass of requiredClasses) {
			if (!tdClasses.includes(requiredClass)) {
				return false;
			}
		}
		return true;
	}

	private extractBuildingPromises(buildingsTable: any, unzipped: JSZip): Promise<Room[]>[] {
		const promises: Promise<Room[]>[] = [];
		const tbody = buildingsTable.childNodes.find((child: any) => child.nodeName === "tbody");
		if (tbody.childNodes) {
			for (const child of tbody.childNodes) {
				if (child.nodeName === "tr") {
					promises.push(this.createBuildingPromise(child, unzipped));
				}
			}
		}
		return promises;
	}

	// private extractBuildingPromises(buildingsTable: any, unzipped: JSZip): Promise<Room[]>[] {
	// 	const promises: Promise<Room[]>[] = [];
	// 	let num = 0;
	// 	let invalidCount = 0; // Counter for invalid buildings
	// 	const tbody = buildingsTable.childNodes.find((child: any) => child.nodeName === "tbody");
	// 	if (tbody.childNodes) {
	// 		for (const child of tbody.childNodes) {
	// 			if (child.nodeName === "tr") {
	// 				try {
	// 					// Add each promise but handle errors for invalid buildings
	// 					promises.push(this.createBuildingPromise(child, unzipped));
	// 					num++;
	// 				} catch (_) {
	// 					console.log("Invalid building detected:", num);
	// 					invalidCount++;
	// 				}
	// 			}
	// 		}
	// 	}
	// 	console.log("Total buildings:", num);
	// 	console.log("Invalid buildings skipped:", invalidCount);
	// 	return promises;
	// }
	//
	// private async createBuildingPromise(tr: any, unzipped: JSZip): Promise<Room[]> {
	// 	let fileAddress: string | undefined;
	// 	let buildingFullName: string | undefined;
	// 	let buildingShortName: string | undefined;
	// 	let buildingAddress: string | undefined;
	//
	// 	for (const childTd of tr.childNodes) {
	// 		if (childTd.nodeName === "td") {
	// 			const tdClass = childTd.attrs.find((attr: any) => attr.name === "class")?.value;
	//
	// 			switch (tdClass) {
	// 				case "views-field views-field-nothing":
	// 					fileAddress = this.getLinkHref(childTd);
	// 					break;
	// 				case "views-field views-field-field-building-code":
	// 					buildingShortName = this.getTextContent(childTd);
	// 					break;
	// 				case "views-field views-field-title":
	// 					buildingFullName = this.getTextContent(childTd);
	// 					break;
	// 				case "views-field views-field-field-building-address":
	// 					buildingAddress = this.getTextContent(childTd);
	// 					break;
	// 			}
	// 		}
	// 	}
	//
	// 	if (!fileAddress || !buildingFullName || !buildingShortName || !buildingAddress) {
	// 		if (!fileAddress) {console.log("Missing fileAddress for building:", buildingShortName, buildingFullName);}
	// 		if (!buildingFullName) {console.log("Missing buildingFullName for building:", buildingShortName, fileAddress);}
	// 		if (!buildingShortName) {console.log("Missing buildingShortName for building:", fileAddress, buildingFullName);}
	// 		if (!buildingAddress) {console.log("Missing buildingAddress for building:", buildingShortName, buildingFullName);}
	// 		throw new InsightError("Invalid building data");
	// 	}
	//
	// 	const cleanedPath = fileAddress.replace("./", "");
	// 	const buildingFile = unzipped.file(cleanedPath);
	// 	if (!buildingFile) {
	// 		console.log(`Building file not found for path: ${cleanedPath}`);
	// 		throw new InsightError(`Building file not found: ${cleanedPath}`);
	// 	}
	//
	// 	const parsedBuilding = parse5.parse(await buildingFile.async("string"));
	// 	console.log("Successfully processed building:", buildingFullName);
	//
	// 	return Promise.resolve(Room.extractRooms(parsedBuilding, buildingAddress, buildingShortName, buildingFullName));
	// }

	private async createBuildingPromise(tr: any, unzipped: JSZip): Promise<Room[]> {
		let fileAddress: string | undefined;
		let buildingFullName: string | undefined;
		let buildingShortName: string | undefined;
		let buildingAddress: string | undefined;
		// Loop through <td> elements to extract relevant data
		for (const childTd of tr.childNodes) {
			if (childTd.nodeName === "td") {
				const tdClass = childTd.attrs.find((attr: any) => attr.name === "class")?.value;

				switch (tdClass) {
					case "views-field views-field-nothing":
						fileAddress = this.getLinkHref(childTd);
						break;

					case "views-field views-field-field-building-code":
						buildingShortName = this.getTextContent(childTd);
						break;

					case "views-field views-field-title":
						buildingFullName = this.getTextContent(childTd);
						break;

					case "views-field views-field-field-building-address":
						buildingAddress = this.getTextContent(childTd);
						break;
				}
			}
		}
		// Validate extracted data
		if (!fileAddress || !buildingFullName || !buildingShortName || !buildingAddress) {
			throw new InsightError("Invalid building data");
		}

		// Remove "./" prefix from fileAddress
		const cleanedPath = fileAddress.replace("./", "");

		// Locate the building file in the unzipped JSZip object
		const buildingFile = unzipped.file(cleanedPath);
		if (!buildingFile) {
			throw new InsightError(`Building file not found: ${cleanedPath}`);
		}

		// Read and parse the building file
		const parsedBuilding = parse5.parse(await buildingFile.async("string"));

		// Extract and return room information
		return Promise.resolve(Room.extractRooms(parsedBuilding, buildingAddress, buildingShortName, buildingFullName));
	}

	// Helper to extract the href value from an <a> tag inside a <td>
	private getLinkHref(td: any): string | undefined {
		const anchor = td.childNodes.find((child: any) => child.nodeName === "a");
		return anchor?.attrs.find((attr: any) => attr.name === "href")?.value;
	}

	private getTextContent(node: any): string {
		if (!node) {
			return "";
		}
		if (node.nodeName === "#text") {
			return node.value.trim(); // Extract text directly
		}
		// If the node has child nodes, recursively extract their text content
		return node.childNodes
			?.map((child: any) => this.getTextContent(child))
			.join(" ")
			.trim();
	}
}
