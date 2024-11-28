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

class TSEsNextNodeNextNodeNextParser extends Parser {
	tsProject: Project
	tsConfigPath: string

	constructor(parseArgs: ParseArgs) {
		super(parseArgs)

		this.tsConfigPath = path.resolve(
			process.cwd(),
			this.projectPath,
			"tsconfig.json",
		)

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
		const fileExists = fsSync.statSync(this.tsConfigPath, {
			throwIfNoEntry: false,
		})

		// If file doesn't exist, quit with error
		if (!fileExists) {
			log(
				"parser.ts.esnext.nodenext.nodenext",
				LogLevel.Error,
				`TSConfig does not exist: ${this.tsConfigPath}`,
			)
			return StatusCode.BadProject
		}

		return StatusCode.OK
	}

	// resolveModuleFromPath(filePath: string) {
	// 	const pathInfo = path.parse(filePath)
	// 	const { base, dir: fileDir, ext, name: fileName, root } = pathInfo
	// 	/*
	// 	┌─────────────────────┬────────────┐
	// 	│          dir        │    base    │
	// 	├──────┬              ├──────┬─────┤
	// 	│ root │              │ name │ ext │
	// 	" C:\      path\dir   \ file  .txt "
	// 	└──────┴──────────────┴──────┴─────┘
	// 	(All spaces in the "" line should be ignored. They are purely for formatting.)
	// 	*/
	// 	// Could be a named file like tree.ts or tree/index.ts
	// 	const possibleIndexResolutions = ["", "/index"]
	// 	const possibleExtensions = [".ts", ".mts", ".d.ts"]
	// 	const possileResolutionsWithExtensions = possibleExtensions.map(
	// 		(possibleExtension) => {
	// 			return possibleIndexResolutions.map(
	// 				(possibleIndexResolution) => {
	// 					return possibleIndexResolution + possibleExtension
	// 				},
	// 			)
	// 		},
	// 	)
	// 	const flatResolutions = possileResolutionsWithExtensions.flat()
	// 	const possibleFiles = flatResolutions.map((possibleExt) => {
	// 		return path.resolve(fileDir, fileName + possibleExt)
	// 	})

	// 	const mappedStats = possibleFiles.map((filePathWithExt) => {
	// 		try {
	// 			fsSync.statSync(filePathWithExt)
	// 			return filePathWithExt
	// 		} catch (e) {
	// 			return undefined
	// 		}
	// 	})

	// 	const resolvedFile = mappedStats.find((filePathStatted) => {
	// 		return filePathStatted !== undefined
	// 	})

	// 	return resolvedFile
	// }

	// readModuleFromPath(filePath: string) {
	// 	const resolvedFile = this.resolveModuleFromPath(filePath)

	// 	if (!resolvedFile) {
	// 		throw new Error(`Could not resolve any files for ${filePath}`)
	// 	}

	// 	log(
	// 		"parser.ts.esnext.nodenext.nodenext",
	// 		LogLevel.Debug,
	// 		`Resolved ${filePath} to ${resolvedFile}`,
	// 	)

	// 	const fileContent = fsSync.readFileSync(resolvedFile, {
	// 		encoding: "utf-8",
	// 	})

	// 	return {
	// 		fileContent: fileContent,
	// 		filePath: resolvedFile,
	// 	}
	// }

	// parseFile(filePath: string): any {
	// 	try {
	// 		const { fileContent, filePath: resolvedPath } =
	// 			this.readModuleFromPath(filePath)
	// 		const tsProgram = typescript.createProgram([resolvedPath], tsOpts)
	// 		const sourceFile = tsProgram.getSourceFile(resolvedPath)
	// 		if (!sourceFile) {
	// 			return StatusCode.UnknownError
	// 		}

	// 		this.dependencyGraph.addModuleNode({
	// 			modulePath: this.getPathRelativeToProjectRoot(resolvedPath),
	// 			moduleSourceCode: fileContent,
	// 		})

	// 		const filePathsToParse = new Set<string>()
	// 		const visitNode = (syntaxNode: typescript.Node) => {
	// 			if (typescript.isImportDeclaration(syntaxNode)) {
	// 				const importPath =
	// 					syntaxNode.moduleSpecifier.getText(sourceFile)
	// 				const importPathWithoutQuotes = importPath.slice(
	// 					1,
	// 					importPath.length - 1,
	// 				)
	// 				const importFilePath = path.resolve(
	// 					path.dirname(resolvedPath),
	// 					importPathWithoutQuotes,
	// 				)
	// 				filePathsToParse.add(importFilePath)
	// 				const dependentPath =
	// 					this.getPathRelativeToProjectRoot(resolvedPath)
	// 				const resolvedModulePath =
	// 					this.resolveModuleFromPath(importFilePath)
	// 				if (!resolvedModulePath) {
	// 					return
	// 				}
	// 				const dependencyPath =
	// 					this.getPathRelativeToProjectRoot(resolvedModulePath)

	// 				// Add a module to module dependency first
	// 				this.dependencyGraph.addModuleToModuleDependency({
	// 					dependentModulePath: dependentPath,
	// 					dependencyModulePath: dependencyPath,
	// 				})

	// 				if (syntaxNode.importClause){

	// 				}
	// 			}
	// 			typescript.forEachChild(syntaxNode, visitNode)
	// 		}

	// 		typescript.forEachChild(sourceFile, visitNode)

	// 		const filePathArr = Array.from(filePathsToParse)

	// 		filePathArr.map((modFilePath) => {
	// 			const relFilePath = path.resolve(modFilePath)
	// 			return this.parseFile(relFilePath)
	// 		})
	// 	} catch (e) {
	// 		log("parser.ts.esnext.nodenext.nodenext", LogLevel.Error, e)
	// 	}
	// }

	parseFile(filePath: string) {}

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
					: // Prefix it with @ for non-resolved modules
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
			}
		})

		log(
			"parser.ts.esnext.nodenext.nodenext",
			LogLevel.Debug,
			this.dependencyGraph,
		)

		return
	}
}

export default TSEsNextNodeNextNodeNextParser
