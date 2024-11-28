import type { Module } from "@/common/depgraph/modules"
import type { Symbol } from "@/common/depgraph/symbols"
import dotenv from "dotenv"
import { OpenAI } from "openai"

dotenv.config()

export const MODEL = "gpt-4o-mini"

export const SYSTEM_PROMPT =
	"You are an expert at documenting source code of programs. Do not add your own opinions about the safety, security and behavior of code. You will generate apt summaries for the source code provided"

export const openAiClient = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

export function generateMessageForSymbol(
	symbolNode: Symbol,
	symbolsWithSummaries: Symbol[],
	modulesWithSummaries: Module[],
) {
	const { symbolIdentifier, symbolSourceCode } = symbolNode

	const summarisedSymbols = symbolsWithSummaries.map((depWithSum) => {
		return `${depWithSum.symbolIdentifier}: ${depWithSum.symbolSummary ?? "<UNKNOWN>"}`
	})

	const summarisedModules = modulesWithSummaries.map((moduleWithSum) => {
		return `${moduleWithSum.modulePath}: ${moduleWithSum.moduleSummary ?? "<UNKNOWN>"}`
	})

	const mergedSummaries = [...summarisedSymbols, ...summarisedModules]

	const summaryContext = mergedSummaries.length
		? "The following summaries may be applicable in your task - \n" +
			summarisedSymbols.join("\n")
		: ""

	return `Generate a short summary for the following symbol, named ${symbolIdentifier}.\n${summaryContext}\nThe source code is - \n\`\`\`${symbolSourceCode}\`\`\``
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

	const summaryContext = mergedSummaries.length
		? "The following summaries may be applicable in your task - \n" +
			summarisedSymbols.join("\n")
		: ""

	return `Generate a short summary for the following code.\n${summaryContext}\nThe source code is - \n\`\`\`${moduleSourceCode}\`\`\``
}
