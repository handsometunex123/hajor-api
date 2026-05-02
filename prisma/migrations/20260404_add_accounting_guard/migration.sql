-- Migration: Add DB-level accounting guard triggers and create_transaction_internal stored procedure
-- Idempotent: safe to run on a DB that already has these objects.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS accounting;

-- Guard trigger function: blocks direct writes to Transaction/Wallet unless
-- the session variable hajor.allow_internal = 'true' has been set via set_config().
CREATE OR REPLACE FUNCTION accounting.block_writes_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hajor.allow_internal', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Direct writes to guarded table % are forbidden. Use internal stored procedures.', TG_TABLE_NAME
      USING ERRCODE = 'EP0001';
  END IF;
  RETURN NEW;
END;
$$;

-- Attach guard trigger to Transaction table (idempotent via NOT EXISTS check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'block_transaction_writes' AND c.relname = 'Transaction'
  ) THEN
    CREATE TRIGGER block_transaction_writes
      BEFORE INSERT OR UPDATE OR DELETE ON "Transaction"
      FOR EACH ROW EXECUTE FUNCTION accounting.block_writes_guard();
  END IF;
END$$;

-- Attach guard trigger to Wallet table (idempotent via NOT EXISTS check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE t.tgname = 'block_wallet_writes' AND c.relname = 'Wallet'
  ) THEN
    CREATE TRIGGER block_wallet_writes
      BEFORE INSERT OR UPDATE OR DELETE ON "Wallet"
      FOR EACH ROW EXECUTE FUNCTION accounting.block_writes_guard();
  END IF;
END$$;

-- Stored procedure: create a single transaction and audit log entry atomically.
-- Internally sets allow_internal so the guard trigger permits the INSERT.
CREATE OR REPLACE FUNCTION accounting.create_transaction_internal(
  p_wallet_id uuid,
  p_type      text,
  p_amount    numeric,
  p_reference text,
  p_status    text,
  p_metadata  json
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  PERFORM set_config('hajor.allow_internal', 'true', true);

  INSERT INTO "Transaction" (id, "walletId", type, amount, reference, status, metadata, "createdAt")
  VALUES (v_id, p_wallet_id, p_type, p_amount, p_reference, p_status, p_metadata, now());

  INSERT INTO "AuditLog" (id, "actorId", action, "entityType", "entityId", metadata, "createdAt")
  VALUES (
    gen_random_uuid(), NULL, 'create_transaction', 'Transaction', v_id::text,
    json_build_object('reference', p_reference, 'amount', p_amount, 'metadata', p_metadata),
    now()
  );

  PERFORM set_config('hajor.allow_internal', 'false', true);

  RETURN v_id;
END;
$$;
