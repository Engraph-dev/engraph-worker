export enum SymbolType {
	Variable = "Variable",
	Constant = "Constant",
	Function = "Function",
	Class = "Class",
	Interface = "Interface",
	Enum = "Enum",
	Type = "Type",
	Unknown = "Unknown",
}

export type Symbol = {
	symbolIdentifier: string
	symbolType: SymbolType
	symbolTypeSignature?: string
	symbolPath: string
	symbolSourceCode: string
	symbolEmbeddings?: number[]
	// Unused
	symbolSummary?: string
}
