import type { INodeProperties } from 'n8n-workflow';
import { unwrapData, webhookLocator } from '../shared/descriptions';
import { EVENT_OPTIONS } from '../shared/events';

const show = { resource: ['webhook'] };

// For the usual case — receiving CRM events in a workflow — use the Oxford
// CRM Trigger node, which registers and removes the subscription on its own.
// This resource is for managing subscriptions that point somewhere else.
export const webhookDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		default: 'getAll',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a webhook subscription',
				description: 'Subscribe a URL to CRM events; the response includes the signing secret',
				routing: { request: { method: 'POST', url: '/webhooks' }, output: unwrapData },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a webhook subscription',
				description: 'Delete a webhook subscription',
				routing: {
					request: { method: 'DELETE', url: '=/webhooks/{{$parameter.webhookId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a webhook subscription',
				description: 'Get a single webhook subscription',
				routing: {
					request: { method: 'GET', url: '=/webhooks/{{$parameter.webhookId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many webhook subscriptions',
				description: 'Get many webhook subscriptions',
				routing: { request: { method: 'GET', url: '/webhooks' }, output: unwrapData },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a webhook subscription',
				description: 'Change the URL, the events or the active state',
				routing: {
					request: { method: 'PATCH', url: '=/webhooks/{{$parameter.webhookId}}' },
					output: unwrapData,
				},
			},
		],
	},
	{
		...webhookLocator,
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'Label shown in the CRM webhooks screen',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://exemplo.com/hook',
		description: 'Address the CRM posts the events to',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'url' } },
	},
	{
		displayName: 'Events',
		name: 'events',
		type: 'multiOptions',
		options: EVENT_OPTIONS,
		default: ['*'],
		required: true,
		description: 'Events this subscription receives',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'events' } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: [
			{
				displayName: 'Active',
				name: 'is_active',
				type: 'boolean',
				default: true,
				description: 'Whether the subscription receives deliveries',
				routing: { send: { type: 'body', property: 'is_active' } },
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: EVENT_OPTIONS,
				default: ['*'],
				description: 'Events this subscription receives',
				routing: { send: { type: 'body', property: 'events' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Label shown in the CRM webhooks screen',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'Address the CRM posts the events to',
				routing: { send: { type: 'body', property: 'url' } },
			},
		],
	},
];
