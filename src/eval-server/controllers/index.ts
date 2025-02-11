import { ContextGraph } from "@/common/ctxgraph"
import { DependencyGraph } from "@/common/depgraph"
import { type ParseArgs, createParser } from "@/common/parser"
import entrypoints from "@/eval-server/entrypoints.json"
import { loadCachedGraph, storeCachedGraph } from "@/eval-server/utils/cache"
import db from "@/util/db"
import { StatusCodes } from "@/util/defs/engraph-backend/common"
import { LogLevel, log } from "@/util/log"
import { isStatusCode } from "@/util/process"
import type { PreferenceType, ProjectType } from "@prisma/client"
import type { Request, Response } from "express"
import fs from "fs/promises"
import path from "path"

export async function getSupportedParsers(req: Request, res: Response) {
	try {
		const evalCasesDirPath = path.join(process.cwd(), "eval-cases")
		const evalCasesDir = await fs.readdir(evalCasesDirPath, {
			withFileTypes: true,
		})

		const evalCasesParsers = evalCasesDir
			.map((parserDir) => {
				return parserDir.isDirectory() ? parserDir.name : null
			})
			.filter((parserDir) => {
				return parserDir !== null
			})

		res.status(200).json({
			supportedParsers: evalCasesParsers,
		})
	} catch (e) {
		log("eval-server", LogLevel.Error, e)
		res.status(StatusCodes.INTERNAL_ERROR).json({})
	}
}

export async function getParserProjects(req: Request, res: Response) {
	try {
		const parserName = req.params.parser
		const parserDirPath = path.join(process.cwd(), "eval-cases", parserName)
		const parserDir = await fs.readdir(parserDirPath, {
			withFileTypes: true,
		})

		const evalProjects = parserDir
			.map((parserProject) => {
				return parserProject.isDirectory() ? parserProject.name : null
			})
			.filter((parserProject) => {
				return parserProject !== null
			})

		res.status(200).json({
			supportedProjects: evalProjects,
		})
	} catch (e) {
		log("eval-server", LogLevel.Error, e)
		res.status(StatusCodes.INTERNAL_ERROR).json({})
	}
}

export async function getProjectModules(req: Request, res: Response) {
	try {
		const parserName = req.params.parser
		const projectName = req.params.project

		const entryPoint =
			// @ts-expect-error
			(entrypoints[parserName][projectName] as string) ?? ""

		const parseArgs: ParseArgs = {
			projectType: parserName as ProjectType,
			projectEntryPoint: entryPoint,
			projectPath: path.join(
				process.cwd(),
				"eval-cases",
				parserName,
				projectName,
			),
		}

		const parserInstance = await createParser(parseArgs)

		if (isStatusCode(parserInstance)) {
			res.status(500).json({})
			return
		}

		await parserInstance.parseProject()

		const dependencyGraph = parserInstance.getDependencyGraph()

		const { moduleNodes } = dependencyGraph

		res.status(StatusCodes.OK).json({
			moduleNodes: moduleNodes,
		})
	} catch (e) {
		log("eval-server", LogLevel.Error, e)
		res.status(StatusCodes.INTERNAL_ERROR).json({})
	}
}

export async function getProjectSymbols(req: Request, res: Response) {
	try {
		const parserName = req.params.parser
		const projectName = req.params.project

		const entryPoint =
			// @ts-expect-error
			(entrypoints[parserName][projectName] as string) ?? ""

		const parseArgs: ParseArgs = {
			projectType: parserName as ProjectType,
			projectEntryPoint: entryPoint,
			projectPath: path.join(
				process.cwd(),
				"eval-cases",
				parserName,
				projectName,
			),
		}

		const parserInstance = await createParser(parseArgs)

		if (isStatusCode(parserInstance)) {
			res.status(500).json({})
			return
		}

		await parserInstance.parseProject()

		const dependencyGraph = parserInstance.getDependencyGraph()

		const { symbolNodes } = dependencyGraph

		res.status(StatusCodes.OK).json({
			symbolNodes: symbolNodes,
		})
	} catch (e) {
		log("eval-server", LogLevel.Error, e)
		res.status(StatusCodes.INTERNAL_ERROR).json({})
	}
}

