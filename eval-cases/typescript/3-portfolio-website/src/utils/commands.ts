import {
	LIST_DATA,
	PROJECT_DATA,
	RESUME_LINK,
	getVersionString,
} from "@/utils/common"
import { ExecutableCommand } from "@/utils/typedef"

const HELP_STRING_MAP: Record<string, string> = {
	HELP: "Great, now we're stuck in a loop! Try a different command, maybe that will break it...",
	HELLO: "Do you need an introduction? Say `Hello!`",
	LIST: "Enumerate some stuff - such as `projects`, `experience`, `hobbies` or `academics`",
	CONTACT: "Want to get in touch with me?, say `contact` and find out how!",
	RESUME: "Now we're talking! Punch in `resume` to get a quick link to my latest Resume",
	PROJECT:
		"Want to dig deeper into my works? Hit `project <name>`, you'll find more information there!",
	SOCIAL: "There's more to me than bits and bytes! Give me a ping on any of my `social` links!",
	CLEAR: "Two well-dressed men in black pull out a very suspicious device that emits a bright flash...",
	COLOR: "Bring out the colors! Usage: `color <colorname>`. Accepts `red|green|yellow|blue|pink`. Run without arguments to reset",
	SLEEP: "*Yawn* I've been up too long! Put me to sleep with `sleep <seconds>`",
}

