import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let invalidZipFile: string;
	let missingCourseFolder: string;
	let missingValidSections: string;
	let emptyZipFile: string;
	let emptyJasonFile: string;
	let invalidJasonStructure: string;
	let MissingQueryableFields: string;
	let invalidZipType: string;
	let fewsections: string;
	let fiveSections: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		invalidZipFile = await getContentFromArchives("JiakangHuang.jpg");
		missingCourseFolder = await getContentFromArchives("nocourses.zip");
		missingValidSections = await getContentFromArchives("nosections.zip");
		emptyZipFile = await getContentFromArchives("empty.zip");
		emptyJasonFile = await getContentFromArchives("emptyjason.zip");
		invalidJasonStructure = await getContentFromArchives("invalidJasonStr.zip");
		MissingQueryableFields = await getContentFromArchives(
			"missingqueryablefields.zip"
		);
		invalidZipType = await getContentFromArchives("invalidtype.zip");
		fewsections = await getContentFromArchives("fewCourses.zip");
		fiveSections = await getContentFromArchives("fivecourses.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	/** ----------------------------------------------------------------------------------------*/
	/** ----------------------------------------------------------------------------------------*/
	/** ----------------------------------------------------------------------------------------*/

	/** Tests for addDataset: */
	describe("AddDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		/** ----------------------------------------------------------------------------------------*/

		/** ID argument */
		/** Error Cases:*/
		// Free mutant: Invalid ID(Empty) V
		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Invalid ID(whitespace) V
		it("should reject with an whitespace dataset id", async function () {
			try {
				await facade.addDataset(" ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Duplicate ID: V
		it("should reject with an duplicate dataset id", async function () {
			try {
				await facade.addDataset(
					"sections",
					sections,
					InsightDatasetKind.Sections
				);
				await facade.addDataset(
					"sections",
					sections,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// underscore ID: V
		it("should reject with an underscore dataset id", async function () {
			try {
				await facade.addDataset("_", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		/** ----------------------------------------------------------------------------------------*/

		/** Content argument */
		/** Error Cases:*/
		// Invalid Base64 encoding V
		it("should reject when the content is not base64-encoded", async function () {
			try {
				await facade.addDataset(
					"sections",
					invalidZipFile,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Invalid zip file format V
		it("should reject with an jpg file format", async function () {
			try {
				await facade.addDataset(
					"sections",
					invalidZipFile,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Missing Courses folder V
		it("should reject with a zip file without courses folder", async function () {
			try {
				await facade.addDataset(
					"sections",
					missingCourseFolder,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Missing valid course sections V
		it("should reject with a zip file without courses sections", async function () {
			try {
				await facade.addDataset(
					"sections",
					missingValidSections,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Empty zip file V
		it("should reject with a empty zip file", async function () {
			try {
				await facade.addDataset(
					"sections",
					emptyZipFile,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Empty JSON File V
		it("should reject with a zip file with empty JSON File", async function () {
			try {
				await facade.addDataset(
					"sections",
					emptyJasonFile,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Invalid JSON Structure V
		it("should reject with a zip file with invalid JSON Structure", async function () {
			try {
				await facade.addDataset(
					"sections",
					invalidJasonStructure,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// JSON file missing queryable fields V
		it("should reject with a zip file with JSON file missing queryable fields", async function () {
			try {
				await facade.addDataset(
					"sections",
					MissingQueryableFields,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Zip file containing invalid file types V
		it("should reject with a Zip file containing invalid file types", async function () {
			try {
				await facade.addDataset(
					"sections",
					invalidZipType,
					InsightDatasetKind.Sections
				);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		/** ----------------------------------------------------------------------------------------*/

		/** Content argument */
		/** Error Cases:*/
		// Invalid rooms kind
		it("should reject with invalid rooms kind", async function () {
			try {
				await facade.addDataset("sections", sections, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		/** ----------------------------------------------------------------------------------------*/
		/** Successful Cases:*/
		// add one dataset
		it("should successfully add one dataset", async function () {
			try {
				await facade.addDataset(
					"sections",
					sections,
					InsightDatasetKind.Sections
				);
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);
				expect(result[0].id).to.equal("sections");
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});

		// add multiple datasets
		it("should successfully add two dataset", async function () {
			try {
				await facade.addDataset(
					"sections",
					sections,
					InsightDatasetKind.Sections
				);
				await facade.addDataset(
					"fewsections",
					fewsections,
					InsightDatasetKind.Sections
				);
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(2);
				expect(result[0].id).to.equal("sections");
				expect(result[1].id).to.equal("fewsections");
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(result[1].kind).to.equal(InsightDatasetKind.Sections);
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});
	});

	/** ----------------------------------------------------------------------------------------*/
	/** ----------------------------------------------------------------------------------------*/
	/** ----------------------------------------------------------------------------------------*/

	/** Tests for removeDataset: */
	describe("RemoveDataset", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		/** ----------------------------------------------------------------------------------------*/

		/** Error Cases:*/
		// Removing a non-existent dataset
		it("should reject with removing a non-existent dataset", async function () {
			try {
				await facade.removeDataset("nonexistant");
				expect.fail("Should have thrown a NotFoundError above.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		// Removing a dataset with an empty ID
		it("should reject with removing a dataset with an empty ID", async function () {
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown an InsightError above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Removing a dataset with whitespace
		it("should reject with removing a dataset with an ID containing only whitespace", async function () {
			try {
				await facade.removeDataset(" ");
				expect.fail("Should have thrown an InsightError above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		// Removing a dataset twice
		it("should reject with removing one dataset twice", async function () {
			try {
				await facade.addDataset(
					"sections",
					sections,
					InsightDatasetKind.Sections
				);
				await facade.removeDataset("sections");
				await facade.removeDataset("sections");
				expect.fail("Should have thrown a NotFoundError above.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		/** ----------------------------------------------------------------------------------------*/

		/** Successful Cases:*/
		// Removing one dataset
		it("should successfully remove one dataset", async function () {
			try {
				await facade.addDataset(
					"sections",
					sections,
					InsightDatasetKind.Sections
				);
				await facade.removeDataset("sections");
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});

		// Removing multiple dataset
		it("should successfully remove multiple dataset", async function () {
			try {
				await facade.addDataset(
					"sections",
					sections,
					InsightDatasetKind.Sections
				);
				await facade.addDataset(
					"fewsections",
					fewsections,
					InsightDatasetKind.Sections
				);
				await facade.removeDataset("sections");
				await facade.removeDataset("fewsections");
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});
	});

	/** ----------------------------------------------------------------------------------------*/
	/** ----------------------------------------------------------------------------------------*/
	/** ----------------------------------------------------------------------------------------*/

	/** Tests for listDatasets: */
	describe("ListDatasets", function () {
		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		afterEach(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		/** ----------------------------------------------------------------------------------------*/

		/** Successful Cases:*/

		// Listing a single dataset after adding it
		it("should list a single dataset", async function () {
			try {
				let result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
				await facade.addDataset(
					"fewsections",
					fewsections,
					InsightDatasetKind.Sections
				);
				result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);
				expect(result[0].id).to.equal("fewsections");
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(result[0].numRows).to.equal(2);
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});

		// Listing multiple datasets after adding them
		it("should list multiple datasets", async function () {
			try {
				await facade.addDataset(
					"fewsections",
					fewsections,
					InsightDatasetKind.Sections
				);
				await facade.addDataset(
					"fivesections",
					fiveSections,
					InsightDatasetKind.Sections
				);
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(2);
				expect(result[0].id).to.equal("fewsections");
				expect(result[1].id).to.equal("fivesections");
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(result[1].kind).to.equal(InsightDatasetKind.Sections);
				expect(result[0].numRows).to.equal(2);
				expect(result[1].numRows).to.equal(2);
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});

		// Listing remaining datasets after one is removed
		it("should list remaining datasets after one is removed", async function () {
			try {
				await facade.addDataset(
					"fewsections",
					fewsections,
					InsightDatasetKind.Sections
				);
				await facade.addDataset(
					"fivesections",
					fiveSections,
					InsightDatasetKind.Sections
				);
				await facade.removeDataset("fivesections");
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);
				expect(result[0].id).to.equal("fewsections");
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(result[0].numRows).to.equal(2);
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});

		// Listing datasets when none have been added (should return an empty list)
		it("should listing datasets when none have been added", async function () {
			try {
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});

		// Listing datasets after all datasets have been removed (should return an empty list)
		it("should return empty list", async function () {
			try {
				await facade.addDataset(
					"fewsections",
					fewsections,
					InsightDatasetKind.Sections
				);
				await facade.addDataset(
					"fivesections",
					fiveSections,
					InsightDatasetKind.Sections
				);
				await facade.removeDataset("fivesections");
				await facade.removeDataset("fewsections");
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
			} catch (err) {
				expect.fail("Should have thrown above.");
			}
		});
	});

	/** ----------------------------------------------------------------------------------------*/
	/** ----------------------------------------------------------------------------------------*/
	/** ----------------------------------------------------------------------------------------*/

	/** Tests for PerformQuery: */
	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		// Create the error map inside the describe block(from chatgpt)
		const errorMap: Map<
			string,
			typeof InsightError | typeof NotFoundError | typeof ResultTooLargeError
		> = new Map([
			["InsightError", InsightError],
			["NotFoundError", NotFoundError],
			["ResultTooLargeError", ResultTooLargeError],
		]);

		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}

			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(
				this.test.title
			);
			let result: InsightResult[];

			try {
				// Try to perform the query
				result = await facade.performQuery(input);

				// If the query was expected to throw an error but succeeded
				if (errorExpected) {
					return expect.fail(
						`performQuery resolved when it should have rejected with ${expected}`
					);
				}

				// If the query was expected to succeed, assert the result
				expect(result).to.deep.equal(expected);
			} catch (err) {
				// If the query was expected to succeed but threw an error
				if (!errorExpected) {
					return expect.fail(`performQuery threw unexpected error: ${err}`);
				}

				// If the query was expected to fail, ensure the error matches expected
				expect(err).to.be.instanceOf(errorMap.get(expected));
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(
					`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`
				);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.

		/** ----------------------------------------------------------------------------------------*/

		/** Error Cases:*/
		// // Null or Undefined Query
		// it("[invalid/null.json] Null or Undefined Query", checkQuery);
		//
		// // Query check that it is not a JSON file
		// it(
		// 	"[invalid/HuangJiakang.jpg] Query check that it is not a JSON file",
		// 	checkQuery
		// );

		// Given invalid basic query
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);

		// Query with a nonexistent department
		it(
			"[invalid/anonexistentdepartment.json] a nonexistent department",
			checkQuery
		);

		// Test for an empty course id or nonexistent course
		it(
			"[invalid/nonexistentcourse.json] An empty course id or nonexistent course",
			checkQuery
		);

		// Query when there is no title available or an unknown title
		it("[invalid/anunknowntitle.json] An unknown title", checkQuery);

		// Query for an instructor who does not exist
		it(
			"[invalid/noninstructor.json] An instructor who does not exist",
			checkQuery
		);

		// Test for too many results
		it("[invalid/toomanyresults.json] Test for too many results", checkQuery);

		// Query when pass, fail, or audit values are missing or zero
		it(
			"[invalid/nonnumberofstudentspassed.json] Query when pass, fail, or audit values are missing or zero",
			checkQuery
		);

		// Using wildcard in the middle
		it(
			"[invalid/wildcardstarinthemid.json]  Using wildcard in the middle",
			checkQuery
		);

		// Query for a department that ends with a specific string but does not exist.
		it(
			"[invalid/endswithaspecificstringnotexist.json] ends with a specific string but does not exist",
			checkQuery
		);

		// Missing WHERE format
		it("[invalid/missingWHEREClause.json]Missing WHERE format", checkQuery);

		// Missing COLUMNS format
		it("[invalid/missingCOLUMNSClause.json]Missing WHERE format", checkQuery);

		// missingORDERClause
		it("[invalid/missingORDERClause.json]Missing WHERE format", checkQuery);

		//  AND with an empty array
		it(
			"[invalid/aNDWithAnEmptyArray.json] AND with an empty array",
			checkQuery
		);

		// GT on an invalid field
		it("[invalid/gTOnAnInvalidField.json] GT on an invalid field", checkQuery);

		// LT with non-numeric value
		it(
			"[invalid/lTWithNon-NumericValue.json] LT with non-numeric value",
			checkQuery
		);

		// NOT with AND condition
		it("[invalid/nOTWithISComparison.json] NOT with AND condition", checkQuery);

		// Query references multiple datasets
		it(
			"[invalid/queryReferencesMultipleDatasets.json] Query references multiple datasets",
			checkQuery
		);

		/** ----------------------------------------------------------------------------------------*/

		/** Successful Cases:*/
		// Given valid basic query
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);

		// Return empty result
		it("[valid/returnemptyresult.json] Return empty result", checkQuery);

		// Query to retrieve the correct uuid of a section.
		it(
			"[valid/correctuuidofasection.json] correct uuid of a section",
			checkQuery
		);

		// Query the course id for a known course
		it(
			"[valid/theknowncourseid.json]  Query the course id for a known course ",
			checkQuery
		);

		// Query to return the course title
		it(
			"[valid/returnthecoursetitle.json] Query to return the course title ",
			checkQuery
		);

		// Query to search for a specific professor or instructor
		it(
			"[valid/aspecificprofessor.json]  Query to search for a specific professor or instructor ",
			checkQuery
		);

		// Query using a condition based on the year of the course
		it(
			"[valid/conditionbasedontheyear.json] Query using a condition based on the year of the course ",
			checkQuery
		);

		// Test for an invalid year or a year that does not exist
		it("[valid/nonyear.json] a year that does not exist ", checkQuery);

		// Query to filter based on the average grade
		it("[valid/averagegrade.json] Based on the average grade ", checkQuery);

		// Query for the number of students who passed, failed, or audited
		it(
			"[valid/numberofstudentspassed.json] Query for the number of students who passed, failed, or audited ",
			checkQuery
		);

		// Query to match departments that contain a specific string
		it(
			"[valid/containaspecificstring.json] Query to match departments that contain a specific string ",
			checkQuery
		);

		// Using wildcard in the front
		it(
			"[valid/wildcardstarinthefront.json] Using wildcard in the front",
			checkQuery
		);

		// Using wildcard at the back
		it(
			"[valid/wildcardstarintheback.json] Using wildcard at the back",
			checkQuery
		);

		// Combines AND condition with a numerical comparison and a string comparison.
		it(
			"[valid/combinesANDcondition.json] Combines AND condition with a numerical comparison and a string comparison.",
			checkQuery
		);

		// Tests an OR condition with greater than and less than comparisons.
		it(
			"[valid/anORcondition.json] Tests an OR condition with greater than and less than comparisons.",
			checkQuery
		);

		// Combines an AND condition that contains an OR within it
		it(
			"[valid/anANDConditionThatContainsAnORWithinIt.json] Combines an AND condition that contains an OR within it",
			checkQuery
		);

		// NOT with GT comparison
		it("[valid/nOTWithGTComparison.json] NOT with GT comparison", checkQuery);
	});
});
