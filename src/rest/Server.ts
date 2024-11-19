import express, { Application, Request, Response } from "express";
import Log from "@ubccpsc310/folder-test/build/Log";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import { InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "../controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	private insightFacade: InsightFacade;

	constructor(port: number) {
		Log.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();
		this.insightFacade = new InsightFacade(); // initialize

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		// this.express.use(express.static("./frontend/public"))
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			Log.info("Server::start() - start");
			if (this.server !== undefined) {
				Log.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						Log.info(`Server::start() - server listening on port: ${this.port}`);
						resolve();
					})
					.on("error", (err: Error) => {
						// catches errors in server start
						Log.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public async stop(): Promise<void> {
		Log.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				Log.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					Log.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware(): void {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({ type: "application/*", limit: "10mb" }));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes(): void {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		// this.express.get("/echo/:msg", Server.echo);

		// TODO: your other endpoints should go here
		// PUT /dataset/:id/:kind
		this.express.put("/dataset/:id/:kind", this.addDataset.bind(this));

		this.express.delete("/dataset/:id", this.deleteDataset.bind(this));

		this.express.post("/query", this.performQuery.bind(this));

		this.express.get("/datasets", this.listDatasets.bind(this));
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	// private static echo(req: Request, res: Response): void {
	// 	try {
	// 		Log.info(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
	// 		const response = Server.performEcho(req.params.msg);
	// 		res.status(StatusCodes.OK).json({ result: response });
	// 	} catch (err) {
	// 		res.status(StatusCodes.BAD_REQUEST).json({ error: err });
	// 	}
	// }
	//
	// private static performEcho(msg: string): string {
	// 	if (typeof msg !== "undefined" && msg !== null) {
	// 		return `${msg}...${msg}`;
	// 	} else {
	// 		return "Message not provided";
	// 	}
	// }

	private async addDataset(req: Request, res: Response): Promise<void> {
		try {
			const result = await this.performAddDataset(req);
			const goodResponseCode = 200;
			res.status(goodResponseCode).json({ result });
		} catch (err) {
			const badResponseCode = 400;
			const errorMessage = err instanceof Error ? err.message : "An error occurred";
			res.status(badResponseCode).json({ error: errorMessage });
		}
	}

	private async performAddDataset(req: Request): Promise<string[]> {
		const id = req.params.id;
		const kindString = req.params.kind;
		const content = req.body.toString("base64");

		// 将字符串转换为枚举类型
		let kind: InsightDatasetKind;
		if (kindString === "sections") {
			kind = InsightDatasetKind.Sections;
		} else if (kindString === "rooms") {
			kind = InsightDatasetKind.Rooms;
		} else {
			throw new Error("Invalid kind parameter");
		}

		// 使用 this.insightFacade 调用 addDataset 方法
		return this.insightFacade.addDataset(id, content, kind);
	}

	private async deleteDataset(req: Request, res: Response): Promise<void> {
		try {
			const result = await this.performDeleteDataset(req);
			const goodResponseCode = 200;
			res.status(goodResponseCode).json({ result });
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "An error occurred";
			const insightErrorCode = 400;
			const notFoundErrorCode = 404;
			if (err instanceof InsightError) {
				res.status(insightErrorCode).json({ error: errorMessage });
			} else {
				res.status(notFoundErrorCode).json({ error: errorMessage });
			}
		}
	}

	private async performDeleteDataset(req: Request): Promise<string> {
		const id = req.params.id;
		return this.insightFacade.removeDataset(id);
	}

	private async performQuery(req: Request, res: Response): Promise<void> {
		try {
			const result = await this.performQueryHelper(req);
			const goodResponseCode = 200;
			res.status(goodResponseCode).json({ result });
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "An error occurred";
			const badResponseCode = 400;
			res.status(badResponseCode).json({ error: errorMessage });
		}
	}

	private async performQueryHelper(req: Request): Promise<InsightResult[]> {
		const query = req.body;
		return this.insightFacade.performQuery(query);
	}

	private async listDatasets(_req: Request, res: Response): Promise<void> {
		const result = await this.performListDatasets();
		const goodResponseCode = 200;
		res.status(goodResponseCode).json({ result });
	}

	private async performListDatasets(): Promise<InsightDataset[]> {
		return this.insightFacade.listDatasets();
	}
}

// private async handleAddDataset(req: Request, res: Response): Promise<void> {
// 	try {
// 		const id = req.params.id;
// 		const kindString = req.params.kind;
// 		const content = req.body;
//
// 		// 将字符串转换为枚举类型
// 		let kind: InsightDatasetKind;
// 		if (kindString === "sections") {
// 			kind = InsightDatasetKind.Sections;
// 		} else if (kindString === "rooms") {
// 			kind = InsightDatasetKind.Rooms;
// 		} else {
// 			throw new Error("Invalid kind parameter");
// 		}
//
// 		// 使用 this.insightFacade 调用 addDataset 方法
// 		const result = await this.insightFacade.addDataset(id, content, kind);
// 		const goodResponseCode = 200;
// 		res.status(goodResponseCode).json({ result });
// 	} catch (err) {
// 		const badResponseCode = 400;
// 		const errorMessage = (err instanceof Error) ? err.message : "An error occurred";
// 		res.status(badResponseCode).json({ error: errorMessage });
// 	}
// }
