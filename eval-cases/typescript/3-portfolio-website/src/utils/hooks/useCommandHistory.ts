import { Command } from "@/utils/typedef"
import { useCallback, useState } from "react"

type UseCommandHistoryOptions = {}

type CommandHistory = {
	historyStack: Command[]
	currIndex: number
	addCommand: (commandData: Command) => void
	clearHistory: () => void
	rewindCommand: () => Command
	forwardCommand: () => Command
}

export function useCommandHistory(
	opts: UseCommandHistoryOptions = {},
): CommandHistory {
	const [historyStack, setHistoryStack] = useState<Command[]>([])
	const [historyIdx, setHistoryIdx] = useState<number>(-1)

	const addCommand = useCallback(
		(commandStr: Command) => {
			setHistoryStack((prevStack) => {
				// Bring index forward to current index again
				setHistoryIdx(prevStack.length)
				return [...prevStack, commandStr]
			})
		},
		[setHistoryStack],
	)

	const clearHistory = useCallback(() => {
		setHistoryStack([])
		setHistoryIdx(-1)
	}, [])

	const forwardCommand = useCallback((): Command => {
		const currIdx = historyIdx
		if (currIdx >= historyStack.length - 1) {
			return {
				commandName: "",
				rawCommand: "",
				commandArgs: [],
				commandOptions: [],
			}
		} else {
			setHistoryIdx((prevIdx) => {
				return prevIdx + 1
			})
			return historyStack[currIdx + 1]
		}
	}, [historyStack, historyIdx, setHistoryIdx])

	const rewindCommand = useCallback((): Command => {
		const currIdx = historyIdx
		if (currIdx === -1) {
			return {
				commandName: "",
				rawCommand: "",
				commandArgs: [],
				commandOptions: [],
			}
		} else if (currIdx === 0) {
			return historyStack[0]
		} else {
			setHistoryIdx((prevIdx) => {
				return prevIdx - 1
			})
			return historyStack[currIdx]
		}
	}, [historyStack, historyIdx, setHistoryIdx])

	return {
		historyStack: historyStack,
		currIndex: historyIdx,
		addCommand: addCommand,
		forwardCommand: forwardCommand,
		rewindCommand: rewindCommand,
		clearHistory: clearHistory,
	}
}
