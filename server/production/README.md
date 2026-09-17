# Production Runtime Gate

This directory documents the acceptance contract for the production HTTP runtime.

The production deployment must provide a concrete server entrypoint that:

1. Loads production configuration from the environment/secret manager.
2. Creates the PostgreSQL pool and transactional executor.
3. Composes PostgreSQL authentication/session handling.
4. Installs authorization and all production HTTP routes.
5. Exposes liveness and readiness checks.
6. Handles graceful shutdown and closes the PostgreSQL pool.
7. Fails closed when required configuration is absent.

A production build without an executable server entrypoint is not sufficient evidence for the Production Infrastructure gate. The implementation must be exercised by an integration or deployment test before this gate can be marked PASS.
