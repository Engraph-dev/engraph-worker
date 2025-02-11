import { DependencyGraph } from "@/common/depgraph"
import fs from "fs"
import path from "path"

export function loadCachedGraph(parser: string, project: string) {
	const cacheLocation = path.join(
		process.cwd(),
		"cache",
		parser,
		project,
		"graph.json",
	)

	try {
		fs.statSync(cacheLocation)
	} catch (e) {
		return null
	}

	const fileContents = fs.readFileSync(cacheLocation, { encoding: "utf-8" })
	const dependencyGraphData = JSON.parse(fileContents) as DependencyGraph
	return new DependencyGraph(dependencyGraphData)
}

export function storeCachedGraph(
	parser: string,
	project: string,
	graph: DependencyGraph,
) {
	const cacheDirLocation = path.join(process.cwd(), "cache", parser, project)

	fs.mkdirSync(cacheDirLocation, { recursive: true })

	const cacheLocation = path.join(cacheDirLocation, "graph.json")

	const graphSnapshot = JSON.stringify(graph)

	fs.writeFileSync(cacheLocation, graphSnapshot, {})
}
