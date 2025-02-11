import { useCallback, useState } from "react"

export type UseSecretCodeArgs = {
	onUnlock: () => void
	codeSequence: string[]
}

export type SecretCodeRet = {
	onKeyPress: (keyCode: string) => void
}

export function useSecretCode(args: UseSecretCodeArgs): SecretCodeRet {
	const { onUnlock, codeSequence } = args
	const [keyQueue, setKeyQueue] = useState<string[]>([])

	const onKeyPress = useCallback(
		(keyCode: string) => {
			let mergedQueue: string[] = []
			if (keyQueue.length >= codeSequence.length) {
				const copyQueue = [...keyQueue]
				const slicedQueue = copyQueue.slice(1)
				mergedQueue = [...slicedQueue, keyCode]
			} else {
				mergedQueue = [...keyQueue, keyCode]
			}
			if (mergedQueue.length === codeSequence.length) {
				let matchFlag = true
				for (let idx = 0; idx < codeSequence.length; idx++) {
					if (mergedQueue[idx] !== codeSequence[idx]) {
						matchFlag = false
					}
				}
				if (matchFlag) {
					onUnlock()
				}
			} else {
				// Do nothing, code cannot be input
			}
			setKeyQueue(mergedQueue)
		},
		[codeSequence, keyQueue, onUnlock],
	)

	return {
		onKeyPress: onKeyPress,
	}
}
