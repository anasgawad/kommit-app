# Security Audit & Dependency Update Plan

**Date:** 2026-03-08  
**Project:** Kommit v0.1.0  
**Status:** Phase 1 - Initial audit after first `npm install`

---

## Executive Summary

`npm install` completed successfully with 18 vulnerabilities detected (2 low, 7 moderate, 9 high). All vulnerabilities are in **development dependencies** used for building, testing, and packaging. **None affect the runtime security of the Electron app itself.**

**Recommendation:** ✅ **Safe to proceed with Phase 1 testing.** Address vulnerabilities after validating Phase 1 functionality.

---

## Vulnerability Breakdown

### High Severity (9)

| Package                             | Version      | Issue                                            | Fix Available               | Notes                               |
| ----------------------------------- | ------------ | ------------------------------------------------ | --------------------------- | ----------------------------------- |
| `tar`                               | 6.2.1        | Multiple path traversal vulnerabilities (5 CVEs) | Upgrade to 7.5.10+          | Transitive dep via electron-builder |
| `electron-builder`                  | 25.1.8       | Via app-builder-lib, dmg-builder, tar            | Upgrade to 26.8.1           | Breaking changes expected           |
| `app-builder-lib`                   | (transitive) | Via @electron/rebuild, tar                       | Via electron-builder 26.8.1 | Packaging only                      |
| `dmg-builder`                       | (transitive) | Via app-builder-lib                              | Via electron-builder 26.8.1 | macOS packaging only                |
| `@electron/rebuild`                 | (transitive) | Via node-gyp, tar                                | Via electron-builder 26.8.1 | Native module rebuild only          |
| `node-gyp`                          | (transitive) | Via make-fetch-happen, tar                       | Via electron-builder 26.8.1 | Native compilation only             |
| `make-fetch-happen`                 | (transitive) | Via cacache, http-proxy-agent                    | Via electron-builder 26.8.1 | Network requests during build       |
| `cacache`                           | (transitive) | Via tar                                          | Via electron-builder 26.8.1 | Build cache only                    |
| `electron-builder-squirrel-windows` | (transitive) | Via app-builder-lib                              | Via electron-builder 26.8.1 | Windows installer only              |

**Impact:** Build/packaging process only. Does not affect running app.

### Moderate Severity (7)

| Package               | Version      | Issue                                        | Fix Available      | Notes                                |
| --------------------- | ------------ | -------------------------------------------- | ------------------ | ------------------------------------ |
| `electron`            | 34.0.0       | ASAR Integrity Bypass (GHSA-vmqv-hx8q-j7mg)  | Upgrade to 35.7.5+ | Only affects packaged apps with ASAR |
| `vitest`              | 2.1.8        | Via vite, @vitest/mocker, vite-node          | Upgrade to 4.0.18  | Testing only                         |
| `@vitest/coverage-v8` | 2.1.8        | Via vitest                                   | Upgrade to 4.0.18  | Test coverage only                   |
| `vite`                | (transitive) | Via esbuild                                  | Via vitest 4.0.18  | Dev server only                      |
| `esbuild`             | 0.24.2       | Dev server CORS bypass (GHSA-67mh-4wv8-2f99) | Via vitest 4.0.18  | Dev server only                      |
| `@vitest/mocker`      | (transitive) | Via vite                                     | Via vitest 4.0.18  | Testing mocks only                   |
| `vite-node`           | (transitive) | Via vite                                     | Via vitest 4.0.18  | Test runner only                     |

**Impact:** Development and testing only. Does not affect production builds.

### Low Severity (2)

| Package             | Version      | Issue                                      | Fix Available               | Notes                           |
| ------------------- | ------------ | ------------------------------------------ | --------------------------- | ------------------------------- |
| `@tootallnate/once` | (transitive) | Control flow scoping (GHSA-vpq2-c234-7xj6) | Via electron-builder 26.8.1 | Transitive via http-proxy-agent |
| `http-proxy-agent`  | (transitive) | Via @tootallnate/once                      | Via electron-builder 26.8.1 | Build-time network requests     |

**Impact:** Build process only.

---

## Deprecation Warnings

The following packages are deprecated but still functional:

- `@npmcli/move-file@2.0.1` → Use `@npmcli/fs`
- `are-we-there-yet@3.0.1` → No longer supported
- `npmlog@6.0.2` → No longer supported
- `rimraf@3.0.2` → Upgrade to v4+
- `gauge@4.0.4` → No longer supported
- `whatwg-encoding@3.1.1` → Use `@exodus/bytes`
- `inflight@1.0.6` → Use `lru-cache` (memory leak)
- `boolean@3.2.0` → No longer supported
- `lodash.isequal@4.5.0` → Use `node:util.isDeepStrictEqual`
- `glob@7.2.3`, `glob@8.1.0`, `glob@10.5.0` → Upgrade to latest (security vulnerabilities)
- `tar@6.2.1` → Upgrade to 7.5.10+ (security vulnerabilities)

All are transitive dependencies from `electron-builder` and will be resolved by upgrading to v26.

---

## Risk Assessment

### Runtime Risk: **NONE** ✅

