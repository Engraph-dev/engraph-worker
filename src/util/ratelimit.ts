import { MODEL } from "@/util/ai"

const RPM_MAPPING = {
	"gpt-4": 500,
	"gpt-4o": 500,
	"gpt-4o-mini": 500,
	"gpt-3.5-turbo": 500,
}

const REQUESTS_PER_MINUTE = RPM_MAPPING[MODEL] ?? 50

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
