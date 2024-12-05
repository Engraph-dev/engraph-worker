export enum StatusCode {
	OK = 0,
	UnknownError = 1,
	BadProject = 2,
	BadImplementation = 3,
	BadModule = 4,
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
