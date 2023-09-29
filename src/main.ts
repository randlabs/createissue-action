import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import fm from 'front-matter';
import nunjucks from 'nunjucks';
import moment from 'moment';
import { getBoolInput, getNumericInput, getOctokit, getRepoOwnerInput, getSelectionInput } from './helpers';

// -----------------------------------------------------------------------------

type TemplateAttributes = {
	title?: string;
	assignees?: string;
	labels?: string;
	milestone?: string;
}

// -----------------------------------------------------------------------------

async function run(): Promise<void> {
	// Create the GitHub accessor
	const octokit = getOctokit();

	// Get target owner and repository
	const { repo, owner } = getRepoOwnerInput();

	// Get title
	let title = core.getInput('title');

	// Get assignees
	let assignees = parseCommaSeparatedList(core.getInput('assignees'));

	// Get labels
	let labels = parseCommaSeparatedList(core.getInput('labels'));

	// Get milestone
	let milestone = getNumericInput('milestone', undefined, 1);

	// Get update existing
	let updateExisting = getBoolInput('update-existing', false);

	// Get search existing
	let searchType = getSelectionInput('search-type', ['none', 'open', 'closed', 'all'], 'open');

	// Get search parameters
	let searchTitleRegex: RegExp|undefined;
	let searchLabels = labels;
	if (searchType != 'none') {
		try {
			let pattern = core.getInput('search-title');
			if (!pattern) {
				pattern = '.*';
			}
			searchTitleRegex = new RegExp(pattern, 'ui');
		}
		catch (err: any) {
			throw new Error('invalid `search-title` regex pattern');
		}

		let input = parseCommaSeparatedList(core.getInput('search-labels'));
		if (input) {
			searchLabels = input;
		}
		if (!searchLabels) {
			throw new Error('no `labels` nor `search-labels` input were specified for search');
		}
	}

	// Get filename
	let filename = core.getInput('filename');
	if (!filename) {
		filename = '.github/ISSUE_TEMPLATE.md';
	}

	// Get the template file and load it
	const curDir = (process.env.GITHUB_WORKSPACE as string) || '.';
	const fullFilename = path.join(curDir, filename);
	if (!fs.existsSync(fullFilename)) {
		throw new Error(`file ${filename} could not be found in your project's workspace, try cloning the repository first`)
	}
	const template = fs.readFileSync(fullFilename, 'utf8');

	// Try to locate an already existing issue
	let issueId = 0;
	let issueUrl = '';
	let existingIssue: Record<string, any>|null = null;
	if (searchType != 'none') {
		for await (const response of octokit.paginate.iterator(
			octokit.rest.issues.listForRepo,
			{
				repo,
				owner,
				state: searchType as 'open' | 'closed' | 'all',
				labels: searchLabels,
				per_page: 100,
			}
		)) {
			for (const issue of response.data) {
				if ((!searchTitleRegex) || searchTitleRegex.test(title)) {
					existingIssue = issue;
					issueId = issue.id;
					issueUrl = issue.url;
					break;
				}
			}
			if (issueId > 0) {
				break;
			}
		}
	}

	// Create template processor
	const nj = nunjucks.configure({
		autoescape: false,
		noCache: true
	})
	nj.addFilter('date', (date: moment.MomentInput, format: string): string => {
		return moment(date).format(format);
	});

	// Parse template
	const parsedTemplate = fm<TemplateAttributes>(template);

	const templateVars: Record<string, any> = {
		repo,
		owner,
		env: process.env,
		now: Date.now(),
		context: github.context,
		input: {
			title,
			assignees,
			labels,
			milestone
		}
	}
	if (existingIssue) {
		templateVars.existingIssue = existingIssue;
	}

	const body = nj.renderString(parsedTemplate.body, templateVars);
	if (typeof parsedTemplate.attributes.title === 'string') {
		title = nj.renderString(parsedTemplate.attributes.title, templateVars);
	}
	if (typeof parsedTemplate.attributes.assignees === 'string') {
		const s = nj.renderString(parsedTemplate.attributes.assignees, templateVars);
		if (s) {
			assignees = parseCommaSeparatedList(s);
		}
	}
	if (typeof parsedTemplate.attributes.labels === 'string') {
		const s = nj.renderString(parsedTemplate.attributes.labels, templateVars);
		if (s) {
			labels = parseCommaSeparatedList(s);
		}
	}
	if (typeof parsedTemplate.attributes.milestone === 'string') {
		milestone = parseInt(parsedTemplate.attributes.milestone, 10);
		if (Number.isNaN(milestone) || milestone < 1) {
			throw new Error('invalid `milestone` attribute');
		}
	}

	// Validate title
	title = title.trim();
	if (title.length == 0) {
		throw new Error('unable to determine issue title');
	}

	// Create or update existing issue
	let issueAction = 'none';
	if (issueId == 0) {
		const { data } = await octokit.rest.issues.create({
			repo,
			owner,
			title,
			body,
			assignees: assignees.split(','),
			labels: labels.split(','),
			milestone,
		});
		issueId = data.id;
		issueUrl = data.url;
		issueAction = 'created';
	}
	else if (updateExisting) {
		const { data } = await octokit.rest.issues.update({
			repo,
			owner,
			issue_number: issueId,
			title,
			body,
			assignees: assignees.split(','),
			labels: labels.split(','),
			milestone,
		});
		issueUrl = data.url;
		issueAction = 'updated';
	}
	
	// Set action's output
	core.setOutput('id', issueId);
	core.setOutput('url', issueUrl);
	core.setOutput('action', issueAction);
}

function parseCommaSeparatedList(input: string): string {
	return input.split(',').map(x => x.trim()).filter(x => (x.length > 0)).join(',');
}

// -----------------------------------------------------------------------------

run().catch((err: any) => {
	if (err instanceof Error) {
		core.setFailed(err.message);
	}
	else if (err.toString) {
		core.setFailed(err.toString());
	}
	else {
		core.setFailed('unknown error');
	}
});
