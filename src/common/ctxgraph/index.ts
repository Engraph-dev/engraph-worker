import type { DependencyGraph } from "@/common/depgraph";
import type { Module } from "@/common/depgraph/modules";
import type { Symbol } from "@/common/depgraph/symbols";
import { MODEL, SYSTEM_PROMPT, generateMessageForModule, generateMessageForSymbol, openAiClient } from "@/util/ai";
import { LogLevel, log } from "@/util/log";


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
					symbolDependencyNode.symbolSummary === undefined
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
				return moduleDependencyNode
			},
		)

		const filteredModuleDepsWithSummaries =
			moduleDependencyWithSummaries.filter((moduleDepWithSum) => {
				return moduleDepWithSum !== undefined
			})

		const symbolMessage = generateMessageForSymbol(
			depgraphSymbol,
			filteredSymbolDepsWithSummaries,
			filteredModuleDepsWithSummaries,
		)

		log(
			"ctxgraph.symbol.summary.message",
			LogLevel.Debug,
			symbolMessage
		)

		const aiResponse = await openAiClient.chat.completions.create({
			model: MODEL,
			messages: [
				{
					role: "system",
					content: SYSTEM_PROMPT,
				},
				{
					role: "user",
					content: symbolMessage,
				},
			],
			n: 1,
		})

		if (aiResponse.choices.length) {
			const responseSummary = aiResponse.choices[0].message.content
			log(
				"ctxgraph.symbol.summary.response",
				LogLevel.Debug,
				`Symbol ${symbolIdentifier} (${symbolPath}) - ${responseSummary}`,
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
					symbolDependencyNode.symbolSummary === undefined
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
				return moduleDependencyNode
			},
		)

		const filteredModuleDepsWithSummaries =
			moduleDependencyWithSummaries.filter((moduleDepWithSum) => {
				return moduleDepWithSum !== undefined
			})

		const moduleMessage = generateMessageForModule(
			depgraphModule,
			filteredSymbolDepsWithSummaries,
			filteredModuleDepsWithSummaries,
		)

		log("ctxgraph.symbol.summary.message", LogLevel.Debug, moduleMessage)

		const aiResponse = await openAiClient.chat.completions.create({
			model: MODEL,
			messages: [
				{
					role: "system",
					content: SYSTEM_PROMPT,
				},
				{
					role: "user",
					content: moduleMessage,
				},
			],
			n: 1,
		})

		if (aiResponse.choices.length) {
			const responseSummary = aiResponse.choices[0].message.content
			log(
				"ctxgraph",
				LogLevel.Debug,
				`Module ${modulePath} - ${responseSummary}`,
			)
			this.dependencyGraph.updateModule(modulePath, {
				moduleSummary: responseSummary || undefined,
			})
		}
	}

	async generateContext() {
		for (const symbolNode of this.dependencyGraph.symbolNodes) {
			await this.generateSummaryForSymbol(
				symbolNode.symbolPath,
				symbolNode.symbolIdentifier,
			)
		}

		for (const moduleNode of this.dependencyGraph.moduleNodes) {
			await this.generateSummaryForModule(moduleNode.modulePath)
		}
	}
}