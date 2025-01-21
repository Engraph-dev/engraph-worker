import type { Module } from "@/common/depgraph/modules"
import type { Symbol } from "@/common/depgraph/symbols"
import type { ParseArgs } from "@/common/parser"
import { TOKEN_CHUNK_LENGTH } from "@/util/config/ai"
import { envVar } from "@/util/env"
import dotenv from "dotenv"
import { OpenAI } from "openai"

dotenv.config()

export const SYMBOL_SUMMARY_WORD_COUNT = 100
export const MODULE_SUMMARY_WORD_COUNT = 200

export const openAiClient = new OpenAI({
	apiKey: envVar("OPENAI_API_KEY"),
})

export function generateSystemPrompt(projectOpts: ParseArgs) {
	const SYSTEM_PROMPT =
		`You are an expert at documenting and explaining source code of a ${projectOpts.projectType} project. ` +
		"You will be given code along with summaries of related SYBMOLS and MODULES. " +
		"DO NOT include your own opinions. DO NOT explain optimal use cases. Give SHORT EXAMPLES ONLY IF APPLICABLE. " +
		"Be TECHNICAL and DETAILED in your responses. If there are explicit EDGE CASES in the program, define all WITH EXAMPLES. " +
		"DO NOT start your answers with 'this code' 'the module' 'the given' 'the file' or related phrases. " +
		"For modules cover every item of that module. DO NOT ADD IRRELEVANT DESCRIPTIONS OR ADVISORIES. " +
		"DO NOT assume hypothetical scenarios. DO NOT advise the user about their own code and practices. " +
		"Include links to FIRST-PARTY documentation wherever possible. "

	return SYSTEM_PROMPT
}

export function generateMessagesForSymbol(
	symbolNode: Symbol,
	symbolsWithSummaries: Symbol[],
	modulesWithSummaries: Module[],
) {
	const { symbolSourceCode } = symbolNode

	const summarisedSymbols = symbolsWithSummaries.map((depWithSum) => {
		return [
			{
				role: "user" as const,
				content: `<SYMBOL>\n\`\`\`\n${depWithSum.symbolSourceCode}\n\`\`\`\n</SYMBOL>`,
			},
			{
				role: "assistant" as const,
				content: depWithSum.symbolSummary ?? "<UNKNOWN>",
			},
		]
	})

	const summarisedModules = modulesWithSummaries.map((depWithSum) => {
		return [
			{
				role: "user" as const,
				content: `<MODULE>\n\`\`\`\n${depWithSum.moduleSourceCode}\n\`\`\`\n</MODULE>`,
			},
			{
				role: "assistant" as const,
				content: depWithSum.moduleSummary ?? "<UNKNOWN>",
			},
		]
	})

	const mergedSummaries = [...summarisedSymbols, ...summarisedModules]

	const flatSummaries = mergedSummaries.flat()
	// const userMessage = `Generate a ${SYMBOL_SUMMARY_WORD_COUNT} WORD summary\n\`\`\`${symbolSourceCode}\`\`\``
	const userMessage = `<SYMBOL>\n\`\`\`\n${symbolSourceCode}\n\`\`\`\n</SYMBOL>`

	const summariesWithUserMessage = [
		...flatSummaries,
		{
			role: "user" as const,
			content: userMessage,
		},
	]

	return summariesWithUserMessage
}

export function generateMessagesForModule(
	moduleNode: Module,
	symbolsWithSummaries: Symbol[],
	modulesWithSummaries: Module[],
) {
	const { moduleSourceCode } = moduleNode
	const summarisedSymbols = symbolsWithSummaries.map((depWithSum) => {
		return [
			{
				role: "user" as const,
				content: `<SYMBOL>\n\`\`\`\n${depWithSum.symbolSourceCode}\n\`\`\`\n</SYMBOL>`,
			},
			{
				role: "assistant" as const,
				content: depWithSum.symbolSummary ?? "<UNKNOWN>",
			},
		]
	})

	const summarisedModules = modulesWithSummaries.map((depWithSum) => {
		return [
			{
				role: "user" as const,
				content: `<MODULE>\n\`\`\`\n${depWithSum.moduleSourceCode}\n\`\`\`\n</MODULE>`,
			},
			{
				role: "assistant" as const,
				content: depWithSum.moduleSummary ?? "<UNKNOWN>",
			},
		]
	})

	const mergedSummaries = [...summarisedSymbols, ...summarisedModules]

	const flatSummaries = mergedSummaries.flat()

	// const userMessage = `Generate a ${MODULE_SUMMARY_WORD_COUNT} WORD summary\n\`\`\`${moduleSourceCode}\`\`\``
	const userMessage = `<MODULE>\n\`\`\`\n${moduleSourceCode}\n\`\`\`\n</MODULE>`

	const summariesWithUserMessage = [
		...flatSummaries,
		{
			role: "user" as const,
			content: userMessage,
		},
	]

	return summariesWithUserMessage
}

export function splitContentIntoShittyTokens(contentStr: string) {
	const splitContent = contentStr.split(/\s/g)
	// Split the array into chunks of TOKEN_CHUNK_LENGTH
	let tokenizedContent = []
	for (
		let chunkIdx = 0;
		chunkIdx < splitContent.length;
		chunkIdx += TOKEN_CHUNK_LENGTH
	) {
		tokenizedContent.push(
			splitContent
				.slice(chunkIdx, chunkIdx + TOKEN_CHUNK_LENGTH)
				.join(" "),
		)
	}
	return tokenizedContent
}
