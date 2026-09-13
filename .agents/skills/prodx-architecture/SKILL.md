# PRODX Architecture

## Mission
Protect architectural boundaries and server authority.

## Rules
- Inspect existing architecture before changing boundaries.
- Business rules affecting money, stock, permissions, or audit must remain server-authoritative.
- Keep domain, persistence, transport, and UI responsibilities separated according to the repository's existing architecture.
- Do not introduce client-side trust for values the server can derive or validate.
- Prefer explicit invariants and narrow interfaces over hidden coupling.
- Treat cross-store access as a security boundary.

## Gate checklist
- [ ] Architecture and dependency direction understood from actual code.
- [ ] Server remains authoritative for critical business decisions.
- [ ] No forbidden layer bypass introduced.
- [ ] Store/tenant boundary is explicit.
- [ ] Existing architecture tests/gates still pass.

## Evidence
A PASS requires concrete repository paths plus relevant tests/CI evidence. If architecture intent is documented but not enforced, classify as `Partial` or `Unverified` rather than PASS.
