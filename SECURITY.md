# Security Policy

## Supported Versions

AI Commander v1.0.0 and later are supported with security updates.

| Version | Supported | Status      |
| ------- | --------- | ----------- |
| 1.0.0+  | ✅ Yes    | Active      |
| < 1.0.0 | ❌ No     | End of Life |

For versions below 1.0.0, security patches are not provided. Users are encouraged to upgrade to v1.0.0 or later.

---

## Vulnerability Reporting

If you discover a security vulnerability in AI Commander, please **do not** open a public GitHub issue. Instead, report it confidentially.

### Reporting Process

1. **Email:** security@anthropic.com
   - Subject: `[AI Commander Security] Description of vulnerability`
   - Include: Version affected, reproduction steps, potential impact

2. **What to Include:**
   - Description of the vulnerability
   - Affected component(s)
   - Steps to reproduce
   - Potential impact (confidentiality, integrity, availability)
   - Suggested fix (if you have one)

3. **Timeline:**
   - We will acknowledge receipt within 48 hours
   - We will assess severity and develop a fix
   - We will notify you of patch timeline
   - We will provide advance notification of security releases

### Disclosure Policy

We follow responsible disclosure practices:

1. **Report received** → Acknowledge within 48 hours
2. **Assessment** → Determine severity and impact
3. **Development** → Create patch or workaround
4. **Notification** → Notify reporter of patch timeline
5. **Release** → Publish patch and security advisory
6. **Credit** → Acknowledge reporter (if desired)

We request a 30-day embargo period for:

- Critical vulnerabilities (CVSS 9.0+)
- Zero-day vulnerabilities

---

## Known Security Limitations

### Framework Scope

AI Commander is a framework for building AI agents in strategy games. It operates within these constraints:

1. **Local Execution Only:** The framework runs on single machines or local networks. It is not designed for:
   - Internet-facing deployment
   - Distributed multi-user environments
   - Public-facing APIs

2. **Game Integration:** The framework integrates with game engines (currently OpenRA). Security assumes:
   - Game engine is trusted
   - Game state is accessible only to the agent
   - Game commands are properly validated by the game engine

3. **Input Validation:** The framework performs minimal input validation, assuming:
   - Game state from the game engine is valid
   - Application-layer code (planners, decision engines) validates domain-specific inputs
   - External data passed to the framework is already validated

4. **Determinism:** The framework prioritizes deterministic execution for testing. This means:
   - No cryptographic randomness (use `Math.random()` for game logic)
   - No time-based functionality (use game ticks instead of wall-clock time)
   - Not suitable for security-critical random number generation

### Application Responsibility

Applications built with AI Commander are responsible for:

- **Input validation:** Validate all user inputs and external data
- **API security:** If exposing APIs, implement proper authentication and authorization
- **Game state integrity:** Ensure game state cannot be corrupted by agent actions
- **Resource limits:** Prevent runaway agents from consuming excessive resources
- **Sensitive data:** Do not pass sensitive data through the framework

### Recommended Security Practices

When using AI Commander:

1. **Run locally:** Do not expose agents to untrusted networks
2. **Validate inputs:** Validate all data before passing to the framework
3. **Limit resources:** Set reasonable limits on agent execution time and memory
4. **Test thoroughly:** Test agent behavior under edge cases and failure scenarios
5. **Monitor execution:** Log and monitor agent decisions and actions
6. **Regular updates:** Keep AI Commander and dependencies up to date

---

## Dependencies

AI Commander has minimal production dependencies:

- **TypeScript:** Compiler, no runtime dependency
- **vitest:** Testing framework, dev dependency
- **eslint, prettier:** Code quality tools, dev dependencies

All dependencies are actively maintained and monitored for security updates.

### Dependency Security

We commit to:

1. **Monitoring:** Watching for security updates to dependencies
2. **Patching:** Updating vulnerable dependencies promptly
3. **Auditing:** Running `npm audit` regularly to identify issues
4. **Transparency:** Including dependency updates in release notes

---

## Secure Development Practices

### Code Review

All code changes undergo review before merging:

1. Automated checks (TypeScript, ESLint, Prettier)
2. Peer code review
3. Architecture review for significant changes

### Testing

Comprehensive test coverage validates security properties:

- **Determinism tests:** Verify execution is reproducible
- **Error handling tests:** Verify graceful failure
- **Resource stability tests:** Verify no resource leaks
- **Integration tests:** Verify game integration is correct

### CI/CD Security

The CI/CD pipeline enforces:

- TypeScript strict mode
- ESLint rules (no unsafe patterns)
- Prettier formatting
- 246+ automated tests

---

## Security Contact

For security issues, contact: **security@anthropic.com**

Please **do not** file security issues as GitHub issues or pull requests.

---

## Security Advisories

Security advisories will be published on:

1. **GitHub Security Advisories:** github.com/anthropics/ai-commander/security/advisories
2. **Release Notes:** Included in CHANGELOG.md for each release
3. **npm:** Distributed via npm security notifications

---

## Compliance & Standards

### Relevant Standards

AI Commander follows common security practices and principles:

- **OWASP Top 10:** Framework is not web-facing; most OWASP concerns do not apply
- **Secure Coding:** TypeScript strict mode, ESLint rules prevent common issues
- **Testing:** Comprehensive test coverage validates behavior

### Not Applicable

The following are not applicable to AI Commander:

- PCI DSS (no payment processing)
- HIPAA (no healthcare data)
- GDPR (no personal data processing)
- SOC 2 (not a service provider)

---

## Incident Response

If a security vulnerability is confirmed:

1. **Assessment:** Determine severity and impact
2. **Planning:** Develop patch and testing plan
3. **Development:** Create and test patch
4. **Notification:** Notify affected parties (reporters, users)
5. **Release:** Publish patched version
6. **Communication:** Post-incident analysis and updates

---

## Security Roadmap

Future security improvements:

1. Formal security audit (post-v1.0)
2. Fuzzing and property-based testing
3. SBOM (Software Bill of Materials) for transparency
4. Automated dependency scanning
5. Security training for contributors

---

## Questions

For security questions or concerns:

- **Security Issues:** security@anthropic.com
- **General Questions:** Open an issue on GitHub (not for vulnerabilities)
- **Documentation:** See .foundation/architecture/ for design documentation

---

**Last Updated:** July 1, 2026  
**Framework Version:** v1.0.0+  
**Policy Version:** 1.0
