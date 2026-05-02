-- Add DB-level double-entry stored procedure (accounting.create_double_entry)

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
  PERFORM set_config('hajor.allow_internal', 'true', true);

  INSERT INTO "Transaction" (id, "walletId", type, amount, reference, status, metadata, "createdAt")
  VALUES (v_debit, p_from_wallet, 'DEBIT', p_amount, p_reference, p_status::text, p_metadata, now());

  INSERT INTO "Transaction" (id, "walletId", type, amount, reference, status, metadata, "createdAt")
  VALUES (v_credit, p_to_wallet, 'CREDIT', p_amount, p_reference, p_status::text, p_metadata, now());

  INSERT INTO "AuditLog" (id, "actorId", action, "entityType", "entityId", metadata, "createdAt")
  VALUES (gen_random_uuid(), NULL, 'create_double_entry_debit', 'Transaction', v_debit::text, json_build_object('reference', p_reference, 'amount', p_amount, 'metadata', p_metadata), now()),
         (gen_random_uuid(), NULL, 'create_double_entry_credit', 'Transaction', v_credit::text, json_build_object('reference', p_reference, 'amount', p_amount, 'metadata', p_metadata), now());

  PERFORM set_config('hajor.allow_internal', 'false', true);

  RETURN json_build_object('debit', v_debit::text, 'credit', v_credit::text);
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hajor_app') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION accounting.create_double_entry(uuid, uuid, numeric, text, text, json) TO hajor_app';
  END IF;
END;
$$;
