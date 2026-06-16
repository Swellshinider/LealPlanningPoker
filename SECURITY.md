# Security Policy

## Supported versions

LealPlanningPoker is a self-hosted application. Only the latest released version
receives security updates.

| Version  | Supported          |
| -------- | ------------------ |
| latest   | :white_check_mark: |
| < latest | :x:                |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report vulnerabilities privately using
[GitHub's private vulnerability reporting](https://github.com/Swellshinider/LealPlanningPoker/security/advisories/new):

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the issue, affected versions, reproduction steps, and any known
   mitigations.

You should receive an acknowledgement within 72 hours. If you do not, please
follow up via the same channel.

Please do not disclose the vulnerability publicly until a fix has been released.

## Scope

Vulnerabilities in the latest release are in scope, including but not limited
to:

- Cross-site scripting (XSS) in the web client
- Authentication or authorization bypass in the host controls
- Server-side request forgery or injection in the API
- Denial of service via crafted SSE or socket payloads
- Insecure default configuration that exposes sensitive data

## Out of scope

- Vulnerabilities in self-hosted deployments using outdated versions.
- Issues that require already-compromised host credentials.
- Theoretical issues without a working proof of concept.
- Findings from automated scanners without manual verification.

## Disclosure

Once a fix is released we will publish a GitHub Security Advisory crediting the
reporter (unless they prefer to remain anonymous).
