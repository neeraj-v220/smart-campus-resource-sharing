# CommonGround — Smart Campus Resource Sharing

A working campus sharing web app for posting resources, requesting items, accepting offers, tracking handovers and returns, chatting with participants, and receiving notifications.

## Demo and source

- **Live demo:** https://smart-campus-resource-sharing.vercel.app/
- **GitHub:** https://github.com/neeraj-v220/smart-campus-resource-sharing

The hosted demo uses SQLite in Vercel's temporary `/tmp` directory. Its data may reset after a restart and is not shared across serverless instances. This deployment is suitable for a presentation demo; use a persistent shared database before real campus use.

## Run locally

Requires Node.js 24 or newer. No package install is needed.

```powershell
Copy-Item .env.example .env
$env:PORT = '3000'
$env:DB_PATH = './data/campus.sqlite'
node server.mjs
```

Open http://localhost:3000 and register using a `.edu` email address. Set `INSTITUTIONAL_EMAIL_DOMAIN` to restrict registration to a campus domain. To bootstrap an administrator, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before first startup; there is no built-in admin password. Keep those values private.

Run the integration suite with:

```powershell
npm test
```

## Included workflows

- Campus resource listings with keyword search, filters, details, editing and archive controls.
- Resource requests, matching offers, owner notifications and transactional offer acceptance that prevents competing reservations.
- Two-party handover and return confirmation, transaction history, private transaction chat, and ratings after completion.
- Persisted notifications, reports, and administrator account suspension/reactivation with audit events.
- Hashed passwords and sessions, HttpOnly/SameSite cookies, CSRF checks for mutations, and basic login/signup throttling.

## Implementation and known gaps

The backend is Node.js with SQLite and a JSON API; the frontend is responsive HTML, CSS and JavaScript. Chat and notifications refresh through authenticated polling rather than WebSockets. The pasted project brief requested Java/Spring Boot, MySQL, React/TypeScript, Docker, WebSockets, uploads, email verification and other features. This runnable version does not implement uploads, email delivery or password recovery, direct exchanges, request expiration, profile editing, transaction disputes, or listing/report moderation. Exchange requests are disabled.

Before deployment for real campus users, configure an institution-specific email domain, add email verification, and move data/session/rate-limit storage to persistent shared services.
