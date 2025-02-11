import { ShellWindow } from "@/components/ShellWindow"
import { getVersionString } from "@/utils/common"
import Head from "next/head"

export default function IndexPage() {
	return (
		<>
			<Head>
				<title>{`ArnitDOS ${getVersionString()}`}</title>
				<meta
					name={"description"}
					content={
						"Welcome to arnitdo's portfolio page! This has been designed like an intuitive terminal interface. Give it a try!"
					}
				/>
			</Head>
			<div
				className={
					"flex h-screen w-screen bg-termgrey font-mono text-termwhite"
				}
			>
				<ShellWindow />
			</div>
		</>
	)
}
