---
inclusion: auto
---

# Security Compliance Steering — NACSA, SCA, ISO 27001

This steering file defines security requirements for all code changes in this Angular frontend project. Every modification must be checked against these controls before being considered complete.

Standards referenced:
- NACSA (National Cyber Security Agency) — Malaysian national cybersecurity framework
- SCA (Secure Coding Assessment) — Secure development lifecycle practices
- ISO 27001:2022 — Information Security Management System (Annex A controls)

---

## A. Authentication and Session Management

ISO 27001: A.8.5 (Secure authentication), A.5.17 (Authentication information)
NACSA: Identity and Access Management controls
SCA: Authentication best practices

### Checks

1. **Token storage** — Tokens are stored in `localStorage`. Verify that:
   - No token is ever logged to the console or included in error reports.
   - Token values are removed on logout and session expiry.
   - Token scope is checked before attaching to requests (only RMC API endpoints).

2. **Authentication flow integrity** — The app uses external APU OAuth-like redirect flow:
   - Redirect URLs must come from `environment` config, never from user input.
   - The `endpoint` query parameter in login redirects must be validated with `getSafeLoginEndpoint()`.
   - Token exchange must happen over HTTPS in non-local environments.
   - On auth failure, all stored credentials must be cleared.

3. **Session expiry** — The `sessionExpiryInterceptor` handles 401 with error code 40143:
   - Expired sessions must trigger a full logout (token + user data removal).
   - No silent re-authentication without user awareness.

4. **Demo credentials** — The `DUMMY_USERS` array in `auth.service.ts` contains plaintext passwords:
   - This must NEVER be deployed to production builds.
   - Production environment files (`environment.production.ts`) must not reference dummy auth flows.
   - Consider guarding demo code behind `!environment.production` checks.

---

## B. Authorization and Access Control

ISO 27001: A.5.15 (Access control), A.5.18 (Access rights), A.8.3 (Information access restriction)
NACSA: Least-privilege access, role separation
SCA: Authorization enforcement at every layer

### Checks

1. **Route guards** — `permissionGuard` enforces RBAC via `NavPermission` rules:
   - Every protected route must declare a `permission` data property.
   - New routes must not bypass the guard without documented justification.
   - The guard's bypass for `?id=` or `?request_id=` params assumes backend enforcement — document this.

2. **Role-based visibility** — UI elements must respect the user's groups:
   - Do not show actions the user cannot perform.
   - Do not expose admin-only data in component templates without a group check.
   - Use `PermissionService.canAccess()` or `AclService` for conditional rendering.

3. **Principle of least privilege** — New features must:
   - Default to restricted access, then explicitly grant.
   - Not add new groups or roles without updating the permission model documentation.

---

## C. Input Validation and Output Encoding

ISO 27001: A.8.26 (Application security requirements)
NACSA: Input validation, injection prevention
SCA: OWASP Top 10 — Injection, XSS

### Checks

1. **Angular's built-in XSS protection** — The framework sanitizes template bindings by default:
   - Never bypass with `bypassSecurityTrustHtml()` unless the content is from a trusted, controlled source.
   - If `innerHTML` binding is used, document why and confirm the source is safe.
   - Rich text editors (Quill) output must be sanitized before rendering elsewhere.

2. **User input validation** — All form inputs must be validated:
   - Use Angular reactive form validators (required, minLength, maxLength, pattern).
   - Use `<app-validation-message>` to surface errors.
   - Validate on the client for UX, but never trust client validation as the security boundary.

3. **URL parameters** — Query parameters used for routing or API calls:
   - Must be validated against expected formats.
   - `getSafeReturnRoute()` pattern must be followed for any redirect logic.
   - Never construct URLs by concatenating unsanitized user input.

4. **File uploads** — If file upload features exist or are added:
   - Validate file type, size, and name on the client.
   - Never execute or render uploaded content without backend validation.

---

## D. Data Protection and Confidentiality

ISO 27001: A.5.33 (Protection of records), A.5.34 (Privacy and PII), A.8.11 (Data masking)
NACSA: Data classification, data-at-rest and data-in-transit protection
SCA: Sensitive data exposure prevention

### Checks

