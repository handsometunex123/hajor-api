-- Migration: Add DB-level accounting guard, stored proc and triggers
-- Run as a DB superuser / DBA. Review before applying in production.

BEGIN;

-- Ensure extensions for UUID generation and JSON helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create accounting schema
CREATE SCHEMA IF NOT EXISTS accounting;

-- Guard function: blocks direct writes unless session flag hajor.allow_internal = 'true'
CREATE OR REPLACE FUNCTION accounting.block_writes_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('hajor.allow_internal', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Direct writes to guarded table % are forbidden. Use internal stored procedures.', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach guard triggers to sensitive tables
-- Note: Prisma uses model names as table names; quoted identifiers used to match case.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'Transaction') THEN
    EXECUTE 'CREATE TRIGGER block_transaction_writes BEFORE INSERT OR UPDATE OR DELETE ON "Transaction" FOR EACH ROW EXECUTE FUNCTION accounting.block_writes_guard();';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class WHERE relname = 'Wallet') THEN
    EXECUTE 'CREATE TRIGGER block_wallet_writes BEFORE INSERT OR UPDATE OR DELETE ON "Wallet" FOR EACH ROW EXECUTE FUNCTION accounting.block_writes_guard();';
  END IF;
END
$$;

-- SECURITY DEFINER function to create transaction and audit atomically
CREATE OR REPLACE FUNCTION accounting.create_transaction_internal(
  p_wallet_id uuid,
  p_type text,
  p_amount numeric,
  p_reference text,
  p_status text,
  p_metadata json
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  -- enable internal flag for triggers
  PERFORM set_config('hajor.allow_internal', 'true', true);

  INSERT INTO "Transaction" (id, "walletId", type, amount, reference, status, metadata, "createdAt")
  VALUES (v_id, p_wallet_id, p_type::text, p_amount, p_reference, p_status::text, p_metadata, now());

  -- write an audit log entry
  INSERT INTO "AuditLog" (id, "actorId", action, "entityType", "entityId", metadata, "createdAt")
  VALUES (gen_random_uuid(), NULL, 'create_transaction', 'Transaction', v_id::text, json_build_object('reference', p_reference, 'amount', p_amount, 'metadata', p_metadata), now());

  -- disable internal flag for remaining session
  PERFORM set_config('hajor.allow_internal', 'false', true);

  RETURN v_id;
END;
$$;

COMMIT;

-- Rollback notes:
-- To revert: DROP FUNCTION accounting.create_transaction_internal(uuid, text, numeric, text, text, json);
-- DROP TRIGGER block_transaction_writes ON "Transaction"; DROP TRIGGER block_wallet_writes ON "Wallet"; DROP FUNCTION accounting.block_writes_guard();
