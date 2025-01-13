import { AWS_KEY_ID, AWS_KEY_SECRET, AWS_REGION } from "@/util/config/aws"
import { SQS_URL } from "@/util/config/sqs"
import { LogLevel, log } from "@/util/log"
import {
	DeleteMessageCommand,
	ReceiveMessageCommand,
	SQSClient,
} from "@aws-sdk/client-sqs"

export const sqsClient = new SQSClient({
	credentials: {
		accessKeyId: AWS_KEY_ID,
		secretAccessKey: AWS_KEY_SECRET,
	},
	region: AWS_REGION,
})

export async function receiveSQSMessage() {
	const recvCommand = new ReceiveMessageCommand({
		QueueUrl: SQS_URL,
		MaxNumberOfMessages: 1,
		MessageAttributeNames: ["All"],
	})

	const messagePayload = await sqsClient.send(recvCommand)
	const receivedMessages = messagePayload.Messages ?? []
	if (receivedMessages.length) {
		const recvMessage = receivedMessages[0]
		if (recvMessage.Body && recvMessage.ReceiptHandle) {
			return {
				recvHandle: recvMessage.ReceiptHandle,
				workflowId: recvMessage.Body,
			}
		}
		return null
	}

	return null
}

export async function deleteSQSMessage(recvHandle: string) {
	const deleteCommand = new DeleteMessageCommand({
		QueueUrl: SQS_URL,
		ReceiptHandle: recvHandle,
	})

	const deleteRes = await sqsClient.send(deleteCommand)

	log(
		"sqs",
		LogLevel.Debug,
		`Deleted Message with ReceiptHandle ${recvHandle}`,
	)
}
