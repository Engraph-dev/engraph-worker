import {
	type DependencyGraph,
	UNRESOLVED_MODULE_PREFIX,
} from "@/common/depgraph"
import type { ParseArgs } from "@/common/parser"
import {
	generateMessagesForModule,
	generateMessagesForSymbol,
	generateSystemPrompt,
	openAiClient,
} from "@/util/ai"
import { LLM_MODEL } from "@/util/config/ai"
import type { Module } from "@/util/defs/engraph-worker/common/modules"
import type { Symbol } from "@/util/defs/engraph-worker/common/symbols"
import { LogLevel, log } from "@/util/log"
import { rateLimit } from "@/util/ratelimit"

type ContextMetrics = {
	startTime: Date
	endTime: Date
	totalPromptTokens: number
	totalCompletionTokens: number
	totalSymbolsProcessed: number
	totalModulesProcessed: number
	totalSymbolsNotProcessed: number
	totalModulesNotProcessed: number
}

/**
 * READ ME:
 * This graph generates the full context for a project by generating summaries for all symbols and modules in the project.
 * As of 19/01/2025, context generation is no longer done worker-side. It will be performed user side
 */
export class ContextGraph {
	parserArgs: ParseArgs
	dependencyGraph: DependencyGraph
	contextMetrics: ContextMetrics

	constructor(parserArgs: ParseArgs, depGraph: DependencyGraph) {
		this.parserArgs = parserArgs
		this.dependencyGraph = depGraph
		this.contextMetrics = {
			startTime: new Date(),
			endTime: new Date(),
			totalPromptTokens: 0,
			totalCompletionTokens: 0,
			totalSymbolsProcessed: 0,
			totalModulesProcessed: 0,
			totalSymbolsNotProcessed: 0,
			totalModulesNotProcessed: 0,
		}
	}

	async generateSummaryForSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
		const SYSTEM_PROMPT = generateSystemPrompt(this.parserArgs)

		const depgraphSymbol = this.dependencyGraph.getSymbolNode(
			symbolPath,
			symbolIdentifier,
		)
		if (!depgraphSymbol) {
			return
		}

		if (depgraphSymbol.symbolSummary) {
			return
		}

		const symbolDependencies =
			this.dependencyGraph.getSymbolDependenciesOfSymbol(
				symbolPath,
				symbolIdentifier,
			)

		const moduleDependencies =
			this.dependencyGraph.getModuleDependenciesOfSymbol(
				symbolPath,
				symbolIdentifier,
			)

		for (const symbolDependency of symbolDependencies) {
			await this.generateSummaryForSymbol(
				symbolDependency.dependencySymbolPath,
				symbolDependency.dependencySymbolIdentifier,
			)
		}

		for (const moduleDependency of moduleDependencies) {
			await this.generateSummaryForModule(
				moduleDependency.dependencyModulePath,
			)
		}

		const symbolDependenciesWithSummaries = symbolDependencies.map(
			(symbolDependency) => {
				const { dependencySymbolIdentifier, dependencySymbolPath } =
					symbolDependency

				const symbolDependencyNode = this.dependencyGraph.getSymbolNode(
					dependencySymbolPath,
					dependencySymbolIdentifier,
				)
				if (
					!symbolDependencyNode ||
					symbolDependencyNode.symbolSummary
				) {
					return undefined
				}

				if (
					symbolDependencyNode.symbolPath.startsWith(
						UNRESOLVED_MODULE_PREFIX,
					)
				) {
					return undefined
				}

				return symbolDependencyNode
			},
		)

		const filteredSymbolDepsWithSummaries =
			symbolDependenciesWithSummaries.filter((symbolDepWithSum) => {
				return symbolDepWithSum !== undefined
			})

