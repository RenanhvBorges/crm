import type { INodeProperties, INodeRequestOutput } from 'n8n-workflow';

/**
 * Every v1 endpoint answers with `{ data }` (plus `meta` on listings), so all
 * operations strip that envelope before the item reaches the next node.
 */
export const unwrapData: INodeRequestOutput = {
	postReceive: [
		{
			type: 'rootProperty',
			properties: { property: 'data' },
		},
	],
};

// Endpoints that answer with the whole collection at once — no limit/offset.
const unpaginatedResources = ['pipeline', 'user', 'customField'];

export const returnAllProperty: INodeProperties = {
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	default: false,
	description: 'Whether to return all results or only up to a given limit',
	displayOptions: {
		show: { operation: ['getAll', 'getMembers'] },
		hide: { resource: unpaginatedResources },
	},
	routing: {
		send: { paginate: '={{ $value }}' },
		operations: {
			pagination: {
				type: 'offset',
				properties: {
					limitParameter: 'limit',
					offsetParameter: 'offset',
					pageSize: 200,
					rootProperty: 'data',
					type: 'query',
				},
			},
		},
	},
};

export const limitProperty: INodeProperties = {
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	typeOptions: { minValue: 1, maxValue: 200 },
	default: 50,
	description: 'Max number of results to return',
	displayOptions: {
		show: { operation: ['getAll', 'getMembers'], returnAll: [false] },
		hide: { resource: unpaginatedResources },
	},
	routing: {
		send: { type: 'query', property: 'limit' },
		output: { maxResults: '={{$value}}' },
	},
};

/**
 * Custom fields are dynamic per install (`custom_field_definitions.key`), so
 * they are typed as free key/value pairs rather than fixed inputs.
 */
export const customFieldsProperty: INodeProperties = {
	displayName: 'Custom Fields',
	name: 'customFields',
	placeholder: 'Add Custom Field',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	default: {},
	description: 'Values for the custom fields configured in the CRM',
	options: [
		{
			displayName: 'Field',
			name: 'field',
			values: [
				{
					displayName: 'Key',
					name: 'key',
					type: 'string',
					default: '',
					description: 'Key of the custom field, as configured in the CRM',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					description: 'Value to store in the field',
				},
			],
		},
	],
	routing: {
		send: {
			type: 'body',
			property: 'custom_fields',
			value:
				'={{ Object.fromEntries(($value.field ?? []).map((f) => [f.key, f.value])) }}',
		},
	},
};

export const contactLocator: INodeProperties = {
	displayName: 'Contact',
	name: 'contactId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Contact to act on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a contact...',
			typeOptions: { searchListMethod: 'getContacts', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

export const listLocator: INodeProperties = {
	displayName: 'List',
	name: 'listId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Contact list to act on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a list...',
			typeOptions: { searchListMethod: 'getLists', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

export const dealLocator: INodeProperties = {
	displayName: 'Deal',
	name: 'dealId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Deal to act on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a deal...',
			typeOptions: { searchListMethod: 'getDeals', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

export const taskLocator: INodeProperties = {
	displayName: 'Task',
	name: 'taskId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Task to act on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a task...',
			typeOptions: { searchListMethod: 'getTasks', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

export const automationLocator: INodeProperties = {
	displayName: 'Automation',
	name: 'automationId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Automation to act on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select an automation...',
			typeOptions: { searchListMethod: 'getAutomations', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

export const pipelineLocator: INodeProperties = {
	displayName: 'Pipeline',
	name: 'pipelineId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Pipeline the deal belongs to',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a pipeline...',
			typeOptions: { searchListMethod: 'getPipelines', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

/** Depends on the pipeline chosen above — `getStages` reads that parameter. */
export const stageLocator: INodeProperties = {
	displayName: 'Stage',
	name: 'stageId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Stage within the chosen pipeline',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a stage...',
			typeOptions: { searchListMethod: 'getStages', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

export const tagLocator: INodeProperties = {
	displayName: 'Tag',
	name: 'tagId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Tag in the catalogue',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a tag...',
			typeOptions: { searchListMethod: 'getTags', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

export const customFieldLocator: INodeProperties = {
	displayName: 'Custom Field',
	name: 'fieldId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Custom field definition to act on',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a field...',
			typeOptions: { searchListMethod: 'getCustomFields', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};

export const webhookLocator: INodeProperties = {
	displayName: 'Webhook',
	name: 'webhookId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Outbound webhook subscription',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a webhook...',
			typeOptions: { searchListMethod: 'getWebhooks', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 3f2a…',
		},
	],
};
