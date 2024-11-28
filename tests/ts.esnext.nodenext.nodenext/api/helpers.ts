import type { ReqMethod as RequestMethod, ResJSON as ResponseJSON, StatusCode } from "@/lib/types/common"
import { cookies } from "next/headers"
import { localAuthSession } from "../constants"
// import {toast} from "sonner";

export type MakeAPIRequestArgs<ParamsT extends {} = {}, BodyT extends {} = {}, QueryT extends {} = {}> = {
	requestUrl: string,
	requestMethod: RequestMethod,
	urlParams: ParamsT,
	bodyParams: BodyT,
	queryParams: QueryT,
	customHeaders?: Headers
}

type MakeAPIRequestRet<ResponseT extends {} = {}, ParamsT extends {} = {}, BodyT extends {} = {}, QueryT extends {} = {}> =
	{
		hasResponse: true,
		hasError: false,
		statusCode: StatusCode,
		responseData: ResponseJSON<ResponseT, ParamsT, BodyT, QueryT>,
		errorData: undefined
	}
	| {
		hasResponse: false,
		hasError: true,
		statusCode: 0,
		responseData: undefined,
		errorData: Error
	}

export async function makeAPIRequest<ResponseT extends {} = {}, ParamsT extends {} = {}, BodyT extends {} = {}, QueryT extends {} = {}>(
	args: MakeAPIRequestArgs<ParamsT, BodyT, QueryT>
): Promise<MakeAPIRequestRet<ResponseT, ParamsT, BodyT, QueryT>> {
	const url = process.env.NEXT_PUBLIC_API_URL
	const { requestMethod, requestUrl, urlParams, queryParams, bodyParams, customHeaders = {} } = args

	let resolvedUrl = requestUrl

	for (const paramKey in urlParams) {

		const paramValue = urlParams[paramKey]
		// @ts-ignore
		resolvedUrl = resolvedUrl.replaceAll(`:${paramKey}`, paramValue.toString())
		// @ts-ignore
		resolvedUrl = resolvedUrl.replaceAll(`[${paramKey}]`, paramValue.toString())
	}

	const queryParameters = new URLSearchParams(queryParams)
	resolvedUrl = `${url}${resolvedUrl}?${queryParameters.toString()}`
	let sessionToken = null
	const isWindow = typeof window !== "undefined"
	if (isWindow && window.sessionStorage) {
		sessionToken = sessionStorage.getItem(localAuthSession);
	} else if (!isWindow) {
		const { cookies } = await import("next/headers")
		const storedCookie = sessionToken = cookies().get(localAuthSession)
		sessionToken = storedCookie ? storedCookie.value : ""
	}
	try {
		const fetchResponse = await fetch(
			resolvedUrl,
			{
				method: requestMethod,
				credentials: "include",
				cache: "no-store",
				headers: sessionToken ? {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
					// "ngrok-skip-browser-warning": "true",
					"X-Engaze-Auth": sessionToken,
					...customHeaders
				} : {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
					...customHeaders
				},
				...(["GET", "DELETE"].includes(requestMethod) ? {} : {
					body: JSON.stringify(bodyParams)
				})

			}
		)

		const responseJson = await fetchResponse.json() as ResponseJSON<ResponseT, ParamsT, BodyT, QueryT>
		return {
			hasResponse: true,
			hasError: false,
			statusCode: fetchResponse.status as StatusCode,
			responseData: responseJson,
			errorData: undefined
		}
	} catch (e) {
		const errorData = e as unknown as Error
		// toast.error(errorData.message)
		return {
			hasResponse: false,
			hasError: true,
			statusCode: 0,
			responseData: undefined,
			errorData: errorData
		}
	}
}

