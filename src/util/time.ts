export async function timeout(timeMs: number) {
	if (timeMs <= 0) {
		return
	}
	return new Promise<void>((resolve, reject) => {
		setTimeout(() => {
			resolve()
		}, timeMs)
	})
}