1. **No secrets in source code** — Verify before every commit:
   - No API keys, passwords, or tokens in TypeScript/HTML/SCSS files.
   - Environment files must contain only URLs and feature flags, not secrets.
   - The `.gitignore` must exclude `.env` files (currently missing — this is a gap).

2. **Sensitive data in transit** — All API communication must use HTTPS:
   - Production and staging environments must use `https://` URLs.
   - Local development (`http://localhost`) is acceptable only for local mock server.
   - The `authTokenInterceptor` must not attach tokens to non-HTTPS requests in deployed environments.

3. **Sensitive data in storage** — localStorage is accessible to any script on the same origin:
   - Do not store PII beyond what is needed for session display (name, email, role).
   - Never store full application data or financial information client-side.
   - Clear all stored data on logout.

4. **Console and error logging** — In production:
   - No `console.log` statements containing user data or tokens.
   - Error reports must redact sensitive fields before transmission.

---

## E. Security Headers and Transport Security

ISO 27001: A.8.9 (Configuration management), A.8.20 (Networks security)
NACSA: Secure configuration, transport layer security
SCA: HTTP security headers, HTTPS enforcement

### Checks

1. **Mock server headers** — `server.mjs` already sets:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: same-origin`
   - `Cross-Origin-Resource-Policy: same-origin`
   - `Cache-Control: no-store, max-age=0`

2. **Production deployment** — Ensure the production server or CDN also provides:
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `Content-Security-Policy` with restrictive defaults.
   - `Permissions-Policy` limiting browser features.
   - These are infrastructure concerns but must be documented for operations.

3. **CORS** — The mock server uses an origin allowlist:
   - Production must also restrict CORS to known frontend origins.
   - Never use `Access-Control-Allow-Origin: *` with credentials.

---

## F. Dependency and Supply Chain Security

ISO 27001: A.5.19 (Information security in supplier relationships), A.8.28 (Secure coding)
NACSA: Supply chain risk management
SCA: Third-party component security

### Checks

1. **Dependency versions** — `package.json` uses caret (`^`) ranges:
   - For production deployments, consider pinning exact versions or using lockfiles.
   - `package-lock.json` and `pnpm-lock.yaml` must be committed and reviewed for integrity.

2. **Known vulnerabilities** — Before releasing:
   - Run `npm audit` or `pnpm audit` and resolve critical/high findings.
   - No dependency with known critical CVEs should ship to production.

3. **Minimal dependencies** — Only include what is needed:
   - Review new dependency additions for necessity and trustworthiness.
   - Check download counts, maintenance status, and known issues.
   - Avoid packages with less than 1000 weekly downloads unless well-justified.

4. **Integrity verification** — Lockfiles provide hash verification:
   - Do not delete or regenerate lockfiles without cause.
   - If lockfile conflicts occur, resolve carefully and re-audit.

---

## G. Error Handling and Logging

ISO 27001: A.8.15 (Logging), A.8.16 (Monitoring activities)
NACSA: Security event logging
SCA: Secure error handling

### Checks

1. **No stack traces to users** — Error messages shown in the UI must be:
   - User-friendly and generic (e.g., "Something went wrong").
   - Free of internal implementation details, file paths, or SQL fragments.

2. **Auth errors** — Authentication and authorization failures must:
   - Return appropriate HTTP status awareness (401, 403) without leaking reason details to attackers.
   - Not distinguish between "user not found" and "wrong password" in UI messages.

3. **Error boundaries** — Unhandled exceptions must not crash the app silently:
   - Use Angular's `ErrorHandler` or a global handler to catch and report.
   - Ensure error reports are sent to a monitoring service (not console-only) in production.

---

## H. Secure Development Practices

ISO 27001: A.8.25 (Secure development lifecycle), A.8.28 (Secure coding), A.8.29 (Security testing)
NACSA: Secure SDLC requirements
SCA: Code review, static analysis, testing

### Checks

1. **Code review** — All security-sensitive changes must be reviewed:
   - Auth flow modifications.
   - New API integrations.
   - Changes to guards, interceptors, or permission logic.
   - Environment configuration changes.

2. **Environment separation** — The project has four environments:
   - Local (localhost:8000 / localhost:3000 mock)
   - Dev (dev-api.apu.edu.my)
   - Staging (same dev URLs with staging flag)
   - Production (rmc-api.apu.edu.my)
   - Each must have appropriate security controls for its tier.

3. **Build security** — Production builds must:
   - Use `--configuration production` which enables AOT, tree-shaking, and minification.
   - Strip debug code and source maps from deployed artifacts.
   - Not include environment files with non-production URLs.

4. **Testing security logic** — Auth guards, interceptors, and permission logic must have unit tests:
   - Test that unauthorized users are redirected.
   - Test that tokens are not attached to external URLs.
   - Test that session expiry triggers logout.

---

## I. Infrastructure and Deployment Security

ISO 27001: A.8.9 (Configuration management), A.8.32 (Change management)
NACSA: Secure deployment, change management
SCA: CI/CD pipeline security

### Checks

1. **CI/CD pipeline** — `bitbucket-pipelines.yml` defines the build pipeline:
   - Pipeline must not expose secrets in logs.
   - Build artifacts must be verified before deployment.
   - Deployment credentials must use short-lived tokens or service accounts.

2. **Environment variables** — Sensitive configuration must:
   - Be injected at build/deploy time, not committed to the repository.
   - Be documented in a `.env.example` without actual values.

3. **Access to production** — Deployment to production must:
   - Require approval from authorized personnel.
   - Be auditable (who deployed what, when).

---

## J. Current Codebase Audit Results

Last audited: 2026-07-20

### PASS — Controls Met

| # | Control | Standard | Status | Evidence |
|---|---------|----------|--------|----------|
| 1 | No `console.log` in production code | SCA, ISO A.8.15 | PASS | Zero `console.(log/debug/info/warn)` found in non-spec `.ts` files |
| 2 | No `eval()` or `new Function()` | SCA (Injection) | PASS | No code injection vectors found |
| 3 | No raw `fetch()` bypassing interceptors | ISO A.8.26 | PASS | All HTTP calls use Angular `HttpClient` with interceptor chain |
| 4 | No hardcoded non-localhost HTTP URLs | ISO A.8.20, NACSA | PASS | All non-local URLs use HTTPS via environment config |
| 5 | All authenticated routes protected | ISO A.5.15, NACSA | PASS | Parent route uses `authGuard`; feature routes add `permissionGuard` |
| 6 | No `postMessage` or message listeners | SCA (XSS) | PASS | No cross-origin messaging attack surface |
| 7 | No native form submissions | SCA | PASS | No `action=` or `method=` in templates; all requests via HttpClient |
| 8 | No `document.cookie` access | ISO A.5.17 | PASS | Token management uses localStorage only, no cookie manipulation |
| 9 | Token scope enforcement | ISO A.8.5 | PASS | `authTokenInterceptor` only attaches Bearer token to RMC API endpoints |
| 10 | Session expiry handling | ISO A.8.5 | PASS | 401 with code 40143 triggers full logout and credential cleanup |
| 11 | Safe redirect validation | SCA (Open Redirect) | PASS | `getSafeReturnRoute()` blocks `//`, validates paths, strips dangerous params |
| 12 | CORS origin allowlist | NACSA, ISO A.8.20 | PASS | Mock server rejects unknown origins with 403 |
| 13 | Security headers on mock server | ISO A.8.9 | PASS | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, CORP, Cache-Control all set |

