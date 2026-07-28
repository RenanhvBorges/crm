import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export const CREDENTIALS_NAME = 'oxfordCrmApi';

type RequestContext =
	| IExecuteFunctions
	| IExecuteSingleFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IWebhookFunctions;

/**
 * Base URL of the API, from the credential. The trailing slash is trimmed so
 * that a user pasting "https://crm.exemplo.com/" does not produce "//api/v1".
 */
export async function getApiBaseUrl(this: RequestContext): Promise<string> {
	const credentials = await this.getCredentials(CREDENTIALS_NAME);
	return `${String(credentials.baseUrl ?? '').replace(/\/+$/, '')}/api/v1`;
}

/**
 * Manual call to the API, used by the dropdowns and by the trigger node. The
 * declarative operations of the action node do not go through here — they are
 * routed by n8n itself from `requestDefaults`.
 *
 * Responses are unwrapped from the `{ data }` envelope.
 */
export async function oxfordApiRequest<T = IDataObject>(
	this: RequestContext,
	method: IHttpRequestMethods,
	resource: string,
	body?: IDataObject,
	qs: IDataObject = {},
): Promise<T> {
	const options: IHttpRequestOptions = {
		method,
		qs,
		body,
		url: `${await getApiBaseUrl.call(this)}${resource}`,
		json: true,
	};

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		CREDENTIALS_NAME,
		options,
	)) as { data: T };

	return response?.data;
}
