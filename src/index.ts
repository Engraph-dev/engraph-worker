import { ContextGraph } from "@/common/ctxgraph"
import type { IDependencyGraph } from "@/common/depgraph"
import { createParser } from "@/common/parser"
import { ProjectType } from "@/common/parser/project"
import { isStatusCode } from "@/util/process"
import dotenv from "dotenv"
import fsSync from "fs"

dotenv.config()

async function main() {
	const projectParser = await createParser({
		// projectPath: process.cwd(),
		// projectPath: "tests/ts.esnext.nodenext.nodenext/1-basic-imports",
		projectPath: "tests/typescript/2-poisoned-source",
		projectEntryPoint: "index.ts",
		projectType: ProjectType["typescript"],
	})

	if (isStatusCode(projectParser)) {
		return
	}

	await projectParser.parseProject()

	const dependencyGraph = projectParser.dependencyGraph

	const ctxGraph = new ContextGraph(dependencyGraph)

	await ctxGraph.generateContext()

	const jsonData = JSON.stringify(ctxGraph.dependencyGraph)

	fsSync.writeFileSync("cache/out.json", jsonData)
}

function output() {
	const fileContent = fsSync.readFileSync("cache/out.json", {
		encoding: "utf-8",
	})

	const jsonData = JSON.parse(fileContent) as IDependencyGraph

	const { moduleNodes, symbolNodes } = jsonData

	let aggregateSummary = ""

	moduleNodes.forEach((moduleNode) => {
		aggregateSummary += `Path: ${moduleNode.modulePath}\n`
		aggregateSummary += `Source Code: ${moduleNode.moduleSourceCode}\n`
		aggregateSummary += `Summary: ${moduleNode.moduleSummary ?? "Summary Not Generated"}\n`
	})

	symbolNodes.forEach((symbolNode) => {
		aggregateSummary += `Path: ${symbolNode.symbolPath} ${symbolNode.symbolIdentifier}\n`
		aggregateSummary += `Source Code:${symbolNode.symbolSourceCode}\n`
		aggregateSummary += `Summary: ${symbolNode.symbolSummary ?? "Summary Not Generated"}\n\n`
	})

	fsSync.writeFileSync("cache/out.txt", aggregateSummary)
}

main().then(() => output())