### FAIL — Issues Requiring Remediation

| # | Finding | Standard | Severity | File(s) | Detail |
|---|---------|----------|----------|---------|--------|
| F1 | Plaintext credentials in source | ISO A.5.17, NACSA, SCA | **HIGH** | `src/app/core/services/auth.service.ts` (lines 28–130) | `DUMMY_USERS` array contains 12+ plaintext passwords. No `environment.production` guard. This code ships in ALL builds including production. |
| F2 | `.env` files not excluded by `.gitignore` | ISO A.5.33, SCA | **MEDIUM** | `.gitignore` | If `.env` files are introduced, they will be committed to version control. No `.env*` pattern exists. |
| F3 | `bypassSecurityTrustHtml` usage | SCA (XSS), ISO A.8.26 | **LOW** | `src/app/shared/components/svg-icon/svg-icon.component.ts` | Uses `bypassSecurityTrustHtml` for SVG rendering. Acceptable because input is from internal `SvgIconDefinition` constants, not user input. Document this risk acceptance. |
| F4 | `innerHTML` binding with backend content | SCA (XSS), ISO A.8.26 | **MEDIUM** | `journal-guidelines-modal.component.html`, `guidelines-modal.component.html` | Renders `guideline.content` and `content()` via `[innerHTML]`. If this content originates from a backend CMS or user-editable field, it is an XSS vector. Angular sanitizes by default but complex HTML may still pose risk. |
| F5 | ABAC override component has no environment gate | ISO A.5.15, NACSA | **HIGH** | `src/app/features/travel-authorization/components/abac-override/` | Allows users to override their own access control groups at runtime. No check for `environment.production` — if rendered in production, this is a privilege escalation tool. |
| F6 | No Content-Security-Policy documented | ISO A.8.20, NACSA | **MEDIUM** | N/A | No CSP meta tag in `index.html` or documentation of server-side CSP headers for production. |
| F7 | Token stored in localStorage (XSS exfiltration risk) | ISO A.5.17, SCA | **MEDIUM** | `src/app/core/services/auth.service.ts` | Any XSS vulnerability allows token theft. Risk accepted if no XSS vectors exist, but should be documented. |
| F8 | No production-mode `console.error` filtering | ISO A.8.15, SCA | **LOW** | `src/app/features/conference/services/conference-form-state.service.ts` | Uses `console.error` which may leak information in production browser devtools. |
| F9 | Admin settings routes lack individual permission guards | ISO A.5.15, NACSA | **MEDIUM** | `src/app/features/admin-settings/admin-settings.routes.ts` | Only `batch-sitting` has its own `permissionGuard`. Other admin child routes (guidelines, form-setting, dropdowns) rely only on the parent-level admin guard — if the parent permission is broad, children are under-protected. |
| F10 | Lockfile duplication (npm + pnpm) | ISO A.5.19 | **LOW** | `package-lock.json`, `pnpm-lock.yaml` | Two lockfiles exist. If the team switches package managers without cleaning up, integrity guarantees may diverge. |