export async function getProjectModuleEvalResult(req: Request, res: Response) {
	try {
		const parserName = req.params.parser
		const projectName = req.params.project
		const moduleName = req.query.module as string

		const entryPoint =
			// @ts-expect-error
			(entrypoints[parserName][projectName] as string) ?? ""

		const parseArgs: ParseArgs = {
			projectType: parserName as ProjectType,
			projectEntryPoint: entryPoint,
			projectPath: path.join(
				process.cwd(),
				"eval-cases",
				parserName,
				projectName,
			),
		}

		let dependencyGraph = loadCachedGraph(parserName, projectName)

		if (dependencyGraph === null) {
			const parserInstance = await createParser(parseArgs)

			if (isStatusCode(parserInstance)) {
				res.status(StatusCodes.INTERNAL_ERROR).json({})
				return
			}

			await parserInstance.parseProject()
			dependencyGraph = parserInstance.getDependencyGraph()
		}

		dependencyGraph.moduleNodes = dependencyGraph.moduleNodes.map(
			(moduleNode) => {
				if (moduleNode.modulePath === moduleName) {
					moduleNode.moduleSummary = undefined
				}
				return moduleNode
			},
		)

		const moduleNode = dependencyGraph.getModuleNode(moduleName)

		if (moduleNode === undefined) {
			res.status(StatusCodes.NOT_FOUND).json({})
			return
		}

		const { modulePath, moduleSourceCode } = moduleNode

		const contextGraph = new ContextGraph(parseArgs, dependencyGraph)

		const dependencyGraphClone = new DependencyGraph(dependencyGraph)

		// Remove all dependencies of the given module
		dependencyGraphClone.moduleToModuleDependencies =
			dependencyGraphClone.moduleToModuleDependencies.filter(
				(moduleToModuleDependency) => {
					return (
						moduleToModuleDependency.dependentModulePath !==
						modulePath
					)
				},
			)
		dependencyGraphClone.moduleToSymbolDependencies =
			dependencyGraphClone.moduleToSymbolDependencies.filter(
				(moduleToSymbolDependency) => {
					return (
						moduleToSymbolDependency.dependentModulePath !==
						modulePath
					)
				},
			)

		const cloneGraph = new ContextGraph(parseArgs, dependencyGraphClone)

		await Promise.all([
			contextGraph.generateSummaryForModule(modulePath),
			cloneGraph.generateSummaryForModule(modulePath),
		])

		storeCachedGraph(parserName, projectName, contextGraph.dependencyGraph)

		const contextSummary =
			contextGraph.dependencyGraph.getModuleNode(modulePath)
				?.moduleSummary ?? ""
		const plainSummary =
			cloneGraph.dependencyGraph.getModuleNode(modulePath)
				?.moduleSummary ?? ""

		const evalSummary = await db.evalSummary.create({
			data: {
				summaryType: parserName as ProjectType,
				summaryProject: projectName,
				summarySource: moduleSourceCode,
				summaryContext: contextSummary,
				summaryPlain: plainSummary,
				summaryTimestamp: new Date(),
			},
		})

		res.status(StatusCodes.OK).json(evalSummary)
	} catch (e) {
		log("eval-server", LogLevel.Error, e)
		res.status(StatusCodes.INTERNAL_ERROR).json({})
	}
}

