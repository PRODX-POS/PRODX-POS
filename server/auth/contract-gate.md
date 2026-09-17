# Authentication Contract Gate

The production login boundary is tenant/store/register scoped. The server resolves an active organization, store, explicitly registered device, organization-scoped credential, and store membership before issuing a bearer session. Session verification and logout are server-authoritative.
