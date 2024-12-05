import type { Module } from "@/common/depgraph/modules"
import type { Symbol } from "@/common/depgraph/symbols"
import dotenv from "dotenv"
import { OpenAI } from "openai"

dotenv.config()

export const MODEL = "gpt-3.5-turbo"

export const SYSTEM_PROMPT =
	"You are an expert at documenting source code. " +
	"You will be given a snippet of code along with summaries of related code snippets. " +
	"You generate clear and concise documentation, and DO NOT include your own opinions. " +
	"The user is a programmer, and is always correct. DO NOT try to correct the programmer. " +
	"Always answer in SIMPLE ENGLISH, PLAIN TEXT, with NO FORMATTING"

export const openAiClient = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

export function generateMessageForSymbol(
	symbolNode: Symbol,
	symbolsWithSummaries: Symbol[],
	modulesWithSummaries: Module[],
) {
	const { symbolSourceCode } = symbolNode

	const summarisedSymbols = symbolsWithSummaries.map((depWithSum) => {
		return `${depWithSum.symbolIdentifier}: ${depWithSum.symbolSummary ?? "<UNKNOWN>"}`
	})

	const summarisedModules = modulesWithSummaries.map((moduleWithSum) => {
		return `${moduleWithSum.modulePath}: ${moduleWithSum.moduleSummary ?? "<UNKNOWN>"}`
	})

	const mergedSummaries = [...summarisedSymbols, ...summarisedModules]

	const userMessage = `Generate a 50 WORD summary for the following code. The source code is - \n\`\`\`${symbolSourceCode}\`\`\``

	return {
		assistantMessages: mergedSummaries,
		userMessages: [userMessage],
	}
}

export function generateMessageForModule(
	moduleNode: Module,
	symbolsWithSummaries: Symbol[],
	modulesWithSummaries: Module[],
) {
	const { moduleSourceCode } = moduleNode
	const summarisedSymbols = symbolsWithSummaries.map((depWithSum) => {
		return `${depWithSum.symbolIdentifier}: ${depWithSum.symbolSummary ?? "<UNKNOWN>"}`
	})

	const summarisedModules = modulesWithSummaries.map((moduleWithSum) => {
		return `${moduleWithSum.modulePath}: ${moduleWithSum.moduleSummary ?? "<UNKNOWN>"}`
	})

	const mergedSummaries = [...summarisedSymbols, ...summarisedModules]

	const userMessage = `Generate a 50 WORD summary for the following code. The source code is - \n\`\`\`${moduleSourceCode}\`\`\``

	return {
		assistantMessages: mergedSummaries,
		userMessages: [userMessage],
	}
}
