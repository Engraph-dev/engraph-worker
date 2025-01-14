import { ContextGraph } from "@/common/ctxgraph"
import { type ParseArgs, createParser } from "@/common/parser"
import { PROJECT_DIRECTORY } from "@/util/config/worker"
import db from "@/util/db"
import { LogLevel, log } from "@/util/log"
import { uploadWorkflowSummary } from "@/util/memgraph"
import { StatusCode, isStatusCode } from "@/util/process"
import { type Project, type Workflow, WorkflowStatus } from "@prisma/client"

export type WorkflowHandlerArgs = Workflow & {
	workflowProject: Project
}

export type WorkflowHandlerFunction = (
	args: WorkflowHandlerArgs,
) => Promise<StatusCode>

export const workflowHandler = (
	workflowHandler: WorkflowHandlerFunction,
): WorkflowHandlerFunction => {
	return async function (workflowArgs) {
		try {
			return workflowHandler(workflowArgs)
		} catch (e) {
			log("workflow.handler", LogLevel.Error, e)
			return StatusCode.UnknownError
		}
	}
}

export const initGraphWorkflow = workflowHandler(async (workflowArgs) => {
	const { workflowProject } = workflowArgs
	const { projectType, projectEntryPoint } = workflowProject

	await db.workflow.update({
		where: {
			workflowId: workflowArgs.workflowId,
		},
		data: {
			workflowStatus: WorkflowStatus.DepGraphStarted,
		},
	})

	const parserArgs: ParseArgs = {
		projectType: projectType,
		projectPath: PROJECT_DIRECTORY,
		projectEntryPoint: projectEntryPoint,
	}

	const parserInstance = createParser(parserArgs)

	if (isStatusCode(parserInstance)) {
		await db.workflow.update({
			where: {
				workflowId: workflowArgs.workflowId,
			},
			data: {
				workflowStatus: WorkflowStatus.DepGraphFailed,
				workflowEndTimestamp: new Date(),
			},
		})
		return StatusCode.WorkflowError
	}

	const valResult = parserInstance.validateProject()
	if (valResult !== StatusCode.OK) {
		await db.workflow.update({
			where: {
				workflowId: workflowArgs.workflowId,
			},
			data: {
				workflowStatus: WorkflowStatus.DepGraphFailed,
				workflowEndTimestamp: new Date(),
			},
		})
		return StatusCode.WorkflowError
	}

	await parserInstance.parseProject()

	await db.workflow.update({
		where: {
			workflowId: workflowArgs.workflowId,
		},
		data: {
			workflowStatus: WorkflowStatus.DepGraphCompleted,
		},
	})

	const depGraph = parserInstance.getDependencyGraph()
	const ctxGraph = new ContextGraph(parserArgs, depGraph)

	await db.workflow.update({
		where: {
			workflowId: workflowArgs.workflowId,
		},
		data: {
			workflowStatus: WorkflowStatus.SummaryGenStarted,
		},
	})

	try {
		await ctxGraph.generateContext()
	} catch (e) {
		await db.workflow.update({
			where: {
				workflowId: workflowArgs.workflowId,
			},
			data: {
				workflowStatus: WorkflowStatus.SummaryGenFailed,
				workflowEndTimestamp: new Date(),
			},
		})
		log("workflow.graph", LogLevel.Error, e)
	}

	await db.workflow.update({
		where: {
			workflowId: workflowArgs.workflowId,
		},
		data: {
			workflowStatus: WorkflowStatus.SummaryUploadStarted,
		},
	})

	try {
		const uploadResult = await uploadWorkflowSummary({
			workflowId: workflowArgs.workflowId,
			contextGraph: ctxGraph,
		})

		await db.workflow.update({
			where: {
				workflowId: workflowArgs.workflowId,
			},
			data: {
				workflowStatus: WorkflowStatus.SummaryUploadCompleted,
			},
		})

		return uploadResult
	} catch (e) {
		await db.workflow.update({
			where: {
				workflowId: workflowArgs.workflowId,
			},
			data: {
				workflowStatus: WorkflowStatus.SummaryUploadFailed,
				workflowEndTimestamp: new Date(),
			},
		})
		log("workflow.graph", LogLevel.Error, e)
	}

	return StatusCode.WorkflowError
})
