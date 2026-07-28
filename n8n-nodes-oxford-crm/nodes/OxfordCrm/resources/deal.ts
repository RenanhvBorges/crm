import type { INodeProperties } from 'n8n-workflow';
import {
	customFieldsProperty,
	dealLocator,
	pipelineLocator,
	stageLocator,
	unwrapData,
} from '../shared/descriptions';

const show = { resource: ['deal'] };

const statusOptions = [
	{ name: 'Open', value: 'open' },
	{ name: 'Won', value: 'won' },
	{ name: 'Lost', value: 'lost' },
];

export const dealDescription: INodeProperties[] = [
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
				action: 'Create a deal',
				description: 'Create a new deal in a pipeline stage',
				routing: { request: { method: 'POST', url: '/deals' }, output: unwrapData },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a deal',
				description: 'Delete a deal',
				routing: {
					request: { method: 'DELETE', url: '=/deals/{{$parameter.dealId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a deal',
				description: 'Get a single deal',
				routing: {
					request: { method: 'GET', url: '=/deals/{{$parameter.dealId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many deals',
				description: 'Get many deals',
				routing: { request: { method: 'GET', url: '/deals' }, output: unwrapData },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a deal',
				description: 'Move a deal, change its value or close it as won or lost',
				routing: {
					request: { method: 'PATCH', url: '=/deals/{{$parameter.dealId}}' },
					output: unwrapData,
				},
			},
		],
	},
	{
		...dealLocator,
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},

	// --- create ---
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'Title of the deal',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'title' } },
	},
	{
		...pipelineLocator,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'pipeline_id' } },
	},
	{
		...stageLocator,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'stage_id' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Contact ID',
				name: 'contact_id',
				type: 'string',
				default: '',
				description: 'Contact this deal belongs to',
				routing: { send: { type: 'body', property: 'contact_id' } },
			},
			{
				displayName: 'Expected Close Date',
				name: 'expected_close_date',
				type: 'dateTime',
				default: '',
				description: 'When the deal is expected to close',
				routing: { send: { type: 'body', property: 'expected_close_date' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: statusOptions,
				default: 'open',
				description: 'Whether the deal is open, won or lost',
				routing: { send: { type: 'body', property: 'status' } },
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				default: 0,
				description: 'Monetary value of the deal',
				routing: { send: { type: 'body', property: 'value' } },
			},
		],
	},
	{
		...customFieldsProperty,
		displayOptions: { show: { ...show, operation: ['create', 'update'] } },
	},

	// --- update ---
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['update'] } },
		options: [
			{
				displayName: 'Contact ID',
				name: 'contact_id',
				type: 'string',
				default: '',
				description: 'Contact this deal belongs to',
				routing: { send: { type: 'body', property: 'contact_id' } },
			},
			{
				displayName: 'Expected Close Date',
				name: 'expected_close_date',
				type: 'dateTime',
				default: '',
				description: 'When the deal is expected to close',
				routing: { send: { type: 'body', property: 'expected_close_date' } },
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipeline_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'loadPipelines' },
				default: '',
				description:
					'Pipeline to move the deal to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'pipeline_id' } },
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stage_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'loadStages' },
				default: '',
				description:
					'Stage to move the deal to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'body', property: 'stage_id' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: statusOptions,
				default: 'open',
				description: 'Won or lost also fills in the closing date',
				routing: { send: { type: 'body', property: 'status' } },
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the deal',
				routing: { send: { type: 'body', property: 'title' } },
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				default: 0,
				description: 'Monetary value of the deal',
				routing: { send: { type: 'body', property: 'value' } },
			},
		],
	},

	// --- getAll ---
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Contact ID',
				name: 'contact_id',
				type: 'string',
				default: '',
				description: 'Only deals of this contact',
				routing: { request: { qs: { contact_id: '={{$value}}' } } },
			},
			{
				displayName: 'Pipeline Name or ID',
				name: 'pipeline_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'loadPipelines' },
				default: '',
				description:
					'Only deals in this pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { request: { qs: { pipeline_id: '={{$value}}' } } },
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stage_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'loadStages' },
				default: '',
				description:
					'Only deals in this stage. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { request: { qs: { stage_id: '={{$value}}' } } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: statusOptions,
				default: 'open',
				description: 'Only deals with this status',
				routing: { request: { qs: { status: '={{$value}}' } } },
			},
		],
	},
];
