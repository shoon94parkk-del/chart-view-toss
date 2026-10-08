---
name: chartview-agent-review
description: Coordinate independent Chart View Toss source, mobile, data and performance reviews with Codex subagents and preserve verified handoff records across Codex environments.
---

# Independent Chart View review

Locate the repository root and read `AGENTS.md`, `docs/AGENT_WORKFLOW.md`, `docs/agents/ROLES.md`, `docs/agents/HANDOFF_TEMPLATE.md` and `docs/CODEX_TRANSFER.md`.

Use native Codex subagents when the current environment supports them and independent work will help. Choose the necessary roles, normally two or three; otherwise apply the same review roles sequentially and report that limitation. A role prompt does not install a model or grant external authority.

- Coordinator: establish repository/project ID, base SHA, user scope, previous fixes, file ownership and evidence path. Keep final integration, push and deployment under one coordinator.
- Data reviewer: read-only API/model/UI relationship checks, dates/units/missing/zero/provenance/returns. Avoid provider recollection or bulk fresh calls.
- Mobile reviewer: independent browser/session/artifacts; actual geometry and interactions in Android/320px/iPhone WebKit. Distinguish fixtures, live web and native devices.
- Runtime reviewer: asynchronous races, failure recovery, polling disposal, lazy imports and deployment/data-version drift. Measure performance alone using the same harness/CPU/browser/data conditions.
- Implementation owner: only assigned disjoint files and regression tests. Coordinate changes to shared files before editing.
- Independent final reviewer: read-only diff/test/evidence review; identify source lines, trigger, impact and unresolved concerns. Verify claims against results.

Send each agent the assignment template in `docs/agents/ROLES.md`. Serialize mandatory QA/common outputs and performance measurements. Do not run every role automatically for a small change. Report actual contributing agents, not the number of old task names in an environment.

Preserve confirmed decisions and unfinished work in Git-backed project-memory/decision-log/handoff records with SHA and evidence. Do not claim role prompts or an ephemeral SQLite database provide long-term memory. e2e MCP and claude-mem hooks/worker remain unconnected unless separately configured and actually verified. Current Codex/subagent use consumes the user's existing Codex allowance; CI must not add LLM calls or secrets.
