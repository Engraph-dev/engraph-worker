import { EmbeddingGraph } from "./common/embedgraph"
import { createParser } from "./common/parser"
import { uploadWorkflowGraph } from "./util/memgraph"
import { MESSAGE_COOLDOWN_MS } from "@/util/config/worker"
import { LogLevel, log } from "@/util/log"
import { StatusCode, isStatusCode } from "@/util/process"
import { deleteSQSMessage, receiveSQSMessage } from "@/util/sqs"
import { timeout } from "@/util/time"
import { startWorkflow } from "@/util/worker"
import { ProjectType } from "@prisma/client"
import dotenv from "dotenv"
import fs from "fs/promises"
import path from "path"

dotenv.config()

async function workerImpl() {
	while (true) {
		const workflowData = await receiveSQSMessage()
		if (workflowData === null) {
			log("worker", LogLevel.Debug, "No message received from SQS")
		} else {
			log(
				"worker",
				LogLevel.Info,
				"Received message from SQS",
				workflowData,
			)

			await deleteSQSMessage(workflowData.recvHandle)
			const workflowStatus = await startWorkflow({
				workflowId: workflowData.workflowId,
			})

			const reverseLookup = Object.keys(StatusCode)

			log(
				"worker",
				LogLevel.Info,
				`Workflow ${workflowData.workflowId} exited with status code ${reverseLookup[workflowStatus]}`,
			)
		}
		timeout(MESSAGE_COOLDOWN_MS)
	}
}

// workerImpl()

async function main() {
	const parserArgs = {
		projectEntryPoint: "",
		projectPath: path.join(
			process.cwd(),
			"tests/typescript/3-complex-implementation",
		),
		projectType: ProjectType.typescript,
	}
	const testParser = createParser(parserArgs)

	if (isStatusCode(testParser)) {
		return
	}

	await testParser.parseProject()

	const embeddingGraph = new EmbeddingGraph(
		parserArgs,
		testParser.getDependencyGraph(),
	)

	await embeddingGraph.generateEmbeddings()

	await fs.writeFile(
		path.resolve(process.cwd(), "cache/embedgraph.json"),
		JSON.stringify(embeddingGraph.dependencyGraph, null, 4),
	)

	await uploadWorkflowGraph({
		workflowId: "do-not-care-uses-root-anyways",
		dependencyGraph: embeddingGraph.dependencyGraph,
	})
}

main()
