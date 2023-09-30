title: Test issue #1
labels: test, sample
assignees: {{ context.actor }}
---
This is a test issue milestone: {% if existingIssue %}updated{% else %}created{% endif %} on {{ date | date('dddd, MMMM Do') }}

The hash is: {{ context.sha }}

{% if existingIssue %}Existing issue node id: {{ existingIssue.node_id }}{% endif %}