### ADVISORY — Awareness Items

| # | Item | Note |
|---|------|------|
| A1 | Form data in localStorage | Conference form state and admin catalog data persisted in localStorage. Not sensitive PII but survives logout if not explicitly cleared. |
| A2 | ABAC custom profiles in localStorage | Travel authorization ABAC override stores custom role profiles. Dev/testing tool — verify it is not rendered in production. |
| A3 | `external-project-data-entry/detail/:requestCode` route has no permission guard | Relies on being under the `authGuard` parent, so authentication is required, but no role-based restriction exists for viewing specific records. This matches the documented pattern (any authenticated user may view by ID). |

---

## K. Remediation Priority

### Immediate (before next release)

1. **F1** — Wrap `DUMMY_USERS` in a dev-only guard or move to a file excluded from production builds.
2. **F5** — Add `environment.production` check to prevent ABAC override from rendering in production.

### Short-term (next sprint)

3. **F2** — Add `.env*` and `!.env.example` to `.gitignore`.
4. **F4** — Audit the source of guidelines content; add DOMPurify sanitization if content is user-editable.
5. **F9** — Add individual permission guards to admin child routes.

### Medium-term (backlog)

6. **F6** — Define and deploy CSP headers for production.
7. **F7** — Document localStorage token risk acceptance or migrate to httpOnly cookies.
8. **F10** — Remove unused lockfile to prevent integrity drift.

---

## Compliance Checklist for Code Review

Before approving any PR, verify:

- [ ] No hardcoded secrets, passwords, or API keys introduced
- [ ] New routes have appropriate permission guards
- [ ] User input is validated with reactive form validators
- [ ] No `bypassSecurityTrust*` usage without documented justification
- [ ] Error messages do not leak implementation details
- [ ] New dependencies have been audited (`npm audit`)
- [ ] Auth token is not exposed in logs or error reports
- [ ] HTTPS is used for all non-localhost API calls
- [ ] Sensitive data is cleared on logout
- [ ] Environment-specific code is gated by environment flags
- [ ] Changes to auth/permission logic have corresponding tests
- [ ] No `console.log` with sensitive data in committed code
