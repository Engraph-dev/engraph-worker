import { MODEL } from "@/util/ai"

const RPM_MAPPING = {
	"gpt-4": 500,
	"gpt-4o": 500,
	"gpt-4o-mini": 500,
	"gpt-3.5-turbo": 500,
}

const RPD_MAPPING = {
	"gpt-4": 10000,
	"gpt-4o-mini": 10000,
	"gpt-3.5-turbo": 10000,
}

const MAX_REQUESTS_PER_MINUTE = RPM_MAPPING[MODEL] ?? 50
const MAX_REQUESTS_PER_DAY =
	RPD_MAPPING[MODEL] ?? MAX_REQUESTS_PER_MINUTE * 60 * 24

const RPD_SCALED_RPM = Math.floor(MAX_REQUESTS_PER_DAY / (60 * 24))

// Select the least out of the two, this ensures that we are not hitting daily limits when chasing minutely-limits
const REQUESTS_PER_MINUTE = Math.min(MAX_REQUESTS_PER_MINUTE, RPD_SCALED_RPM)

export async function rateLimit() {
	return new Promise<void>((resolve, reject) => {
		setTimeout(
			() => {
				resolve()
			},
			(1000 * 60) / REQUESTS_PER_MINUTE,
		)
	})
}
