import { Router as ExpressRouter } from "express"

export function Router() {
	return ExpressRouter({ mergeParams: true })
}
