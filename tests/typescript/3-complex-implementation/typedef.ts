export enum CommandOptionType {
	SHORT_OPT,
	LONG_OPT,
}

export type CommandOption = {
	optType: CommandOptionType
	optionValue: string
}

export type Command = {
	commandName: string
	rawCommand: string
	commandArgs: string[]
	commandOptions: CommandOption[]
}

export type ShellHandle = {
	lockHandle: () => void
	unlockHandle: () => void
	writeLine: (outString: string) => void
	clearShell: () => void
	setShellColor: (colorName: string) => void
}

export type ExecutableCommand = {
	commandExecutable: string
	executeCommand: (
		commandArgs: string[],
		commandOpts: CommandOption[],
		shellHandle: ShellHandle,
	) => void
}
