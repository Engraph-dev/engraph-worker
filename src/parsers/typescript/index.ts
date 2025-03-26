import { UNRESOLVED_MODULE_PREFIX } from "@/common/depgraph"
import { type ParseArgs, Parser } from "@/common/parser"
import { SymbolType } from "@/util/defs/engraph-worker/common/symbols"
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
		// Include package.json for dependency management as well
		const packageJsonPath = path.resolve(this.projectPath, "package.json")

		let packageJSONExists = false

		try {
			const packageJsonCheck = fsSync.statSync(packageJsonPath)

			const packageJSONContents = fsSync.readFileSync(packageJsonPath, {
				encoding: "utf-8",
			})

			this.dependencyGraph.addModuleNode({
				modulePath: this.getPathRelativeToProjectRoot(packageJsonPath),
				moduleSourceCode: packageJSONContents,
			})

			packageJSONExists = true
		} catch (e) {
			log(
				"parser.typescript",
				LogLevel.Info,
				"package.json does not exist",
				e,
			)
		}

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

			if (packageJSONExists) {
				this.dependencyGraph.addModuleToModuleDependency({
					dependentModulePath: relativeFilePath,
					dependencyModulePath:
						this.getPathRelativeToProjectRoot(packageJsonPath),
				})
			}

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
					this.dependencyGraph.addModuleToSymbolDependency({
						dependentModulePath: relativeFilePath,
						dependencySymbolIdentifier: symbolName,
						dependencySymbolPath: modulePath,
					})
				})

				this.dependencyGraph.addModuleToModuleDependency({
					dependencyModulePath: modulePath,
					dependentModulePath: relativeFilePath,
				})
			})

			// Exports
			const moduleExports = sourceFile.getExportedDeclarations()
			for (const [exportName, exportDeclarations] of moduleExports) {
				const textDeclarations = exportDeclarations.map(
					(exportDeclaration) => {
						return exportDeclaration.getFullText()
					},
				)

				const mergedDeclarations = textDeclarations.join("\n")
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

				// Copy all imports of a module to the dependencies of the export as well
				this.dependencyGraph
					.getSymbolDependenciesOfModule(relativeFilePath)
					.forEach((modSymDependency) => {
						const symbolNode = this.dependencyGraph.getSymbolNode(
							modSymDependency.dependencySymbolPath,
							modSymDependency.dependencySymbolIdentifier,
						)

						if (symbolNode) {
							this.dependencyGraph.addSymbolToSymbolDependency({
								dependencySymbolIdentifier:
									symbolNode.symbolIdentifier,
								dependencySymbolPath: symbolNode.symbolPath,
								dependentSymbolPath: relativeFilePath,
								dependentSymbolIdentifier: exportName,
							})
						}
					})
			}
		})

		log("parser.typescript", LogLevel.Debug, this.dependencyGraph)

		return
	}
}

export default TypescriptParser
