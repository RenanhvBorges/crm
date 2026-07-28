import type { INodeProperties } from 'n8n-workflow';
import { contactLocator, customFieldsProperty, unwrapData } from '../shared/descriptions';

const show = { resource: ['contact'] };

const tagsProperty: INodeProperties = {
	displayName: 'Tags',
	name: 'tags',
	type: 'string',
	typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Tag' },
	default: [],
	description: 'Tag names. Names that are not in the catalogue yet are created on the fly.',
	routing: { send: { type: 'body', property: 'tags' } },
};

export const contactDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		default: 'getAll',
		options: [
			{
				name: 'Add Tags',
				value: 'addTags',
				action: 'Add tags to a contact',
				description: 'Add tags without rewriting the ones already on the contact',
				routing: {
					request: { method: 'POST', url: '=/contacts/{{$parameter.contactId}}/tags' },
					output: unwrapData,
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a contact',
				description: 'Create a new contact',
				routing: {
					request: { method: 'POST', url: '/contacts' },
					output: unwrapData,
				},
			},
			{
				name: 'Create or Update',
				value: 'createOrUpdate',
				action: 'Create or update a contact',
				description: 'Update the contact with this email, or create it if there is none',
				routing: {
					request: { method: 'POST', url: '/contacts', qs: { upsert: 'email' } },
					output: unwrapData,
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a contact',
				description: 'Delete a contact',
				routing: {
					request: { method: 'DELETE', url: '=/contacts/{{$parameter.contactId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a contact',
				description: 'Get a single contact',
				routing: {
					request: { method: 'GET', url: '=/contacts/{{$parameter.contactId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many contacts',
				description: 'Get many contacts',
				routing: {
					request: { method: 'GET', url: '/contacts' },
					output: unwrapData,
				},
			},
			{
				name: 'Remove Tag',
				value: 'removeTag',
				action: 'Remove a tag from a contact',
				description: 'Remove a single tag from a contact',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/contacts/{{$parameter.contactId}}/tags/{{encodeURIComponent($parameter.tagName)}}',
					},
					output: unwrapData,
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a contact',
				description: 'Update an existing contact',
				routing: {
					request: { method: 'PATCH', url: '=/contacts/{{$parameter.contactId}}' },
					output: unwrapData,
				},
			},
		],
	},

	{
		...contactLocator,
		displayOptions: {
			show: { ...show, operation: ['get', 'update', 'delete', 'addTags', 'removeTag'] },
		},
	},

	// --- create / createOrUpdate ---
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the contact',
		displayOptions: { show: { ...show, operation: ['create', 'createOrUpdate'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'nome@email.com',
		default: '',
		required: true,
		description: 'Email used to find the existing contact',
		displayOptions: { show: { ...show, operation: ['createOrUpdate'] } },
		routing: { send: { type: 'body', property: 'email' } },
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
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'Company the contact works for',
				routing: { send: { type: 'body', property: 'company' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'nome@email.com',
				default: '',
				description: 'Email address of the contact',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact',
				routing: { send: { type: 'body', property: 'phone' } },
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsUpsert',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['createOrUpdate'] } },
		options: [
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'Company the contact works for',
				routing: { send: { type: 'body', property: 'company' } },
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact',
				routing: { send: { type: 'body', property: 'phone' } },
			},
		],
	},
	{
		...tagsProperty,
		displayOptions: { show: { ...show, operation: ['create', 'createOrUpdate'] } },
	},
	{
		...customFieldsProperty,
		displayOptions: { show: { ...show, operation: ['create', 'createOrUpdate', 'update'] } },
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
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'Company the contact works for',
				routing: { send: { type: 'body', property: 'company' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'nome@email.com',
				default: '',
				description: 'Email address of the contact',
				routing: { send: { type: 'body', property: 'email' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the contact',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact',
				routing: { send: { type: 'body', property: 'phone' } },
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Tag' },
				default: [],
				description:
					'Replaces the whole tag list. To add or drop a single tag without touching the others, use the Add Tags / Remove Tag operations.',
				routing: { send: { type: 'body', property: 'tags' } },
			},
		],
	},

	// --- addTags / removeTag ---
	{
		...tagsProperty,
		required: true,
		displayOptions: { show: { ...show, operation: ['addTags'] } },
	},
	{
		displayName: 'Tag Name',
		name: 'tagName',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'Tag to remove from the contact',
		displayOptions: { show: { ...show, operation: ['removeTag'] } },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a tag...',
				typeOptions: { searchListMethod: 'getTagNames', searchable: true },
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'e.g. cliente-vip',
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
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'nome@email.com',
				default: '',
				description: 'Exact email address',
				routing: { request: { qs: { email: '={{$value}}' } } },
			},
			{
				displayName: 'List Name or ID',
				name: 'list_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'loadLists' },
				default: '',
				description:
					'Only contacts in this list. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { request: { qs: { list_id: '={{$value}}' } } },
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Partial match against name, email and company',
				routing: { request: { qs: { q: '={{$value}}' } } },
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description: 'Only contacts carrying this tag',
				routing: { request: { qs: { tag: '={{$value}}' } } },
			},
		],
	},
];
