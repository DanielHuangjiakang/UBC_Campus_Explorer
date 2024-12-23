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
	let campus: string;

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
		//room Dataset
		campus = await getContentFromArchives("campus.zip");

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

		it("should not add sections with a kind 'Rooms' ", async function () {
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

		it("Old facade added a dataset 1 , new one add 2 and 3 and return [1, 2, 3]", async function () {
			const facade1 = new InsightFacade();
			const facade2 = new InsightFacade();
			try {
				const messages1: string[] = await facade1.addDataset("1", validCourse, InsightDatasetKind.Sections);
				expect(messages1).to.have.lengthOf(1);
				expect(messages1[0]).to.equal("1");

				await facade2.addDataset("2", validCourse, InsightDatasetKind.Sections);
				const messages2: string[] = await facade2.addDataset("3", validCourse, InsightDatasetKind.Sections);
				const three = 3;
				expect(messages2).to.have.lengthOf(three);
				expect(messages2[0]).to.equal("1");
				expect(messages2[1]).to.equal("2");
				expect(messages2[three - 1]).to.equal("3");
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});

		it("should add a campus dataset", async function () {
			try {
				const messages: string[] = await facade.addDataset("campus", campus, InsightDatasetKind.Rooms);
				expect(messages).to.have.lengthOf(1);
				const roomsLength = 364;
				const result = await facade.listDatasets();
				expect(result).to.have.lengthOf(1);
				expect(result[0].kind).to.equal(InsightDatasetKind.Rooms);
				expect(result[0].numRows).to.equal(roomsLength);
			} catch (_) {
				expect.fail("Should not have thrown above");
				// throw err;
			}
		});

		it("should return room and section datasets when two facade used", async function () {
			const facade1 = new InsightFacade();
			const facade2 = new InsightFacade();
			try {
				const message1: string[] = await facade1.addDataset("ubcRooms", campus, InsightDatasetKind.Rooms);
				expect(message1).to.have.lengthOf(1);
				expect(message1[0]).to.equal("ubcRooms");
				const message2: string[] = await facade2.addDataset("ubcSections", numRows2, InsightDatasetKind.Sections);
				const two = 2;
				expect(message2).to.have.lengthOf(two);
				expect(message2[0]).to.equal("ubcRooms");
				expect(message2[1]).to.equal("ubcSections");
			} catch (_) {
				expect.fail("Should not have thrown above.");
				// throw err;
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
				const list = await facade2.listDatasets();
				expect(list).to.have.lengthOf(0);
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});

		it("should successfully remove a Room dataset added by a different facade", async function () {
			const facade1 = new InsightFacade();
			const facade2 = new InsightFacade();
			try {
				const messages1: string[] = await facade1.addDataset("ubcRooms", campus, InsightDatasetKind.Rooms);
				expect(messages1).to.have.lengthOf(1);
				expect(messages1[0]).to.equal("ubcRooms");

				const message2: string = await facade2.removeDataset("ubcRooms");
				expect(message2).to.equal("ubcRooms");
				const list = await facade2.listDatasets();
				expect(list).to.have.lengthOf(0);
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});

		it("should successfully remove two datasets added by a different facade", async function () {
			const facade1 = new InsightFacade();
			const facade2 = new InsightFacade();
			try {
				await facade1.addDataset("1", validCourse, InsightDatasetKind.Sections);
				const messages1 = await facade1.addDataset("2", validCourse, InsightDatasetKind.Sections);
				const two = 2;
				expect(messages1).to.have.lengthOf(two);
				expect(messages1[0]).to.equal("1");
				expect(messages1[1]).to.equal("2");

				const remove1: string = await facade2.removeDataset("1");
				expect(remove1).to.equal("1");
				const remove2: string = await facade2.removeDataset("2");
				expect(remove2).to.equal("2");
				const list = await facade2.listDatasets();
				expect(list).to.have.lengthOf(0);
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

		it("Old facade added a dataset 1, 2, new one can list dataset [{1, ,}, {2, ,}]", async function () {
			try {
				const facade1 = new InsightFacade();
				await facade1.addDataset("1", validCourse, InsightDatasetKind.Sections);
				await facade1.addDataset("2", validCourse, InsightDatasetKind.Sections);
				const facade2 = new InsightFacade();

				const list = await facade2.listDatasets();
				const two = 2;
				expect(list).to.have.lengthOf(two);
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});

		it(
			"Old facade added a dataset 1, new one add a dataset 2 " + "and can list dataset [{1, ,}, {2, ,}]",
			async function () {
				try {
					const facade1 = new InsightFacade();
					await facade1.addDataset("1", validCourse, InsightDatasetKind.Sections);
					const facade2 = new InsightFacade();
					await facade2.addDataset("2", validCourse, InsightDatasetKind.Sections);

					const list = await facade2.listDatasets();
					const two = 2;
					expect(list).to.have.lengthOf(two);
				} catch (_) {
					expect.fail("Should not have thrown above.");
				}
			}
		);

		it("Old facade added a dataset 1, new one remove the dataset 1 and list no dataset", async function () {
			try {
				const facade1 = new InsightFacade();
				await facade1.addDataset("1", validCourse, InsightDatasetKind.Sections);
				const facade2 = new InsightFacade();
				await facade2.removeDataset("1");

				const list = await facade2.listDatasets();
				expect(list).to.have.lengthOf(0);
			} catch (_) {
				expect.fail("Should not have thrown above.");
			}
		});

		it(
			"should return a list with correct info after adding room, " + "section datasets with 2 facades",
			async function () {
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

					const facadeNew = new InsightFacade();
					await facadeNew.addDataset("UBCRooms", campus, InsightDatasetKind.Rooms);
					result = await facadeNew.listDatasets();
					expect(result).to.have.lengthOf(two);
					expect(result[0].id).to.equal("UBC");
					expect(result[0].kind).to.equal(InsightDatasetKind.Sections);
					expect(result[0].numRows).to.equal(two);

					expect(result[1].id).to.equal("UBCRooms");
					expect(result[1].kind).to.equal(InsightDatasetKind.Rooms);
					const numRooms = 364;
					expect(result[1].numRows).to.equal(numRooms);
				} catch (_) {
					expect.fail("Should not have thrown above.");
					// throw err;
				}
			}
		);
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
				expect(result).to.deep.members(expected); // compare results ignore the order
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
			const oldFacade = new InsightFacade();
			await oldFacade.addDataset("old", twoSubjects, InsightDatasetKind.Sections);
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", campus, InsightDatasetKind.Rooms),
				facade.addDataset("UBC", validCourse, InsightDatasetKind.Sections),
				facade.addDataset("pass", twoSubjects, InsightDatasetKind.Sections),
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
		it("[valid/persistence.json] try to visit the dataset added by oldFacade, * select all dept", checkQuery);
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
		//
		it("[invalid/referenced_dataset_ubc_not_added.json] referenced_dataset_ubc_not_added ", checkQuery);

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
		it("[valid/count_Sections_By_Instructor.json] count_Unique_Occurrencesg", checkQuery);
		it("[valid/count_Unique_Occurrences.json] count_Unique_Occurrences", checkQuery);
		it("[valid/valid_base_two_test.json] valid base two test", checkQuery);
		it("[valid/valid_base_one_test.json] valid base one test", checkQuery);
		it("[valid/valid_simple_filter.json] valid simple filter", checkQuery);
		it("[valid/valid_overal_avg.json]valid overal avg", checkQuery);
		it("[valid/valid_max.json]valid max", checkQuery);
		it("[valid/valid_pass.json]valid pass", checkQuery);
		it("[valid/valid_course_id.json] valid_course id", checkQuery);
		it("[valid/valid_course_id_min.json] valid_course_id_min", checkQuery);
		it("[valid/valid_avg_cs.json] valid_avg_cs", checkQuery);
		it("[valid/valid_avg_gt.json] valid_avg_gt", checkQuery);
		it("[valid/valid_avg_gt_two.json] valid_avg_gt_two", checkQuery);
		it("[valid/valid_avg_gt_three.json] valid_avg_gt_three", checkQuery);
		it("[valid/valid_group_max.json] valid_group_max", checkQuery);
		it("[valid/valid_Rooms_Seats.json] valid_Rooms_Seats", checkQuery);
		it("[valid/valid_Rooms_geolocation.json] valid_Rooms_geolocation", checkQuery);
		it("[valid/valid_sections_facl.json] valid_sections_facl", checkQuery);
		it("[valid/valid_sections_aanb.json] valid_sections_aanb", checkQuery);
		it("[valid/valid_RoomQueries_Edge_Case_Test.json] valid_RoomQueries_Edge_Case_Test", checkQuery);
		it("[valid/valid_Sum_Aggregation_Test.json] valid_Sum_Aggregation_Test", checkQuery);
		it("[valid/valid_Combination_of_Multiple_Aggregations.json] valid_Combination_Aggregations", checkQuery);
		it("[valid/valid_non_is.json] valid_non_is", checkQuery);
		it("[valid/valid_Grouping_Sum.json] valid_Grouping_Sum", checkQuery);
		it("[valid/valid_Average_Grouping.json] valid_Average_Grouping", checkQuery);
		it("[valid/valid_Count.json] valid_Count", checkQuery);
		it("[valid/valid_SUM_Aggregation.json] valid_SUM_Aggregation", checkQuery);
		it("[valid/valid_AVG_Aggregation.json] valid_AVG_Aggregation", checkQuery);
		it("[valid/valid_SUM_Aggregation_two.json] valid_SUM_Aggregation_two", checkQuery);
		it("[valid/valid_SUM_Average_Grades.json] valid_SUM_Average_Grades", checkQuery);
		it("[valid/valid_Total_Passed_Students.json] valid_Total_Passed_Students", checkQuery);
		it("[valid/valid_Total_Failed_Students_Department.json] valid_Total_Failed_Students_Department", checkQuery);
		it("[valid/valid_transformation_group_Apply.json] valid_transformation_group_Apply", checkQuery);
		it("[valid/valid_sum_section.json] valid_sum_section", checkQuery);
		it("[valid/valid_sum_section_two.json] valid_sum_section_two", checkQuery);
		it("[valid/valid_sum_without_year.json] valid_sum_section_two", checkQuery);

		it("[invalid/invalid_transformation_Extra_keys.json] invalid_transformation_Extra_keys", checkQuery);
		it("[invalid/invalid_transformation_missing_GROUP.json] invalid_transformation_missing_GROUP", checkQuery);
		it("[invalid/query_more_than_one_dataset.json] query more than one dataset", checkQuery);
		it("[invalid/invalid_key_type_AVG.json] invalid key type AVG", checkQuery);
		it("[invalid/invalid_Max_Aggregation_Test.json] invalid_Max_Aggregation_Test", checkQuery);
		it("[invalid/invalid_Excess_keys_in_query.json] invalid_Excess_keys_in_query", checkQuery);
		it(
			"[invalid/invalid_transformation_more_than_one_dataset.json] invalid_transformation_more_than_one_dataset",
			checkQuery
		);
		it(
			"[invalid/invalid_transformation_Cannot_have_underscore.json] invalid_transformation_Cannot_have_underscore",
			checkQuery
		);
		it("[invalid/max_invalid_key.json] max_invalid_key", checkQuery);
		it("[valid/testValidlon.json] testValidlon", checkQuery);
	});
});
