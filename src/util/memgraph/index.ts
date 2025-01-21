import type { DependencyGraph } from "@/common/depgraph"
import { UNRESOLVED_MODULE_PREFIX } from "@/common/depgraph"
import {
	MEMGRAPH_BOLT_PORT,
	MEMGRAPH_HOST,
	MEMGRAPH_ROOT_DB,
	MEMGRAPH_ROOT_PASSWORD,
	MEMGRAPH_ROOT_USER,
} from "@/util/config/memgraph"
import { WORKFLOW_CREDENTIAL_SECRET } from "@/util/config/workflow"
import { LogLevel, log } from "@/util/log"
import { StatusCode } from "@/util/process"
import { createHash } from "crypto"
import {
	type Driver,
	type RecordShape,
	Session,
	type SessionConfig,
	auth,
	driver,
} from "neo4j-driver"

export type GraphDBCredentials = {
	userName: string
	userPass: string
	dbName: string
}

export const ROOT_DB_CREDENTIALS: GraphDBCredentials = {
	userName: MEMGRAPH_ROOT_USER,
	userPass: MEMGRAPH_ROOT_PASSWORD,
	dbName: MEMGRAPH_ROOT_DB,
}

/** Defaults to root credentials */
export async function getGraphDb(
	dbCredentials: GraphDBCredentials = ROOT_DB_CREDENTIALS,
) {
	const { userName, userPass } = dbCredentials

	const dbDriver = driver(
		`bolt://${MEMGRAPH_HOST}:${MEMGRAPH_BOLT_PORT}`,
		auth.basic(userName, userPass),
	)

	return dbDriver
}

export async function queryGraphDb<
	KeyT extends PropertyKey,
	ValueT,
	T extends RecordShape = RecordShape<KeyT, ValueT>,
>(
	dbDriver: Driver,
	queryString: string,
	queryParams: any = {},
	sessionConfig?: SessionConfig,
) {
	const dbSession = dbDriver.session(sessionConfig)
	log("memgraph.query", LogLevel.Debug, queryString, queryParams)
	const result = await dbSession.run<T>(queryString, queryParams)

	await dbSession.close()

	return result.records
}

export async function createGraphDB(dbCredentials: GraphDBCredentials) {
	const rootDriver = await getGraphDb(ROOT_DB_CREDENTIALS)
	const driverInfo = await rootDriver.getServerInfo()
	log("memgraph.driver", LogLevel.Info, driverInfo)

	// Creates the user
	await queryGraphDb(
		rootDriver,
		`CREATE USER IF NOT EXISTS ${dbCredentials.userName} IDENTIFIED BY '${dbCredentials.userPass}'`,
		dbCredentials,
	)
	if (dbCredentials.dbName !== MEMGRAPH_ROOT_DB) {
		// Creates the database
		await queryGraphDb(
			rootDriver,
			`CREATE DATABASE ${dbCredentials.dbName}`,
			dbCredentials,
		)
		// Grants all privileges
		await queryGraphDb(
			rootDriver,
			`GRANT DATABASE ${dbCredentials.dbName} TO ${dbCredentials.userName}`,
			dbCredentials,
		)
		await queryGraphDb(
			rootDriver,
			`SET MAIN DATABASE ${dbCredentials.dbName} TO ${dbCredentials.userName}`,
			dbCredentials,
		)
	}

	await rootDriver.close()

	const dbDriver = await getGraphDb(dbCredentials)

	// Wipe the graph database of all nodes, detaching relationships
	await queryGraphDb(
		dbDriver,
		"MATCH (n) DETACH DELETE n",
		{},
		{ database: dbCredentials.dbName },
	)

	await dbDriver.close()
}

export function getWorkflowPassword(workflowId: string) {
	const passwordHash = createHash("sha256")
		.update(workflowId)
		.update(WORKFLOW_CREDENTIAL_SECRET)
		.digest("hex")

	return passwordHash
}

type UploadWorkflowSummaryArgs = {
	workflowId: string
	dependencyGraph: DependencyGraph
}

