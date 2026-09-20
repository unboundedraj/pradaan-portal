-- Namespace this project's schema objects with a `pradaan_` prefix.
--
-- Context: the Supabase account hosts several projects, and unprefixed names
-- like `profiles` / `drives` are easy to confuse in the dashboard and SQL
-- editor. Renames are metadata-only — no data, index or constraint is rebuilt.
--
-- `pradaan_pot_ledger` is deliberately left alone; it already carries the prefix.
--
-- Indexes, constraints, FKs, triggers, RLS policies and the view's definition
-- all bind to their table by OID, so they follow these renames automatically.
-- PL/pgSQL function bodies do NOT — they are stored as text and re-parsed at
-- runtime, so every function below is recreated with the new names. Skipping
-- `handle_new_user` in particular would break user signup entirely: it fires
-- AFTER INSERT on auth.users, and a raise there aborts the auth.users insert.
--
-- Run as a single transaction: either the whole rename lands or none of it does.

BEGIN;

-- ─── Tables ─────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles            RENAME TO pradaan_profiles;
ALTER TABLE public.donor_profiles      RENAME TO pradaan_donor_profiles;
ALTER TABLE public.org_profiles        RENAME TO pradaan_org_profiles;
ALTER TABLE public.drives              RENAME TO pradaan_drives;
ALTER TABLE public.donations           RENAME TO pradaan_donations;
ALTER TABLE public.wallet_transactions RENAME TO pradaan_wallet_transactions;
ALTER TABLE public.polls               RENAME TO pradaan_polls;
ALTER TABLE public.poll_options        RENAME TO pradaan_poll_options;
ALTER TABLE public.poll_votes          RENAME TO pradaan_poll_votes;
-- public.pradaan_pot_ledger — already prefixed, intentionally unchanged.

-- ─── View ───────────────────────────────────────────────────────────────────

ALTER VIEW public.donor_analytics RENAME TO pradaan_donor_analytics;

-- ─── Enum types ─────────────────────────────────────────────────────────────

ALTER TYPE public.user_role          RENAME TO pradaan_user_role;
ALTER TYPE public.drive_status       RENAME TO pradaan_drive_status;
ALTER TYPE public.transaction_source RENAME TO pradaan_transaction_source;
ALTER TYPE public.pot_ledger_type    RENAME TO pradaan_pot_ledger_type;
ALTER TYPE public.poll_status        RENAME TO pradaan_poll_status;

-- ─── Functions (text bodies — must be rewritten) ────────────────────────────

-- Load-bearing: trigger on auth.users. Body unchanged except the table name.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.pradaan_profiles (id, email, role, is_verified)
  VALUES (NEW.id, NEW.email, 'DONOR', false);
  RETURN NEW;
END;
$function$;

-- NOTE: the two functions below are currently dead code AND already broken —
-- both INSERT into pradaan_pot_ledger (…, reference_id), a column that does not
-- exist, which is why the wallet-donation logic was inlined into TypeScript
-- (see src/app/actions/donations.ts). They are recreated here only so the
-- database holds no references to tables that no longer exist. The reference_id
-- bug is left exactly as-is: fixing behaviour is out of scope for a rename.

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
    INSERT INTO pradaan_pot_ledger (type, amount, reference_id)
    VALUES ('INFLOW_OVERFLOW', v_overflow, v_donation_id);
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
    INSERT INTO pradaan_pot_ledger (type, amount, reference_id)
    VALUES ('INFLOW_OVERFLOW', v_overflow, v_donation_id::TEXT);
  END IF;

  RETURN json_build_object('donation_id', v_donation_id, 'overflow_amount', v_overflow);
END;
$function$;

-- public.rls_auto_enable() is intentionally untouched: it is table-name
-- agnostic (driven by pg_event_trigger_ddl_commands) and fires only on
-- CREATE TABLE, not ALTER … RENAME.

COMMIT;
