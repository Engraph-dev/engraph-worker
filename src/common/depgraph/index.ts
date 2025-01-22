import type { Module } from "@/util/defs/engraph-worker/common/modules"
import type { Symbol } from "@/util/defs/engraph-worker/common/symbols"

type SymbolToSymbolDependency = {
	dependentSymbolPath: Symbol["symbolPath"]
	dependentSymbolIdentifier: Symbol["symbolIdentifier"]
	dependencySymbolPath: Symbol["symbolPath"]
	dependencySymbolIdentifier: Symbol["symbolIdentifier"]
}

type SymbolToModuleDependency = {
	dependentSymbolPath: Symbol["symbolPath"]
	dependentSymbolIdentifier: Symbol["symbolIdentifier"]
	dependencyModulePath: Module["modulePath"]
}

type ModuleToSymbolDependency = {
	dependentModulePath: Module["modulePath"]
	dependencySymbolPath: Symbol["symbolPath"]
	dependencySymbolIdentifier: Symbol["symbolIdentifier"]
}

type ModuleToModuleDependency = {
	dependentModulePath: Module["modulePath"]
	dependencyModulePath: Module["modulePath"]
}

export interface IDependencyGraph {
	symbolNodes: Symbol[]
	moduleNodes: Module[]
	symbolToSymbolDependencies: SymbolToSymbolDependency[]
	symbolToModuleDependencies: SymbolToModuleDependency[]
	moduleToSymbolDependencies: ModuleToSymbolDependency[]
	moduleToModuleDependencies: ModuleToModuleDependency[]
}

export class DependencyGraph implements IDependencyGraph {
	symbolNodes: Symbol[]
	moduleNodes: Module[]
	symbolToSymbolDependencies: SymbolToSymbolDependency[]
	symbolToModuleDependencies: SymbolToModuleDependency[]
	moduleToSymbolDependencies: ModuleToSymbolDependency[]
	moduleToModuleDependencies: ModuleToModuleDependency[]

	constructor() {
		this.symbolNodes = []
		this.moduleNodes = []
		this.symbolToSymbolDependencies = []
		this.symbolToModuleDependencies = []
		this.moduleToSymbolDependencies = []
		this.moduleToModuleDependencies = []
	}

	addSymbolNode(symbolNode: Symbol) {
		const nodeExists = this.symbolNodes.find((existingNode) => {
			return (
				existingNode.symbolPath === symbolNode.symbolPath &&
				existingNode.symbolIdentifier === symbolNode.symbolIdentifier
			)
		})
		if (nodeExists) {
			return
		}
		this.symbolNodes.push(symbolNode)
	}

	addModuleNode(moduleNode: Module) {
		const nodeExists = this.moduleNodes.find((existingNode) => {
			return existingNode.modulePath === moduleNode.modulePath
		})
		if (nodeExists) {
			return
		}
		this.moduleNodes.push(moduleNode)
	}

	addSymbolToSymbolDependency(dependencyData: SymbolToSymbolDependency) {
		const dependencyExists = this.symbolToSymbolDependencies.find(
			(existingDependency) => {
				return (
					existingDependency.dependentSymbolPath ===
						dependencyData.dependentSymbolPath &&
					existingDependency.dependentSymbolIdentifier ===
						dependencyData.dependentSymbolIdentifier &&
					existingDependency.dependencySymbolPath ===
						dependencyData.dependencySymbolPath &&
					existingDependency.dependencySymbolIdentifier ===
						dependencyData.dependencySymbolIdentifier
				)
			},
		)
		if (dependencyExists) {
			return
		}
		this.symbolToSymbolDependencies.push(dependencyData)
	}

	addSymbolToModuleDependency(dependencyData: SymbolToModuleDependency) {
		const dependencyExists = this.symbolToModuleDependencies.find(
			(existingDependency) => {
				return (
					existingDependency.dependentSymbolPath ===
						dependencyData.dependentSymbolPath &&
					existingDependency.dependentSymbolIdentifier ===
						dependencyData.dependentSymbolIdentifier &&
					existingDependency.dependencyModulePath ===
						dependencyData.dependencyModulePath
				)
			},
		)
		if (dependencyExists) {
			return
		}
		this.symbolToModuleDependencies.push(dependencyData)
	}

	addModuleToSymbolDependency(dependencyData: ModuleToSymbolDependency) {
		const dependencyExists = this.moduleToSymbolDependencies.find(
			(existingDependency) => {
				return (
					existingDependency.dependentModulePath ===
						dependencyData.dependentModulePath &&
					existingDependency.dependencySymbolPath ===
						dependencyData.dependencySymbolPath &&
					existingDependency.dependencySymbolIdentifier ===
						dependencyData.dependencySymbolIdentifier
				)
			},
		)
		if (dependencyExists) {
			return
		}
		this.moduleToSymbolDependencies.push(dependencyData)
	}

