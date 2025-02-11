import { type EmbeddingModel, type Model } from "@/util/config/ai"
import { timeout } from "@/util/time"

const RPM_MAPPING: Record<Model | EmbeddingModel, number> = {
	"gpt-4": 500,
	"gpt-4o": 500,
	"gpt-4o-mini": 500,
	"gpt-3.5-turbo": 500,
	"text-embedding-3-large": 3000,
	"text-embedding-3-small": 3000,
	"text-embedding-ada-002": 3000,
}

const RPD_MAPPING: Partial<Record<Model | EmbeddingModel, number>> = {
	"gpt-4": 10000,
	"gpt-4o-mini": 10000,
	"gpt-3.5-turbo": 10000,
}

export async function rateLimit(modelName: Model | EmbeddingModel) {
	const MAX_REQUESTS_PER_MINUTE = Math.floor(
		RPM_MAPPING[modelName] ?? Math.min(...Object.values(RPM_MAPPING)),
	)
	const MAX_REQUESTS_PER_DAY =
		RPD_MAPPING[modelName] ?? MAX_REQUESTS_PER_MINUTE * 60 * 24

	const RPD_SCALED_RPM = Math.floor(MAX_REQUESTS_PER_DAY / (60 * 24))

	// Select the least out of the two, this ensures that we are not hitting daily limits when chasing minutely-limits
	const REQUESTS_PER_MINUTE = Math.min(
		MAX_REQUESTS_PER_MINUTE,
		RPD_SCALED_RPM,
	)

	return timeout((1000 * 60) / REQUESTS_PER_MINUTE)
}
