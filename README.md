# Taskline

A private daily task planner that runs entirely in your browser. Open `index.html` — no Python, no server, no installation, no internet connection.

## Open it

Double-click `index.html` (or drag it into Chrome, Edge, Firefox, or Safari). Everything works from `file://`: accounts, teams, tasks, themes, and backups.

For the simplest possible backup, use the single-file build: **`Taskline.html`**. It contains the CSS and JavaScript inline, so you can copy that one file anywhere and open it.

## Where the data goes

All data is saved in this browser's `localStorage`, under keys such as:

| Key | Contents |
| --- | --- |
| `taskline.users.v1` | Accounts (name, email, password hashes, maiden-name hash) |
| `taskline.session.v1` | The signed-in session (7 days) |
| `taskline.teams.v1` | Teams, owners, and members |
| `taskline.personal.v1.<user-id>` | Private tasks for one account |
| `taskline.team.v1.<team-id>` | Tasks shared with a team |

**Accounts are local to one browser.** Opening the app in a different browser (or a different Windows user profile) shows an empty app. Use **Export JSON** and **Import JSON** in the footer to move tasks between browsers or keep a backup. Clearing browser site data deletes the accounts and tasks, so export first.

This is a privacy convenience, not a security boundary: anyone with access to your browser profile can read its storage. Passwords and maiden-name answers are hashed with PBKDF2-HMAC-SHA256 (240,000 iterations, random salt), but local storage is not encrypted.

## Features

- Email + password accounts with names; each account's personal tasks stay private.
- Show/Hide toggle on every password field, so you can check what you typed.
- Personal and team tasks; teams with owners, members, and assignees.
- Permissions: members can view and edit shared tasks; only the creator or owner can delete them; only the owner can manage or delete the team.
- Title, date, status (Yet to start / In progress / On hold / Complete), priority, and notes.
- Date grouping, overdue highlighting, on-hold warning, and summary counters.
- One-click archive with Undo, plus a separate Archive view for restore/permanent delete.
- Edit and delete tasks with confirmation and Undo.
- Search and filter by text, status, and task type.
- Light/dark theme that remembers your choice.
- JSON export/import for backup and transfer.
- Password change and recovery (see below), with forced re-login after a change.

## Password change and recovery

Open the account menu → **Change password**. You need your current password and mother's maiden name. A wrong maiden name produces a six-digit verification code instead (there is no email server in this app). Click **Show verification code** in the reset window to reveal it.

**Forgot password?** → enter your email and maiden name. If the maiden name matches, you can choose a new password immediately. Otherwise the same local verification code flow is used. After any successful change or reset you are signed out and must sign in again.

Recovery codes are generated in the browser and shown on screen; they are never emailed. The message is stored only in memory while the tab is open.

## Files

- `index.html` — the app page (multi-file build)
- `Taskline.html` — the same app in one self-contained file
- `styles.css` — styling
- `backend.js` — the browser-side API: accounts, sessions, teams, tasks, hashing, and storage
- `app.js` — the interface

## Compatibility

Any modern browser with Web Crypto and `localStorage` works. If Web Crypto is unavailable, `backend.js` falls back to a pure-JavaScript SHA-256/PBKDF2 implementation (slower, but the hashes are identical).

## Troubleshooting

- **"Invalid request." when creating an account or adding a member** — you are using an older `backend.js`. Pull the latest version (commit `1b668d0` or newer) or re-download `Taskline-2026-11-20.zip`, then reload the page. Newer versions parse API paths directly and do not depend on the page URL.
- **"An account with that email already exists"** — that email is already registered in this browser. Use **Sign in**, or **Forgot password?** if you need to reset it.
- **Accounts are missing** — each browser profile has its own accounts. Use **Import JSON** in the footer to restore tasks from a backup.

## Backup reminder

There is no server-side copy. Export JSON regularly and keep the file somewhere safe. Import restores tasks into the currently signed-in account.