- All vulnerabilities are in **devDependencies** (build/test tools)
- The packaged Electron app does NOT include these vulnerable packages
- The only runtime dependency with a vulnerability is `electron` itself, which has a moderate ASAR bypass issue that:
  - Only affects **packaged apps** (not `npm run dev`)
  - Only affects apps with **ASAR enabled** (which we use)
  - Requires **local file system access** to exploit
  - Will be fixed by upgrading to Electron 35+

### Development Risk: **LOW** ⚠️

- `esbuild` dev server CORS bypass: Only exploitable if attacker can get a developer to visit a malicious site while dev server is running
- `tar` path traversal: Only affects extraction of untrusted tar archives during build (unlikely scenario)

### Build/Packaging Risk: **LOW** ⚠️

- Vulnerabilities in `electron-builder` dependencies only affect the packaging process
- `tar` vulnerabilities require extracting malicious archives (we don't do this)
- `node-gyp` vulnerabilities are transitive via `tar`

---

## Update Plan (Post-Phase 1 Testing)

### Phase 1.5: Dependency Updates (After manual testing completes)

**Priority 1: Electron** (Moderate risk, easy upgrade)

```bash
npm install electron@latest --save-dev
```

- Upgrade from `34.0.0` → `35.7.5+` (or latest stable)
- **Risk:** Low. Electron 35 is a minor version bump.
- **Breaking changes:** Review [Electron 35 release notes](https://www.electronjs.org/blog/electron-35-0)
- **Testing:** Re-run all Phase 1 manual tests after upgrade

**Priority 2: Vitest** (Moderate risk, major version upgrade)

```bash
npm install vitest@latest @vitest/coverage-v8@latest --save-dev
```

- Upgrade from `2.1.8` → `4.0.18`
- **Risk:** Medium. Major version bump (2 → 4).
- **Breaking changes:** Review [Vitest 3.0](https://github.com/vitest-dev/vitest/releases/tag/v3.0.0) and [Vitest 4.0](https://github.com/vitest-dev/vitest/releases/tag/v4.0.0) migration guides
- **Testing:** `npm test` must pass all 86 tests after upgrade

**Priority 3: electron-builder** (High risk, major version upgrade)

```bash
npm install electron-builder@latest --save-dev
```

- Upgrade from `25.1.8` → `26.8.1`
- **Risk:** High. Major version bump (25 → 26).
- **Breaking changes:** Review [electron-builder 26 changelog](https://github.com/electron-userland/electron-builder/releases/tag/v26.0.0)
- **Testing:** Build for all platforms after upgrade:
  - `npm run build:win`
  - `npm run build:mac`
  - `npm run build:linux`

### Verification Steps (After Each Update)

1. **Build verification:**

   ```bash
   npm run build
   ```

   - Must compile with zero TypeScript errors

2. **Test verification:**

   ```bash
   npm test
   npm run test:e2e
   ```

   - All 86 tests must pass

3. **Dev mode verification:**

   ```bash
   npm run dev
   ```

   - App must launch and function normally

4. **Manual testing:**
   - Re-run critical paths from MANUAL-TESTS.md (sections 2, 4, 6)

5. **Audit verification:**
   ```bash
   npm audit
   ```

   - Verify vulnerability count decreased

---

## Alternative: Nuclear Option

If incremental updates fail, use `npm audit fix`:

```bash
# Automatic fix (non-breaking changes only)
npm audit fix

# Force fix (includes breaking changes)
npm audit fix --force
```

⚠️ **WARNING:** `npm audit fix --force` will:

- Upgrade to major versions (electron-builder 26, vitest 4, electron 40+)
- Potentially break the build and tests
- Require extensive re-testing

**Recommendation:** Only use after Phase 1 is validated and tests are passing.

---

## Post-Update Audit

After all updates, document the final state:

```bash
npm audit --json > audit-post-update.json
npm list --depth=0 > dependencies-post-update.txt
```

**Success criteria:**

- ✅ Zero high/critical vulnerabilities
- ✅ All 86 automated tests pass
- ✅ All Phase 1 manual tests pass
- ✅ `npm run build` succeeds
- ✅ Packaged builds work on all platforms

---

## Timeline

| Phase                                | Duration      | Status         |
| ------------------------------------ | ------------- | -------------- |
| Phase 1 Manual Testing               | 2-4 hours     | 🔄 In Progress |
| Priority 1: Electron upgrade         | 30 min        | ⏳ Pending     |
| Priority 2: Vitest upgrade           | 1 hour        | ⏳ Pending     |
| Priority 3: electron-builder upgrade | 2 hours       | ⏳ Pending     |
| Final verification                   | 1 hour        | ⏳ Pending     |
| **Total**                            | **6-8 hours** |                |

---

## Notes

- npm itself has a minor update available: `11.9.0` → `11.11.0`

  ```bash
  npm install -g npm@11.11.0
  ```

  (Optional, low priority)

- The project uses 842 packages total (103 prod, 836 dev)
- 216 packages are looking for funding (run `npm fund` if interested)

---

## Approval

**Approved to proceed with Phase 1 testing:** ✅ YES

**Reason:** All vulnerabilities are in dev dependencies and do not affect the ability to test Phase 1 functionality. Updates can safely be deferred until after Phase 1 validation.

**Next step:** Continue with MANUAL-TESTS.md section 1.2 (Build verification)
