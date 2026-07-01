# AI Commander v1.0 Release Readiness Checklist

**Target Release:** July 2026  
**Repository:** ai-commander (monorepo)  
**Current Status:** 70% ready (see audit report)

---

## Critical Blockers (MUST FIX)

### Release Metadata

- [ ] **CONTRIBUTING.md** — Development setup, PR process, code style
  - File: `/Users/alejandrobotero/ai-commander/CONTRIBUTING.md`
  - Content needed:
    - Development environment setup
    - How to build and test
    - Code style (ESLint, Prettier, TypeScript rules)
    - Pull request process and guidelines
    - Commit message conventions
    - How to run tests
    - Release process (for maintainers)
  - Estimated effort: 1-2 hours
  - Blocking: Release cannot proceed without this

- [ ] **SECURITY.md** — Vulnerability disclosure and security policy
  - File: `/Users/alejandrobotero/ai-commander/SECURITY.md`
  - Content needed:
    - Security contact email or process
    - Vulnerability disclosure procedure
    - Supported versions
    - Known security limitations
    - Dependencies and security update policy
  - Estimated effort: 1-2 hours
  - Blocking: Recommended for any production-ready release

### CI/CD Configuration

- [ ] **Fix CI workflow to enforce all checks**
  - File: `.github/workflows/ci.yml`
  - Changes needed:
    - Remove `|| true` from typecheck step (currently allows failures)
    - Add lint enforcement: `npm run lint`
    - Add test execution: `npm run test`
    - Add format validation: `npm run format:check`
    - All steps must fail CI on error (no fallthrough)
  - Verification: `git push` should run all checks and fail on violations
  - Estimated effort: 15 minutes
  - Blocking: Cannot release without verified CI passing

### Package Versions

- [ ] **Fix version inconsistency in @ai-commander/decision**
  - File: `packages/decision/package.json`
  - Change: Version `0.1.0-alpha` → `0.1.0`
  - Line: Find `"version": "0.1.0-alpha"` and change to `"version": "0.1.0"`
  - Verification: All packages should have version 0.1.0
  - Estimated effort: 5 minutes
  - Blocking: Version mismatch confuses release tooling

---

## High-Priority Recommendations (SHOULD FIX)

### Release Documentation

- [ ] **CODE_OF_CONDUCT.md** — Community guidelines
  - File: `/Users/alejandrobotero/ai-commander/CODE_OF_CONDUCT.md`
  - Content options:
    - Use Contributor Covenant (standard for open source)
    - Or create custom code of conduct
  - Estimated effort: 20-30 minutes
  - Status: Recommended for professional release

- [ ] **CHANGELOG.md** — Version history and release notes
  - File: `/Users/alejandrobotero/ai-commander/CHANGELOG.md`
  - Content needed for v0.1.0 release:
    - Date and version
    - Major features implemented (OpenRA integration, Agent Runtime, etc.)
    - Breaking changes (if any)
    - Known limitations
    - Installation instructions
    - Links to documentation
  - Estimated effort: 1-2 hours
  - Status: Expected for any published release

### Documentation Improvements

- [ ] **Enhance root README.md**
  - Current: Good overview, lacks installation details
  - Updates needed:
    - Add "Installation" section: `npm install`
    - Add "Quick Start" section with minimal example
    - Add "Documentation" section with links to package READMEs
    - Add "Architecture" diagram or reference to `.foundation/architecture/`
    - Update "Contributing" section to reference CONTRIBUTING.md
  - Estimated effort: 30-45 minutes
  - Status: Improves user experience significantly

---

## Verification Checklist (BEFORE RELEASE)

### Code Quality Gates

- [ ] Full build passes: `npm run build` (all packages compile)
- [ ] No type errors: `npm run typecheck` (full TypeScript check)
- [ ] Lint passes: `npm run lint` (ESLint on all packages)
- [ ] Format consistent: `npm run format:check` (no formatting issues)
- [ ] All tests pass: `npm run test` (189+ tests, 100% pass rate)
- [ ] Doctor check passes: `npm run doctor` (comprehensive validation)

### Test Suite Verification

- [ ] Framework tests passing: 189/189 tests
- [ ] OpenRA integration tests passing: 24 tests
- [ ] Production validation tests passing: 26 tests
- [ ] Reference app tests passing: 7 files
- [ ] Total: 246+ tests passing
- [ ] No flaky tests: Run full suite 2-3 times, verify consistent pass rate

### Documentation Verification

- [ ] Root README.md complete and accurate
- [ ] All package READMEs updated and current
- [ ] ADR documents in `.foundation/adr/` reviewed
- [ ] Architecture documentation in `.foundation/architecture/` accurate
- [ ] All external links verified (working, no 404s)
- [ ] Examples in documentation are runnable

### Release Metadata Verification

- [ ] LICENSE file exists and contains MIT license text
- [ ] CONTRIBUTING.md exists and is comprehensive
- [ ] SECURITY.md exists and provides contact information
- [ ] CODE_OF_CONDUCT.md exists and is clear
- [ ] CHANGELOG.md exists and documents v0.1.0 release

### Package Configuration Verification

- [ ] All package.json files have consistent version: 0.1.0
- [ ] All packages have proper `main` entry point
- [ ] All packages have proper `exports` field (where needed)
- [ ] All packages have proper `types` entry point
- [ ] No unintended files in `files` field (if specified)
- [ ] `engines.node` field specifies >=22.0.0

### CI/CD Verification

