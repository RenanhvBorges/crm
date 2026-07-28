import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OxfordCrmApi implements ICredentialType {
	name = 'oxfordCrmApi';

	displayName = 'Oxford CRM API';

	icon: Icon = { light: 'file:../icons/oxford.svg', dark: 'file:../icons/oxford.dark.svg' };

	documentationUrl =
		'https://github.com/RenanhvBorges/crm/tree/main/n8n-nodes-oxford-crm#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://crm-iota-one-32.vercel.app',
			placeholder: 'https://crm.suaempresa.com',
			description: 'Address of the CRM, with no trailing slash and no /api/v1 suffix',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'oxk_...',
			description: 'Key generated in the CRM under Configurações → API',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// Cheapest authenticated endpoint: it returns the pipelines and nothing
	// else, so a green check really means "this key works".
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/pipelines',
			method: 'GET',
		},
	};
}