export async function runQueryInSession(
	dbSession: Session,
	queryString: string,
	queryOpts: Record<
		string,
		string | number | string[] | number[] | undefined
	> = {},
) {
	let debugString = queryString
	for (const objKey of Object.keys(queryOpts)) {
		const objValue = queryOpts[objKey]
		debugString = debugString.replaceAll(
			`$${objKey}`,
			objValue?.toString() ?? "",
		)
	}

	log("memgraph.query", LogLevel.Debug, debugString)

	return dbSession.run(queryString, queryOpts)
}

export async function uploadWorkflowGraph(
	args: UploadWorkflowSummaryArgs,
): Promise<StatusCode> {
	const { dependencyGraph, workflowId } = args

	const dbPassword = getWorkflowPassword(workflowId)
	// const dbCredentials: GraphDBCredentials = {
	// 	userName: workflowId,
	// 	userPass: dbPassword,
	// 	dbName: workflowId,
	// }

	const dbCredentials: GraphDBCredentials = ROOT_DB_CREDENTIALS

	const driverInstance = await getGraphDb(dbCredentials)

	// This depgraph has all summaries available

	const { moduleNodes, symbolNodes } = dependencyGraph

	const dbSession = driverInstance.session({
		database: dbCredentials.dbName,
	})

	for (const moduleNode of moduleNodes) {
		const { moduleSourceCode, modulePath, moduleEmbeddings } = moduleNode

		if (modulePath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
			const modulePathWithoutPrefix = modulePath.slice(
				UNRESOLVED_MODULE_PREFIX.length,
			)
			await runQueryInSession(
				dbSession,
				`CREATE (m:ExternalModule {modulePath: $modulePath})`,
				{
					modulePath: modulePathWithoutPrefix,
				},
			)
		} else {
			await runQueryInSession(
				dbSession,
				`CREATE (m:Module {modulePath: $modulePath, moduleSourceCode: $moduleSourceCode, moduleEmbeddings: $moduleEmbeddings})`,
				{
					modulePath: modulePath,
					moduleSourceCode: moduleSourceCode,
					moduleEmbeddings: moduleEmbeddings ?? [],
				},
			)
		}
	}

	for (const symbolNode of symbolNodes) {
		const {
			symbolSourceCode,
			symbolPath,
			symbolIdentifier,
			symbolEmbeddings,
		} = symbolNode

		if (symbolPath.startsWith(UNRESOLVED_MODULE_PREFIX)) {
			const symbolPathWithoutPrefix = symbolPath.slice(
				UNRESOLVED_MODULE_PREFIX.length,
			)
			await runQueryInSession(
				dbSession,
				`CREATE (s:ExternalSymbol {symbolIdentifier: $symbolIdentifier,symbolPath: $symbolPath})`,
				{
					symbolPath: symbolPathWithoutPrefix,
					symbolIdentifier: symbolIdentifier,
				},
			)

			// Creates a EXPORTS relationship between the module and the symbol
			await runQueryInSession(
				dbSession,
				`MATCH (m:ExternalModule {modulePath: $modulePath}), (s:ExternalSymbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}) CREATE (m)-[:EXPORTS]->(s)`,
				{
					modulePath: symbolPathWithoutPrefix,
					symbolPath: symbolPathWithoutPrefix,
					symbolIdentifier: symbolIdentifier,
				},
			)
		} else {
			await runQueryInSession(
				dbSession,
				`CREATE (s:Symbol {symbolIdentifier: $symbolIdentifier, symbolPath: $symbolPath, symbolSourceCode: $symbolSourceCode, symbolEmbeddings: $symbolEmbeddings})`,
				{
					symbolPath: symbolPath,
					symbolSourceCode: symbolSourceCode,
					symbolIdentifier: symbolIdentifier,
					symbolEmbeddings: symbolEmbeddings,
				},
			)

			// Creates a EXPORTS relationship between the module and the symbol
			await runQueryInSession(
				dbSession,
				`MATCH (m:Module {modulePath: $modulePath}), (s:Symbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}) CREATE (m)-[:EXPORTS]->(s)`,
				{
					modulePath: symbolPath,
					symbolPath: symbolPath,
					symbolIdentifier: symbolIdentifier,
				},
			)
		}
	}

	const {
		moduleToModuleDependencies,
		moduleToSymbolDependencies,
		symbolToSymbolDependencies,
		symbolToModuleDependencies,
	} = dependencyGraph

	for (const moduleToModuleDependency of moduleToModuleDependencies) {
		const { dependencyModulePath, dependentModulePath } =
			moduleToModuleDependency

		const isDependencyExternal = dependencyModulePath.startsWith(
			UNRESOLVED_MODULE_PREFIX,
		)
		const isDependentExternal = dependentModulePath.startsWith(
			UNRESOLVED_MODULE_PREFIX,
		)
		const dependencyModulePathWithoutPrefix = dependencyModulePath.slice(
			UNRESOLVED_MODULE_PREFIX.length,
		)
		const dependentModulePathWithoutPrefix = dependentModulePath.slice(
			UNRESOLVED_MODULE_PREFIX.length,
		)

		if (isDependencyExternal && isDependentExternal) {
			// ExternalModule depends on ExternalModule
			await runQueryInSession(
				dbSession,
				`MATCH (m1:ExternalModule {modulePath: $dependentModulePath}), (m2:ExternalModule {modulePath: $dependencyModulePath}) CREATE (m1)-[:DEPENDS_ON]->(m2)`,
				{
					dependentModulePath: dependentModulePathWithoutPrefix,
					dependencyModulePath: dependencyModulePathWithoutPrefix,
				},
			)
		} else if (isDependencyExternal && !isDependentExternal) {
			// Module depends on ExternalModule
			await runQueryInSession(
				dbSession,
				`MATCH (m1:Module {modulePath: $dependentModulePath}), (m2:ExternalModule {modulePath: $dependencyModulePath}) CREATE (m1)-[:DEPENDS_ON]->(m2)`,
				{
					dependentModulePath: dependentModulePath,
					dependencyModulePath: dependencyModulePathWithoutPrefix,
				},
			)
		} else if (!isDependencyExternal && isDependentExternal) {
			// ExternalModule depends on Module
			await runQueryInSession(
				dbSession,
				`MATCH (m1:ExternalModule {modulePath: $dependentModulePath}), (m2:Module {modulePath: $dependencyModulePath}) CREATE (m1)-[:DEPENDS_ON]->(m2)`,
				{
					dependentModulePath: dependentModulePathWithoutPrefix,
					dependencyModulePath: dependencyModulePath,
				},
			)
		} else {
			// Module depends on Module
			await runQueryInSession(
				dbSession,
				`MATCH (m1:Module {modulePath: $dependentModulePath}), (m2:Module {modulePath: $dependencyModulePath}) CREATE (m1)-[:DEPENDS_ON]->(m2)`,
				{
					dependentModulePath: dependentModulePath,
					dependencyModulePath: dependencyModulePath,
				},
			)
		}
	}

	for (const moduleToSymbolDependency of moduleToSymbolDependencies) {
		const {
			dependencySymbolIdentifier,
			dependencySymbolPath,
			dependentModulePath,
		} = moduleToSymbolDependency

		const isModuleExternal = dependentModulePath.startsWith(
			UNRESOLVED_MODULE_PREFIX,
		)
		const isSymbolExternal = dependencySymbolPath.startsWith(
			UNRESOLVED_MODULE_PREFIX,
		)
		const modulePathWithoutPrefix = dependentModulePath.slice(
			UNRESOLVED_MODULE_PREFIX.length,
		)
		const symbolPathWithoutPrefix = dependencySymbolPath.slice(
			UNRESOLVED_MODULE_PREFIX.length,
		)

		if (isModuleExternal && isSymbolExternal) {
			// ExternalModule depends on ExternalSymbol
			await runQueryInSession(
				dbSession,
				`MATCH (m:ExternalModule {modulePath: $modulePath}), (s:ExternalSymbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}) CREATE (m)-[:DEPENDS_ON]->(s)`,
				{
					modulePath: modulePathWithoutPrefix,
					symbolPath: symbolPathWithoutPrefix,
					symbolIdentifier: dependencySymbolIdentifier,
				},
			)
		} else if (!isModuleExternal && isSymbolExternal) {
			// Module depends on ExternalSymbol
			await runQueryInSession(
				dbSession,
				`MATCH (m:Module {modulePath: $modulePath}), (s:ExternalSymbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}) CREATE (m)-[:DEPENDS_ON]->(s)`,
				{
					modulePath: dependentModulePath,
					symbolPath: symbolPathWithoutPrefix,
					symbolIdentifier: dependencySymbolIdentifier,
				},
			)
		} else if (isModuleExternal && !isSymbolExternal) {
			// ExternalModule depends on Symbol
			await runQueryInSession(
				dbSession,
				`MATCH (m:ExternalModule {modulePath: $modulePath}), (s:Symbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}) CREATE (m)-[:DEPENDS_ON]->(s)`,
				{
					modulePath: modulePathWithoutPrefix,
					symbolPath: dependencySymbolPath,
					symbolIdentifier: dependencySymbolIdentifier,
				},
			)
		} else {
			// Module depends on Symbol
			await runQueryInSession(
				dbSession,
				`MATCH (m:Module {modulePath: $modulePath}), (s:Symbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}) CREATE (m)-[:DEPENDS_ON]->(s)`,
				{
					modulePath: dependentModulePath,
					symbolPath: dependencySymbolPath,
					symbolIdentifier: dependencySymbolIdentifier,
				},
			)
		}
	}

	for (const symbolToSymbolDependency of symbolToSymbolDependencies) {
		const {
			dependencySymbolIdentifier,
			dependencySymbolPath,
			dependentSymbolIdentifier,
			dependentSymbolPath,
		} = symbolToSymbolDependency

		const isDependencyExternal = dependencySymbolPath.startsWith(
			UNRESOLVED_MODULE_PREFIX,
		)
		const isDependentExternal = dependentSymbolPath.startsWith(
			UNRESOLVED_MODULE_PREFIX,
		)

		const dependencySymbolPathWithoutPrefix = dependencySymbolPath.slice(
			UNRESOLVED_MODULE_PREFIX.length,
		)
		const dependentSymbolPathWithoutPrefix = dependentSymbolPath.slice(
			UNRESOLVED_MODULE_PREFIX.length,
		)

		if (isDependentExternal && isDependencyExternal) {
			// ExternalSymbol depends on ExternalSymbol
			await runQueryInSession(
				dbSession,
				`MATCH (s1:ExternalSymbol {symbolPath: $dependentSymbolPath, symbolIdentifier: $dependentSymbolIdentifier}), (s2:ExternalSymbol {symbolPath: $dependencySymbolPath, symbolIdentifier: $dependencySymbolIdentifier}) CREATE (s1)-[:DEPENDS_ON]->(s2)`,
				{
					dependentSymbolPath: dependentSymbolPathWithoutPrefix,
					dependentSymbolIdentifier: dependentSymbolIdentifier,
					dependencySymbolPath: dependencySymbolPathWithoutPrefix,
					dependencySymbolIdentifier: dependencySymbolIdentifier,
				},
			)
		} else if (!isDependentExternal && isDependencyExternal) {
			// Symbol depends on ExternalSymbol
			await runQueryInSession(
				dbSession,
				`MATCH (s1:Symbol {symbolPath: $dependentSymbolPath, symbolIdentifier: $dependentSymbolIdentifier}), (s2:ExternalSymbol {symbolPath: $dependencySymbolPath, symbolIdentifier: $dependencySymbolIdentifier}) CREATE (s1)-[:DEPENDS_ON]->(s2)`,
				{
					dependentSymbolPath: dependentSymbolPath,
					dependentSymbolIdentifier: dependentSymbolIdentifier,
					dependencySymbolPath: dependencySymbolPathWithoutPrefix,
					dependencySymbolIdentifier: dependencySymbolIdentifier,
				},
			)
		} else if (!isDependentExternal && isDependencyExternal) {
			// ExternalSymbol depends on Symbol
			await runQueryInSession(
				dbSession,
				`MATCH (s1:ExternalSymbol {symbolPath: $dependentSymbolPath, symbolIdentifier: $dependentSymbolIdentifier}), (s2:Symbol {symbolPath: $dependencySymbolPath, symbolIdentifier: $dependencySymbolIdentifier}) CREATE (s1)-[:DEPENDS_ON]->(s2)`,
				{
					dependentSymbolPath: dependentSymbolPathWithoutPrefix,
					dependentSymbolIdentifier: dependentSymbolIdentifier,
					dependencySymbolPath: dependencySymbolPath,
					dependencySymbolIdentifier: dependencySymbolIdentifier,
				},
			)
		} else {
			// Symbol depends on Symbol
			await runQueryInSession(
				dbSession,
				`MATCH (s1:Symbol {symbolPath: $dependentSymbolPath, symbolIdentifier: $dependentSymbolIdentifier}), (s2:Symbol {symbolPath: $dependencySymbolPath, symbolIdentifier: $dependencySymbolIdentifier}) CREATE (s1)-[:DEPENDS_ON]->(s2)`,
				{
					dependentSymbolPath: dependentSymbolPath,
					dependentSymbolIdentifier: dependentSymbolIdentifier,
					dependencySymbolPath: dependencySymbolPath,
					dependencySymbolIdentifier: dependencySymbolIdentifier,
				},
			)
		}
	}

	for (const symbolToModuleDependency of symbolToModuleDependencies) {
		const {
			dependencyModulePath,
			dependentSymbolIdentifier,
			dependentSymbolPath,
		} = symbolToModuleDependency

		const isModuleExternal = dependencyModulePath.startsWith(
			UNRESOLVED_MODULE_PREFIX,
		)
		const isSymbolExternal = dependentSymbolPath.startsWith(
			UNRESOLVED_MODULE_PREFIX,
		)

		const modulePathWithoutPrefix = dependencyModulePath.slice(
			UNRESOLVED_MODULE_PREFIX.length,
		)

		const symbolPathWithoutPrefix = dependentSymbolPath.slice(
			UNRESOLVED_MODULE_PREFIX.length,
		)

		if (isSymbolExternal && isModuleExternal) {
			// ExternalSymbol depends on ExternalModule
			await runQueryInSession(
				dbSession,
				`MATCH (s:ExternalSymbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}), (m:ExternalModule {modulePath: $modulePath}) CREATE (s)-[:DEPENDS_ON]->(m)`,
				{
					symbolPath: symbolPathWithoutPrefix,
					symbolIdentifier: dependentSymbolIdentifier,
					modulePath: modulePathWithoutPrefix,
				},
			)
		} else if (!isSymbolExternal && isModuleExternal) {
			// Symbol depends on ExternalModule
			await runQueryInSession(
				dbSession,
				`MATCH (s:Symbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}), (m:ExternalModule {modulePath: $modulePath}) CREATE (s)-[:DEPENDS_ON]->(m)`,
				{
					symbolPath: dependentSymbolPath,
					symbolIdentifier: dependentSymbolIdentifier,
					modulePath: modulePathWithoutPrefix,
				},
			)
		} else if (isSymbolExternal && !isModuleExternal) {
			// ExternalSymbol depends on Module
			await runQueryInSession(
				dbSession,
				`MATCH (s:ExternalSymbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}), (m:Module {modulePath: $modulePath}) CREATE (s)-[:DEPENDS_ON]->(m)`,
				{
					symbolPath: symbolPathWithoutPrefix,
					symbolIdentifier: dependentSymbolIdentifier,
					modulePath: dependencyModulePath,
				},
			)
		} else {
			// Symbol depends on Module
			await runQueryInSession(
				dbSession,
				`MATCH (s:Symbol {symbolPath: $symbolPath, symbolIdentifier: $symbolIdentifier}), (m:Module {modulePath: $modulePath}) CREATE (s)-[:DEPENDS_ON]->(m)`,
				{
					symbolPath: dependentSymbolPath,
					symbolIdentifier: dependentSymbolIdentifier,
					modulePath: dependencyModulePath,
				},
			)
		}
	}

	await dbSession.close()

	await driverInstance.close()

	return StatusCode.OK
}