		const moduleDependencyWithSummaries = moduleDependencies.map(
			(moduleDependency) => {
				const { dependencyModulePath } = moduleDependency
				const moduleDependencyNode =
					this.dependencyGraph.getModuleNode(dependencyModulePath)
				if (
					!moduleDependencyNode ||
					moduleDependencyNode.moduleSummary === undefined
				) {
					return undefined
				}

				if (
					moduleDependencyNode.modulePath.startsWith(
						UNRESOLVED_MODULE_PREFIX,
					)
				) {
					undefined
				}

				return moduleDependencyNode
			},
		)

		const filteredModuleDepsWithSummaries =
			moduleDependencyWithSummaries.filter((moduleDepWithSum) => {
				return moduleDepWithSum !== undefined
			})

		const promptMessages = generateMessagesForSymbol(
			depgraphSymbol,
			filteredSymbolDepsWithSummaries,
			filteredModuleDepsWithSummaries,
		)

		log("ctxgraph.symbol.summary.messages", LogLevel.Debug, {
			promptMessages,
		})

		const completionMessages = [
			{
				role: "system" as const,
				content: SYSTEM_PROMPT,
			},
			...promptMessages,
		]

		await rateLimit(LLM_MODEL)

		const aiResponse = await openAiClient.chat.completions.create({
			model: LLM_MODEL,
			messages: completionMessages,
			n: 1,
		})

