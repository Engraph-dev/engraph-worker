import { PROJECT_DIRECTORY } from "@/util/config/worker"
import db from "@/util/db"
import type { GitHubWorkflowMetadata } from "@/util/defs/engraph-backend/common/workflows"
import { getGithubApp } from "@/util/github"
import { LogLevel, log } from "@/util/log"
import { StatusCode } from "@/util/process"
import { initGraphWorkflow, workflowHandler } from "@/util/worker/common"
import { WorkflowStatus } from "@prisma/client"
import { rm } from "fs/promises"
import simpleGit from "simple-git"

export const githubWorkflowHandler = workflowHandler(async (workflowArgs) => {
	const { workflowMetadata } = workflowArgs
	const { commitHash, commitRef, installationId } =
		workflowMetadata as GitHubWorkflowMetadata

	log("workflow.github", LogLevel.Debug, `Workflow clone started`)

	await db.workflow.update({
		where: { workflowId: workflowArgs.workflowId },
		data: {
			workflowStatus: WorkflowStatus.CloneStarted,
		},
	})

	const githubApp = await getGithubApp()
	const installationApp = await githubApp.getInstallationOctokit(
		Number.parseInt(installationId),
	)

	const installationResponse = await githubApp.octokit.request(
		`POST /app/installations/{installation_id}/access_tokens`,
		{ installation_id: Number.parseInt(installationId) },
	)

	if (installationResponse.status !== 201) {
		log(
			"workflow.github",
			LogLevel.Debug,
			"Installation Response:",
			installationResponse,
		)
		await db.workflow.update({
			where: { workflowId: workflowArgs.workflowId },
			data: {
				workflowStatus: WorkflowStatus.CloneFailed,
				workflowEndTimestamp: new Date(),
			},
		})
		return StatusCode.WorkflowError
	}

	const installationAccessToken = installationResponse.data.token

	log(
		"workflow.github",
		LogLevel.Debug,
		`Installation access token acquired: ${installationAccessToken}`,
	)

	const repoResponse = await installationApp.paginate(
		`GET /installation/repositories`,
	)

	const repoData = repoResponse.find((repoResponseData) => {
		return (
			repoResponseData.id.toString() ===
			workflowArgs.workflowProject.projectIdentifier
		)
	})

	if (repoData === undefined) {
		log("workflow.github", LogLevel.Debug, "Repo Response ", repoData)
		await db.workflow.update({
			where: { workflowId: workflowArgs.workflowId },
			data: {
				workflowStatus: WorkflowStatus.CloneFailed,
				workflowEndTimestamp: new Date(),
			},
		})
		return StatusCode.WorkflowError
	}

	const { full_name: repoNameWithOwner } = repoData

	log(
		"workflow.github",
		LogLevel.Debug,
		"Resolved repository id",
		workflowArgs.workflowProject.projectIdentifier,
		repoNameWithOwner,
	)

	const targetUrl = `https://x-access-token:${installationAccessToken}@github.com/${repoNameWithOwner}`

	log("workflow.github", LogLevel.Debug, `Target URL: ${targetUrl}`)

	try {
		await rm(PROJECT_DIRECTORY, {
			recursive: true,
			force: true,
		})
	} catch (e) {
		log("workflow.github", LogLevel.Error, e)
		await db.workflow.update({
			where: { workflowId: workflowArgs.workflowId },
			data: {
				workflowStatus: WorkflowStatus.CloneFailed,
				workflowEndTimestamp: new Date(),
			},
		})
		return StatusCode.WorkflowError
	}

	const rootGitInstance = simpleGit()

	log(
		"workflow.github",
		LogLevel.Debug,
		`Starting git-clone to ${PROJECT_DIRECTORY}`,
	)

	await rootGitInstance.clone(targetUrl, PROJECT_DIRECTORY, {
		"--recurse-submodules": null,
	})

	const repoGitInstance = simpleGit(PROJECT_DIRECTORY)

	log(
		"workflow.github",
		LogLevel.Debug,
		`Checking out repository at ${commitRef}`,
	)

	await repoGitInstance.checkout(commitRef)

	await db.workflow.update({
		where: { workflowId: workflowArgs.workflowId },
		data: {
			workflowStatus: WorkflowStatus.CloneCompleted,
		},
	})

	log("workflow.github", LogLevel.Debug, `git-clone completed`)

	log("workflow.github", LogLevel.Debug, `Starting graph workflow`)

	const graphResult = await initGraphWorkflow(workflowArgs)

	try {
		await rm(PROJECT_DIRECTORY, {
			recursive: true,
			force: true,
		})
	} catch (e) {
		log("workflow.github", LogLevel.Error, e)
	}

	if (graphResult === StatusCode.OK) {
		await db.workflow.update({
			where: { workflowId: workflowArgs.workflowId },
			data: {
				workflowStatus: WorkflowStatus.WorkflowCompleted,
				workflowEndTimestamp: new Date(),
			},
		})

		return StatusCode.OK
	}

	return StatusCode.WorkflowError
})
