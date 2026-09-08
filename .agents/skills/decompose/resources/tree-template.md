# Variable Tree: [Objective Slug]

**Objective:** [Subject] [does X] when [condition]  
**Created:** [YYYY-MM-DD]  
**Status:** In Progress  

---

## Known Facts (with Citations)
- **KNOWN-1**: [Fact statement] (Source: `path/to/file.ts:12-25`)
- **KNOWN-2**: [Fact statement] (Source: `experiments/decompose/.graph/graph.json` node `NODE-ID`)

---

## Variables (DAG)

### VAR-1: [Claim 1]
- **type**: leaf
- **depends_on**: []
- **sandbox**: `scratch/test_var1.ts`
- **expected**: [Expected outcome or criteria]
- **status**: pending

### VAR-2: [Claim 2]
- **type**: leaf
- **depends_on**: []
- **sandbox**: run_command
- **expected**: [Expected outcome or criteria]
- **status**: pending

### VAR-3: [Composite Claim]
- **type**: composite
- **depends_on**: [VAR-1, VAR-2]
- **expected**: Both VAR-1 and VAR-2 pass
- **status**: pending
