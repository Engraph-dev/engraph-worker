import { toast } from "sonner"
import { makeAPIRequest } from "./helpers"
import {
	CredentialsResponse,
	LoginCredentialsBody,
	RegisterCredentialsBody,
} from "../types/auth"
import { NoParams, ResJSON as ResponseJSON } from "../types/common"
import { EndSessionParams, GetSessionResponse } from "../types/sessions"
import { GetIndustriesAndSkillsResponse, GetUsernameUsedQuery, GetUsernameUsedResponse } from "../types/onboarding"
import { GetMeResponse } from "../types/users/me"

const url = process.env.NEXT_PUBLIC_API_URL

export const apiHandler = {
	check: async () => {
		try {
			const res = await fetch(`${url}`)
			if (res.ok) {
				toast("Backend is working!")
			} else {
				return toast("Backend down!")
			}
		} catch (error) {
			return toast("Backend down!")
		}
	},
	register: async (data: RegisterCredentialsBody) => {
		if (!data.userMail && !data.userPhone) return null
		const response = await makeAPIRequest<CredentialsResponse, NoParams, RegisterCredentialsBody, NoParams>({
			requestUrl: `/auth/register/credentials`,
			urlParams: {},
			bodyParams: data,
			queryParams: {},
			requestMethod: "POST"
		})
		if (response.hasError) {
			toast.error("Error fetching data!")
			return null
		}
		if (response.responseData.responseStatus === "SUCCESS") {
			return response.responseData.responseStatus
		}
	},
	login: async (data: LoginCredentialsBody) => {
		if (!data.userIdentity) return null
		const response = await makeAPIRequest<CredentialsResponse, NoParams, LoginCredentialsBody, NoParams>({
			requestUrl: `/auth/login/credentials`,
			urlParams: {},
			bodyParams: data,
			queryParams: {},
			requestMethod: "POST"
		})
		if (response.hasError) {
			toast.error("Error fetching data!")
			return null
		}
		if (response.responseData.responseStatus === "SUCCESS") {
			return response.responseData
		}
	},
	getMe: async () => {
		const response = await makeAPIRequest<GetMeResponse, NoParams, NoParams, NoParams>({
			requestUrl: `/users/me`,
			urlParams: {},
			bodyParams: {},
			queryParams: {},
			requestMethod: "GET"
		})
		if (response.hasError) {
			toast.error("Error fetching data!")
			return null
		}
		if (response.responseData.responseStatus === "SUCCESS") {
			return response.responseData
		}
	},
	getSession: async () => {
		const response = await makeAPIRequest<GetSessionResponse, NoParams, NoParams, NoParams>({
			requestUrl: `/sessions/me`,
			urlParams: {},
			bodyParams: {},
			queryParams: {},
			requestMethod: "GET"
		})
		// console.log({ response })
		if (response.hasError) {
			toast.error("Error fetching data!")
			return null
		}
		if (response.responseData.responseStatus === "SUCCESS") {
			return response.responseData
		}
		return null;
	},
	closeSession: async ({ sessionId }: EndSessionParams) => {
		const response = await makeAPIRequest<ResponseJSON, EndSessionParams, NoParams, NoParams>({
			requestUrl: `/sessions/:sessionId`,
			urlParams: { sessionId },
			bodyParams: {},
			queryParams: {},
			requestMethod: "DELETE"
		})
		if (response.hasError) {
			toast.error("Error fetching data!")
			return null
		}
		if (response.responseData.responseStatus === "SUCCESS") {
			return response.responseData
		}
	},
	checkUsername: async (username: string) => {
		const response = await makeAPIRequest<GetUsernameUsedResponse, NoParams, NoParams, GetUsernameUsedQuery>({
			requestUrl: `/onboarding/check-username`,
			urlParams: {},
			bodyParams: {},
			queryParams: { userName: username },
			requestMethod: "GET"
		})
		if (response.hasError) {
			toast.error("Error fetching data!")
			return null
		}
		if (response.responseData.responseStatus === "SUCCESS") {
			return response.responseData
		}
	},
	getIndustrySkills: async () => {
		const response = await makeAPIRequest<GetIndustriesAndSkillsResponse, NoParams, NoParams, NoParams>({
			requestUrl: `/onboarding/industries-skills`,
			urlParams: {},
			bodyParams: {},
			queryParams: {},
			requestMethod: "GET"
		})
		if (response.hasError) {
			toast.error("Error fetching data!")
			return null
		}
		if (response.responseData.responseStatus === "SUCCESS") {
			return response.responseData
		}
	},
	checkSearchTerm: async (username: string) => {
		const response = await makeAPIRequest<GetUsernameUsedResponse, NoParams, NoParams, GetUsernameUsedQuery>({
			requestUrl: `/onboarding/check-username`,
			urlParams: {},
			bodyParams: {},
			queryParams: { userName: username },
			requestMethod: "GET"
		})
		if (response.hasError) {
			toast.error("Error fetching data!")
			return null
		}
		if (response.responseData.responseStatus === "SUCCESS") {
			return response.responseData
		}
	},
}
