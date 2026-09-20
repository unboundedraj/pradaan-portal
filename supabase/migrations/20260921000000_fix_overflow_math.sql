-- Fix the overflow split in both donation RPCs.
--
-- Previous logic:
--   v_overflow     := GREATEST(0, (current + amount) - target);
--   v_drive_credit := amount - v_overflow;
--
-- That is only correct while a drive is still below its target. Once
-- current > target, the computed overflow exceeds the donation itself and the
-- drive credit goes negative — so a donation would credit the pot MORE than
-- the donor gave and simultaneously REDUCE the drive's total. Observed on a
-- drive sitting at 1,110,000 with a 1,000,000 target: a 50,000 donation
-- credited 160,000 to the pot and knocked 110,000 off the drive.
--
-- Correct split: credit the drive only up to its remaining gap, never more
-- than was given, and derive overflow as the remainder. This makes
-- drive_credit + overflow === amount by construction, so neither ledger can
-- invent or lose money regardless of the drive's starting position.
--
-- Mirrors computeOverflow() in src/lib/money.ts, which both TypeScript
-- donation paths now share.

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

  -- Split the donation: drive up to its gap, remainder to the pot
  v_drive_credit := LEAST(p_amount, GREATEST(0, v_drive.target_amount - v_drive.current_amount));
  v_overflow     := p_amount - v_drive_credit;

  -- Immutable donation ledger entry
  INSERT INTO pradaan_donations (donor_id, drive_id, amount, source)
  VALUES (p_donor_id, p_drive_id, p_amount, 'WALLET')
  RETURNING id INTO v_donation_id;

  -- Credit the drive
  IF v_drive_credit > 0 THEN
    UPDATE pradaan_drives
    SET current_amount = current_amount + v_drive_credit
    WHERE id = p_drive_id;
  END IF;

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
  v_drive        pradaan_drives%ROWTYPE;
  v_drive_credit INTEGER;
  v_overflow     INTEGER;
  v_donation_id  UUID;
BEGIN
  SELECT * INTO v_drive FROM pradaan_drives WHERE id = p_drive_id FOR UPDATE;

  v_drive_credit := LEAST(p_amount, GREATEST(0, v_drive.target_amount - v_drive.current_amount));
  v_overflow     := p_amount - v_drive_credit;

  IF v_drive_credit > 0 THEN
    UPDATE pradaan_drives
    SET current_amount = current_amount + v_drive_credit
    WHERE id = p_drive_id;
  END IF;

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
