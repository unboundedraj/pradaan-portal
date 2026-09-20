-- Fix the overflow branch in both donation RPCs.
--
-- Both functions inserted into pradaan_pot_ledger (type, amount, reference_id).
-- There is no `reference_id` column and there never was — the table records the
-- originating drive via `drive_id` and free text via `description`. Any call
-- that produced overflow therefore aborted with
--   column "reference_id" of relation "pradaan_pot_ledger" does not exist
-- which is why the wallet-donation path was reimplemented in TypeScript
-- (src/app/actions/donations.ts) instead of calling donate_from_wallet.
--
-- The insert now mirrors what the working application code writes, so the two
-- paths produce identical ledger rows:
--   src/app/api/stripe/webhook/route.ts → description: `Overflow from donation ${id}`
--
-- NOTE: neither function is called by the application today. This makes them
-- correct if they are ever wired up; it does not change current behaviour.

BEGIN;

CREATE OR REPLACE FUNCTION public.donate_from_wallet(p_donor_id uuid, p_drive_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_drive        pradaan_drives%ROWTYPE;
  v_overflow     INTEGER;
  v_drive_credit INTEGER;
  v_donation_id  UUID;
BEGIN
  -- Deduct from wallet atomically; aborts if balance insufficient
  UPDATE pradaan_donor_profiles
  SET    wallet_balance = wallet_balance - p_amount
  WHERE  id = p_donor_id
    AND  wallet_balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Lock drive row to prevent concurrent over-donation
  SELECT * INTO v_drive FROM pradaan_drives WHERE id = p_drive_id FOR UPDATE;

  -- Compute overflow
  v_overflow     := GREATEST(0, (v_drive.current_amount + p_amount) - v_drive.target_amount);
  v_drive_credit := p_amount - v_overflow;

  -- Immutable donation ledger entry
  INSERT INTO pradaan_donations (donor_id, drive_id, amount, source)
  VALUES (p_donor_id, p_drive_id, p_amount, 'WALLET')
  RETURNING id INTO v_donation_id;

  -- Credit the drive
  UPDATE pradaan_drives
  SET current_amount = current_amount + v_drive_credit
  WHERE id = p_drive_id;

  -- Route overflow to Pradaan Pot if any
  IF v_overflow > 0 THEN
    INSERT INTO pradaan_pot_ledger (type, amount, drive_id, description)
    VALUES ('INFLOW_OVERFLOW', v_overflow, p_drive_id,
            'Overflow from donation ' || v_donation_id);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.donate_with_overflow(p_donor_id uuid, p_drive_id uuid, p_amount integer, p_source text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_drive pradaan_drives%ROWTYPE;
  v_drive_credit INTEGER;
  v_overflow INTEGER;
  v_donation_id UUID;
BEGIN
  SELECT * INTO v_drive FROM pradaan_drives WHERE id = p_drive_id FOR UPDATE;

  v_overflow := GREATEST(0, v_drive.current_amount + p_amount - v_drive.target_amount);
  v_drive_credit := p_amount - v_overflow;

  UPDATE pradaan_drives SET current_amount = current_amount + v_drive_credit WHERE id = p_drive_id;

  INSERT INTO pradaan_donations (donor_id, drive_id, amount, source)
  VALUES (p_donor_id, p_drive_id, p_amount, p_source::pradaan_transaction_source)
  RETURNING id INTO v_donation_id;

  IF v_overflow > 0 THEN
    INSERT INTO pradaan_pot_ledger (type, amount, drive_id, description)
    VALUES ('INFLOW_OVERFLOW', v_overflow, p_drive_id,
            'Overflow from donation ' || v_donation_id);
  END IF;

  RETURN json_build_object('donation_id', v_donation_id, 'overflow_amount', v_overflow);
END;
$function$;

COMMIT;
