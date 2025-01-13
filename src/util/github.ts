import { GITHUB_APP_PRIVATE_KEY, GITHUB_CLIENT_ID } from "@/util/config/github"
import { LogLevel, log } from "@/util/log"

const logConfig = {
	debug: (...logData: any[]) => {
		log("github", LogLevel.Debug, logData)
	},
	info: (...logData: any[]) => {
		log("github", LogLevel.Info, logData)
	},
	warn: (...logData: any[]) => {
		log("github", LogLevel.Warn, logData)
	},
	error: (...logData: any[]) => {
		log("github", LogLevel.Error, logData)
	},
}

export async function getGithubApp() {
	const { App } = await import("octokit")

	const engraphApp = new App({
		appId: GITHUB_CLIENT_ID,
		privateKey: GITHUB_APP_PRIVATE_KEY,
		log: logConfig,
	})

	return engraphApp
}
