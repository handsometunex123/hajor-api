DB Write Guard: rollout steps

Goal
- Enforce DB-level protection so only internal code paths can create or modify ledger entries (`Transaction`) or wallet records.
- Provide a safe migration and rollout plan.

Files added
- prisma/migrations/20260404_add_accounting_guard.sql — creates `accounting.create_transaction_internal()` stored procedure and trigger guard.

Preconditions
- You must have a Postgres DB and a DBA who can run migrations as a superuser (to create extensions and SECURITY DEFINER functions).
- Ensure application is backed up and you can run migrations in a maintenance window or with zero-downtime strategy.

Rollout Plan (recommended)
1. Review SQL
   - Inspect `prisma/migrations/20260404_add_accounting_guard.sql` and adjust schema/table names if you customized them.

2. Deploy stored procedure and triggers (safe test)
   - On a staging DB, run the SQL file using psql or your migration tool:

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260404_add_accounting_guard.sql
```

   - Confirm the functions and triggers exist:

```sql
SELECT proname FROM pg_proc WHERE proname LIKE 'create_transaction_internal%';
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'block_%';
```

3. Test behaviour
   - In staging, attempt a direct INSERT into "Transaction" as the normal app role — it should fail with an error.
   - Call the stored procedure directly as superuser to ensure it inserts and logs correctly.

4. Adjust application code
   - Update `TransactionsService.createTransaction()` to call the stored procedure (already implemented in this codebase).
   - Ensure other internal code paths that create transactions use `TransactionsService` or call the stored procedure.

5. Deploy changes to application code
   - Deploy the new backend that uses the stored procedure.

6. Create or update DB role permissions (DBA)
   - Create an application role (if not present) and ensure it has no direct INSERT/UPDATE/DELETE on `Transaction`/`Wallet`.
   - Grant EXECUTE on `accounting.create_transaction_internal` to the application role.

Example SQL for DBAs (run as superuser):

```sql
-- Create app role (if not existing)
-- CREATE ROLE hajor_app NOINHERIT LOGIN PASSWORD 'secure-password';

-- Revoke direct DML
REVOKE INSERT, UPDATE, DELETE ON "Transaction" FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON "Transaction" FROM hajor_app;
REVOKE UPDATE, DELETE ON "Wallet" FROM hajor_app;

-- Grant execute on the stored procedure
GRANT EXECUTE ON FUNCTION accounting.create_transaction_internal(uuid, text, numeric, text, text, json) TO hajor_app;
```

7. Monitor after rollout
   - Use the reconciliation job to detect any missing or mismatched transactions.
   - Watch logs for exceptions where code attempted direct writes — these will now fail and should be fixed to use the stored proc.

8. Optional hardening
   - Replace the stored procedure internals with additional checks (unique reference enforcement, more detailed audit metadata).
   - Add stored procedures for other accounting operations (confirmations, reversals) and remove remaining direct DML privileges.

Rollback
- To rollback the SQL changes, remove triggers and functions (DBA action):

```sql
DROP FUNCTION IF EXISTS accounting.create_transaction_internal(uuid, text, numeric, text, text, json);
DROP TRIGGER IF EXISTS block_transaction_writes ON "Transaction";
DROP TRIGGER IF EXISTS block_wallet_writes ON "Wallet";
DROP FUNCTION IF EXISTS accounting.block_writes_guard();
DROP SCHEMA IF EXISTS accounting;
```

Notes
- This approach enforces ledger-only writes at the DB level and significantly reduces risk from compromised application code or credentials.
- Stored procedures run with the privileges of their owner; keep the function body minimal and audited.
- Test carefully in staging and ensure backups and monitoring are in place.
