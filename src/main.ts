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
	let assignees = core.getMultilineInput('assignees');
	assignees = parseMultipleItems(assignees, '`assignees` input');

	// Get labels
	let labels = core.getMultilineInput('labels');
	labels = parseMultipleItems(assignees, '`labels` input');

	// Get milestone
	let milestone = getNumericInput('milestone', undefined, 1);

	// Get update existing
	let updateExisting = getBoolInput('update_existing', false);

	// Get search existing
	let searchType = getSelectionInput('search_type', ['none', 'open', 'closed', 'all'], 'open');

	// Get filename
	let filename = core.getInput('filename');
	if (!filename) {
		filename = '.github/ISSUE_TEMPLATE.md';
	}

	// Get the file
	const curDir = (process.env.GITHUB_WORKSPACE as string) || '.';
	const fullFilename = path.join(curDir, filename);
	if (!fs.existsSync(fullFilename)) {
		throw new Error(`file ${filename} could not be found in your project's workspace, try cloning the repository first`)
	}
	const template = fs.readFileSync(fullFilename, 'utf8');

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

	const templateVars = {
		repo,
		owner,
		env: process.env,
		now: Date.now(),
		context: github.context,
		input: {
			title,
			assignees: assignees.join(','),
			labels: labels.join(','),
			milestone
		}
	}

	const body = nj.renderString(parsedTemplate.body, templateVars);
	if (typeof parsedTemplate.attributes.title === 'string') {
		title = nj.renderString(parsedTemplate.attributes.title, templateVars);
	}
	if (typeof parsedTemplate.attributes.assignees === 'string') {
		const s = nj.renderString(parsedTemplate.attributes.assignees, templateVars);
		assignees = parseMultipleItems(s, '`assignees` attribute');
	}
	if (typeof parsedTemplate.attributes.labels === 'string') {
		const s = nj.renderString(parsedTemplate.attributes.labels, templateVars);
		labels = parseMultipleItems(s, '`labels` attribute');
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

	// Try to locate an already existing issue
	let issueId = 0;
	let issueUrl = '';
	if (searchType != 'none') {
		for await (const response of octokit.paginate.iterator(
			octokit.rest.issues.listForRepo,
			{
				repo,
				owner,
				state: searchType as 'open' | 'closed' | 'all',
				labels: labels.join(','),
				per_page: 100,
			}
		)) {
			for (const issue of response.data) {
				if (issue.title === title) {
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

	let issueAction = 'none';
	if (issueId == 0) {
		const { data } = await octokit.rest.issues.create({
			repo,
			owner,
			title,
			body,
			assignees,
			labels: labels,
			milestone,
		});
		issueId = data.id;
		issueUrl = data.url;
		issueAction = 'created';
	}
	else {
		if (updateExisting) {
			const { data } = await octokit.rest.issues.update({
				repo,
				owner,
				issue_number: issueId,
				title,
				body,
				assignees,
				labels,
				milestone,
			});
			issueUrl = data.url;
			issueAction = 'updated';
		}
	}
	
	// Set action's output
	core.setOutput('id', issueId);
	core.setOutput('url', issueUrl);
	core.setOutput('action', issueAction);
}

function parseMultipleItems(input: string|string[], itemType: string): string[] {
	if (!Array.isArray(input)) {
		input = input.split(',');
	}
	const res: string[] = [];
	for (let s of input) {
		s = s.trim();
		if (!s) {
			throw new Error('empty entry found in ' + itemType);
		}
		res.push(s);
	}
	return res;
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
