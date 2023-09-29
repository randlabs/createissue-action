# uploadasset-action

A [GitHub Action][github-actions-url] to create repository issues written in [TypeScript][typescript-url]

Based on the work of https://github.com/JasonEtco/create-an-issue

[![License][license-image]][license-url]
[![Issues][issues-image]][issues-url]

## Usage

```YML
    ...
    - name: Uploading binaries to release
      id: uploadbin
      uses: randlabs/createissue-action@v1.0.0
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        title: my issue
        filename: .github/MY_ISSUE_TEMPLATE.md
    ...
```

### Inputs

```YML
inputs:
  title:
    description: Issue title.
    required: false
  assignees:
    description: A GitHub user or list of users to assign the issue.
    required: false
  labels:
    description: A list of labels to add.
    required: false
  milestone:
    description: Number of the milestone to assign the issue to.
    required: false
  filename:
    description: The name of the file to use as the issue template.
    default: .github/ISSUE_TEMPLATE.md
    required: false
  update-existing:
    description: Update an open existing issue with the same title if it exists.
    required: false
    default: 'true'
  search-type:
    description: Existing types of issues to search for (none, open, closed or all).
    required: false
    default: 'open'
  search-title:
    description: A javascript regex pattern. Defaults to any (*).
    required: false
  search-labels:
    description: A list of labels to search for. Defaults to the values specified in labels.
    required: false
```

### Outputs

```YML
outputs:
  id:
    description: 'The ID of the created/updated issue.'
  url:
    description: 'The location of the created/updated issue.'
  action:
    description: 'The executed action (none, created or updated).'
```

### Template

A template is composed of two main areas.

```
---
key-1: some-value
key-2: some-other-value
---
content
```

An example:

```
---
title: Something is not working
assignees: @dev-team
labels: bug
---
Someone just pushed a commit {{ context.sha }} but it does not compile.
```

Between `---` lines, a set of key/value fields. Keys can be: `title`, `assignees`, `labels` or `milestone`. If specified, they override the values passed as input parameters.`

Below the second dash line, the issue's body.

The template engine uses [Nunjucks](https://mozilla.github.io/nunjucks/) to parse items. Please check the [templating docs](https://mozilla.github.io/nunjucks/templating.html) to know, for e.g., how to insert variables.

#### Variables

The following custom variables are defined for use:

* `repo`: A string containing the repository name.
* `owner`: A string containing the owner of the repository.
* `env`: An object with all the available environment variables.
* `date`: A javascript object with the current local date and time.
* `context`: The github context object. See the [documentation](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context) for details.
* `input`: An object containing the following fields: `title`, `assignees`, `labels` and `milestone`. They contain the input values passed to the workflow.
* `existingIssue`: If a previous issue matching the title and labels exists, this variable will contain its data.

**IMPORTANT**: Some variables, like the environment ones, may contain sensitive information. Handle with care.

#### Dates

Use the `date` filter and variable to show some information about when this action was executed:

```
---
....
---
Today is {{ date | date('dddd, MMMM Do') }}
```

This example will create a new issue with a title like **Today is Saturday, November 10th**. You can pass any valid [Moment.js formatting string](https://momentjs.com/docs/#/displaying/) to the filter.

### Permissions

This Action requires the following permissions on the GitHub integration token:

```YML
permissions:
  issues: write
```

### Environment variables:

`GITHUB_TOKEN` must be set to the workflow's token or the personal access token (PAT) required to accomplish the task.

[typescript-url]: http://www.typescriptlang.org/
[github-actions-url]: https://github.com/features/actions
[license-url]: https://github.com/randlabs/createissue-action/blob/master/LICENSE
[license-image]: https://img.shields.io/github/license/randlabs/createissue-action.svg
[issues-url]: https://github.com/randlabs/createissue-action/issues
[issues-image]: https://img.shields.io/github/issues-raw/randlabs/createissue-action.svg
