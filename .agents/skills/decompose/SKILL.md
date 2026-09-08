---
name: decompose
description: >-
  Use this skill to investigate complex issues, bugs with unknown causes, architectural ambiguities, or tasks requiring assumption verification before writing production code. Deconstructs an objective into variables, executes controlled experiments, maintains double knowledge graphs, and outputs a verified fix handoff brief.
---

# Workflow: Decompose

Use this workflow to systematically investigate complex issues, bugs with unknown root causes, or architectural refactorings where assumptions must be verified through experiments before applying any production code.

## Core Directives

1. **Objective Decomposition**: Break down the goal into testable, discrete variables. **Do not write production code directly.**
2. **Double Knowledge Graph**: Always consult the **Agent graph** (`experiments/decompose/.graph/graph.json`) and **Project graph** (`graphify-out/graph.json`) before treating assumptions as unknown.
3. **Pass/Fail Integrity**: Explicitly define expected results and failure criteria in `tree.md` *before* running any experiment.
4. **Auto-Execute Limits**: Run read-only tools and scratch reproduction scripts automatically, but **always ask for user approval** before executing destructive actions (production writes, server restarts, DB migrations).
5. **Fix Hand-Off**: Once variables are proven or disproven, write a comprehensive hand-off brief to `handoff.md` for a specialist implementation agent. Do not apply fixes yourself.

---

## Directory & Artifact Structure

Every decomposition session creates an isolated folder under `experiments/decompose/<slug>/`:

```text
experiments/decompose/
├── .graph/
│   └── graph.json                     # Persistent Agent Knowledge Graph
└── <date>-<short-objective-slug>/      # Session Folder (e.g. 2026-09-08-fix-receipt-parser)
    ├── tree.md                        # Variable tree & execution DAG
    ├── runs.jsonl                     # Append-only experiment run log
    ├── learnings.md                   # Detailed findings & insights
    └── handoff.md                     # Final verified fix brief for specialist agent
```

---

## Lifecycle Phases

### Phase A: Objective Framing
1. Restate the objective as a single-line hypothesis:
   > `"[Subject] [does X] when [condition]"`
2. Generate a session slug: `<YYYY-MM-DD>-<short-objective-slug>` (e.g. `2026-09-08-fix-auth-session-timeout`).
3. Create session directory: `experiments/decompose/<slug>/`
4. Initialize the session files:
   - `tree.md` (variable tree skeleton)
   - `runs.jsonl` (empty append-only log)
   - `learnings.md` (initially empty notes)

---

### Phase B: Knowledge-Base Check
Before defining new unknowns, verify against prior historical knowledge:
1. **Agent Graph Check**:
   - Inspect `experiments/decompose/.graph/graph.json` (or execute `graphify query` / check existing run artifacts) to see if related bugs, files, or variables were previously tested.
2. **Project Graph Check**:
   - Inspect `graphify-out/graph.json` (if available) or search the project codebase to map dependencies, call-chains, and code ownership.
3. **Assumption Classification**:
   - **KNOWN**: Any assumption validated by a specific `file:line`, prior experiment run ID, or existing graph node. Record citation in `learnings.md`.
   - **UNKNOWN**: Any unverified hypothesis or behavior that must become a testable variable in `tree.md`.

---

### Phase C & D: Build Variable Tree & DAG
1. In `tree.md`, break down unknowns into variables with explicit contracts:
   ```markdown
   ### VAR-1: [Brief statement of claim]
   - **type**: leaf | composite | blocked
   - **depends_on**: []
   - **sandbox**: [run_command / view_file / scratch test script]
   - **expected**: [Precise pass criteria]
   - **status**: pending | running | pass | fail | inconclusive
   ```
2. **DAG Construction**: Order variables so prerequisites and low-level leaf dependencies are evaluated before composite parent variables.
3. **Safeguard Limits**:
   - `limits.max_depth`: Maximum tree depth is 3.
   - `limits.max_leaves_per_session`: Maximum 10 leaves evaluated per session to prevent infinite exploration loops.

---

### Phase E & F: Execute Leaves & Record Runs
For each leaf variable in DAG order:
1. **Define Test**: Confirm test command, script in `scratch/`, or read-only inspection.
2. **Execute**: Run the test.
3. **Log Run**: Append the exact result to `runs.jsonl`:
   ```json
   {"run_id": "run-001", "var_id": "VAR-1", "timestamp": "2026-09-08T18:00:00Z", "command": "...", "status": "pass", "evidence": "..."}
   ```
4. **Update Status**: Mark `VAR-N` as `pass`, `fail`, or `inconclusive` in `tree.md`.
5. **Bubble Up**: If all child leaves of a composite variable pass/fail, resolve the composite parent variable.

---

### Phase G: Final Report & Hand-Off
Once the root cause or required architectural change is verified:
1. **Populate `learnings.md`**: Summarize key discoveries, verified behavioral realities, and invalidated hypotheses.
2. **Draft `handoff.md`**:
   - **Objective**: Target outcome.
   - **Root Cause & Evidence**: Citations to `runs.jsonl` and code lines.
   - **Verified Fix Strategy**: Exact specifications, modified files, and implementation constraints.
   - **Acceptance Criteria**: Automated commands the implementation agent should run to confirm success.
3. **Rebuild Agent Graph**: Run `graphify update experiments/decompose` (if graphify is configured in environment) or update `.graph/graph.json` to record new nodes and edges.
4. **Notify User**: Conclude with a clear summary of findings and prompt the user to proceed with the specialist implementation agent.
