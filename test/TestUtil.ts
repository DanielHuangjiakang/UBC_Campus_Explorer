import * as fs from "fs-extra";
import { ITestQuery } from "./controller/InsightFacade.spec";

/**
 * The directory where data is persisted.
 *
 * NOTE: this variable should _not_ be referenced from production code.
 */
const persistDir = "./data";

/**
 * Convert a file into a base64 string.
 *
 * @param name  The name of the file to be converted.
 *
 * @return Promise A base 64 representation of the file
 */
export async function getContentFromArchives(name: string): Promise<string> {
	const buffer = await fs.readFile("test/resources/archives/" + name);
	return buffer.toString("base64");
}

/**
 * Removes all files within the persistDir.
 */
export async function clearDisk(): Promise<void> {
	await fs.remove(persistDir);
}

/**
 * Reads and validates a Test Query from the specified path.
 *
 * @param testname containing the relative path to the JSON Query file in square brackets.
 * @throws Error if JSON file is not a valid test query.
 */
export async function loadTestQuery(testname: string): Promise<ITestQuery> {
	const filename = extractFileFromTestName(testname);
	const data = await fs.readFile(`test/resources/queries/${filename}`, "utf-8");
	const testQuery: unknown = JSON.parse(data);
	assertTestQuery(testQuery);
	return testQuery;
}

/**
 * Returns any content between the first pair of square brackets found in the string.
 *
 * @param name a string containing a relative path in square brackets.
 * @throws Error when no bracket pair is found.
 */
export function extractFileFromTestName(name: string): string {
	const match = name.match(/\[(.+)]/);
	const validMatchLength = 2;
	if (!match || match.length < validMatchLength) {
		throw new Error(
			"Invalid test name." +
				"Test names must include a relative file path enclosed in brackets; e.g., [my/file.json]." +
				`'${name}' does not include a file path in brackets.`
		);
	}
	return match[1];
}

/**
 * Checks that the Test Query is an object with the properties specified in ITestQuery.
 * Note: the values are not validated.
 *
 * @param testQuery An object which should conform to the ITestQuery interface.
 * @throws Error when a property is missing.
 */
function assertTestQuery(testQuery: any): asserts testQuery is ITestQuery {
	if (Array.isArray(testQuery)) {
		throw new Error(
			"ValidationError: Test Query must be an object not an array."
		);
	}
	if (!Object.hasOwn(testQuery, "input")) {
		throw new Error(
			"ValidationError: Test Query is missing required field 'input'."
		);
	}
	if (!Object.hasOwn(testQuery, "expected")) {
		throw new Error(
			"ValidationError: Test Query is missing required field 'expected'."
		);
	}
	if (!Object.hasOwn(testQuery, "errorExpected")) {
		throw new Error(
			"ValidationError: Test Query is missing required field 'errorExpected'."
		);
	}
}
