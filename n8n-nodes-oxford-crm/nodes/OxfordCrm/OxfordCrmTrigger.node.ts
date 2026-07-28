import { createHmac, timingSafeEqual } from 'crypto';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { EVENT_OPTIONS } from './shared/events';
import { oxfordApiRequest } from './shared/transport';

type Subscription = {
	id: string;
	url: string;
	secret: string;
	events: string[];
	is_active: boolean;
};

// The CRM signs `timestamp + "." + body`. Anything older than this is refused,
// so a captured delivery cannot be replayed later.
const MAX_SIGNATURE_AGE_SECONDS = 300;

function sameEvents(a: string[], b: string[]): boolean {
	return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export class OxfordCrmTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Oxford CRM Trigger',
		name: 'oxfordCrmTrigger',
		icon: { light: 'file:../../icons/oxford.svg', dark: 'file:../../icons/oxford.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when something happens in the Oxford CRM',
		defaults: { name: 'Oxford CRM Trigger' },
		// Required by the community-node lint rules. It has no practical effect
		// on a trigger — an AI agent has no input to call it through.
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'oxfordCrmApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: EVENT_OPTIONS,
				default: [],
				required: true,
				description: 'Events that start this workflow',
			},
			{
				displayName: 'Verify Signature',
				name: 'verifySignature',
				type: 'boolean',
				default: true,
				description:
					'Whether to check the X-Oxford-Signature header before running the workflow. Leave it on unless you are replaying deliveries by hand.',
			},
		],
	};

	// n8n manages the subscription in the CRM: it is created when the workflow
	// is activated and removed when it is deactivated.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;
				if (!webhookId) return false;

				let existing: Subscription;
				try {
					existing = (await oxfordApiRequest.call(
						this,
						'GET',
						`/webhooks/${webhookId}`,
					)) as unknown as Subscription;
				} catch {
					// Deleted in the CRM — forget it so `create` runs again.
					delete staticData.webhookId;
					delete staticData.webhookSecret;
					return false;
				}

				const events = this.getNodeParameter('events') as string[];
				const url = this.getNodeWebhookUrl('default') as string;

				// The subscription drifts whenever the workflow URL changes or the
				// user edits the event list. Patching it keeps a single
				// subscription instead of leaking an orphan on every change.
				if (
					existing.url !== url ||
					!sameEvents(existing.events, events) ||
					!existing.is_active
				) {
					await oxfordApiRequest.call(this, 'PATCH', `/webhooks/${webhookId}`, {
						url,
						events,
						is_active: true,
					});
				}

				staticData.webhookSecret = existing.secret;
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string[];
				const url = this.getNodeWebhookUrl('default') as string;
				const workflowName = this.getWorkflow().name ?? 'sem nome';

				const created = (await oxfordApiRequest.call(this, 'POST', '/webhooks', {
					name: `n8n — ${workflowName}`,
					url,
					events,
				})) as unknown as Subscription;

				// The secret is only returned here; it is what the signature check
				// below uses, so it has to survive in the workflow static data.
				staticData.webhookId = created.id;
				staticData.webhookSecret = created.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;
				if (!webhookId) return true;

				try {
					await oxfordApiRequest.call(this, 'DELETE', `/webhooks/${webhookId}`);
				} catch {
					// Already gone, or the CRM is unreachable: dropping the local
					// reference is still the right move — a stale ID would block
					// the next activation.
				}

				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();

		if (this.getNodeParameter('verifySignature', true) as boolean) {
			const problem = verifySignature.call(this);
			if (problem) {
				// Answer 401 and start nothing. Returning an error instead would
				// make the CRM retry a delivery that can never be accepted.
				const response = this.getResponseObject();
				response.status(401).json({ error: problem });
				return { noWebhookResponse: true };
			}
		}

		return { workflowData: [this.helpers.returnJsonArray(body as IDataObject)] };
	}
}

/** Returns null when the delivery is authentic, or the reason why it is not. */
function verifySignature(this: IWebhookFunctions): string | null {
	const staticData = this.getWorkflowStaticData('node');
	const secret = staticData.webhookSecret as string | undefined;
	if (!secret) {
		throw new NodeOperationError(
			this.getNode(),
			'Assinatura não pôde ser verificada: o segredo do webhook não está salvo. Desative e reative o workflow para recriar a assinatura no CRM.',
		);
	}

	const headers = this.getHeaderData() as Record<string, string | undefined>;
	const signature = headers['x-oxford-signature'];
	const timestamp = headers['x-oxford-timestamp'];
	if (!signature || !timestamp) return 'Assinatura ausente.';

	const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
	if (!Number.isFinite(age) || age > MAX_SIGNATURE_AGE_SECONDS) {
		return 'Assinatura expirada.';
	}

	// The HMAC covers the bytes as they were sent — re-serialising the parsed
	// body would reorder keys and change the digest.
	const request = this.getRequestObject();
	const rawBody = request.rawBody?.toString('utf8');
	if (!rawBody) return 'Corpo bruto indisponível para verificar a assinatura.';

	const expected = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
	const received = Buffer.from(signature);
	const computed = Buffer.from(expected);
	if (received.length !== computed.length || !timingSafeEqual(received, computed)) {
		return 'Assinatura inválida.';
	}

	return null;
}
