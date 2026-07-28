import type { INodeProperties } from 'n8n-workflow';
import { automationLocator, unwrapData } from '../shared/descriptions';

const show = { resource: ['automation'] };

export const automationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		default: 'getAll',
		options: [
			{
				name: 'Enroll Contact',
				value: 'enroll',
				action: 'Enroll a contact in an automation',
				description: 'Put a contact through an active automation, without waiting for a CRM event',
				routing: {
					request: { method: 'POST', url: '=/automations/{{$parameter.automationId}}/enroll' },
					output: unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an automation',
				description: 'Get a single automation, including its flow',
				routing: {
					request: { method: 'GET', url: '=/automations/{{$parameter.automationId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many automations',
				description: 'Get many automations and their triggers',
				routing: { request: { method: 'GET', url: '/automations' }, output: unwrapData },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an automation',
				description: 'Activate, pause or rename an automation — the flow is edited in the CRM',
				routing: {
					request: { method: 'PATCH', url: '=/automations/{{$parameter.automationId}}' },
					output: unwrapData,
				},
			},
		],
	},
	{
		...automationLocator,
		displayOptions: { show: { ...show, operation: ['get', 'update', 'enroll'] } },
	},
	{
		displayName: 'Identify Contact By',
		name: 'identifyBy',
		type: 'options',
		options: [
			{ name: 'Contact ID', value: 'contact_id' },
			{ name: 'Email', value: 'email' },
		],
		default: 'contact_id',
		description: 'How to find the contact to enroll',
		displayOptions: { show: { ...show, operation: ['enroll'] } },
	},
	{
		displayName: 'Contact ID',
		name: 'enrollContactId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the contact to enroll',
		displayOptions: { show: { ...show, operation: ['enroll'], identifyBy: ['contact_id'] } },
		routing: { send: { type: 'body', property: 'contact_id' } },
	},
	{
		displayName: 'Email',
		name: 'enrollEmail',
		type: 'string',
		placeholder: 'nome@email.com',
		default: '',
		required: true,
		description: 'Email of the contact to enroll',
		displayOptions: { show: { ...show, operation: ['enroll'], identifyBy: ['email'] } },
		routing: { send: { type: 'body', property: 'email' } },
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
				displayName: 'Allow Re-Entry',
				name: 'allow_reentry',
				type: 'boolean',
				default: false,
				description: 'Whether a contact may go through the automation more than once',
				routing: { send: { type: 'body', property: 'allow_reentry' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the automation',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Active', value: 'active' },
					{ name: 'Paused', value: 'paused' },
				],
				default: 'active',
				description: 'Activating requires a valid flow, exactly as in the CRM',
				routing: { send: { type: 'body', property: 'status' } },
			},
		],
	},
];
