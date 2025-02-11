import { envVar } from "@/util/env"
import type { EmbeddingModel as OpenAIEmbeddingModel } from "openai/resources/embeddings.mjs"

export type Model = "gpt-4" | "gpt-4o" | "gpt-4o-mini" | "gpt-3.5-turbo"

export const LLM_MODEL: Model = "gpt-4o-mini"

export type EmbeddingModel = OpenAIEmbeddingModel

export const EMBEDDING_MODEL: EmbeddingModel = "text-embedding-3-large"

export const OPENAI_API_KEY = envVar("OPENAI_API_KEY")

export const TOKEN_CHUNK_LENGTH = 4096
