import http from "http";

// Interface representing the response from the geolocation API
export interface GeoResponse {
	lat?: number; // Latitude of the location
	lon?: number; // Longitude of the location
	error?: string; // Error message, if any
}

export default class Room {
	private readonly fullname: string;
	private readonly shortname: string;
	private readonly number: string;
	private readonly name: string;
	private readonly address: string;
	private readonly lat: number;
	private readonly lon: number;
	private readonly seats: number;
	private readonly type: string;
	private readonly furniture: string;
	private readonly href: string;

	// Constructor to initialize the Room object
	constructor(
		fullname: string,
		shortname: string,
		number: string,
		address: string,
		lat: number,
		lon: number,
		seats: number,
		type: string,
		furniture: string,
		href: string
	) {
		this.fullname = fullname;
		this.shortname = shortname;
		this.number = number;
		this.name = `${shortname}_${number}`; // Derived from shortname and number
		this.address = address;
		this.lat = lat;
		this.lon = lon;
		this.seats = seats;
		this.type = type;
		this.furniture = furniture;
		this.href = href;
	}

	// Getters for each property
	public getFullname(): string {
		return this.fullname;
	}

	public getShortname(): string {
		return this.shortname;
	}

	public getNumber(): string {
		return this.number;
	}

	public getName(): string {
		return this.name;
	}

	public getAddress(): string {
		return this.address;
	}

	public getLat(): number {
		return this.lat;
	}

	public getLon(): number {
		return this.lon;
	}

	public getSeats(): number {
		return this.seats;
	}

	public getType(): string {
		return this.type;
	}

	public getFurniture(): string {
		return this.furniture;
	}

	public getHref(): string {
		return this.href;
	}

	public static async extractRooms(
		parsedBuilding: any,
		buildingAddress: string,
		buildingShortName: string,
		buildingFullName: string
	): Promise<Room[]> {
		const table = this.findValidTable(parsedBuilding);
		const tbody = table?.childNodes.find((child: any) => child.nodeName === "tbody");

		if (!tbody) {
			return [];
		}

		// Create an array of promises for each room extraction
		const roomPromises = tbody.childNodes
			.filter((child: any) => child.nodeName === "tr")
			.map(async (childTr: any) =>
				this.extractRoomFromTr(childTr, buildingAddress, buildingShortName, buildingFullName)
			);

		// Wait for all promises to resolve
		const resolvedRooms = await Promise.all(roomPromises);

		// Filter out any `null` results and return the valid rooms
		return resolvedRooms.filter((room) => room !== null) as Room[];
	}

	private static async extractRoomFromTr(
		tr: any,
		buildingAddress: string,
		buildingShortName: string,
		buildingFullName: string
	): Promise<Room | null> {
		const roomDetails = this.extractRoomDetails(tr);

		// Fetch geolocation
		const geolocation = await this.getGeolocation(buildingAddress);
		if (!geolocation) {
			return null;
		}

		// If any required room details are missing, return null
		if (
			!roomDetails.roomNumber ||
			!roomDetails.capacity ||
			!roomDetails.furniture ||
			!roomDetails.type ||
			!roomDetails.href ||
			!geolocation.lat ||
			!geolocation.lon
		) {
			return null;
		}

		// Create and return the Room object
		return new Room(
			buildingFullName,
			buildingShortName,
			roomDetails.roomNumber,
			buildingAddress,
			geolocation.lat,
			geolocation.lon,
			roomDetails.capacity,
			roomDetails.type,
			roomDetails.furniture,
			roomDetails.href
		);
	}

	// Helper function to extract room details from a <tr>
	private static extractRoomDetails(tr: any): {
		roomNumber?: string;
		capacity?: number;
		furniture?: string;
		type?: string;
		href?: string;
	} {
		const details: Record<string, any> = {};

		for (const childTd of tr.childNodes) {
			if (childTd.nodeName === "td") {
				const tdClass = childTd.attrs.find((attr: any) => attr.name === "class")?.value;

				switch (tdClass) {
					case "views-field views-field-field-room-number":
						details.roomNumber = this.getLinkText(childTd);
						break;

					case "views-field views-field-field-room-capacity":
						details.capacity = parseInt(this.getTextContent(childTd), 10);
						break;

					case "views-field views-field-field-room-furniture":
						details.furniture = this.getTextContent(childTd);
						break;

					case "views-field views-field-field-room-type":
						details.type = this.getTextContent(childTd);
						break;

					case "views-field views-field-nothing":
						details.href = this.getLinkHref(childTd);
						break;
				}
			}
		}

		return details;
	}

	// Helper function to fetch geolocation
	private static async getGeolocation(buildingAddress: string): Promise<GeoResponse | null> {
		try {
			const geolocation = await this.fetchGeolocation(buildingAddress);
			if (geolocation.lat !== undefined && geolocation.lon !== undefined) {
				return geolocation;
			}
			return null;
		} catch {
			return null;
		}
	}

	// Helper to extract href from <a> tag inside <td>
	private static getLinkHref(td: any): string | undefined {
		const anchor = td.childNodes.find((child: any) => child.nodeName === "a");
		return anchor?.attrs.find((attr: any) => attr.name === "href")?.value;
	}

	// Helper to extract text from <a> tag inside <td>
	private static getLinkText(td: any): string {
		const anchor = td.childNodes.find((child: any) => child.nodeName === "a");
		return (
			anchor?.childNodes
				.filter((child: any) => child.nodeName === "#text")
				.map((textNode: any) => textNode.value.trim())
				.join(" ") || ""
		);
	}

	// Helper to extract text content from <td>
	private static getTextContent(td: any): string {
		return td.childNodes
			.filter((child: any) => child.nodeName === "#text")
			.map((textNode: any) => textNode.value.trim())
			.join(" ");
	}

	// Helper function to fetch the geolocation of an address
	private static async fetchGeolocation(address: string): Promise<GeoResponse> {
		// Encode the address using encodeURIComponent
		const encodedAddress = encodeURIComponent(address);
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team051/${encodedAddress}`;

		return new Promise((resolve, reject) => {
			http
				.get(url, (res) => {
					let data = "";

					// Collect data chunks
					res.on("data", (chunk) => {
						data += chunk;
					});

					// Handle response completion
					res.on("end", () => {
						try {
							const geoResponse: GeoResponse = JSON.parse(data);
							resolve(geoResponse);
						} catch {
							reject(new Error("Failed to parse geolocation response"));
						}
					});
				})
				.on("error", () => {
					reject(new Error("HTTP request failed"));
				});
		});
	}

	private static findValidTable(document: any): any | null {
		// Recursive function to traverse the HTML tree and find the table with <td> elements of specific classes
		return this.traverseTable(document);
	}

	private static traverseTable(node: any): any | null {
		if (node.nodeName === "table") {
			const tbody = node.childNodes.find((child: any) => child.nodeName === "tbody");
			if (tbody && this.hasRequiredRoomTdElements(tbody)) {
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

	private static hasRequiredRoomTdElements(tbody: any): boolean {
		const requiredClasses = new Set([
			"views-field views-field-field-room-number",
			"views-field views-field-field-room-capacity",
			"views-field views-field-field-room-furniture",
			"views-field views-field-field-room-type",
			"views-field views-field-nothing",
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
}
