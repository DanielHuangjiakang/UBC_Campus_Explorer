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
}
