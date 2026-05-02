-- Migration: Add DB-level double-entry stored procedure
-- Creates accounting.create_double_entry(from_wallet uuid, to_wallet uuid, amount numeric, reference text, status text, metadata json)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS accounting;

CREATE OR REPLACE FUNCTION accounting.create_double_entry(
  p_from_wallet uuid,
  p_to_wallet uuid,
  p_amount numeric,
  p_reference text,
  p_status text,
  p_metadata json
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_debit uuid := gen_random_uuid();
  v_credit uuid := gen_random_uuid();
BEGIN
  -- allow internal writes for this session while we insert guarded rows
  PERFORM set_config('hajor.allow_internal', 'true', true);

  -- insert debit (from wallet)
  INSERT INTO "Transaction" (id, "walletId", type, amount, reference, status, metadata, "createdAt")
  VALUES (v_debit, p_from_wallet, 'DEBIT', p_amount, p_reference, p_status::text, p_metadata, now());

  -- insert credit (to wallet)
  INSERT INTO "Transaction" (id, "walletId", type, amount, reference, status, metadata, "createdAt")
  VALUES (v_credit, p_to_wallet, 'CREDIT', p_amount, p_reference, p_status::text, p_metadata, now());

  -- audit entries for both created transactions
  INSERT INTO "AuditLog" (id, "actorId", action, "entityType", "entityId", metadata, "createdAt")
  VALUES (gen_random_uuid(), NULL, 'create_double_entry_debit', 'Transaction', v_debit::text, json_build_object('reference', p_reference, 'amount', p_amount, 'metadata', p_metadata), now()),
         (gen_random_uuid(), NULL, 'create_double_entry_credit', 'Transaction', v_credit::text, json_build_object('reference', p_reference, 'amount', p_amount, 'metadata', p_metadata), now());

  -- disable internal flag for remainder of session
  PERFORM set_config('hajor.allow_internal', 'false', true);

  RETURN json_build_object('debit', v_debit::text, 'credit', v_credit::text);
END;
$$;

GRANT EXECUTE ON FUNCTION accounting.create_double_entry(uuid, uuid, numeric, text, text, json) TO hajor_app;

COMMIT;
