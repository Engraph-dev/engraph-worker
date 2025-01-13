import { MESSAGE_COOLDOWN_MS } from "@/util/config/worker"
import { LogLevel, log } from "@/util/log"
import { StatusCode } from "@/util/process"
import { deleteSQSMessage, receiveSQSMessage } from "@/util/sqs"
import { timeout } from "@/util/time"
import { startWorkflow } from "@/util/worker"
import dotenv from "dotenv"

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

workerImpl()
