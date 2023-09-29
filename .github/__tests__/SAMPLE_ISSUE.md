---
title: Test issue #1
labels: test, sample
milestone: {% if existingIssue %}{{ existingIssue.milestone + 1 }}{% else %}0{% endif %}
---
This is a test issue created on {{ date | date('dddd, MMMM Do') }}

The hash is: {{ context.sha }}

{% if existingIssue %}Milestone was {{ existingIssue.milestone }}{% else %}No previous milestone{% endif %}
