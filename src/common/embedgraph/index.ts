import {
	type DependencyGraph,
	UNRESOLVED_MODULE_PREFIX,
} from "@/common/depgraph"
import type { Module } from "@/common/depgraph/modules"
import type { Symbol } from "@/common/depgraph/symbols"
import type { ParseArgs } from "@/common/parser"
import { openAiClient, splitContentIntoShittyTokens } from "@/util/ai"
import { EMBEDDING_MODEL } from "@/util/config/ai"
import { LogLevel, log } from "@/util/log"
import { rateLimit } from "@/util/ratelimit"

type EmbedMetrics = {
	startTime: Date
	endTime: Date
	totalEmbeddingLength: number
	totalSymbolsProcessed: number
	totalModulesProcessed: number
	totalSymbolsNotProcessed: number
	totalModulesNotProcessed: number
}

export class EmbeddingGraph {
	embedMetrics: EmbedMetrics
	parserArgs: ParseArgs
	dependencyGraph: DependencyGraph

	constructor(parserArgs: ParseArgs, dependencyGraph: DependencyGraph) {
		this.embedMetrics = {
			startTime: new Date(),
			endTime: new Date(),
			totalEmbeddingLength: 0,
			totalSymbolsProcessed: 0,
			totalModulesProcessed: 0,
			totalSymbolsNotProcessed: 0,
			totalModulesNotProcessed: 0,
		}
		this.parserArgs = parserArgs
		this.dependencyGraph = dependencyGraph
	}

	async generateEmbeddingsForModule(modulePath: Module["modulePath"]) {
		const moduleNode = this.dependencyGraph.getModuleNode(modulePath)
		if (!moduleNode) {
			// Module does not exist, cannot generate
			return
		}

		if (moduleNode.modulePath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
			// Module is unresolved, cannot generate
			this.embedMetrics.totalModulesNotProcessed += 1
			return
		}

		if (moduleNode.moduleEmbeddings) {
			// Embeddings exist, no need to regenerate
			return
		}

		const moduleSourceCode = moduleNode.moduleSourceCode

		const splitCode = splitContentIntoShittyTokens(moduleSourceCode)

		const embeddingsResponse = await openAiClient.embeddings.create({
			model: EMBEDDING_MODEL,
			input: splitCode,
		})

		if (embeddingsResponse.data) {
			const mappedEmbeddings = embeddingsResponse.data.map(
				(embeddingData) => {
					return {
						embedVector: embeddingData.embedding,
						embedIndex: embeddingData.index,
					}
				},
			)

			const sortedEmbeddings = mappedEmbeddings.sort(
				(embedLhs, embedRhs) => {
					return embedLhs.embedIndex - embedRhs.embedIndex
				},
			)

			const mergedEmbeddings = sortedEmbeddings.map((sortedEmbed) => {
				return sortedEmbed.embedVector
			})

			const flatEmbedding = mergedEmbeddings.flat()

			log(
				"embedding.module",
				LogLevel.Debug,
				`Generated ${flatEmbedding.length} embeddings for ${modulePath}`,
			)

			this.embedMetrics.totalEmbeddingLength += flatEmbedding.length

			this.dependencyGraph.updateModule(modulePath, {
				moduleEmbeddings: flatEmbedding,
			})
		}
	}

	async generateEmbeddingsForSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
		const symbolNode = this.dependencyGraph.getSymbolNode(
			symbolPath,
			symbolIdentifier,
		)
		if (!symbolNode) {
			// Symbol does not exist, cannot generate
			return
		}

		if (symbolNode.symbolPath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
			// Symbol is unresolved, cannot generate
			this.embedMetrics.totalSymbolsNotProcessed += 1
			return
		}

		if (symbolNode.symbolEmbeddings) {
			// Embeddings exist, no need to regenerate
			return
		}

		const symbolSourceCode = symbolNode.symbolSourceCode

		const splitCode = splitContentIntoShittyTokens(symbolSourceCode)

		await rateLimit(EMBEDDING_MODEL)

		const embeddingsResponse = await openAiClient.embeddings.create({
			model: EMBEDDING_MODEL,
			input: splitCode,
		})

		if (embeddingsResponse.data) {
			const mappedEmbeddings = embeddingsResponse.data.map(
				(embeddingData) => {
					return {
						embedVector: embeddingData.embedding,
						embedIndex: embeddingData.index,
					}
				},
			)

			const sortedEmbeddings = mappedEmbeddings.sort(
				(embedLhs, embedRhs) => {
					return embedLhs.embedIndex - embedRhs.embedIndex
				},
			)

			const mergedEmbeddings = sortedEmbeddings.map((sortedEmbed) => {
				return sortedEmbed.embedVector
			})

			const flatEmbedding = mergedEmbeddings.flat()

			log(
				"embedding.symbol",
				LogLevel.Debug,
				`Generated ${flatEmbedding.length} embeddings for ${symbolPath}:${symbolIdentifier}`,
			)

			this.embedMetrics.totalEmbeddingLength += flatEmbedding.length

			this.dependencyGraph.updateSymbol(symbolPath, symbolIdentifier, {
				symbolEmbeddings: flatEmbedding,
			})
		}
	}

	async generateEmbeddings() {
		this.embedMetrics.startTime = new Date()
		log(
			"embedding",
			LogLevel.Info,
			`Started embedding generation at ${this.embedMetrics.startTime}`,
		)

		for (const moduleNode of this.dependencyGraph.moduleNodes) {
			await this.generateEmbeddingsForModule(moduleNode.modulePath)
			this.embedMetrics.totalModulesProcessed += 1
		}

		for (const symbolNode of this.dependencyGraph.symbolNodes) {
			await this.generateEmbeddingsForSymbol(
				symbolNode.symbolPath,
				symbolNode.symbolIdentifier,
			)
			this.embedMetrics.totalSymbolsProcessed += 1
		}

		this.embedMetrics.endTime = new Date()
		log(
			"embedding",
			LogLevel.Info,
			`Finished embedding generation at ${this.embedMetrics.endTime}`,
		)
	}
}
