import { Resend } from "resend";
import { formatCurrency } from "@/lib/money";

/**
 * Resend client — server-only, built lazily. The Resend constructor throws
 * synchronously when the key is missing, so building it at module scope would
 * crash every importer (the Stripe webhook included) the moment
 * RESEND_API_KEY is unset — email is a best-effort side effect and must
 * never take donation recording down with it.
 *
 * Sandboxed accounts (no verified sending domain) can only deliver from
 * onboarding@resend.dev and only to the address the Resend account itself
 * was signed up with.
 */
let resendClient: Resend | null | undefined;

function getResendClient(): Resend | null {
  if (resendClient === undefined) {
    resendClient = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
    if (!resendClient) {
      console.warn("[email] RESEND_API_KEY not set — skipping email sends.");
    }
  }
  return resendClient;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "Pradaan <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const BRAND = {
  green: "#16a34a",
  greenDark: "#14532d",
  greenSoft: "#f0fdf4",
  lime: "#65a30d",
  limeSoft: "#ecfccb",
  ink: "#0f0f0f",
  muted: "#71717a",
  border: "#e4e4e7",
};

function layout(bodyHtml: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Pradaan</title>
<style>
  body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  @media (max-width: 480px) {
    .container { width: 100% !important; }
    .px { padding-left: 20px !important; padding-right: 20px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#f4f4f5;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" style="width:560px; max-width:100%; background:#ffffff; border:1px solid ${BRAND.border}; border-radius:16px; overflow:hidden;">

          <!-- Wordmark -->
          <tr>
            <td class="px" style="padding:28px 40px 0 40px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:24px; height:24px; background:${BRAND.green}; border-radius:999px; text-align:center; vertical-align:middle; font-size:12px; color:#ffffff; line-height:24px;">&hearts;</td>
                  <td style="padding-left:8px; font-size:15px; font-weight:700; color:${BRAND.ink};">Pradaan</td>
                </tr>
              </table>
            </td>
          </tr>

          ${bodyHtml}

          <!-- Footer -->
          <tr>
            <td class="px" style="padding:24px 40px 32px 40px; border-top:1px solid ${BRAND.border}; margin-top:8px;">
              <p style="margin:16px 0 0 0; font-size:12px; line-height:1.6; color:${BRAND.muted}; text-align:center;">
                You&rsquo;re receiving this because of activity on your Pradaan account.<br />
                Pradaan &middot; Community Giving &middot; Transparency &middot; Impact
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="border-radius:8px; background:${BRAND.green};">
        <a href="${href}" style="display:inline-block; padding:11px 24px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`;
}

// ─── Donation receipt ───────────────────────────────────────────────────────

export type DonationReceiptData = {
  to: string;
  donorName: string;
  amount: number; // cents
  driveTitle: string;
  orgName: string;
  source: "STRIPE" | "WALLET";
  overflowAmount: number; // cents — 0 if none
  date: Date;
};

export function buildDonationReceiptHtml(data: DonationReceiptData): string {
  const dateStr = data.date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const overflowBlock =
    data.overflowAmount > 0
      ? `<tr>
          <td class="px" style="padding:0 40px 8px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.limeSoft}; border-radius:10px;">
              <tr>
                <td style="padding:14px 18px; font-size:13px; line-height:1.6; color:${BRAND.greenDark};">
                  <strong>${formatCurrency(data.overflowAmount)}</strong> of this went into the
                  <strong>Pradaan Pot</strong> — the community fund that donors like you vote on.
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : "";

  const body = `
    <!-- Headline -->
    <tr>
      <td class="px" style="padding:24px 40px 0 40px;" align="center">
        <p style="margin:0; font-size:13px; color:${BRAND.muted};">Thank you, ${data.donorName}</p>
        <p style="margin:6px 0 0 0; font-size:22px; font-weight:700; color:${BRAND.ink};">Your donation is confirmed</p>
      </td>
    </tr>

    <!-- Amount -->
    <tr>
      <td class="px" style="padding:20px 40px 0 40px;" align="center">
        <p style="margin:0; font-size:40px; font-weight:800; color:${BRAND.green}; letter-spacing:-0.02em;">
          ${formatCurrency(data.amount)}
        </p>
        <p style="margin:6px 0 0 0; font-size:14px; color:${BRAND.muted};">
          to <strong style="color:${BRAND.ink};">${data.driveTitle}</strong><br/>
          organised by ${data.orgName}
        </p>
      </td>
    </tr>

    <!-- Details -->
    <tr>
      <td class="px" style="padding:24px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.border}; border-bottom:1px solid ${BRAND.border};">
          <tr>
            <td style="padding:12px 0; font-size:13px; color:${BRAND.muted};">Date</td>
            <td style="padding:12px 0; font-size:13px; color:${BRAND.ink}; text-align:right; font-weight:500;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:12px 0 0 0; font-size:13px; color:${BRAND.muted}; border-top:1px solid ${BRAND.border};">Paid via</td>
            <td style="padding:12px 0 0 0; font-size:13px; color:${BRAND.ink}; text-align:right; font-weight:500; border-top:1px solid ${BRAND.border};">${data.source === "STRIPE" ? "Card" : "Pradaan Wallet"}</td>
          </tr>
        </table>
      </td>
    </tr>

    <tr><td style="padding:20px 40px 0 40px;"></td></tr>
    ${overflowBlock}

    <!-- CTA -->
    <tr>
      <td class="px" style="padding:24px 40px 8px 40px;" align="center">
        ${button("Get your certificate", `${APP_URL}/donor/certificates`)}
      </td>
    </tr>
  `;

  return layout(
    body,
    `Your ${formatCurrency(data.amount)} donation to ${data.driveTitle} is confirmed.`
  );
}

export async function sendDonationReceiptEmail(data: DonationReceiptData) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: `Receipt: your ${formatCurrency(data.amount)} donation to ${data.driveTitle}`,
      html: buildDonationReceiptHtml(data),
    });
  } catch (err) {
    // Email is a side effect — never let a delivery failure break the
    // donation flow that triggered it.
    console.error("[email] donation receipt failed:", err);
  }
}

// ─── Wallet top-up confirmation ─────────────────────────────────────────────

export type WalletTopupReceiptData = {
  to: string;
  donorName: string;
  amount: number; // cents
  newBalance: number; // cents
  date: Date;
};

export function buildWalletTopupHtml(data: WalletTopupReceiptData): string {
  const dateStr = data.date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const body = `
    <tr>
      <td class="px" style="padding:24px 40px 0 40px;" align="center">
        <p style="margin:0; font-size:13px; color:${BRAND.muted};">Hi ${data.donorName}</p>
        <p style="margin:6px 0 0 0; font-size:22px; font-weight:700; color:${BRAND.ink};">Your wallet was topped up</p>
      </td>
    </tr>

    <tr>
      <td class="px" style="padding:20px 40px 0 40px;" align="center">
        <p style="margin:0; font-size:40px; font-weight:800; color:${BRAND.green}; letter-spacing:-0.02em;">
          +${formatCurrency(data.amount)}
        </p>
        <p style="margin:6px 0 0 0; font-size:14px; color:${BRAND.muted};">on ${dateStr}</p>
      </td>
    </tr>

    <tr>
      <td class="px" style="padding:24px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.greenSoft}; border-radius:10px;">
          <tr>
            <td style="padding:14px 18px; font-size:13px; color:${BRAND.greenDark};">
              New wallet balance
            </td>
            <td style="padding:14px 18px; font-size:15px; font-weight:700; color:${BRAND.greenDark}; text-align:right;">
              ${formatCurrency(data.newBalance)}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td class="px" style="padding:24px 40px 8px 40px;" align="center">
        ${button("Browse drives to give", `${APP_URL}/donor/donate`)}
      </td>
    </tr>
  `;

  return layout(body, `${formatCurrency(data.amount)} added to your Pradaan wallet.`);
}

export async function sendWalletTopupEmail(data: WalletTopupReceiptData) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: data.to,
      subject: `${formatCurrency(data.amount)} added to your Pradaan wallet`,
      html: buildWalletTopupHtml(data),
    });
  } catch (err) {
    console.error("[email] wallet top-up receipt failed:", err);
  }
}
