import { makeAPIRequest } from "./api/helpers"
import { manageMedia } from "api/media"

async function main() {
	await makeAPIRequest({
		requestUrl: "/some-endpoint",
		requestMethod: "GET",
		bodyParams: {},
		queryParams: {},
		urlParams: {},
	})

	await manageMedia({
		mediaFiles: [],
		objectKeyGenerator: (file, idx) => file.name,
		requestMethod: "PUT",
	})
}
