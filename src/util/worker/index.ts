import db from "@/util/db"
import { LogLevel, log } from "@/util/log"
import { StatusCode } from "@/util/process"
import { deleteSQSMessage } from "@/util/sqs"
import type { WorkflowHandlerFunction } from "@/util/worker/common"
import { githubWorkflowHandler } from "@/util/worker/github"
import {
	ProjectSourceType,
	type Workflow,
	WorkflowStatus,
} from "@prisma/client"

const workflowHandlerMap: Record<ProjectSourceType, WorkflowHandlerFunction> = {
	[ProjectSourceType.GitHub]: githubWorkflowHandler,
}

type StartWorkflowArgs = {
	workflowId: Workflow["workflowId"]
	sqsHandle: string
}

export async function startWorkflow(args: StartWorkflowArgs) {
	const { sqsHandle, workflowId } = args
	const workflowDoc = await db.workflow.findFirst({
		where: {
			workflowId: workflowId,
		},
		include: {
			workflowProject: true,
		},
	})

	if (workflowDoc === null) {
		log("workflow", LogLevel.Debug, "No workflow found for id", workflowId)
		return StatusCode.InvalidWorkflow
	}

	if (workflowDoc.workflowStatus !== WorkflowStatus.Queued) {
		log(
			"workflow",
			LogLevel.Debug,
			"Workflow not in queued state",
			workflowId,
		)
		return StatusCode.InvalidWorkflow
	}

	await deleteSQSMessage(sqsHandle)

	const { projectSourceType } = workflowDoc.workflowProject
	const targetWorkflowHandler = workflowHandlerMap[projectSourceType]
	return targetWorkflowHandler(workflowDoc)
}