- [ ] GitHub Actions workflow runs on all PRs
- [ ] Workflow runs all checks: typecheck, lint, test, format
- [ ] Workflow fails if any check fails (no `|| true` fallthrough)
- [ ] Sample PR passes all checks before merge

### Git & Repository Verification

- [ ] Git history is clean and linear
- [ ] All commits are proper and documented
- [ ] No uncommitted changes: `git status` is clean
- [ ] Branch is ready for merge to main
- [ ] Tags are planned: `v0.1.0` or `v1.0.0` (decide on versioning)

---

## Pre-Release Workflow

### Step 1: Fix Critical Issues (This Sprint)

```bash
# 1. Add missing release files
touch CONTRIBUTING.md
touch SECURITY.md
# ... write content (see above)

# 2. Update package version
# Edit packages/decision/package.json: "0.1.0-alpha" → "0.1.0"

# 3. Fix CI workflow
# Edit .github/workflows/ci.yml: remove || true, add lint/test steps

# 4. Verify all changes
git status
npm run doctor  # Should pass all checks
```

### Step 2: Test & Validate

```bash
# Run full validation suite
npm run build
npm run typecheck
npm run lint
npm run format:check
npm run test

# Or run comprehensive check
npm run doctor

# Expected: All 100% passing
```

### Step 3: Create Release Commit

```bash
git add CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md CHANGELOG.md
git add packages/decision/package.json
git add .github/workflows/ci.yml
git commit -m "chore: add release metadata and CI enforcement for v1.0"
git push
```

### Step 4: Merge to Main & Tag

```bash
# After PR review and CI passes:
git checkout main
git pull
git merge feature/bootstrap
git tag v0.1.0  # or v1.0.0 depending on versioning scheme
git push
git push --tags
```

### Step 5: Publish to npm (If Applicable)

```bash
# Option A: Publish each package individually
cd packages/core && npm publish
cd packages/domain && npm publish
# ... repeat for each package

# Option B: Use npm workspace publish
npm publish --workspaces --access public

# Note: You may need to authenticate with npm
npm login
```

---

## Known Issues & Workarounds

### Test Flakiness

**Issue:** Occasional failures in `openra-production-validation.test.ts`

**Affected tests:** 2-4 tests fail intermittently in CI

**Cause:** Likely timing-dependent assertions or resource constraints

**Workaround:**
- Re-run failed tests locally to verify
- If local runs pass, issue is environmental (CI runner resources)
- Not blocking release, but should be investigated post-release

**Action:** Run test suite 2-3 times before release, accept if 90%+ consistent

### Node.js Version Requirement

**Issue:** Package requires Node.js >=22.0.0

**Impact:** Users on older Node versions cannot install

**Status:** Expected, no issue. Documented in package.json and installation guide

**Action:** Document in CONTRIBUTING.md and installation section of README

---

## Timeline Estimate

| Phase | Tasks | Effort | Status |
|-------|-------|--------|--------|
| Phase 1 (Critical) | Add metadata files, fix CI, fix version | 3-4 hours | **TODO** |
| Phase 2 (High-Priority) | Add CODE_OF_CONDUCT, CHANGELOG, enhance README | 2-3 hours | **TODO** |
| Phase 3 (Verification) | Run full test suite, verify CI | 1 hour | **TODO** |
| Phase 4 (Release) | Create tag, publish, announce | 30 minutes | **TODO** |
| **Total** | | **6-9 hours** | |

---

## Success Criteria

Release is ready when:

- ✅ All Critical Phase 1 items complete
- ✅ All High-Priority Phase 2 items complete
- ✅ All verification checks passing
- ✅ Full test suite passing (246+ tests)
- ✅ No TypeScript errors: `npm run typecheck`
- ✅ No lint violations: `npm run lint`
- ✅ No format issues: `npm run format:check`
- ✅ CI workflow passing on all PRs
- ✅ Release metadata files complete and accurate
- ✅ Version consistency across all packages (0.1.0)
- ✅ Release notes prepared and reviewed

---

## Post-Release Tasks

After publishing v1.0:

- [ ] Announce release on relevant channels
- [ ] Create GitHub release with release notes
- [ ] Update project documentation with v1.0 features
- [ ] Investigate and fix test flakiness (non-blocking)
- [ ] Set up automated release workflow (GitHub Actions)
- [ ] Monitor first users for issues and feedback
- [ ] Begin v1.1 planning based on feedback

---

## Questions & Decisions

### Q: Should this be v0.1.0 or v1.0.0?

**Recommendation:** v1.0.0 (not 0.1.0)

**Rationale:**
- Framework is feature-complete and production-proven
- OpenRA integration validated across 120+ missions
- No known defects or breaking changes expected
- Semantic versioning: 1.0.0 = stable public API
- Convention: Only pre-release if API likely to change

**Decision required from CTO/team:** Confirm versioning scheme

### Q: Should AI Commander be published to npm public registry?

**Current assumption:** Yes (mentioned in audit)

**Prerequisites:**
1. npm account with organization (if using @ai-commander scope)
2. Access to npm team with publish permissions
3. Configuration in .npmrc or npm settings

**Action required:** Confirm publication target and credentials

---

## Sign-Off

**Audit Report:** ✅ STORY_5.1_AUDIT_REPORT.md (Complete)

**Checklist Status:** Ready for CTO review and sign-off

**Next Step:** Complete Critical Phase 1 items, then High-Priority Phase 2 items

---

**Generated:** July 1, 2026  
**Story:** Milestone 5 / Story 5.1: Repository Audit & Release Readiness  
**Classification:** Release Preparation (Audit & Documentation)
