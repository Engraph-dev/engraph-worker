import { makeAPIRequest } from "./helpers"
import { NoParams } from "@/lib/types/common"
import { S3RequestMethod } from "@prisma/client"
import { MediaCallbackParams, MediaEndpointRequestBody, MediaEndpointResponse } from "@/lib/types/media"

export enum MediaStatus {
	APIError,
	APIInvalid,
	S3Error,
	CallbackError,
	CallbackInvalid,
	Success
}

type ManageMediaArgs = {
	mediaFiles: File[],
	requestMethod: S3RequestMethod
	objectKeyGenerator: (file: File, idx: number) => string,
}

type ManageMediaSingleRet = {
	mediaStatus: MediaStatus,
	objectKey: string,
	objectUrl: string | undefined,
	requestId: string | undefined,
}

type ManageMediaRet = ManageMediaSingleRet[]

export async function manageMedia(args: ManageMediaArgs): Promise<ManageMediaRet> {
	const { mediaFiles, objectKeyGenerator, requestMethod } = args

	if (mediaFiles.length === 0) {
		return []
	}

	const mediaRets = await Promise.all(
		mediaFiles.map(async (mediaFile, mediaIdx): Promise<ManageMediaSingleRet> => {
			const objectKey = objectKeyGenerator(mediaFile, mediaIdx)

			const urlReq = await makeAPIRequest<MediaEndpointResponse, NoParams, MediaEndpointRequestBody>({
				requestMethod: "POST",
				requestUrl: "/media",
				bodyParams: {
					objectKey: objectKey,
					requestMethod: requestMethod,
					objectFileName: mediaFile.name,
					objectContentType: mediaFile.type,
					objectSizeBytes: mediaFile.size
				},
				urlParams: {},
				queryParams: {}
			})

			if (urlReq.hasError) {
				return {
					objectKey: objectKey,
					objectUrl: undefined,
					requestId: undefined,
					mediaStatus: MediaStatus.APIError
				}
			}

			const { responseData } = urlReq

			if (responseData.responseStatus !== "SUCCESS") {
				return {
					objectKey: objectKey,
					objectUrl: undefined,
					requestId: undefined,
					mediaStatus: MediaStatus.APIInvalid
				}
			}

			const { objectUrl, requestId } = responseData

			if (requestMethod === S3RequestMethod.GET){
				return {
					objectKey: objectKey,
					requestId: requestId,
					mediaStatus: MediaStatus.Success,
					objectUrl: objectUrl
				}
			}

			try {
				const s3Response = await fetch(
					objectUrl,
					{
						method: requestMethod,
						body: mediaFile,
						headers: {
							"Content-Type": mediaFile.type
						}
					}
				)

				if (s3Response.ok) {
					const callbackRes = await makeAPIRequest<{}, MediaCallbackParams>({
						requestUrl: "/media/:requestId",
						requestMethod: requestMethod,
						urlParams: {
							requestId: requestId
						},
						bodyParams: {},
						queryParams: {}
					})

					if (callbackRes.hasError) {
						return {
							objectKey: objectKey,
							objectUrl: objectUrl,
							requestId: requestId,
							mediaStatus: MediaStatus.CallbackError
						}
					} else if (callbackRes.responseData.responseStatus !== "SUCCESS") {
						return {
							objectKey: objectKey,
							objectUrl: objectUrl,
							requestId: requestId,
							mediaStatus: MediaStatus.CallbackError
						}
					}
					return {
						objectKey: objectKey,
						objectUrl: objectUrl,
						requestId: requestId,
						mediaStatus: MediaStatus.Success
					}
				}

				return {
					objectKey: objectKey,
					objectUrl: objectUrl,
					requestId: requestId,
					mediaStatus: MediaStatus.S3Error
				}
			} catch (e) {
				console.error(e)
				return {
					objectKey: objectKey,
					objectUrl: objectUrl,
					requestId: requestId,
					mediaStatus: MediaStatus.S3Error
				}
			}
		})
	)

	return mediaRets
}