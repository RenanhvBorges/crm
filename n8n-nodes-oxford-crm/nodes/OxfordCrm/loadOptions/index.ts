import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { oxfordApiRequest } from '../shared/transport';

// Plain dropdowns (no search box) used inside `collection` filters, where a
// resourceLocator is not available.

export async function loadLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const lists = (await oxfordApiRequest.call(this, 'GET', '/lists', undefined, {
		limit: 200,
	})) as unknown as Array<{ id: string; name: string }>;

	return (lists ?? []).map((list) => ({ name: list.name, value: list.id }));
}

export async function loadPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const pipelines = (await oxfordApiRequest.call(this, 'GET', '/pipelines')) as unknown as Array<{
		id: string;
		name: string;
	}>;

	return (pipelines ?? []).map((pipeline) => ({ name: pipeline.name, value: pipeline.id }));
}

export async function loadStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const pipelines = (await oxfordApiRequest.call(this, 'GET', '/pipelines')) as unknown as Array<{
		name: string;
		stages: Array<{ id: string; name: string }>;
	}>;

	// Prefixed with the pipeline name because stage names repeat across funnels.
	return (pipelines ?? []).flatMap((pipeline) =>
		(pipeline.stages ?? []).map((stage) => ({
			name: `${pipeline.name} — ${stage.name}`,
			value: stage.id,
		})),
	);
}

export async function loadUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const users = (await oxfordApiRequest.call(this, 'GET', '/users')) as unknown as Array<{
		id: string;
		full_name: string | null;
		email: string;
	}>;

	return (users ?? []).map((user) => ({ name: user.full_name ?? user.email, value: user.id }));
}
