"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { X, Download, Award } from "lucide-react";

export type CertificateData = {
  donorName: string;
  driveTitle: string;
  orgName: string;
  totalAmountFormatted: string;
  lastDonationDate: string;
};

function buildPrintHtml(data: CertificateData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate — ${data.driveTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Inter', sans-serif; }
    @media print {
      body { min-height: auto; }
      @page { margin: 0.5in; size: landscape; }
    }
    .cert { width: 900px; background: #fffdf5; border: 3px solid #1a3a2a; padding: 6px; }
    .cert-inner { border: 1.5px solid #b8975a; padding: 48px 60px; position: relative; }
    .corner { position: absolute; width: 28px; height: 28px; border-color: #b8975a; border-style: solid; }
    .corner-tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
    .corner-tr { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
    .corner-bl { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
    .corner-br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }
    .header { text-align: center; border-bottom: 1px solid #d4b87a; padding-bottom: 24px; margin-bottom: 32px; }
    .wordmark { font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #1a3a2a; margin-bottom: 12px; }
    .cert-title { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 700; color: #1a3a2a; letter-spacing: 0.05em; }
    .cert-sub { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #7a8a7a; margin-top: 6px; }
    .body { text-align: center; }
    .preamble { font-size: 13px; color: #4a5a4a; letter-spacing: 0.04em; margin-bottom: 16px; }
    .donor-name { font-family: 'Playfair Display', serif; font-size: 42px; font-style: italic; color: #1a3a2a; margin-bottom: 16px; line-height: 1.2; }
    .donated-text { font-size: 13px; color: #4a5a4a; margin-bottom: 12px; }
    .amount { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 700; color: #b8975a; margin-bottom: 12px; }
    .drive-text { font-size: 13px; color: #4a5a4a; margin-bottom: 6px; }
    .drive-title { font-family: 'Playfair Display', serif; font-size: 20px; color: #1a3a2a; font-weight: 700; margin-bottom: 4px; }
    .org-name { font-size: 13px; color: #6a7a6a; }
    .divider { width: 80px; height: 1px; background: #d4b87a; margin: 24px auto; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; padding-top: 20px; border-top: 1px solid #d4b87a; }
    .footer-item { text-align: center; }
    .footer-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #9aaa9a; margin-bottom: 4px; }
    .footer-value { font-size: 12px; color: #2a3a2a; font-weight: 500; }
    .seal { text-align: center; }
    .seal-circle { width: 56px; height: 56px; border-radius: 50%; border: 2px solid #b8975a; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #b8975a; font-size: 22px; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="cert-inner">
      <div class="corner corner-tl"></div>
      <div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div>
      <div class="corner corner-br"></div>
      <div class="header">
        <div class="wordmark">Pradaan Portal</div>
        <div class="cert-title">Certificate of Donation</div>
        <div class="cert-sub">Community Giving · Transparency · Impact</div>
      </div>
      <div class="body">
        <div class="preamble">This is to gratefully certify that</div>
        <div class="donor-name">${data.donorName}</div>
        <div class="donated-text">has generously contributed a total of</div>
        <div class="amount">${data.totalAmountFormatted}</div>
        <div class="drive-text">to the fundraising drive</div>
        <div class="drive-title">"${data.driveTitle}"</div>
        <div class="org-name">organised by ${data.orgName}</div>
        <div class="divider"></div>
        <div class="footer">
          <div class="footer-item">
            <div class="footer-label">Date of last donation</div>
            <div class="footer-value">${data.lastDonationDate}</div>
          </div>
          <div class="seal">
            <div class="seal-circle">✦</div>
            <div class="footer-label" style="margin-top:6px;">Pradaan Verified</div>
          </div>
          <div class="footer-item">
            <div class="footer-label">Platform</div>
            <div class="footer-value">pradaan.in</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
}

export function CertificateModal({
  data,
  driveName,
}: {
  data: CertificateData;
  driveName: string;
}) {
  const [open, setOpen] = useState(false);

  function handleDownload() {
    const html = buildPrintHtml(data);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
      >
        <Award size={14} className="text-[var(--primary)]" />
        View certificate
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[var(--background)] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  Certificate of Donation
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {driveName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3.5 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
                >
                  <Download size={13} />
                  Download PDF
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Certificate preview */}
            <div className="flex-1 overflow-auto bg-[#f5f5f0] p-8">
              <div
                className="mx-auto"
                style={{
                  width: "100%",
                  maxWidth: 720,
                  background: "#fffdf5",
                  border: "3px solid #1a3a2a",
                  padding: 6,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                <div
                  style={{
                    border: "1.5px solid #b8975a",
                    padding: "40px 52px",
                    position: "relative",
                  }}
                >
                  {/* Corner ornaments */}
                  {(
                    [
                      { top: 10, left: 10, borderWidth: "2px 0 0 2px" },
                      { top: 10, right: 10, borderWidth: "2px 2px 0 0" },
                      { bottom: 10, left: 10, borderWidth: "0 0 2px 2px" },
                      { bottom: 10, right: 10, borderWidth: "0 2px 2px 0" },
                    ] as CSSProperties[]
                  ).map((style, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        width: 28,
                        height: 28,
                        borderColor: "#b8975a",
                        borderStyle: "solid",
                        ...style,
                      }}
                    />
                  ))}

                  {/* Header */}
                  <div
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid #d4b87a",
                      paddingBottom: 20,
                      marginBottom: 28,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "#1a3a2a",
                        marginBottom: 10,
                      }}
                    >
                      Pradaan Portal
                    </p>
                    <p
                      style={{
                        fontSize: 30,
                        fontWeight: 700,
                        color: "#1a3a2a",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Certificate of Donation
                    </p>
                    <p
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: 10,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "#7a8a7a",
                        marginTop: 6,
                      }}
                    >
                      Community Giving · Transparency · Impact
                    </p>
                  </div>

                  {/* Body */}
                  <div style={{ textAlign: "center" }}>
                    <p
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: 12,
                        color: "#4a5a4a",
                        letterSpacing: "0.04em",
                        marginBottom: 12,
                      }}
                    >
                      This is to gratefully certify that
                    </p>
                    <p
                      style={{
                        fontSize: 38,
                        fontStyle: "italic",
                        color: "#1a3a2a",
                        marginBottom: 14,
                        lineHeight: 1.2,
                      }}
                    >
                      {data.donorName}
                    </p>
                    <p
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: 12,
                        color: "#4a5a4a",
                        marginBottom: 10,
                      }}
                    >
                      has generously contributed a total of
                    </p>
                    <p
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: "#b8975a",
                        marginBottom: 10,
                      }}
                    >
                      {data.totalAmountFormatted}
                    </p>
                    <p
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: 12,
                        color: "#4a5a4a",
                        marginBottom: 4,
                      }}
                    >
                      to the fundraising drive
                    </p>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#1a3a2a",
                        marginBottom: 4,
                      }}
                    >
                      &ldquo;{data.driveTitle}&rdquo;
                    </p>
                    <p
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: 12,
                        color: "#6a7a6a",
                      }}
                    >
                      organised by {data.orgName}
                    </p>

                    {/* Divider */}
                    <div
                      style={{
                        width: 80,
                        height: 1,
                        background: "#d4b87a",
                        margin: "22px auto",
                      }}
                    />

                    {/* Footer row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        marginTop: 8,
                        paddingTop: 16,
                        borderTop: "1px solid #d4b87a",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <p
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#9aaa9a",
                            marginBottom: 4,
                          }}
                        >
                          Date of last donation
                        </p>
                        <p
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontSize: 11,
                            color: "#2a3a2a",
                            fontWeight: 500,
                          }}
                        >
                          {data.lastDonationDate}
                        </p>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            border: "2px solid #b8975a",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                            color: "#b8975a",
                            fontSize: 20,
                          }}
                        >
                          ✦
                        </div>
                        <p
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#9aaa9a",
                            marginTop: 6,
                          }}
                        >
                          Pradaan Verified
                        </p>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <p
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "#9aaa9a",
                            marginBottom: 4,
                          }}
                        >
                          Platform
                        </p>
                        <p
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontSize: 11,
                            color: "#2a3a2a",
                            fontWeight: 500,
                          }}
                        >
                          pradaan.in
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
