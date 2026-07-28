import type { INodeProperties } from 'n8n-workflow';
import { unwrapData } from '../shared/descriptions';

// Read-only resources: pipelines, templates, campaigns and users are all
// managed inside the CRM, so the node only lists them — mostly to resolve IDs.

export const pipelineDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['pipeline'] } },
		default: 'getAll',
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many pipelines',
				description: 'Get the pipelines with their stages nested',
				routing: { request: { method: 'GET', url: '/pipelines' }, output: unwrapData },
			},
		],
	},
];

export const templateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['template'] } },
		default: 'getAll',
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many email templates',
				description: 'Get the email templates',
				routing: { request: { method: 'GET', url: '/templates' }, output: unwrapData },
			},
		],
	},
];

export const campaignDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['campaign'] } },
		default: 'getAll',
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many campaigns',
				description: 'Get the email campaigns, excluding the ones automations create',
				routing: { request: { method: 'GET', url: '/campaigns' }, output: unwrapData },
			},
		],
	},
];

export const userDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['user'] } },
		default: 'getAll',
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many users',
				description: 'Get the CRM users, to fill in the assignee of a task',
				routing: { request: { method: 'GET', url: '/users' }, output: unwrapData },
			},
		],
	},
];
