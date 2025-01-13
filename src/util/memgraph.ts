import type { ContextGraph } from "@/common/ctxgraph"
import { LogLevel, log } from "@/util/log"

type UploadWorkflowSummaryArgs = {
	workflowId: string
	contextGraph: ContextGraph
}

export async function uploadWorkflowSummary(args: UploadWorkflowSummaryArgs) {
	const { contextGraph, workflowId } = args
	// Do nothing right now
	log("workflow.upload", LogLevel.Debug, contextGraph.dependencyGraph)

	// TODO: Generate the workflow db password

	// TODO: Connect to the memgraph db

	// TODO: Write memgraph queries to push context to graphdb
}
