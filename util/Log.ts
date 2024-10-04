/**
 * Collection of logging methods. Useful for making the output easier to read and understand.
 *
 * @param msg The message to log.
 * @param obj The object to log (optional).
 */
export default class Log {

	public static trace(...msg: any[]) {
		console.log(`<T> ${new Date().toLocaleString()}:`, ...msg);
	}

	public static info(...msg: any[]) {
		console.log(`<I> ${new Date().toLocaleString()}:`, ...msg);
	}

	public static warn(msg: string, obj?: any) {
		try {
			if (typeof obj === 'undefined') {
				console.log("<W> " + new Date().toLocaleString() + ": " + msg);
			} else {
				if (typeof obj === 'object') {
					if (obj instanceof Error) {
						console.log("<W> Object: " + new Date().toLocaleString() + ": " + msg + "; err: " + obj.message);
					} else {
						console.log("<W> Object: " + new Date().toLocaleString() + ": " + msg + "; obj: " + JSON.stringify(obj));
					}
				} else {
					console.log("<W> " + new Date().toLocaleString() + ": " + msg + "; err: " + obj);
				}
			}
		} catch (err: any) {
			console.log("<W> " + new Date().toLocaleString() + ": Warning (printing error)");
		}
	}

	public static error(msg: string, obj?: any) {
		try {
			if (typeof obj === 'undefined') {
				console.log("<E> " + new Date().toLocaleString() + ": " + msg);
			} else {
				if (typeof obj === 'object') {
					if (obj instanceof Error) {
						console.log("<E> Object: " + new Date().toLocaleString() + ": " + msg + "; err: " + obj.message);
					} else {
						console.log("<E> Object: " + new Date().toLocaleString() + ": " + msg + "; obj: " + JSON.stringify(obj));
					}
				} else {
					console.log("<E> " + new Date().toLocaleString() + ": " + msg + "; err: " + obj);
				}
			}
		} catch (err: any) {
			console.log("<E> " + new Date().toLocaleString() + ": Error (printing error)");
		}
	}

	public static test(...msg: any[]) {
		console.log(`<X> ${new Date().toLocaleString()}:`, ...msg);
	}
}
