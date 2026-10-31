---
name: 'Swapping the Model Behind a Coding Agent'
title: 'Deciding Whether to <em>Swap the Model</em> Behind a Coding Agent'
description: 'Examining how SWE-bench builds and grades its tasks, designing an experiment to compare models in Claude Code, and deciding whether to switch based on resolved rate and cost.'
---

A record of finding out whether the model used in Claude Code can be replaced with an open-weight model. Part 1 analyzes how SWE-bench tasks are built and graded and sets out the principles for comparison. Part 2 builds 36 tasks and a grader from 20 internal PRs and sets up the Claude Code run environment. Part 3 decides whether to switch models based on resolved rate, cost, and patch defects, and part 4 looks back on the 1,164 runs and what remains to think about.
