import {
	type DependencyGraph,
	UNRESOLVED_MODULE_PREFIX,
} from "@/common/depgraph"
import type { Module } from "@/common/depgraph/modules"
import type { Symbol } from "@/common/depgraph/symbols"
import {
	MODEL,
	SYSTEM_PROMPT,
	generateMessageForModule,
	generateMessageForSymbol,
	openAiClient,
} from "@/util/ai"
import { LogLevel, log } from "@/util/log"
import { rateLimit } from "@/util/ratelimit"

export class ContextGraph {
	dependencyGraph: DependencyGraph
	constructor(depGraph: DependencyGraph) {
		this.dependencyGraph = depGraph
	}

	async generateSummaryForSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
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

		const { assistantMessages, userMessages } = generateMessageForSymbol(
			depgraphSymbol,
			filteredSymbolDepsWithSummaries,
			filteredModuleDepsWithSummaries,
		)

		log("ctxgraph.symbol.summary.message", LogLevel.Debug, {
			assistantMessages,
			userMessages,
		})

		const completionMessages = [
			{
				role: "system" as const,
				content: SYSTEM_PROMPT,
			},
			...assistantMessages.map((assistantMessage) => {
				return {
					role: "assistant" as const,
					content: assistantMessage,
				}
			}),
			...userMessages.map((assistantMessage) => {
				return {
					role: "user" as const,
					content: assistantMessage,
				}
			}),
		]

		await rateLimit()

		const aiResponse = await openAiClient.chat.completions.create({
			model: MODEL,
			messages: completionMessages,
			n: 1,
		})

		if (aiResponse.choices.length) {
			const responseSummary = aiResponse.choices[0].message.content
			const promptTokens = aiResponse.usage?.prompt_tokens ?? "unknown"
			const completionTokens =
				aiResponse.usage?.completion_tokens ?? "unknown"

			log(
				"ctxgraph.symbol.summary.response",
				LogLevel.Debug,
				`Symbol ${symbolIdentifier} (${symbolPath}) - ${responseSummary}`,
			)
			log(
				"ctxgraph",
				LogLevel.Debug,
				`Consumed ${promptTokens} prompt tokens, ${completionTokens} completion tokens to generate summary for ${symbolIdentifier}`,
			)
			this.dependencyGraph.updateSymbol(symbolPath, symbolIdentifier, {
				symbolSummary: responseSummary || undefined,
			})
		}
	}

	async generateSummaryForModule(modulePath: Module["modulePath"]) {
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

		const { assistantMessages, userMessages } = generateMessageForModule(
			depgraphModule,
			filteredSymbolDepsWithSummaries,
			filteredModuleDepsWithSummaries,
		)

		log("ctxgraph.symbol.summary.message", LogLevel.Debug, {
			assistantMessages,
			userMessages,
		})

		const completionMessages = [
			{
				role: "system" as const,
				content: SYSTEM_PROMPT,
			},
			...assistantMessages.map((assistantMessage) => {
				return {
					role: "assistant" as const,
					content: assistantMessage,
				}
			}),
			...userMessages.map((assistantMessage) => {
				return {
					role: "user" as const,
					content: assistantMessage,
				}
			}),
		]

		await rateLimit()

		const aiResponse = await openAiClient.chat.completions.create({
			model: MODEL,
			messages: completionMessages,
			n: 1,
		})

		if (aiResponse.choices.length) {
			const responseSummary = aiResponse.choices[0].message.content
			const promptTokens = aiResponse.usage?.prompt_tokens ?? "unknown"
			const completionTokens =
				aiResponse.usage?.completion_tokens ?? "unknown"

			log(
				"ctxgraph",
				LogLevel.Debug,
				`Module ${modulePath} - ${responseSummary}`,
			)
			log(
				"ctxgraph",
				LogLevel.Debug,
				`Consumed ${promptTokens} prompt tokens, ${completionTokens} completion tokens to generate summary for ${modulePath}`,
			)
			this.dependencyGraph.updateModule(modulePath, {
				moduleSummary: responseSummary || undefined,
			})
		}
	}

	async generateContext() {
		for (const symbolNode of this.dependencyGraph.symbolNodes) {
			if (symbolNode.symbolPath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
				continue
			}

			await this.generateSummaryForSymbol(
				symbolNode.symbolPath,
				symbolNode.symbolIdentifier,
			)
		}

		for (const moduleNode of this.dependencyGraph.moduleNodes) {
			if (moduleNode.modulePath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
				continue
			}

			await this.generateSummaryForModule(moduleNode.modulePath)
		}
	}
}
