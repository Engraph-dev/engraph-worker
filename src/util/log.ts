export enum LogLevel {
	Debug = "debug",
	Info = "info",
	Warn = "warn",
	Error = "error",
}

export function log(serviceName: string, logLevel: LogLevel, ...data: any[]) {
	const mappedData = data.map((dataObj) => {
		if (dataObj instanceof Error) {
			const { message, name, cause = "unknown", stack = "" } = dataObj
			return `[${name}]: ${message} (cause = ${cause})\n${stack}`
		}
		if (typeof dataObj === "object") {
			return JSON.stringify(dataObj, null, 4)
		}
		return dataObj ?? "undefined"
	})

	const logDebug = (process.env.NODE_ENV || "development") === "development"

	if (!logDebug && logLevel === LogLevel.Debug) {
		return
	}

	console[logLevel](`[${serviceName}:${logLevel}] ${mappedData.join(" ")}`)
}
