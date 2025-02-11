import { ShellOutput } from "@/components/ShellOutput"
import { execCommand, parseCommandInput } from "@/utils/commandREPL"
import { KONAMI_CODE, generateInitString } from "@/utils/common"
import { useCommandHistory } from "@/utils/hooks/useCommandHistory"
import { useSecretCode } from "@/utils/hooks/useSecretCode"
import { ShellHandle } from "@/utils/typedef"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export type ShellWindowProps = {}

export function ShellWindow(props: ShellWindowProps) {
	const [shellLocked, setShellLocked] = useState<boolean>(false)

	const commandHistory = useCommandHistory()

	const [shellContent, setShellContent] = useState<string[]>([
		generateInitString(),
	])

	const [inputText, setInputText] = useState<string>("")

	const [shellColor, setShellColor] = useState("termwhite")

	const inputRef = useRef<HTMLInputElement>(null)
	const termOutputRef = useRef<HTMLElement>(null)
	const lastOutputRef = useRef<HTMLElement>(null)

	const shellHandle: ShellHandle = useMemo(() => {
		const memoHandle: ShellHandle = {
			lockHandle: () => {
				setShellLocked(true)
			},
			unlockHandle: () => {
				setShellLocked(false)
			},
			writeLine: (outString) => {
				setShellContent((prevContent) => {
					return [...prevContent, outString]
				})
			},
			clearShell: () => {
				setShellContent([generateInitString()])
			},
			setShellColor: (newColor) => {
				setShellColor(newColor)
			},
		}
		return memoHandle
	}, [setShellLocked, setShellContent])

	const { onKeyPress } = useSecretCode({
		codeSequence: KONAMI_CODE,
		onUnlock: () => {
			shellHandle.lockHandle()
			shellHandle.writeLine(
				"Buffer overflow! You've unlocked SUDO mode. This doesn't do much as of now!",
			)
			shellHandle.unlockHandle()
		},
	})

	const executeUserInput = useCallback(() => {
		const parsedCommand = parseCommandInput(inputText)
		if (parsedCommand.commandName !== "NOOP") {
			commandHistory.addCommand(parsedCommand)
		}
		setShellContent((prevContent) => {
			return [...prevContent, `> ${inputText}`]
		})
		if (parsedCommand.commandName !== "NOOP") {
			execCommand(parsedCommand, shellHandle)
		}
		setInputText("")
	}, [commandHistory, inputText, shellHandle])

	useEffect(() => {
		const textRef = inputRef.current
		if (!textRef) {
			return
		}

		const eventHandler = (eventData: KeyboardEvent) => {
			if (shellLocked) {
				// Some command is writing
				return
			}
			if (eventData.isComposing) {
				return
			}

			const keyData = eventData.key

			onKeyPress(keyData)

			if (keyData.startsWith("Arrow")) {
				if (keyData === "ArrowLeft" || keyData === "ArrowRight") {
					// Do nothing
				} else if (keyData === "ArrowUp") {
					const partialCommand = parseCommandInput(inputText)
					const prevCommand = commandHistory.rewindCommand()
					setInputText(prevCommand.rawCommand)
				} else {
					const nextCommand = commandHistory.forwardCommand()
					setInputText(nextCommand.rawCommand)
				}
				return
			}

			if (keyData === "Enter") {
				executeUserInput()
				return
			}
		}

		textRef.addEventListener("keydown", eventHandler)

		return () => {
			if (!textRef) {
				return
			}
			textRef.removeEventListener("keydown", eventHandler)
		}
	}, [
		commandHistory,
		executeUserInput,
		inputText,
		onKeyPress,
		shellHandle,
		shellLocked,
	])

	useEffect(() => {
		if (lastOutputRef.current && termOutputRef.current) {
			termOutputRef.current.scrollTop = lastOutputRef.current.offsetTop
		}
	})

	// If you're seeing ugly scrollbars blame Chrome / Chromium / Edge or whatever fork you are running.
	// Works perfectly fucking fine in firefox

	return (
		<div
			className={
				"flex flex-grow flex-col justify-between border-4 border-termwhite"
			}
		>
			<div className={"scrollbar-hidden flex flex-col overflow-y-scroll"}>
				<div
					className={
						"flex flex-row items-center justify-between gap-4 border-termwhite bg-termwhite p-2 text-xl text-termgrey"
					}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="h-6 w-6"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"
						/>
					</svg>
					{`ArnitDOS ${shellLocked ? ":O" : ":)"}`}
					<button
						className={
							"text-lg hover:underline hover:decoration-termgrey"
						}
						onClick={shellHandle.clearShell}
					>
						Clear
					</button>
				</div>
				{/* @ts-ignore */}
				<div
					className={
						"scrollbar-hidden flex-grow-0 overflow-y-scroll p-2"
					}
					// @ts-ignore
					ref={termOutputRef}
				>
					{shellContent.map((contentString, contentIdx) => {
						return (
							// @ts-ignore
							<div
								key={`${contentIdx}.${contentString}`}
								{...(contentIdx === shellContent.length - 1
									? {
											ref: lastOutputRef,
										}
									: {})}
							>
								<ShellOutput
									textContent={contentString}
									overrideColor={shellColor}
								/>
							</div>
						)
					})}
				</div>
			</div>
			<div
				className={
					"flex flex-row items-center justify-between border-0 border-t-4 border-termwhite"
				}
			>
				<div className={"flex flex-grow flex-row gap-2 p-4"}>
					{shellLocked ? "Locked" : "Input"}
					<div className={shellLocked ? "hidden" : "blink"}>
						{">"}
					</div>
					<input
						disabled={shellLocked}
						className={`text-${shellColor}-400 flex-grow bg-termgrey focus:underline focus:decoration-dashed focus:outline-none`}
						/*// @ts-ignore */
						ref={inputRef}
						type={"text"}
						onChange={(ev) => {
							setInputText(ev.target.value)
						}}
						value={inputText}
					/>
					<div className={shellLocked ? "hidden" : "blink"}>
						{"<"}
					</div>
				</div>
				<div className={"border-l-4 border-l-termwhite p-4"}>
					<button onClick={executeUserInput} disabled={shellLocked}>
						{/* Thank you JBMono Ligatures!*/}
						{shellLocked ? "Waiting -_-" : "Execute ->"}
					</button>
				</div>
			</div>
		</div>
	)
}
