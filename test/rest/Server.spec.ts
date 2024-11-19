import { expect } from "chai";
import request, { Response } from "supertest";
import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "../../src/rest/Server"; // Adjust the path as needed
import fs from "fs-extra";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives } from "../TestUtil";
import { InsightDatasetKind } from "../../src/controller/IInsightFacade";

describe("Facade C3", function () {
	const PORT = 4321;
	let server: Server;
	const serverURL = "http://localhost:4321";
	let validCourseBuffer: Buffer;
	let validRoomBuffer: Buffer;
	let invalidCourseBuffer: Buffer;
	let facade: InsightFacade;
	let sections: string;

	before(async function () {
		// TODO: start server here once and handle errors properly
		validCourseBuffer = fs.readFileSync("test/resources/archives/valid_course.zip");
		invalidCourseBuffer = fs.readFileSync("test/resources/archives/invalid_section.zip");
		validRoomBuffer = fs.readFileSync("test/resources/archives/campus.zip");
		facade = new InsightFacade();
		sections = await getContentFromArchives("pair.zip");
		server = new Server(PORT);
		await server.start();
	});

	after(async function () {
		// TODO: stop server here once!
		await server.stop();
		await clearDisk();
	});

	beforeEach(async function () {
		// might want to add some process logging here to keep track of what is going on
		facade = new InsightFacade();
	});

	afterEach(async function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// // Sample on how to format PUT requests
	// it("PUT test for courses dataset", function () {
	// 	const SERVER_URL = "TBD";
	// 	const ENDPOINT_URL = "TBD";
	// 	const ZIP_FILE_DATA = "TBD";
	//
	// 	try {
	// 		return request(SERVER_URL)
	// 			.put(ENDPOINT_URL)
	// 			.send(ZIP_FILE_DATA)
	// 			.set("Content-Type", "application/x-zip-compressed")
	// 			.then(function (res: Response) {
	// 				// some logging here please!
	// 				expect(res.status).to.be.equal(StatusCodes.OK);
	// 			})
	// 			.catch(function () {
	// 				// some logging here please!
	// 				expect.fail();
	// 			});
	// 	} catch (err) {
	// 		Log.error(err);
	// 		// and some more logging here!
	// 	}
	// });

	it("PUT test for valid course dataset", function () {
		try {
			return request(serverURL)
				.put("/dataset/validCourse/sections")
				.send(validCourseBuffer)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					const goodCode = 200;
					expect(res.status).to.be.equal(goodCode);
					expect(res.body).to.have.property("result").that.includes("validCourse");
				})
				.catch(function () {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("PUT test for valid room dataset", function () {
		try {
			return request(serverURL)
				.put("/dataset/validRoom/rooms")
				.send(validRoomBuffer)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					const goodCode = 200;
					expect(res.status).to.be.equal(goodCode);
					expect(res.body).to.have.property("result").that.includes("validRoom");
				})
				.catch(function () {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("PUT test for invalid course dataset", function () {
		try {
			return request(serverURL)
				.put("/dataset/validCourse/sections")
				.send(invalidCourseBuffer)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					const badCode = 400;
					expect(res.status).to.be.equal(badCode);
				})
				.catch(function () {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("DELETE test for an existing dataset", function () {
		try {
			request(serverURL)
				.put("/dataset/validCourse/sections")
				.send(validCourseBuffer)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					const goodCode = 200;
					expect(res.status).to.be.equal(goodCode);
				})
				.catch(function () {
					// some logging here please!
					expect.fail();
				});

			return request(serverURL)
				.delete("/dataset/validCourse")
				.then(function (res: Response) {
					// some logging here please!
					const goodCode = 200;
					expect(res.status).to.be.equal(goodCode);
					expect(res.body).to.have.property("result").that.includes("validCourse");
				})
				.catch(function () {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("DELETE test for an nonexistent dataset", function () {
		try {
			return request(serverURL)
				.delete("/dataset/validCourse")
				.then(function (res: Response) {
					// some logging here please!
					const notFoundCode = 404;
					expect(res.status).to.be.equal(notFoundCode);
				})
				.catch(function () {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("POST test for valid query", async function () {
		await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
		const data = await fs.readFile("test/resources/queries/valid/simple.json", "utf8");
		const dataJSON = JSON.parse(data);
		const queryInput = dataJSON.input;
		const expectedResult = dataJSON.expected;
		try {
			return request(serverURL)
				.post("/query")
				.send(queryInput)
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					// some logging here please!
					const goodCode = 200;
					expect(res.status).to.be.equal(goodCode);
					expect(res.body.result).to.deep.members(expectedResult);
				})
				.catch(function (err) {
					// some logging here please!
					// console.error("Error in POST request test:", err);
					expect.fail("Request failed unexpectedly: " + err.message);
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("POST test for invalid query", async function () {
		const data = await fs.readFile("test/resources/queries/invalid/invalid.json", "utf8");
		const dataJSON = JSON.parse(data);
		const queryInput = dataJSON.input;
		try {
			return request(serverURL)
				.post("/query")
				.send(queryInput)
				.set("Content-Type", "application/json")
				.then(function (res: Response) {
					// some logging here please!
					const badCode = 400;
					expect(res.status).to.be.equal(badCode);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail("Request failed unexpectedly: " + err.message);
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	it("get test when no datasets added", function () {
		try {
			return request(serverURL)
				.get("/datasets")
				.then(function (res: Response) {
					// some logging here please!
					const goodCode = 200;
					console.log("Response status:", res.status);
					console.log("Response body:", res.body);
					expect(res.status).to.be.equal(goodCode);
				})
				.catch(function () {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			Log.error(err);
			// and some more logging here!
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions in the supertest documentation
});
