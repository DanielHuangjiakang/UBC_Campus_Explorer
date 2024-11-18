import Log from "@ubccpsc310/folder-test/build/Log";
import Server from "./rest/Server";

/**
 * Main app class that is run with the node command. Starts the server.
 */
export class App {
	public async initServer(port: number): Promise<void> {
		Log.info(`App::initServer( ${port} ) - start`);

		const server = new Server(port);
		return server
			.start()
			.then(() => {
				Log.info("App::initServer() - started");
			})
			.catch((err: Error) => {
				Log.error(`App::initServer() - ERROR: ${err.message}`);
			});
	}
}

// This ends up starting the whole system and listens on a hardcoded port (4321)
Log.info("App - starting");
const port = 4321;
const app = new App();
(async (): Promise<void> => {
	await app.initServer(port);
})();
