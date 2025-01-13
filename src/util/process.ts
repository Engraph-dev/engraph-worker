export enum StatusCode {
	OK = 0,
	UnknownError,
	BadProject,
	BadImplementation,
	BadModule,
	InvalidWorkflow,
	WorkflowError,
}

export function isStatusCode(
	statusCodeOrOther: any,
): statusCodeOrOther is StatusCode {
	return Object.values(StatusCode).includes(statusCodeOrOther)
}

export function isStatusOK(statusCodeOrOther: any) {
	if (isStatusCode(statusCodeOrOther)) {
		return statusCodeOrOther === StatusCode.OK
	}
	return true
}

export function isBadStatus(statusCodeOrOther: any) {
	if (isStatusCode(statusCodeOrOther)) {
		return statusCodeOrOther !== StatusCode.OK
	}
	return false
}
