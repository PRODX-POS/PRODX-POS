# Authentication Contract Gate

Production login is tenant/store/register scoped. The server resolves the organization, active store, explicit `register_id` on an active provisioned device, organization-scoped user credential, and active store membership before issuing a bearer session. Session verification and logout use the server-issued bearer token; client code must not fabricate authorization state.
