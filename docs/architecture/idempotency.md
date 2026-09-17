# Idempotency Contract

Checkout idempotency is enforced at the store boundary by a unique `(store_id, idempotency_key)` constraint in PostgreSQL.

A committed checkout also stores a SHA-256 request fingerprint. A retry with the same store and key is replayed only when the semantic request fingerprint matches. Reuse of a key with a different payload fails closed with a checkout conflict.

Historical orders created before the fingerprint migration have no safely reconstructable original client payload and therefore do not receive a fabricated fingerprint. Replaying such a legacy key fails closed; callers must submit a new idempotency key.