		if (aiResponse.choices.length) {
			const responseSummary = aiResponse.choices[0].message.content
			const promptTokens = aiResponse.usage?.prompt_tokens ?? 0
			const completionTokens = aiResponse.usage?.completion_tokens ?? 0

			log(
				"ctxgraph.symbol.summary",
				LogLevel.Debug,
				`Symbol ${symbolIdentifier} (${symbolPath}) - ${responseSummary}`,
			)
			log(
				"ctxgraph.symbol.metrics",
				LogLevel.Debug,
				`Consumed ${promptTokens} prompt tokens, ${completionTokens} completion tokens to generate summary for ${symbolIdentifier}`,
			)

			this.contextMetrics.totalPromptTokens += promptTokens
			this.contextMetrics.totalCompletionTokens += completionTokens

			this.dependencyGraph.updateSymbol(symbolPath, symbolIdentifier, {
				symbolSummary: responseSummary ?? "",
			})
		}
	}

	async generateSummaryForModule(modulePath: Module["modulePath"]) {
		const SYSTEM_PROMPT = generateSystemPrompt(this.parserArgs)

		const depgraphModule = this.dependencyGraph.getModuleNode(modulePath)
		if (!depgraphModule) {
			return
		}

		if (depgraphModule.moduleSummary) {
			return
		}

		const symbolDependencies =
			this.dependencyGraph.getSymbolDependenciesOfModule(modulePath)

		const moduleDependencies =
			this.dependencyGraph.getModuleDependenciesOfModule(modulePath)

		for (const symbolDependency of symbolDependencies) {
			if (
				symbolDependency.dependencySymbolPath.startsWith(
					UNRESOLVED_MODULE_PREFIX,
				)
			) {
				continue
			}
			await this.generateSummaryForSymbol(
				symbolDependency.dependencySymbolPath,
				symbolDependency.dependencySymbolIdentifier,
			)
		}

		for (const moduleDependency of moduleDependencies) {
			if (
				moduleDependency.dependencyModulePath.startsWith(
					UNRESOLVED_MODULE_PREFIX,
				)
			) {
				continue
			}
			await this.generateSummaryForModule(
				moduleDependency.dependencyModulePath,
			)
		}

		const symbolDependenciesWithSummaries = symbolDependencies.map(
			(symbolDependency) => {
				const { dependencySymbolIdentifier, dependencySymbolPath } =
					symbolDependency

				const symbolDependencyNode = this.dependencyGraph.getSymbolNode(
					dependencySymbolPath,
					dependencySymbolIdentifier,
				)
				if (
					!symbolDependencyNode ||
					symbolDependencyNode.symbolSummary === undefined
				) {
					return undefined
				}

				if (
					symbolDependencyNode.symbolPath.startsWith(
						UNRESOLVED_MODULE_PREFIX,
					)
				) {
					undefined
				}

				return symbolDependencyNode
			},
		)

		const filteredSymbolDepsWithSummaries =
			symbolDependenciesWithSummaries.filter((symbolDepWithSum) => {
				return symbolDepWithSum !== undefined
			})

		const moduleDependencyWithSummaries = moduleDependencies.map(
			(moduleDependency) => {
				const { dependencyModulePath } = moduleDependency
				const moduleDependencyNode =
					this.dependencyGraph.getModuleNode(dependencyModulePath)
				if (
					!moduleDependencyNode ||
					moduleDependencyNode.moduleSummary === undefined
				) {
					return undefined
				}

				if (
					moduleDependencyNode.modulePath.startsWith(
						UNRESOLVED_MODULE_PREFIX,
					)
				) {
					undefined
				}

				return moduleDependencyNode
			},
		)

		const filteredModuleDepsWithSummaries =
			moduleDependencyWithSummaries.filter((moduleDepWithSum) => {
				return moduleDepWithSum !== undefined
			})

		const promptMessages = generateMessagesForModule(
			depgraphModule,
			filteredSymbolDepsWithSummaries,
			filteredModuleDepsWithSummaries,
		)

		log("ctxgraph.module.summary.messages", LogLevel.Debug, {
			promptMessages,
		})

		const completionMessages = [
			{
				role: "system" as const,
				content: SYSTEM_PROMPT,
			},
			...promptMessages,
		]

		await rateLimit(LLM_MODEL)

		const aiResponse = await openAiClient.chat.completions.create({
			model: LLM_MODEL,
			messages: completionMessages,
			n: 1,
		})

		if (aiResponse.choices.length) {
			const responseSummary = aiResponse.choices[0].message.content
			const promptTokens = aiResponse.usage?.prompt_tokens ?? 0
			const completionTokens = aiResponse.usage?.completion_tokens ?? 0

			log(
				"ctxgraph.module.summary",
				LogLevel.Debug,
				`Module ${modulePath} - ${responseSummary}`,
			)
			log(
				"ctxgraph.module.metrics",
				LogLevel.Debug,
				`Consumed ${promptTokens} prompt tokens, ${completionTokens} completion tokens to generate summary for ${modulePath}`,
			)

			this.contextMetrics.totalPromptTokens += promptTokens
			this.contextMetrics.totalCompletionTokens += completionTokens

			this.dependencyGraph.updateModule(modulePath, {
				moduleSummary: responseSummary ?? "",
			})
		}
	}

	async generateContext() {
		this.contextMetrics.startTime = new Date()

		log(
			"ctxgraph",
			LogLevel.Debug,
			`Started context generation at ${this.contextMetrics.startTime.toISOString()}`,
		)

		for (const moduleNode of this.dependencyGraph.moduleNodes) {
			if (moduleNode.modulePath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
				this.contextMetrics.totalModulesNotProcessed += 1
				continue
			}

			this.contextMetrics.totalModulesProcessed += 1
			await this.generateSummaryForModule(moduleNode.modulePath)
		}

		for (const symbolNode of this.dependencyGraph.symbolNodes) {
			if (symbolNode.symbolPath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
				this.contextMetrics.totalSymbolsNotProcessed += 1
				continue
			}

			this.contextMetrics.totalSymbolsProcessed += 1
			await this.generateSummaryForSymbol(
				symbolNode.symbolPath,
				symbolNode.symbolIdentifier,
			)
		}

		this.contextMetrics.endTime = new Date()

		log(
			"ctxgraph",
			LogLevel.Debug,
			`Finished context generation at ${this.contextMetrics.endTime.toISOString()}`,
		)

		log("ctxgraph.metrics", LogLevel.Debug, this.contextMetrics)
	}
}
