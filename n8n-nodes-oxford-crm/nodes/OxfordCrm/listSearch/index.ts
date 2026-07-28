import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { oxfordApiRequest } from '../shared/transport';

// The API caps a page at 200 items. The dropdowns fetch one page and let the
// user narrow it down by typing — enough for a picker, and it keeps the
// editor responsive on large installs.
const PAGE_SIZE = 200;

type Named = { id: string; name: string };

/** Client-side filter, for endpoints without a search parameter of their own. */
function matches(text: string, filter?: string): boolean {
	if (!filter) return true;
	return text.toLowerCase().includes(filter.toLowerCase());
}

function toResults(items: INodeListSearchItems[]): INodeListSearchResult {
	return { results: items };
}

export async function getContacts(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// /contacts has its own search, so the filter goes to the server.
	const contacts = (await oxfordApiRequest.call(this, 'GET', '/contacts', undefined, {
		limit: PAGE_SIZE,
		...(filter ? { q: filter } : {}),
	})) as unknown as Array<{ id: string; name: string; email: string | null }>;

	return toResults(
		(contacts ?? []).map((contact) => ({
			name: contact.email ? `${contact.name} (${contact.email})` : contact.name,
			value: contact.id,
		})),
	);
}

export async function getLists(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const lists = (await oxfordApiRequest.call(this, 'GET', '/lists', undefined, {
		limit: PAGE_SIZE,
	})) as unknown as Named[];

	return toResults(
		(lists ?? [])
			.filter((list) => matches(list.name, filter))
			.map((list) => ({ name: list.name, value: list.id })),
	);
}

export async function getTags(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const tags = (await oxfordApiRequest.call(this, 'GET', '/tags', undefined, {
		limit: PAGE_SIZE,
	})) as unknown as Named[];

	return toResults(
		(tags ?? [])
			.filter((tag) => matches(tag.name, filter))
			.map((tag) => ({ name: tag.name, value: tag.id })),
	);
}

/** Tag steps on a contact work by name — `contacts.tags` stores names, not IDs. */
export async function getTagNames(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const tags = (await oxfordApiRequest.call(this, 'GET', '/tags', undefined, {
		limit: PAGE_SIZE,
	})) as unknown as Named[];

	return toResults(
		(tags ?? [])
			.filter((tag) => matches(tag.name, filter))
			.map((tag) => ({ name: tag.name, value: tag.name })),
	);
}

export async function getPipelines(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const pipelines = (await oxfordApiRequest.call(
		this,
		'GET',
		'/pipelines',
	)) as unknown as Named[];

	return toResults(
		(pipelines ?? [])
			.filter((pipeline) => matches(pipeline.name, filter))
			.map((pipeline) => ({ name: pipeline.name, value: pipeline.id })),
	);
}

export async function getStages(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const pipelineId = this.getCurrentNodeParameter('pipelineId', { extractValue: true });
	const pipelines = (await oxfordApiRequest.call(this, 'GET', '/pipelines')) as unknown as Array<
		Named & { stages: Named[] }
	>;

	// With no pipeline chosen yet, offering every stage is more useful than
	// an empty list — the deal endpoints validate the pair anyway.
	const stages = pipelineId
		? (pipelines ?? []).find((pipeline) => pipeline.id === pipelineId)?.stages
		: (pipelines ?? []).flatMap((pipeline) => pipeline.stages);

	return toResults(
		(stages ?? [])
			.filter((stage) => matches(stage.name, filter))
			.map((stage) => ({ name: stage.name, value: stage.id })),
	);
}

export async function getDeals(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const deals = (await oxfordApiRequest.call(this, 'GET', '/deals', undefined, {
		limit: PAGE_SIZE,
	})) as unknown as Array<{ id: string; title: string }>;

	return toResults(
		(deals ?? [])
			.filter((deal) => matches(deal.title, filter))
			.map((deal) => ({ name: deal.title, value: deal.id })),
	);
}

export async function getTasks(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const tasks = (await oxfordApiRequest.call(this, 'GET', '/tasks', undefined, {
		limit: PAGE_SIZE,
	})) as unknown as Array<{ id: string; title: string }>;

	return toResults(
		(tasks ?? [])
			.filter((task) => matches(task.title, filter))
			.map((task) => ({ name: task.title, value: task.id })),
	);
}

export async function getAutomations(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const automations = (await oxfordApiRequest.call(this, 'GET', '/automations', undefined, {
		limit: PAGE_SIZE,
	})) as unknown as Array<Named & { status: string }>;

	return toResults(
		(automations ?? [])
			.filter((automation) => matches(automation.name, filter))
			.map((automation) => ({
				name: `${automation.name} (${automation.status})`,
				value: automation.id,
			})),
	);
}

export async function getTemplates(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const templates = (await oxfordApiRequest.call(this, 'GET', '/templates', undefined, {
		limit: PAGE_SIZE,
	})) as unknown as Named[];

	return toResults(
		(templates ?? [])
			.filter((template) => matches(template.name, filter))
			.map((template) => ({ name: template.name, value: template.id })),
	);
}

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const users = (await oxfordApiRequest.call(this, 'GET', '/users')) as unknown as Array<{
		id: string;
		full_name: string | null;
		email: string;
	}>;

	return toResults(
		(users ?? [])
			.map((user) => ({ name: user.full_name ?? user.email, value: user.id }))
			.filter((item) => matches(item.name, filter)),
	);
}

export async function getCustomFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// The key is unique per entity, so `entity` is mandatory on this endpoint.
	const entity = this.getCurrentNodeParameter('entity') ?? 'contact';
	const fields = (await oxfordApiRequest.call(this, 'GET', '/custom-fields', undefined, {
		entity,
	})) as unknown as Array<{ id: string; key: string; label: string }>;

	return toResults(
		(fields ?? [])
			.filter((field) => matches(`${field.label} ${field.key}`, filter))
			.map((field) => ({ name: `${field.label} (${field.key})`, value: field.id })),
	);
}

export async function getWebhooks(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const webhooks = (await oxfordApiRequest.call(this, 'GET', '/webhooks', undefined, {
		limit: PAGE_SIZE,
	})) as unknown as Named[];

	return toResults(
		(webhooks ?? [])
			.filter((webhook) => matches(webhook.name, filter))
			.map((webhook) => ({ name: webhook.name, value: webhook.id })),
	);
}
