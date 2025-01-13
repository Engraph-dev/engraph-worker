import { DependencyGraph } from "@/common/depgraph"
import { LogLevel, log } from "@/util/log"
import { StatusCode } from "@/util/process"
import type { ProjectType } from "@prisma/client"
import path from "path"

export type ParseArgs = {
	projectPath: string
	projectEntryPoint: string
	projectType: ProjectType
}

export interface IParser {
	dependencyGraph: DependencyGraph
	getDependencyGraph: () => DependencyGraph
	loadDependencyGraph: (depGraph: DependencyGraph) => DependencyGraph
	getPathRelativeToProjectRoot: (fullPath: string) => string
	validateProject: (() => StatusCode) | (() => Promise<StatusCode>)
	parseProject: (() => Promise<any>) | (() => any)
}

interface IParserMetadata extends ParseArgs {}

export class Parser implements IParser, IParserMetadata {
	dependencyGraph: DependencyGraph
	projectPath: string
	projectEntryPoint: string
	projectType: ProjectType

	constructor(parseArgs: ParseArgs) {
		this.dependencyGraph = new DependencyGraph()
		this.projectPath = parseArgs.projectPath
		this.projectEntryPoint = parseArgs.projectEntryPoint
		this.projectType = parseArgs.projectType
	}

	getDependencyGraph() {
		return this.dependencyGraph
	}

	loadDependencyGraph(depGraph: DependencyGraph) {
		this.dependencyGraph = depGraph
		return this.dependencyGraph
	}

	validateProject() {
		return StatusCode.OK
	}

	getPathRelativeToProjectRoot(fullPath: string) {
		return path.relative(this.projectPath, fullPath)
	}

	parseProject(): any {
		throw new Error(
			"Parser.parseProject was directly called, this should be overriden by a parser module implementation",
		)
	}
}

function resolveParserImportDynamic(projectType: ProjectType) {
	const jsPath = `../../parsers/${projectType}/index.js`
	const tsPath = `../../parsers/${projectType}/index.ts`

	try {
		// Give JS priority over ts
		log(
			"parser.loader",
			LogLevel.Debug,
			`Attempting to resolve JS module path ${jsPath}`,
		)
		const jsModule = require(jsPath)
		log(
			"parser.loader",
			LogLevel.Debug,
			`Resolved JS module path ${jsPath} successfully`,
		)
		return jsModule
	} catch (e) {
		log(
			"parser.loader",
			LogLevel.Debug,
			`Could not resolve JS module path ${jsPath}`,
		)
		try {
			log(
				"parser.loader",
				LogLevel.Debug,
				`Attempting to resolve TS module path ${tsPath}`,
			)
			const tsModule = require(tsPath)
			log(
				"parser.loader",
				LogLevel.Debug,
				`Resolved TS module path ${tsPath} successfully`,
			)
			return tsModule
		} catch (err) {
			log(
				"parser.loader",
				LogLevel.Debug,
				`Could not resolve TS module path ${tsPath}`,
			)
			return undefined
		}
	}
}

export function createParser(parseArgs: ParseArgs) {
	try {
		const parserModule = resolveParserImportDynamic(parseArgs.projectType)
		if (!parserModule) {
			log(
				"parser",
				LogLevel.Error,
				`No parser could be loaded for ${parseArgs.projectType}`,
			)
			return StatusCode.BadModule
		}
		const ParserClass = parserModule.default || parserModule.Parser
		if (!ParserClass) {
			log(
				"parser",
				LogLevel.Error,
				`The module ${parseArgs.projectType} is an invalid module, cannot be loaded`,
			)
		}

		const parserInstance = new ParserClass(parseArgs)
		return parserInstance as Parser
	} catch (e) {
		log("parser", LogLevel.Error, e)
		return StatusCode.BadModule
	}
}
