# M2 Authentication Lockout Policy

Status: approved for implementation by the product owner on 2026-09-14.

- Five consecutive failed password attempts trigger lockout.
- Lockout lasts 15 minutes from the fifth failed attempt.
- Scope is the user's password credential identity.
- Attempts received during active lockout are rejected without changing the counter or extending the lockout.
- A successful authentication resets the failed-attempt counter and clears the lockout timestamp.
- Lockout and successful unlock/reset are security events that must be recorded by the audit-event persistence slice when that slice is implemented.
- The server remains authoritative; clients cannot clear or bypass lockout state.
