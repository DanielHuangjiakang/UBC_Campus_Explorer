import { expect } from "chai";
import request, { Response } from "supertest";
import { StatusCodes } from "http-status-codes";
import Log from "@ubccpsc310/folder-test/build/Log";

describe("Facade C3", function () {
	before(function () {
		// TODO: start server here once and handle errors properly
	});

	after(function () {
		// TODO: stop server here once!
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what is going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", function () {
		const SERVER_URL = "TBD";
		const ENDPOINT_URL = "TBD";
		const ZIP_FILE_DATA = "TBD";

		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(StatusCodes.OK);
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
