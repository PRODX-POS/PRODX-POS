# PRODX Observability

## Mission
Make failures diagnosable and auditable in production.

## Rules
- Use structured logs with stable event names and correlation/request identifiers where the stack supports them.
- Never log passwords, tokens, payment secrets, or unnecessary personal/sensitive data.
- Emit metrics for critical transaction success/failure, latency, queue depth, sync failures, and infrastructure health as appropriate.
- Preserve audit events for security and business actions that require accountability.
- Distinguish operational logs from immutable business/audit records.
- Alerts should represent actionable failure conditions, not merely high log volume.

## Gate checklist
- [ ] Critical business failures are observable.
- [ ] Correlation across request and async work exists where needed.
- [ ] Sensitive data is excluded/redacted.
- [ ] Audit events are durable and attributable.
- [ ] Health/readiness signals are meaningful.

## Evidence
PASS requires actual instrumentation and test/inspection evidence, not a claim that a future monitoring platform will provide it.
