import { EXECUTABLE_COMMANDS, isValidExecCommand } from "@/utils/commands"
import { COMMAND_SPLIT_REGEXP } from "@/utils/globals"
import {
	Command,
	CommandOption,
	CommandOptionType,
	ShellHandle,
} from "@/utils/typedef"

/**
 * @summary Generates a Command structure from a given input string
 * **/
export function parseCommandInput(commandString: string): Command {
	let inputString = commandString.trim()
	inputString = inputString.toLowerCase()

	if (inputString.length === 0) {
		// Empty command
		return {
			commandName: "NOOP",
			rawCommand: "",
			commandArgs: [],
			commandOptions: [],
		}
	}

	const stringTokens = inputString.split(COMMAND_SPLIT_REGEXP)
	const cleanTokens = stringTokens.filter((stringToken) => {
		return (
			stringToken.length > 0 || // Empty string
			stringToken == "-" ||
			stringToken == "--" // Only long/short opt flag passed, we need more data after -
		)
	})
	const firstKeyword = cleanTokens[0]

	const inputArgs = cleanTokens.slice(1)

	const argList = inputArgs.filter((argString) => {
		return !argString.startsWith("-")
	})

	const rawOptList = inputArgs.filter((optString) => {
		return optString.startsWith("-")
	})

	const mappedOptList = rawOptList.map((optString): CommandOption => {
		if (optString.startsWith("--")) {
			const trimmedOptString = optString.slice(2)
			return {
				optType: CommandOptionType.LONG_OPT,
				optionValue: trimmedOptString,
			}
		} else {
			const trimmedOptString = optString.slice(1)
			return {
				optType: CommandOptionType.SHORT_OPT,
				optionValue: trimmedOptString[0],
			}
		}
	})

	return {
		commandName: firstKeyword.toUpperCase(),
		rawCommand: commandString.trim(),
		commandArgs: argList,
		commandOptions: mappedOptList,
	}
}

export function execCommand(targetCommand: Command, shellHandle: ShellHandle) {
	const isValidCommand = isValidExecCommand(targetCommand.commandName)
	if (!isValidCommand) {
		shellHandle.lockHandle()
		shellHandle.writeLine(
			`${targetCommand.rawCommand}: Not a valid command!`,
		)
		shellHandle.unlockHandle()
	} else {
		const matchingCommand = EXECUTABLE_COMMANDS.find((execCommand) => {
			return execCommand.commandExecutable === targetCommand.commandName
		})
		if (matchingCommand === undefined) {
			shellHandle.lockHandle()
			shellHandle.writeLine(`${targetCommand.rawCommand}: Error!`)
			shellHandle.unlockHandle()
		} else {
			matchingCommand.executeCommand(
				targetCommand.commandArgs,
				targetCommand.commandOptions,
				shellHandle,
			)
		}
	}
}
