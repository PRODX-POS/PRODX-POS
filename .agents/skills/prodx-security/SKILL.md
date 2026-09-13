---
name: prodx-security
description: Security engineering skill for authentication, authorization, store isolation, secrets, sessions, and abuse resistance.
---

# Security Engineering

Assume the client is hostile and the network is untrusted.

## Authentication
Inspect credential handling, password hashing, session/token lifecycle, expiration, rotation/revocation, secure cookie or token transport, brute-force resistance, and failure behavior. Secrets must never be logged or committed.

## Authorization
For every privileged endpoint and business operation verify identity, role, store/tenant scope, resource ownership, and operation-specific permission on the server. UI hiding is not authorization.

## Store isolation
Treat store/tenant identifiers as security boundaries. Verify access from authenticated server-side context; never trust arbitrary client-supplied tenant scope. Test cross-store read, write, update, delete, export, and indirect-reference attacks.

## Input and output
Validate at trust boundaries, use parameterized queries, enforce allow-lists where appropriate, and prevent injection, IDOR, mass assignment, unsafe redirects, and sensitive-data leakage.

## Security evidence
Prefer executable integration/security tests over prose claims. Record the exact endpoint/operation, attacker model, expected denial, and observed result. Any unknown control is `Unverified`.
