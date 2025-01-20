import { UNRESOLVED_MODULE_PREFIX } from "@/common/depgraph"
import { SymbolType } from "@/common/depgraph/symbols"
import { type ParseArgs, Parser } from "@/common/parser"
import { LogLevel, log } from "@/util/log"
import { StatusCode } from "@/util/process"
import fsSync from "fs"
import path from "path"
import {
	ModuleKind,
	ModuleResolutionKind,
	Project,
	ScriptTarget,
	ts,
} from "ts-morph"

const tsOpts = {
	target: ScriptTarget.ESNext,
	module: ModuleKind.NodeNext,
	moduleResolution: ModuleResolutionKind.NodeNext,
	strict: true,
} satisfies Partial<ts.CompilerOptions>

class TypescriptParser extends Parser {
	tsProject: Project
	tsConfigPath: string

	constructor(parseArgs: ParseArgs) {
		super(parseArgs)

		this.tsConfigPath = path.resolve(this.projectPath, "tsconfig.json")

		const validationStatus = this.validateProject()

		if (validationStatus !== StatusCode.OK) {
			throw new Error("Invalid project directory")
		}

		this.tsProject = new Project({
			compilerOptions: tsOpts,
			tsConfigFilePath: this.tsConfigPath,
		})
	}

	validateProject(): StatusCode {
		try {
			const fileExists = fsSync.statSync(this.tsConfigPath)
		} catch (e) {
			// If file doesn't exist, quit with error
			log("parser.typescript", LogLevel.Error, e)
			return StatusCode.BadProject
		}

		return StatusCode.OK
	}

	parseProject() {
		const sourceFiles = this.tsProject.getSourceFiles()

		sourceFiles.forEach((sourceFile) => {
			const sourceCode = sourceFile.getFullText()
			const filePath = sourceFile.getFilePath()
			const relativeFilePath = this.getPathRelativeToProjectRoot(filePath)

			// Add this own node to the graph first
			this.dependencyGraph.addModuleNode({
				modulePath: relativeFilePath,
				moduleSourceCode: sourceCode,
			})

			// Imports
			const sourceFileImports = sourceFile.getImportDeclarations()

			sourceFileImports.forEach((importDeclaration) => {
				const sourceFile =
					importDeclaration.getModuleSpecifierSourceFile()
				const modulePath = sourceFile
					? this.getPathRelativeToProjectRoot(
							sourceFile.getFilePath(),
						)
					: // Prefix it with UNRESOLVED_MODULE_PREFIX for non-resolved modules
						`${UNRESOLVED_MODULE_PREFIX}${importDeclaration.getModuleSpecifierValue()}`

				if (modulePath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
					this.dependencyGraph.addModuleNode({
						modulePath: modulePath,
						moduleSourceCode: "",
					})
				}

				const namedImports = importDeclaration.getNamedImports()
				namedImports.forEach((namedImport) => {
					const symbolName = namedImport.getText()
					this.dependencyGraph.addSymbolToModuleDependency({
						dependencyModulePath: relativeFilePath,
						dependentSymbolIdentifier: symbolName,
						dependentSymbolPath: modulePath,
					})
				})

				const defaultImport = importDeclaration.getDefaultImport()
				if (defaultImport) {
					this.dependencyGraph.addModuleToModuleDependency({
						dependencyModulePath: modulePath,
						dependentModulePath: relativeFilePath,
					})
				}
			})

			// Exports
			const moduleExports = sourceFile.getExportedDeclarations()
			for (const [exportName, exportDeclarations] of moduleExports) {
				const textDeclarations = exportDeclarations.map(
					(exportDeclaration) => {
						return exportDeclaration.getFullText()
					},
				)

				const mergedDeclarations = textDeclarations.join(" ")
				this.dependencyGraph.addSymbolNode({
					symbolIdentifier: exportName,
					symbolPath: relativeFilePath,
					symbolSourceCode: mergedDeclarations,
					symbolType: SymbolType.Unknown,
				})

				// Implicitly add a module dependency to it's own file for each export
				this.dependencyGraph.addSymbolToModuleDependency({
					dependencyModulePath: relativeFilePath,
					dependentSymbolIdentifier: exportName,
					dependentSymbolPath: relativeFilePath,
				})
			}
		})

		log("parser.typescript", LogLevel.Debug, this.dependencyGraph)

		return
	}
}

export default TypescriptParser
