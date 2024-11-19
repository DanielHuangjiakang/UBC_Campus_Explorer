export default class Section {
	private readonly uuid: string;
	private readonly id: string;
	private readonly title: string;
	private readonly instructor: string;
	private readonly dept: string;
	private readonly year: number;
	private readonly avg: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;

	constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	) {
		this.uuid = uuid;
		this.id = id;
		this.title = title;
		this.instructor = instructor;
		this.dept = dept;
		this.year = year;
		this.avg = avg;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
	}

	// Getter for uuid
	public getUuid(): string {
		return this.uuid;
	}

	// Getter for id
	public getId(): string {
		return this.id;
	}

	// Getter for title
	public getTitle(): string {
		return this.title;
	}

	// Getter for instructor
	public getInstructor(): string {
		return this.instructor;
	}

	// Getter for dept (department)
	public getDept(): string {
		return this.dept;
	}

	// Getter for year
	public getYear(): number {
		return this.year;
	}

	// Getter for avg (average)
	public getAvg(): number {
		return this.avg;
	}

	// Getter for pass
	public getPass(): number {
		return this.pass;
	}

	// Getter for fail
	public getFail(): number {
		return this.fail;
	}

	// Getter for audit
	public getAudit(): number {
		return this.audit;
	}

	// originally from DatasetManager
	public static validateAndExtract(data: any[]): Section[] {
		const sections: Section[] = [];
		const Year1900 = 1900;

		data.forEach((singleSection) => {
			if (this.isValidSection(singleSection)) {
				const parsedYear = singleSection.Section !== "overall" ? parseInt(singleSection.Year, 10) : Year1900;
				sections.push(
					new Section(
						singleSection.id.toString(),
						singleSection.Course,
						singleSection.Title,
						singleSection.Professor,
						singleSection.Subject,
						parsedYear,
						singleSection.Avg,
						singleSection.Pass,
						singleSection.Fail,
						singleSection.Audit
					)
				);
			}
		});

		return sections;
	}

	private static isValidSection(singleSection: any): boolean {
		return (
			typeof singleSection.id === "number" &&
			typeof singleSection.Course === "string" &&
			typeof singleSection.Title === "string" &&
			typeof singleSection.Professor === "string" &&
			typeof singleSection.Subject === "string" &&
			typeof singleSection.Year === "string" &&
			typeof singleSection.Avg === "number" &&
			typeof singleSection.Pass === "number" &&
			typeof singleSection.Fail === "number" &&
			typeof singleSection.Audit === "number" &&
			typeof singleSection.Section === "string"
		);
	}

	// public static validateAndExtract(data: any[]): Section[] {
	// 	const sections: Section[] = [];
	//
	// 	data.forEach((singleSection) => {
	// 		const isValid: boolean =
	// 			typeof singleSection.id === "number" &&
	// 			typeof singleSection.Course === "string" &&
	// 			typeof singleSection.Title === "string" &&
	// 			typeof singleSection.Professor === "string" &&
	// 			typeof singleSection.Subject === "string" &&
	// 			typeof singleSection.Year === "string" &&
	// 			typeof singleSection.Avg === "number" &&
	// 			typeof singleSection.Pass === "number" &&
	// 			typeof singleSection.Fail === "number" &&
	// 			typeof singleSection.Audit === "number" &&
	// 			typeof singleSection.Section === "string";
	//
	// 		if (isValid) {
	// 			let parsedYear = 1900;
	// 			if (singleSection.Section !== "overall") {
	// 				parsedYear = parseInt(singleSection.Year, 10);
	// 			}
	// 			const section = new Section(
	// 				singleSection.id.toString(),
	// 				singleSection.Course,
	// 				singleSection.Title,
	// 				singleSection.Professor,
	// 				singleSection.Subject,
	// 				parsedYear,
	// 				singleSection.Avg,
	// 				singleSection.Pass,
	// 				singleSection.Fail,
	// 				singleSection.Audit
	// 			);
	// 			sections.push(section);
	// 		}
	// 	});
	//
	// 	return sections;
	// }
}