export async function getProjectSymbolEvalResult(req: Request, res: Response) {
	try {
		const parserName = req.params.parser
		const projectName = req.params.project
		const symbolPath = req.query.path as string
		const symbolIdentifier = req.query.identifier as string

		const entryPoint =
			// @ts-expect-error
			(entrypoints[parserName][projectName] as string) ?? ""

		const parseArgs: ParseArgs = {
			projectType: parserName as ProjectType,
			projectEntryPoint: entryPoint,
			projectPath: path.join(
				process.cwd(),
				"eval-cases",
				parserName,
				projectName,
			),
		}

		let dependencyGraph = loadCachedGraph(parserName, projectName)

		if (dependencyGraph === null) {
			const parserInstance = createParser(parseArgs)

			if (isStatusCode(parserInstance)) {
				res.status(StatusCodes.INTERNAL_ERROR).json({})
				return
			}

			await parserInstance.parseProject()
			dependencyGraph = parserInstance.getDependencyGraph()
		}

		dependencyGraph.symbolNodes = dependencyGraph.symbolNodes.map(
			(symbolNode) => {
				if (
					symbolNode.symbolPath === symbolPath &&
					symbolNode.symbolIdentifier === symbolIdentifier
				) {
					symbolNode.symbolSummary = undefined
				}
				return symbolNode
			},
		)

		const symbolNode = dependencyGraph.getSymbolNode(
			symbolPath,
			symbolIdentifier,
		)

		if (symbolNode === undefined) {
			res.status(StatusCodes.NOT_FOUND).json({})
			return
		}

		const { symbolSourceCode } = symbolNode

		const contextGraph = new ContextGraph(parseArgs, dependencyGraph)

		const dependencyGraphClone = new DependencyGraph(dependencyGraph)

		// Remove all dependencies of the given symbol
		dependencyGraphClone.symbolToModuleDependencies =
			dependencyGraphClone.symbolToModuleDependencies.filter(
				(symbolToModuleDependency) => {
					if (
						symbolToModuleDependency.dependentSymbolPath ===
							symbolPath &&
						symbolToModuleDependency.dependentSymbolIdentifier ===
							symbolIdentifier
					) {
						return false
					}
					return true
				},
			)
		dependencyGraphClone.symbolToSymbolDependencies =
			dependencyGraphClone.symbolToSymbolDependencies.filter(
				(symbolToSymbolDependency) => {
					if (
						symbolToSymbolDependency.dependentSymbolPath ===
							symbolPath &&
						symbolToSymbolDependency.dependentSymbolIdentifier ===
							symbolIdentifier
					) {
						return false
					}
					return true
				},
			)

		const cloneGraph = new ContextGraph(parseArgs, dependencyGraphClone)

		await Promise.all([
			contextGraph.generateSummaryForSymbol(symbolPath, symbolIdentifier),
			cloneGraph.generateSummaryForSymbol(symbolPath, symbolIdentifier),
		])

		storeCachedGraph(parserName, projectName, contextGraph.dependencyGraph)

		const contextSummary =
			contextGraph.dependencyGraph.getSymbolNode(
				symbolPath,
				symbolIdentifier,
			)?.symbolSummary ?? ""

		const plainSummary =
			cloneGraph.dependencyGraph.getSymbolNode(
				symbolPath,
				symbolIdentifier,
			)?.symbolSummary ?? ""

		const evalSummary = await db.evalSummary.create({
			data: {
				summaryType: parserName as ProjectType,
				summaryProject: projectName,
				summarySource: symbolSourceCode,
				summaryContext: contextSummary,
				summaryPlain: plainSummary,
				summaryTimestamp: new Date(),
			},
		})

		res.status(StatusCodes.OK).json(evalSummary)
	} catch (e) {
		log("eval-server", LogLevel.Error, e)
		res.status(StatusCodes.INTERNAL_ERROR).json({})
	}
}

export async function addEvalPreference(req: Request, res: Response) {
	try {
		const { evalId, preferenceType } = req.body

		if (!evalId || !preferenceType) {
			res.status(StatusCodes.BAD_REQUEST).json({})
			return
		}

		await db.evalSummaryPreference.create({
			data: {
				preferenceSummaryId: evalId as string,
				preferenceType: preferenceType as PreferenceType,
				preferenceTimestamp: new Date(),
			},
		})

		res.status(200).json({})
	} catch (e) {
		log("eval-server", LogLevel.Error, e)
		res.status(StatusCodes.INTERNAL_ERROR).json({})
	}
}
