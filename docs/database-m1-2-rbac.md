# PRODX POS — M1.2 RBAC Persistence

M1.2 establishes the durable authorization model needed before protected business APIs are implemented.

## Scope

- `prodx_permissions`: canonical, application-defined permission keys.
- `prodx_roles`: organization-owned roles with unique tenant-local keys.
- `prodx_role_permissions`: role-to-permission grants, tenant-scoped by composite foreign key.
- `prodx_store_memberships`: explicit user-to-store membership inside one organization.
- `prodx_user_roles`: store-scoped role assignments that require an existing store membership.

## Security invariants

1. PostgreSQL is authoritative for role and permission state.
2. Users, stores, roles, memberships, and role assignments cannot cross organization boundaries through these relationships.
3. A user cannot receive a store role without an active or existing membership row for that same organization/store/user tuple.
4. Role keys are unique only within an organization; permission keys are globally canonical and application-owned.
5. Deleting a role does not orphan role-permission rows; deleting a store membership is blocked while a role assignment references it.
6. No authentication secret, session token, device state, or business transaction state is stored by M1.2.
7. Authorization decisions must require both the requested organization/store scope and the resolved permission. UI visibility is never an authorization boundary.

## Permission catalog

The initial canonical keys are:

- `dashboard.read`
- `catalog.read`, `catalog.write`
- `inventory.read`, `inventory.adjust`
- `pos.sell`, `pos.void`, `pos.refund`
- `payment.capture`
- `cash.shift.open`, `cash.shift.close`
- `reports.read`
- `users.read`, `users.manage`
- `rbac.manage`

These keys are stable API/domain vocabulary. Tenant administrators grant them through organization-owned roles; application code must not infer privilege from display names.

## Deliberate boundary

M1.2 does not create default `admin`, `manager`, or `cashier` roles. Those are business-policy fixtures and should be introduced only when the product-level authorization policy and bootstrap/administration flow are defined and tested.