	addModuleToModuleDependency(dependencyData: ModuleToModuleDependency) {
		const dependencyExists = this.moduleToModuleDependencies.find(
			(existingDependency) => {
				return (
					existingDependency.dependentModulePath ===
						dependencyData.dependentModulePath &&
					existingDependency.dependencyModulePath ===
						dependencyData.dependencyModulePath
				)
			},
		)
		if (dependencyExists) {
			return
		}
		this.moduleToModuleDependencies.push(dependencyData)
	}

	getSymbolNode(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
		return this.symbolNodes.find((symbolNode) => {
			return (
				symbolNode.symbolPath === symbolPath &&
				symbolNode.symbolIdentifier === symbolIdentifier
			)
		})
	}

	getModuleNode(modulePath: Module["modulePath"]) {
		return this.moduleNodes.find((moduleNode) => {
			return moduleNode.modulePath === modulePath
		})
	}

	getModuleDependenciesOfModule(modulePath: Module["modulePath"]) {
		return this.moduleToModuleDependencies.filter((dependency) => {
			return dependency.dependentModulePath === modulePath
		})
	}

	getModuleDependentsOfModule(modulePath: Module["modulePath"]) {
		return this.moduleToModuleDependencies.filter((dependency) => {
			return dependency.dependencyModulePath === modulePath
		})
	}

	getSymbolDependenciesOfModule(modulePath: Module["modulePath"]) {
		return this.moduleToSymbolDependencies.filter((dependency) => {
			return dependency.dependentModulePath === modulePath
		})
	}

	getSymbolDependentsOfModule(modulePath: Module["modulePath"]) {
		return this.symbolToModuleDependencies.filter((dependency) => {
			return dependency.dependencyModulePath === modulePath
		})
	}

	getModuleDependenciesOfSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
		return this.symbolToModuleDependencies.filter((dependency) => {
			return (
				dependency.dependentSymbolPath === symbolPath &&
				dependency.dependentSymbolIdentifier === symbolIdentifier
			)
		})
	}

	getModuleDependentsOfSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
		return this.moduleToSymbolDependencies.filter((dependency) => {
			return (
				dependency.dependencySymbolPath === symbolPath &&
				dependency.dependencySymbolIdentifier === symbolIdentifier
			)
		})
	}

	getSymbolDependenciesOfSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
		return this.symbolToSymbolDependencies.filter((dependency) => {
			return (
				dependency.dependentSymbolPath === symbolPath &&
				dependency.dependentSymbolIdentifier === symbolIdentifier
			)
		})
	}

	getSymbolDependentsOfSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
		return this.symbolToSymbolDependencies.filter((dependency) => {
			return (
				dependency.dependencySymbolPath === symbolPath &&
				dependency.dependencySymbolIdentifier === symbolIdentifier
			)
		})
	}

	updateSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
		symbolData: Partial<Symbol>,
	) {
		this.symbolNodes = this.symbolNodes.map((symbolNode) => {
			if (
				symbolNode.symbolPath === symbolPath &&
				symbolNode.symbolIdentifier === symbolIdentifier
			) {
				return {
					...symbolNode,
					...symbolData,
				}
			}
			return symbolNode
		})
	}

	updateModule(
		modulePath: Module["modulePath"],
		moduleData: Partial<Module>,
	) {
		this.moduleNodes = this.moduleNodes.map((moduleNode) => {
			if (moduleNode.modulePath === modulePath) {
				return {
					...moduleNode,
					...moduleData,
				}
			}
			return moduleNode
		})
	}

	deleteSymbol(
		symbolPath: Symbol["symbolPath"],
		symbolIdentifier: Symbol["symbolIdentifier"],
	) {
		this.symbolNodes = this.symbolNodes.filter((symbolNode) => {
			return (
				symbolNode.symbolPath !== symbolPath &&
				symbolNode.symbolIdentifier !== symbolIdentifier
			)
		})
		this.symbolToSymbolDependencies =
			this.symbolToSymbolDependencies.filter((dependency) => {
				return (
					dependency.dependentSymbolPath !== symbolPath &&
					dependency.dependentSymbolIdentifier !== symbolIdentifier
				)
			})
		this.symbolToModuleDependencies =
			this.symbolToModuleDependencies.filter((dependency) => {
				return (
					dependency.dependentSymbolPath !== symbolPath &&
					dependency.dependentSymbolIdentifier !== symbolIdentifier
				)
			})
	}

	deleteModule(modulePath: Module["modulePath"]) {
		this.moduleNodes = this.moduleNodes.filter((moduleNode) => {
			return moduleNode.modulePath !== modulePath
		})
		this.moduleToSymbolDependencies =
			this.moduleToSymbolDependencies.filter((dependency) => {
				return dependency.dependentModulePath !== modulePath
			})
		this.moduleToModuleDependencies =
			this.moduleToModuleDependencies.filter((dependency) => {
				return dependency.dependentModulePath !== modulePath
			})
	}
}

export const UNRESOLVED_MODULE_PREFIX = "#"