export const EXECUTABLE_COMMANDS: ExecutableCommand[] = [
	{
		commandExecutable: "NOOP",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			void 0
			// Do nothing, this is a noop command!
		},
	},
	{
		commandExecutable: "CLEAR",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			shellHandle.lockHandle()
			shellHandle.clearShell()
			shellHandle.unlockHandle()
		},
	},
	{
		commandExecutable: "HELLO",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			shellHandle.lockHandle()
			shellHandle.writeLine(
				"Hey there! Welcome to ArnitDOS, I'm an interactive shell, here to guide you through Arnav's Portfolio!\nType `help` to list all available commands.",
			)
			shellHandle.unlockHandle()
		},
	},
	{
		commandExecutable: "HELP",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			const verString = getVersionString()
			shellHandle.lockHandle()
			if (commandArgs.length === 0) {
				shellHandle.writeLine(
					"Need help? Got you covered - try running one of the following commands, or `help <name>` for more information",
				)
				VALID_COMMAND_NAMES.forEach((commandKey, commandIdx) => {
					shellHandle.writeLine(
						`${commandIdx + 1}) ${commandKey.toLowerCase()}`,
					)
				})
			} else {
				for (let commandArg of commandArgs) {
					commandArg = commandArg.toUpperCase()
					if (VALID_COMMAND_NAMES.includes(commandArg)) {
						const helpText = HELP_STRING_MAP[commandArg]
						shellHandle.writeLine(
							`${commandArg.toLowerCase()}: ${helpText}`,
						)
					} else {
						shellHandle.writeLine(
							"Sorry, can't really help with that :(",
						)
					}
				}
			}
			shellHandle.unlockHandle()
		},
	},
	{
		commandExecutable: "LIST",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			shellHandle.lockHandle()
			if (commandArgs.length === 0) {
				shellHandle.writeLine(
					"Tell me something to list! Like `list projects|academics|experience|hobbies`",
				)
			} else if (commandArgs.length === 1) {
				const firstArg = commandArgs[0]
				const uppercaseArg = firstArg.toUpperCase()
				if (Object.keys(LIST_DATA).includes(uppercaseArg)) {
					const listPoints = LIST_DATA[uppercaseArg]
					for (const listPoint of listPoints) {
						shellHandle.writeLine(listPoint)
					}
				} else {
					shellHandle.writeLine(
						"I can't list that, try something relevant!",
					)
				}
			} else {
				shellHandle.writeLine(
					"Too many things to list! Try one at a time!",
				)
			}
			shellHandle.unlockHandle()
		},
	},
	{
		commandExecutable: "CONTACT",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			shellHandle.lockHandle()
			shellHandle.writeLine(
				"Shoot me a mail at the address below, and I'll get in touch with you",
			)
			shellHandle.writeLine("mailto:hello@arnitdo.dev")
			shellHandle.unlockHandle()
		},
	},
	{
		commandExecutable: "RESUME",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			shellHandle.lockHandle()
			shellHandle.writeLine("View my resume at the link below!")
			shellHandle.writeLine("")
			shellHandle.writeLine(RESUME_LINK)
			shellHandle.writeLine("")
			shellHandle.unlockHandle()
		},
	},
	{
		commandExecutable: "PROJECT",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			shellHandle.lockHandle()
			if (commandArgs.length === 0) {
				shellHandle.writeLine(
					"Give me a project id, I'll tell you more! Use the `list` command",
				)
			} else if (commandArgs.length === 1) {
				const projectId = commandArgs[0].toUpperCase()
				if (Object.keys(PROJECT_DATA).includes(projectId)) {
					const projectData = PROJECT_DATA[projectId]
					const {
						projectTitle,
						projectDescription,
						githubLink,
						projectDuration,
						projectNote,
					} = projectData
					shellHandle.writeLine(`Title: ${projectTitle}`)
					shellHandle.writeLine(`Description: ${projectDescription}`)
					shellHandle.writeLine("GitHub Link")
					shellHandle.writeLine(githubLink)
					if (projectDuration) {
						shellHandle.writeLine(
							`Developed from: ${projectDuration}`,
						)
					} else {
						shellHandle.writeLine(`Still under development`)
					}
					if (projectNote) {
						shellHandle.writeLine(`Note: ${projectNote}`)
					}
				} else {
					shellHandle.writeLine("That's not a valid project ID!")
				}
			} else {
				shellHandle.writeLine(
					"That's way too many projects! Try one at a time.",
				)
			}
			shellHandle.unlockHandle()
		},
	},
	{
		commandExecutable: "SOCIAL",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			shellHandle.lockHandle()
			shellHandle.writeLine(
				"Reach out to me on any of the below links, and I'll get in touch!",
			)
			shellHandle.writeLine("GitHub @arnitdo")
			shellHandle.writeLine("https://github.com/arnitdo")
			shellHandle.writeLine("Instagram: @arnitdo")
			shellHandle.writeLine("https://instagram.com/arnitdo")
			shellHandle.writeLine("LinkedIn: @arnitdo")
			shellHandle.writeLine("https://linkedin.com/in/arnitdo")
			shellHandle.unlockHandle()
		},
	},
	{
		commandExecutable: "COLOR",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			if (commandArgs.length === 0) {
				shellHandle.setShellColor("termwhite")
			} else {
				const colorArg = commandArgs[0]
				shellHandle.setShellColor(colorArg)
			}
		},
	},
	{
		commandExecutable: "SLEEP",
		executeCommand: (commandArgs, commandOpts, shellHandle) => {
			shellHandle.lockHandle()
			if (commandArgs.length === 0) {
				shellHandle.writeLine(
					"I can't just go to sleep forever, you know?",
				)
				shellHandle.unlockHandle()
			} else {
				const firstArg = commandArgs[0]
				const numericArg = Number.parseInt(firstArg)
				if (Number.isNaN(numericArg) || numericArg < 1) {
					shellHandle.writeLine("That's not a valid input!")
					shellHandle.unlockHandle()
				} else {
					setTimeout(
						shellHandle.unlockHandle,
						numericArg * 1000, // ms
					)
				}
			}
		},
	},
]

const FORBIDDEN_COMMANDS = ["NOOP"]

const VALID_COMMAND_NAMES = EXECUTABLE_COMMANDS.map((commandStruct) => {
	return commandStruct.commandExecutable
}).filter((commandName) => {
	return !FORBIDDEN_COMMANDS.includes(commandName)
})

export function isValidExecCommand(commandName: string) {
	return VALID_COMMAND_NAMES.includes(commandName)
}
