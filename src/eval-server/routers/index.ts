import {
	addEvalPreference,
	getParserProjects,
	getProjectModuleEvalResult,
	getProjectModules,
	getProjectSymbolEvalResult,
	getProjectSymbols,
	getSupportedParsers,
} from "@/eval-server/controllers"
import { Router } from "@/eval-server/utils/router"

const indexRouter = Router()

indexRouter.get("/parsers", getSupportedParsers)
indexRouter.get("/parsers/:parser/projects", getParserProjects)
indexRouter.get("/parsers/:parser/projects/:project/modules", getProjectModules)
indexRouter.get("/parsers/:parser/projects/:project/symbols", getProjectSymbols)
indexRouter.get(
	"/parsers/:parser/projects/:project/modules/eval",
	getProjectModuleEvalResult,
)
indexRouter.get(
	"/parsers/:parser/projects/:project/symbols/eval",
	getProjectSymbolEvalResult,
)

indexRouter.post("/prefs", addEvalPreference)

export { indexRouter }
