---
name: tdd
description: >-
  Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.
---

# Test-Driven Development (TDD)

Use this workflow to implement features, fix bugs, and refactor code using strict test-driven development and vertical slicing.

## Philosophy

* **Core Principle**: Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.
* **Good Tests** are integration-style: they describe what the system does, not how it does it. They read like a specification and survive internal refactors.
* **Bad Tests** are coupled to implementation. They mock internal collaborators excessively, test private methods, or verify state through external backdoors (e.g., querying the database directly instead of through public APIs). If you rename an internal function or change internal state representation and tests break, those tests were bad.

---

## Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** 
Instead, build features using **vertical slices** (tracer bullets): One test $\rightarrow$ one implementation $\rightarrow$ repeat. Each cycle responds directly to what was learned from the previous one.

```text
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1 → impl1
  RED→GREEN: test2 → impl2
  RED→GREEN: test3 → impl3
```

---

## Workflow

### 1. Planning
Before writing any code:
- [ ] Confirm with the user what interface changes are needed.
- [ ] Confirm with the user which behaviors to test (prioritize critical paths).
- [ ] Design interfaces for testability (small, focused public interface; deep implementation).
- [ ] List the behaviors to test (in terms of observable outcomes, not implementation steps).
- [ ] Get user approval on the plan.

> **Alignment Question for User:**
> *"What should the public interface look like? Which behaviors are most important to test first?"*

---

### 2. Tracer Bullet (First Vertical Slice)
Write **ONE** test that confirms **ONE** fundamental behavior of the system:
1. **RED**: Write the test for the first behavior $\rightarrow$ run test suite $\rightarrow$ verify the test fails for the expected reason (not a syntax/import error).
2. **GREEN**: Write the minimal code necessary to make the test pass $\rightarrow$ run test suite $\rightarrow$ verify it passes.

---

### 3. Incremental Loop
For each remaining behavior on the list:
1. **RED**: Write the next single test $\rightarrow$ verify it fails as expected.
2. **GREEN**: Write only the minimal implementation required to make it pass $\rightarrow$ verify it passes.

**Strict Rules:**
* One test at a time.
* Only write enough code to pass the active test.
* Do not anticipate or write speculative code for future tests.

---

### 4. Refactor
After tests pass, look for refactor candidates (**refactor only while GREEN; never refactor while RED**):
- [ ] Extract duplication and clean up syntax.
- [ ] Deepen modules (move internal complexity behind simple public interfaces).
- [ ] Apply SOLID principles where natural.
- [ ] Run the test suite after every refactoring step to ensure zero regressions.

---

## Checklist Per Cycle

- [ ] Test describes outward behavior, not internal implementation.
- [ ] Test exercises the public interface only.
- [ ] Test would survive an internal architectural refactor.
- [ ] Code written is minimal for this specific test.
- [ ] No speculative features or unrequested abstractions added.
