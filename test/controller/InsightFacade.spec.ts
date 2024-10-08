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
	let sectionsEmpty: string;
	let invalidJSON: string;
	let invalidSection: string;
	let noCourse: string;
	let validCourse: string;
	let invalidEmptySection: string;
	let noQueryable: string;
	let nonZip: string;
	let emptyCourseFolder: string;
	let numRows2: string;
	let twoSubjects: string;
	let emptyFile: string;
	let pic: string;
	let folderPic: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		invalidJSON = await getContentFromArchives("invalid_Json.zip");
		invalidSection = await getContentFromArchives("invalid_section.zip");
		noCourse = await getContentFromArchives("no_course_folder.zip");
		validCourse = await getContentFromArchives("valid_course.zip");
		invalidEmptySection = await getContentFromArchives("invalid_empty_section.zip");
		noQueryable = await getContentFromArchives("no_queryable.zip");
		nonZip = await getContentFromArchives("TicketToMars.png");
		emptyCourseFolder = await getContentFromArchives("empty_course_folder.zip");
		numRows2 = await getContentFromArchives("num_rows_2.zip");
		twoSubjects = await getContentFromArchives("two_subjects.zip");
		emptyFile = await getContentFromArchives("empty_file.zip");
		pic = await getContentFromArchives("pic.zip");
		folderPic = await getContentFromArchives("folder_pic.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

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

		//
		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a whitespace dataset id", async function () {
			try {
				await facade.addDataset(" ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an empty content", async function () {
			try {
				await facade.addDataset("UBC", sectionsEmpty, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with duplicate ids", async function () {
			try {
				await facade.addDataset("UBC", twoSubjects, InsightDatasetKind.Sections);
				await facade.addDataset("UBC", twoSubjects, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an invalid Json content", async function () {
			try {
				await facade.addDataset("UBC", invalidJSON, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an invalid section content", async function () {
			try {
				await facade.addDataset("UBC", invalidSection, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with a no courses folder content", async function () {
			try {
				await facade.addDataset("UBC", noCourse, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with an invalid kind Rooms", async function () {
			try {
				await facade.addDataset("UBC", sections, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with invalid empty file in course folder", async function () {
			try {
				await facade.addDataset("UBC", invalidEmptySection, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with no queryable file in course folder", async function () {
			try {
				await facade.addDataset("UBC", noQueryable, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with non_zip file", async function () {
			try {
				await facade.addDataset("UBC", nonZip, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with empty courses folder", async function () {
			try {
				await facade.addDataset("UBC", emptyCourseFolder, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with id that contains an underscore", async function () {
			try {
				await facade.addDataset("_", validCourse, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with empty file (has a file in courses)", async function () {
			try {
				await facade.addDataset("UBC", emptyFile, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with zip that contains a png", async function () {
			try {
				await facade.addDataset("UBC", pic, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with courses folder contains a png", async function () {
			try {
				await facade.addDataset("UBC", folderPic, InsightDatasetKind.Sections);
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should add a dataset successfully with valid course", async function () {
			try {
				let result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
				await facade.addDataset("UBC", validCourse, InsightDatasetKind.Sections);
				result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(result[0].id).to.equal("UBC");
			} catch (err) {
				expect(err).not.equal(null);
				expect.fail("Should not have thrown above.");
			}
		});


		it("should return correct string [] ids when two facade used", async function () {
			const facade1 = new InsightFacade();
			const facade2 = new InsightFacade();
			try {
				const message1: string[] = await facade1.addDataset("UBC", validCourse, InsightDatasetKind.Sections);
				expect(message1).to.have.lengthOf(1);
				expect(message1[0]).to.equal("UBC");
				const message2: string[] = await facade2.addDataset("PASS", numRows2, InsightDatasetKind.Sections);
				const two = 2;
				expect(message2).to.have.lengthOf(two);
				expect(message2[0]).to.equal("UBC");
				expect(message2[1]).to.equal("PASS");
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});

		it("should add a dataset successfully", async function () {
			try {
				let result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
				result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
				expect(result[0].id).to.equal("sections");
			} catch (_) {
				expect.fail("Should not have thrown above");
			}
		});

		it("should add two simple datasets", async function () {
			try {
				const mes1 = await facade.addDataset("simple", twoSubjects, InsightDatasetKind.Sections);
				expect(mes1).to.has.lengthOf(1);
				expect(mes1[0]).equal("simple");
				const mes2 = await facade.addDataset("simpleUBC", twoSubjects, InsightDatasetKind.Sections);
				const two = 2;
				expect(mes2).to.has.lengthOf(two);
				expect(mes2[1]).equal("simpleUBC");
			} catch (_) {
				expect.fail(`Should not have thrown above`);
			}
		});

		it("should add a complex dataset", async function () {
			try {
				await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			} catch (_) {
				expect.fail("Should not have thrown above");
			}
		});

		it("should add two dataset with different ids successfully", async function () {
			try {
				// Ensure the initial dataset list is empty
				let result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);

				// Add the first dataset with ID "UBC"
				await facade.addDataset("UBC", validCourse, InsightDatasetKind.Sections);
				result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);
				expect(result[0].id).to.equal("UBC");
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);

				// Add the second dataset sfu
				await facade.addDataset("sfu", sections, InsightDatasetKind.Sections);
				result = await facade.listDatasets();
				const two = 2;
				expect(result).to.have.lengthOf(two);
				expect(result[1].id).to.equal("sfu");
				expect(result[1].kind).to.equal(InsightDatasetKind.Sections);
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});
	});

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

		it("should reject with invalid id (empty)", async function () {
			try {
				await facade.addDataset("UBC", validCourse, InsightDatasetKind.Sections);
				await facade.removeDataset("");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with non-matched id", async function () {
			try {
				let result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
				await facade.addDataset("UBC", validCourse, InsightDatasetKind.Sections);
				result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);

				await facade.removeDataset("ub");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should reject with removing a dataset has been removed", async function () {
			try {
				await facade.addDataset("UBC", validCourse, InsightDatasetKind.Sections);
				await facade.removeDataset("UBC");
				await facade.removeDataset("UBC");
				expect.fail("Should have thrown above.");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should remove a dataset with id successfully", async function () {
			try {
				let result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);

				await facade.addDataset("UBC", validCourse, InsightDatasetKind.Sections);
				result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);

				await facade.removeDataset("UBC");
				result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});

		it("should successfully remove three dataset one by one", async function () {
			try {
				await facade.addDataset("u", validCourse, InsightDatasetKind.Sections);
				await facade.addDataset("b", validCourse, InsightDatasetKind.Sections);
				await facade.addDataset("c", validCourse, InsightDatasetKind.Sections);
				await facade.removeDataset("u");
				await facade.removeDataset("b");
				await facade.removeDataset("c");
			} catch (_) {
				expect.fail("Should not  have thrown above.");
			}
		});

		it("should successfully remove a dataset added by a different facade", async function () {
			const facade1 = new InsightFacade();
			const facade2 = new InsightFacade();
			try {
				const messages1: string[] = await facade1.addDataset("UBC", validCourse, InsightDatasetKind.Sections);
				expect(messages1).to.have.lengthOf(1);
				expect(messages1[0]).to.equal("UBC");

				const message2: string = await facade2.removeDataset("UBC");
				expect(message2).to.equal("UBC");
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});
	});

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

		it("should return a list of size zero", async function () {
			try {
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
			} catch (_) {
				expect.fail("Should not  have thrown above.");
			}
		});

		it("should return a list of size one with correct info ", async function () {
			try {
				let result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
				await facade.addDataset("UBC", numRows2, InsightDatasetKind.Sections);
				result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);
				expect(result[0].id).to.equal("UBC");
				expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
				const two = 2;
				expect(result[0].numRows).to.equal(two);
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});

		it("should return a list of size zero after failing to add a dataset ", async function () {
			try {
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
				await facade.addDataset("", numRows2, InsightDatasetKind.Sections);
				expect.fail("Should not have thrown above.");
			} catch (_) {
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(0);
			}
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */

		// Create the error map inside the describe block
		const errorMap = new Map<string, typeof InsightError | typeof NotFoundError | typeof ResultTooLargeError>([
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
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[];
			try {
				// Try to execute the query
				result = await facade.performQuery(input);

				// If we expected an error, but no error was thrown, fail the test
				if (errorExpected) {
					expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
				}

				// If no error is expected, ensure the results match the expected output
				expect(result).to.have.deep.members(expected); // compare results ignore the order
			} catch (err) {
				// If an error was expected, check if the error is of the correct type
				if (errorExpected) {
					const expectedErrorType = errorMap.get(expected);
					expect(err).to.be.instanceOf(expectedErrorType);
				} else {
					// If no error was expected but one was thrown, fail the test
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}
			}
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				// facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				// facade.addDataset("UBC", validCourse, InsightDatasetKind.Sections),
				// facade.addDataset("pass", twoSubjects, InsightDatasetKind.Sections),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery); // added below
		it("[valid/mutant.json] * select all dept", checkQuery);
		it("[invalid/invalid_ResultTooLargeError.json] Query >  more than 5000 results", checkQuery);
		it("[invalid/invalid_No_dataset.json] Query references a dataset not added ", checkQuery);
		it("[invalid/invalid_multiple_datasets.json] Query references multiple datasets ", checkQuery);
		it("[invalid/invalid_second_mutant.json] second_mutant", checkQuery);

		//invalid
		it("[invalid/aNDMustBeANon-EmptyArray.json] AND must be a non-empty array", checkQuery);
		it("[invalid/andShouldOnlyHave1Key,Has0.json] and should only have 1 key, has 0 ", checkQuery);
		it("[invalid/columnsBeingEmptyArray.json] columns being a non-empty array ", checkQuery);
		it("[invalid/invalidKeySections_aInCol.json] Invalid key sections_a in col ", checkQuery);
		it("[invalid/invalidKeyTypeInGT.json] Invalid key type in GT ", checkQuery);
		it("[invalid/invalidKeyTypeInIS.json] Invalid key type in IS ", checkQuery);
		it("[invalid/invalidValueTypeInIS,ShouldBeString.json] Invalid value type in IS, should be strin ", checkQuery);
		it("[invalid/isTooLargeWithAvg_88.74.json] Is too large with avg > 88.74 ", checkQuery);
		it("[invalid/oPTIONS_missing_COLUMNS.json] OPTIONS_missing_COLUMNS ", checkQuery);
		it("[invalid/orderKeyNotInCols.json] order key not in cols ", checkQuery);
		it("[invalid/oRShouldOnlyHave1Key,Has0.json] OR should only have 1 key, has 0 ", checkQuery);

		//valid
		it("[valid/all10fileds.json] All10fileds", checkQuery);
		it("[valid/aND_DEPT_MATH_PRO_AO.json] AND_DEPT_MATH_PRO_AO", checkQuery);
		it("[valid/complexOR_AND_GT_IS__EQQuery.json] Complex OR_AND_GT_IS*_EQ query", checkQuery);
		it("[valid/noOrder.json] no order", checkQuery);
		it("[valid/nOTGT5.json] NOTGT5", checkQuery);
		it("[valid/nOTLT1000.json] NOTLT1000", checkQuery);
		it("[valid/notTooLargeWithAvg_88.75(4948).json] Not too large with avg > 88.75 (4948)", checkQuery);
		it("[valid/oR_DEPT_MATH_PRO_AO.json] OR_DEPT_MATH_PRO_AO", checkQuery);
		it("[valid/orderByDept.json] order by dept", checkQuery);
		it("[valid/sections_avgEQ95.json] sections_avgEQ95", checkQuery);
		it("[valid/sections_avgEQ100.json] sections_avgEQ100", checkQuery);
		it("[valid/sections_avgLT0.json] sections_avgLT0", checkQuery);
		it("[valid/sections_avgLT5.json] sections_avgLT5", checkQuery);
		it("[valid/sectionsavg102.json] sections_avg:102", checkQuery);
		it("[valid/sectionsid7wild.json] sectionsid7wild", checkQuery);
		it("[valid/sectionsidwild99.json] sectionsidwild99", checkQuery);
		it("[valid/sectionsidwild99wild.json] sectionsidwild99wild", checkQuery);
		it("[valid/sectionsidwildNOExamples.json] sectionsidwildNOExamples", checkQuery);
		it("[valid/validValueTypeInIS,ShouldBeString.json] valid value type in IS, should be string", checkQuery);
	});
});
