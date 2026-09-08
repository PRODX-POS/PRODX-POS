# PRODX AI Capability Boundary

AI capabilities are assistive only and require the authenticated `ai:use` permission.

Allowed capabilities are intentionally limited to:
- `assistant`
- `explanation`
- `draft`

Authoritative POS facts remain owned by the backend/domain layer. AI must not become
source of truth for financial totals, VAT, inventory, payments, refunds, or audit data.
