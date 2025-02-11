import { evalServerImpl } from "@/eval-server"
import { envVar } from "@/util/env"
import { LogLevel, log } from "@/util/log"
import { workerImpl } from "@/worker"
import dotenv from "dotenv"

dotenv.config()

const MODE = envVar("MODE")

if (MODE === "worker") {
	workerImpl()
} else if (MODE === "eval-server") {
	evalServerImpl()
} else {
	log(
		"process",
		LogLevel.Error,
		`Unexpected MODE (${MODE}). The process will now do nothing`,
	)
	while (true) {
		// Quite literally, do nothing!
	}
}

// async function main() {
// 	const parserArgs = {
// 		projectEntryPoint: "",
// 		projectPath: path.join(
// 			process.cwd(),
// 			"tests/typescript/3-complex-implementation",
// 		),
// 		projectType: ProjectType.typescript,
// 	}
// 	const testParser = createParser(parserArgs)

// 	if (isStatusCode(testParser)) {
// 		return
// 	}

// 	await testParser.parseProject()

// 	const embeddingGraph = new EmbeddingGraph(
// 		parserArgs,
// 		testParser.getDependencyGraph(),
// 	)

// 	await embeddingGraph.generateEmbeddings()

// 	await fs.writeFile(
// 		path.resolve(process.cwd(), "cache/embedgraph.json"),
// 		JSON.stringify(embeddingGraph.dependencyGraph, null, 4),
// 	)

// 	await uploadWorkflowGraph({
// 		workflowId: "do-not-care-uses-root-anyways",
// 		dependencyGraph: embeddingGraph.dependencyGraph,
// 	})
// }

// main()
