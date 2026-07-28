import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { limitProperty, returnAllProperty } from './shared/descriptions';
import { contactDescription } from './resources/contact';
import { tagDescription } from './resources/tag';
import { listDescription } from './resources/list';
import { dealDescription } from './resources/deal';
import { taskDescription } from './resources/task';
import { customFieldDescription } from './resources/customField';
import { automationDescription } from './resources/automation';
import { webhookDescription } from './resources/webhook';
import {
	campaignDescription,
	pipelineDescription,
	templateDescription,
	userDescription,
} from './resources/misc';
import {
	getAutomations,
	getContacts,
	getCustomFields,
	getDeals,
	getLists,
	getPipelines,
	getStages,
	getTagNames,
	getTags,
	getTasks,
	getTemplates,
	getUsers,
	getWebhooks,
} from './listSearch';
import { loadLists, loadPipelines, loadStages, loadUsers } from './loadOptions';

export class OxfordCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Oxford CRM',
		name: 'oxfordCrm',
		icon: { light: 'file:../../icons/oxford.svg', dark: 'file:../../icons/oxford.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read and write contacts, deals, tasks and automations in the Oxford CRM',
		defaults: { name: 'Oxford CRM' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'oxfordCrmApi', required: true }],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}/api/v1',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'contact',
				options: [
					{ name: 'Automation', value: 'automation' },
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Custom Field', value: 'customField' },
					{ name: 'Deal', value: 'deal' },
					{ name: 'List', value: 'list' },
					{ name: 'Pipeline', value: 'pipeline' },
					{ name: 'Tag', value: 'tag' },
					{ name: 'Task', value: 'task' },
					{ name: 'Template', value: 'template' },
					{ name: 'User', value: 'user' },
					{ name: 'Webhook', value: 'webhook' },
				],
			},
			...automationDescription,
			...campaignDescription,
			...contactDescription,
			...customFieldDescription,
			...dealDescription,
			...listDescription,
			...pipelineDescription,
			...tagDescription,
			...taskDescription,
			...templateDescription,
			...userDescription,
			...webhookDescription,
			// Shared by every listing, so they sit after the per-resource fields.
			returnAllProperty,
			limitProperty,
		],
	};

	methods = {
		listSearch: {
			getAutomations,
			getContacts,
			getCustomFields,
			getDeals,
			getLists,
			getPipelines,
			getStages,
			getTagNames,
			getTags,
			getTasks,
			getTemplates,
			getUsers,
			getWebhooks,
		},
		loadOptions: {
			loadLists,
			loadPipelines,
			loadStages,
			loadUsers,
		},
	};
}
