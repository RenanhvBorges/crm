import type { INodeProperties } from 'n8n-workflow';
import { contactLocator, listLocator, unwrapData } from '../shared/descriptions';

const show = { resource: ['list'] };

export const listDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		default: 'getAll',
		options: [
			{
				name: 'Add Contacts',
				value: 'addContacts',
				action: 'Add contacts to a list',
				description: 'Add one or more contacts; the ones already there are ignored',
				routing: {
					request: { method: 'POST', url: '=/lists/{{$parameter.listId}}/members' },
					output: unwrapData,
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a list',
				description: 'Create a static contact list',
				routing: { request: { method: 'POST', url: '/lists' }, output: unwrapData },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a list',
				description: 'Delete a list (the contacts themselves are kept)',
				routing: {
					request: { method: 'DELETE', url: '=/lists/{{$parameter.listId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a list',
				description: 'Get a single list, including its member count',
				routing: {
					request: { method: 'GET', url: '=/lists/{{$parameter.listId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many lists',
				description: 'Get many lists',
				routing: { request: { method: 'GET', url: '/lists' }, output: unwrapData },
			},
			{
				name: 'Get Members',
				value: 'getMembers',
				action: 'Get the members of a list',
				description: 'Get the contacts in a list',
				routing: {
					request: { method: 'GET', url: '=/lists/{{$parameter.listId}}/members' },
					output: unwrapData,
				},
			},
			{
				name: 'Remove Contact',
				value: 'removeContact',
				action: 'Remove a contact from a list',
				description: 'Remove a single contact from a list',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/lists/{{$parameter.listId}}/members/{{$parameter.contactId}}',
					},
					output: unwrapData,
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a list',
				description: 'Rename a list or change its description',
				routing: {
					request: { method: 'PATCH', url: '=/lists/{{$parameter.listId}}' },
					output: unwrapData,
				},
			},
		],
	},
	{
		...listLocator,
		displayOptions: {
			show: {
				...show,
				operation: [
					'get',
					'update',
					'delete',
					'addContacts',
					'removeContact',
					'getMembers',
				],
			},
		},
	},
	{
		...contactLocator,
		displayOptions: { show: { ...show, operation: ['removeContact'] } },
	},
	{
		displayName: 'Contact IDs',
		name: 'contactIds',
		type: 'string',
		typeOptions: { multipleValues: true, multipleValueButtonText: 'Add Contact' },
		default: [],
		required: true,
		description: 'IDs of the contacts to add to the list',
		displayOptions: { show: { ...show, operation: ['addContacts'] } },
		routing: { send: { type: 'body', property: 'contact_ids' } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the list',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'What this list is for',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'description' } },
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'What this list is for',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the list',
				routing: { send: { type: 'body', property: 'name' } },
			},
		],
	},
];
