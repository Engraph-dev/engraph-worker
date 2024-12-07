import type { Module } from "@/common/depgraph/modules"
import type { Symbol } from "@/common/depgraph/symbols"
import dotenv from "dotenv"
import { OpenAI } from "openai"

dotenv.config()

export type Model = "gpt-4o-mini" | "gpt-4" | "gpt-4o" | "gpt-3.5-turbo"

export const MODEL: Model = "gpt-4o-mini"

export const SYMBOL_SUMMARY_WORD_COUNT = 100
export const MODULE_SUMMARY_WORD_COUNT = 200

export const SYSTEM_PROMPT =
	"You are an expert at documenting source code. Your only task is to document source code. " +
	"The user is a programmer, and is always correct. DO NOT try to correct the programmer. " +
	"You will be given code along with summaries of related code. " +
	"DO NOT include your own opinions. DO NOT assume and DO NOT explain how the code can be used further. " +
	"Always answer in SIMPLE ENGLISH, PLAIN TEXT, with NO FORMATTING. " +
	"DO NOT start your answers with 'this code' 'the code' 'the given' or related phrases. "

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

	// const userMessage = `Generate a ${SYMBOL_SUMMARY_WORD_COUNT} WORD summary\n\`\`\`${symbolSourceCode}\`\`\``
	const userMessage = `\`\`\`${symbolSourceCode}\`\`\``

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

	// const userMessage = `Generate a ${MODULE_SUMMARY_WORD_COUNT} WORD summary\n\`\`\`${moduleSourceCode}\`\`\``
	const userMessage = `\`\`\`${moduleSourceCode}\`\`\``

	return {
		assistantMessages: mergedSummaries,
		userMessages: [userMessage],
	}
}
