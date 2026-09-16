# prodx-production-readiness

## Purpose
Provide the final evidence-driven gate for production readiness.

## Rules
- Never infer PASS from code presence.
- Every capability is classified Implemented, Partial, Missing, or Unverified.
- PASS requires direct evidence.
- Critical gates cannot be bypassed or weakened.
- Production Ready requires all mandatory critical gates to pass.
- Main verification is required after merge.

## Checklist
- [ ] Architecture gate passed.
- [ ] Security gate passed.
- [ ] Database gate passed.
- [ ] Financial integrity gate passed.
- [ ] Inventory integrity gate passed.
- [ ] Payments/refund/void gate passed.
- [ ] Shift/cash gate passed.
- [ ] Offline/sync gate passed.
- [ ] Idempotency/concurrency gate passed.
- [ ] Audit/observability gate passed.
- [ ] Backup/restore and DR evidence passed.
- [ ] Production infrastructure hardening passed.
- [ ] CI/CD gate passed.
- [ ] Independent review and milestone acceptance passed.
- [ ] Main verification passed.

## Evidence requirements
Each PASS must reference executable tests, migration evidence, CI results, runtime/integration evidence, or equivalent direct proof. Missing evidence is UNVERIFIED.

## Failure cases
- Declaring production ready with unverified critical capability
- Bypassing protected CI/review gates
- Treating mock behavior as production evidence
- Changing tests to conceal root cause
- Merging without independent review/acceptance
