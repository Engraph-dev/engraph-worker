import { isURL } from "@/utils/common"

export type ShellOutputProps = {
	textContent: string
	overrideColor?: string
}

export function ShellOutput(props: ShellOutputProps) {
	const { overrideColor = "termwhite", textContent } = props

	const isContentURL = isURL(textContent)

	const forceDeadText = (
		<>
			<p className={"text-green-400"}></p>
			<p className={"text-red-400"}></p>
			<p className={"text-blue-400"}></p>
			<p className={"text-yellow-400"}></p>
			<p className={"text-pink-400"}></p>
		</>
	)

	return (
		<p className={`text-${overrideColor}-400`}>
			{isContentURL ? (
				<a
					href={textContent}
					className={"hover:underline hover:decoration-termwhite"}
					target={"_blank"}
				>
					{textContent}
				</a>
			) : (
				textContent
			)}
		</p>
	)
}
