---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy.
---

# Skill Creator

A skill for creating new skills and iteratively improving them for Antigravity and Gemini CLI.

At a high level, the process of creating a skill goes like this:

- Decide what you want the skill to do and roughly how it should do it
- Write a draft of the skill in `.agents/skills/<skill-name>/SKILL.md`
- Create a few test prompts and run Gemini with access to the skill on them
- Help the user evaluate the results both qualitatively and quantitatively
  - Use the `@skill-grader` subagent to grade outputs against quantitative assertions.
  - Use the `eval-viewer/generate_review.py` script to show the user the results for them to look at.
- Rewrite the skill based on feedback from the user's evaluation of the results.
- Repeat until satisfied.
- Optimize the skill description for better triggering using `scripts/run_loop.py`.

## Structure of a Skill

According to the official Agent Skills spec, a skill is a directory containing a `SKILL.md` file.

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
└── assets/           # Optional: templates, resources
```

### SKILL.md Formatting
`SKILL.md` MUST start with a YAML frontmatter.

```markdown
---
name: your-skill-name
description: A highly specific description of what the skill does AND when to trigger it. Pushy descriptions work best.
---

# Your Skill Title

Detailed step-by-step instructions.
Provide examples and explain the *why* behind your instructions.
```

- **name**: 1-64 characters. lowercase alphanumeric and hyphens only.
- **description**: 1-1024 characters. Crucial for triggering the skill.

## Running and Evaluating Test Cases

### Step 1: Spawn all runs (with-skill AND baseline)
For each test case, spawn runs in parallel using subagents if possible, or sequentially if necessary.

**With-skill run:**
Use the current skill definition.
Save outputs to: `<workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/`

**Baseline run:**
- **Creating a new skill**: No skill at all (baseline Gemini). Save to `without_skill/outputs/`.
- **Improving an existing skill**: The old version. Save to `old_skill/outputs/`.

### Step 2: Grade and Aggregate
1. **Grade each run**: Call the `@skill-grader` subagent. It will read `.gemini/agents/skill-grader.md` and evaluate assertions.
   ```bash
   # Example: Ask grader to evaluate
   @skill-grader Evaluate the expectations in evals.json against the transcript at iteration-1/eval-0/transcript.md and outputs at iteration-1/eval-0/with_skill/outputs/
   ```
2. **Aggregate into benchmark**: Run the aggregation script:
   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
   ```
3. **Do an analyst pass**: Call `@skill-analyzer` to surface patterns.
   ```bash
   @skill-analyzer Analyze the benchmark results at <workspace>/iteration-N/benchmark.json
   ```

### Step 3: Launch the Viewer
```bash
nohup python .agents/skills/skill-creator/eval-viewer/generate_review.py \
  <workspace>/iteration-N \
  --skill-name "my-skill" \
  --benchmark <workspace>/iteration-N/benchmark.json \
  > /dev/null 2>&1 &
```

## Description Optimization

After the skill content is stable, optimize the description for triggering.

1. **Generate eval queries**: Create ~20 queries (should-trigger/should-not-trigger).
2. **Run the optimization loop**:
   ```bash
   python .agents/skills/skill-creator/scripts/run_loop.py \
     --eval-set <path-to-eval_set.json> \
     --skill-path .agents/skills/<skill-name> \
     --max-iterations 5
   ```
   This script internally calls `gemini -p` to test triggering.

## Native Subagents
This skill makes use of the following native Gemini subagents defined in `.gemini/agents/`:
- `@skill-grader`: Precise quantitative evaluation.
- `@skill-analyzer`: Post-benchmark insight extraction.
- `@skill-comparator`: Blind A/B comparison specialist.
