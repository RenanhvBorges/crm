/**
 * Event catalogue of the CRM. Mirrors `EVENT_TYPES` in
 * src/lib/automations/triggers.ts — the same list that feeds
 * `webhook_subscriptions.events` and the Webhooks screen.
 */
export const EVENT_OPTIONS = [
	{ name: 'All Events', value: '*', description: 'Subscribe to every event, including future ones' },
	{ name: 'Contact Created', value: 'contact.created', description: 'A new contact was created' },
	{
		name: 'Contact Entered List',
		value: 'contact.list_joined',
		description: 'A contact was added to a list',
	},
	{
		name: 'Contact Left List',
		value: 'contact.list_left',
		description: 'A contact was removed from a list',
	},
	{
		name: 'Contact Score Changed',
		value: 'contact.score_changed',
		description: 'The lead score of a contact changed',
	},
	{
		name: 'Deal Created',
		value: 'deal.created',
		description: 'A new deal was created',
	},
	{ name: 'Deal Lost', value: 'deal.lost', description: 'A deal was marked as lost' },
	{
		name: 'Deal Stage Changed',
		value: 'deal.stage_changed',
		description: 'A deal moved to another stage',
	},
	{ name: 'Deal Won', value: 'deal.won', description: 'A deal was marked as won' },
	{ name: 'Email Clicked', value: 'email.clicked', description: 'A link in an email was clicked' },
	{ name: 'Email Opened', value: 'email.opened', description: 'A marketing email was opened' },
	{ name: 'Tag Added', value: 'contact.tag_added', description: 'A tag was added to a contact' },
	{
		name: 'Tag Removed',
		value: 'contact.tag_removed',
		description: 'A tag was removed from a contact',
	},
	{ name: 'Task Completed', value: 'task.completed', description: 'A task was marked as done' },
	{ name: 'Task Created', value: 'task.created', description: 'A new task was created' },
];
