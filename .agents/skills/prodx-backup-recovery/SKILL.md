# PRODX Backup and Recovery

## Mission
Prove that production data can be recovered within defined business limits.

## Rules
- Define and verify RPO/RTO for production-critical data.
- Backups must be protected, identifiable, and independently restorable.
- A successful backup job is not proof of recoverability; perform restore verification.
- Test point-in-time or equivalent recovery when required by the architecture.
- Document data loss boundaries, restore ordering, application compatibility, and post-restore validation.
- Include database migrations/schema compatibility in recovery planning.

## Gate checklist
- [ ] Backup mechanism is implemented.
- [ ] Backup retention/protection is verified.
- [ ] Restore has been executed successfully.
- [ ] Recovered data integrity is validated.
- [ ] RPO/RTO evidence exists.
- [ ] DR/failure procedure is reproducible.

## Evidence
PASS requires actual restore evidence with timestamp/run details. Configuration or documentation alone is `Unverified`.
