import type { INodeProperties } from 'n8n-workflow';
import { tagLocator, unwrapData } from '../shared/descriptions';

const show = { resource: ['tag'] };

export const tagDescription: INodeProperties[] = [
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
				action: 'Create a tag',
				description: 'Add a tag to the catalogue',
				routing: { request: { method: 'POST', url: '/tags' }, output: unwrapData },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a tag',
				description: 'Delete the tag and strip it from every contact',
				routing: {
					request: { method: 'DELETE', url: '=/tags/{{$parameter.tagId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a tag',
				description: 'Get a single tag',
				routing: {
					request: { method: 'GET', url: '=/tags/{{$parameter.tagId}}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many tags',
				description: 'Get the tag catalogue',
				routing: { request: { method: 'GET', url: '/tags' }, output: unwrapData },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a tag',
				description: 'Rename or recolour a tag — a rename propagates to every contact',
				routing: {
					request: { method: 'PATCH', url: '=/tags/{{$parameter.tagId}}' },
					output: unwrapData,
				},
			},
		],
	},
	{
		...tagLocator,
		displayOptions: { show: { ...show, operation: ['get', 'update', 'delete'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the tag',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'name' } },
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		default: '#263fa3',
		description: 'Colour shown on the tag badge',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'color' } },
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
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#263fa3',
				description: 'Colour shown on the tag badge',
				routing: { send: { type: 'body', property: 'color' } },
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name — renames the tag on every contact that carries it',
				routing: { send: { type: 'body', property: 'name' } },
			},
		],
	},
];
