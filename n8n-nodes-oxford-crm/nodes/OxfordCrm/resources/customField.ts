import type { INodeProperties } from 'n8n-workflow';
import { customFieldLocator, unwrapData } from '../shared/descriptions';

const show = { resource: ['customField'] };

const entityOptions = [
	{ name: 'Contact', value: 'contact' },
	{ name: 'Deal', value: 'deal' },
];

// Matches the inputs rendered by custom-field-input.tsx in the CRM.
const fieldTypeOptions = [
	{ name: 'Checkbox', value: 'checkbox' },
	{ name: 'Date', value: 'date' },
	{ name: 'Number', value: 'number' },
	{ name: 'Select', value: 'select' },
	{ name: 'Text', value: 'text' },
	{ name: 'Textarea', value: 'textarea' },
];

export const customFieldDescription: INodeProperties[] = [
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
				action: 'Create a custom field',
				description: 'Define a new custom field for contacts or deals',
				routing: { request: { method: 'POST', url: '/custom-fields' }, output: unwrapData },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a custom field',
				description: 'Delete a custom field definition',
				routing: {
					request: { method: 'DELETE', url: '=/custom-fields/{{$parameter.fieldId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a custom field',
				description: 'Get a single custom field definition',
				routing: {
					request: { method: 'GET', url: '=/custom-fields/{{$parameter.fieldId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many custom fields',
				description: 'Get the custom fields of one entity',
				routing: { request: { method: 'GET', url: '/custom-fields' }, output: unwrapData },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a custom field',
				description: 'Update a custom field definition (the entity cannot be changed)',
				routing: {
					request: { method: 'PATCH', url: '=/custom-fields/{{$parameter.fieldId}}' },
					output: unwrapData,
				},
			},
		],
	},
	{
		displayName: 'Entity',
		name: 'entity',
		type: 'options',
		options: entityOptions,
		default: 'contact',
		required: true,
		description: 'Whether the field belongs to contacts or to deals',
		displayOptions: { show: { ...show, operation: ['getAll', 'create', 'get', 'update', 'delete'] } },
		routing: {
			send: { type: 'body', property: 'entity' },
			request: { qs: { entity: '={{$value}}' } },
		},
	},
	{
		...customFieldLocator,
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		default: '',
		required: true,
		description: 'Identifier used inside custom_fields — unique per entity',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'key' } },
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		default: '',
		required: true,
		description: 'Name shown in the CRM forms',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'label' } },
	},
	{
		displayName: 'Field Type',
		name: 'fieldType',
		type: 'options',
		options: fieldTypeOptions,
		default: 'text',
		description: 'Input rendered for this field',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'field_type' } },
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
				displayName: 'Field Type',
				name: 'field_type',
				type: 'options',
				options: fieldTypeOptions,
				default: 'text',
				description: 'Input rendered for this field',
				routing: { send: { type: 'body', property: 'field_type' } },
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				default: '',
				description:
					'Identifier used inside custom_fields. Changing it orphans values already stored under the old key.',
				routing: { send: { type: 'body', property: 'key' } },
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'Name shown in the CRM forms',
				routing: { send: { type: 'body', property: 'label' } },
			},
			{
				displayName: 'Required',
				name: 'is_required',
				type: 'boolean',
				default: false,
				description: 'Whether the field has to be filled in',
				routing: { send: { type: 'body', property: 'is_required' } },
			},
		],
	},
];
