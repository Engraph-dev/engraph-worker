// Watch out this is gonna get pretty big
// We will be spinning up a small express server to pick up a random project
import { indexRouter } from "@/eval-server/routers"
import { EVAL_PORT } from "@/util/config/eval-server"
import { LogLevel, log } from "@/util/log"
import cors from "cors"
import express from "express"

export async function evalServerImpl() {
	const evalServer = express()

	evalServer.use(cors({ origin: "*" }))

	evalServer.use(express.json())

	evalServer.use("/api/v1", indexRouter)

	evalServer.listen(EVAL_PORT, () => {
		log(
			"eval-server",
			LogLevel.Debug,
			`eval-server listening on port ${EVAL_PORT}`,
		)
	})
}
