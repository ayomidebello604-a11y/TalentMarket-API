import "dotenv/config";
import { Resend } from "resend";

let emailClient: Resend | null = null;

const getEmailClient = (): Resend => {
  if (!emailClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    emailClient = new Resend(apiKey);
  }
  return emailClient;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildWelcomeEmailHtml = (name: string): string => {
  const safeName = escapeHtml(name.trim() || "Champion");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to TalentMarket</title>
</head>
<body style="margin:0;padding:0;background-color:#eef1e6;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2414;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef1e6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(52,59,22,0.14);border:1px solid #d9e0c7;">
          
          <!-- Hero Header with Army Green Palette & Cartoon Footballer -->
          <tr>
            <td style="background:linear-gradient(135deg,#2f3612 0%,#4b5320 55%,#636e2b 100%);padding:36px 32px 24px 32px;text-align:center;">
              <div style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:rgba(255,255,255,0.14);color:#e9f0d4;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">
                TalentMarket Official
              </div>
              <h1 style="margin:0 0 8px 0;font-size:30px;line-height:1.2;font-weight:800;color:#ffffff;letter-spacing:-0.4px;">
                Welcome to the Pitch, ${safeName}!
              </h1>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.5;color:#dde5c7;">
                Where emerging football talent meets top scouts and clubs.
              </p>

              <!-- Cartoon Player Kicking a Football Illustration -->
              <div style="margin:0 auto;max-width:340px;background-color:rgba(255,255,255,0.08);border-radius:14px;padding:14px 12px 6px 12px;border:1px solid rgba(255,255,255,0.14);">
                <svg viewBox="0 0 320 150" width="100%" height="140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cartoon footballer kicking a football">
                  <!-- Pitch ground & arc -->
                  <ellipse cx="160" cy="134" rx="135" ry="10" fill="#343b16" opacity="0.65" />
                  <path d="M25 130 Q160 116 295 130" stroke="#a3b567" stroke-width="2" fill="none" stroke-dasharray="6 5" opacity="0.7" />

                  <!-- Motion lines behind ball -->
                  <path d="M185 88 L215 74" stroke="#e9f0d4" stroke-width="3" stroke-linecap="round" opacity="0.85" />
                  <path d="M192 98 L222 90" stroke="#c7d69b" stroke-width="2.5" stroke-linecap="round" opacity="0.75" />
                  <path d="M186 108 L212 106" stroke="#e9f0d4" stroke-width="2" stroke-linecap="round" opacity="0.65" />

                  <!-- Cartoon Player -->
                  <!-- Back leg (planted) -->
                  <path d="M118 88 L104 126" stroke="#f2c6a0" stroke-width="10" stroke-linecap="round" />
                  <path d="M104 114 L104 126" stroke="#ffffff" stroke-width="10" stroke-linecap="round" />
                  <ellipse cx="99" cy="128" rx="10" ry="5" fill="#1f2414" />

                  <!-- Kicking leg (extended forward) -->
                  <path d="M128 88 L168 102" stroke="#f2c6a0" stroke-width="10" stroke-linecap="round" />
                  <path d="M154 97 L168 102" stroke="#ffffff" stroke-width="10" stroke-linecap="round" />
                  <ellipse cx="173" cy="103" rx="10" ry="5" transform="rotate(18 173 103)" fill="#1f2414" />

                  <!-- Shorts -->
                  <path d="M110 78 L138 78 L142 94 L126 94 L122 86 L116 94 L104 94 Z" fill="#23280e" />

                  <!-- Jersey (Army Green) -->
                  <path d="M108 46 Q124 42 140 46 L142 80 L108 80 Z" fill="#6f7d32" stroke="#e9f0d4" stroke-width="1.5" />
                  <!-- Jersey stripe & number -->
                  <rect x="121" y="46" width="6" height="34" fill="#4b5320" opacity="0.85" />
                  <text x="124" y="69" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff" font-family="Arial, sans-serif">10</text>

                  <!-- Arms for balance -->
                  <path d="M110 50 L88 64" stroke="#f2c6a0" stroke-width="8" stroke-linecap="round" />
                  <path d="M138 50 L158 38" stroke="#f2c6a0" stroke-width="8" stroke-linecap="round" />
                  <!-- Sleeves -->
                  <path d="M110 50 L98 58" stroke="#6f7d32" stroke-width="10" stroke-linecap="round" />
                  <path d="M138 50 L149 44" stroke="#6f7d32" stroke-width="10" stroke-linecap="round" />

                  <!-- Head & Hair -->
                  <circle cx="124" cy="29" r="14" fill="#f2c6a0" />
                  <path d="M110 27 Q114 12 128 14 Q138 15 138 26 Q131 20 122 21 Q115 22 110 27 Z" fill="#1f2414" />
                  <!-- Smile & Eye -->
                  <circle cx="129" cy="28" r="1.8" fill="#1f2414" />
                  <path d="M126 34 Q130 37 134 34" stroke="#1f2414" stroke-width="1.8" fill="none" stroke-linecap="round" />

                  <!-- Classic Football in flight -->
                  <g transform="translate(245, 62)">
                    <circle cx="0" cy="0" r="20" fill="#ffffff" stroke="#1f2414" stroke-width="2.5" />
                    <polygon points="0,-8 8,-2 5,7 -5,7 -8,-2" fill="#1f2414" />
                    <line x1="0" y1="-8" x2="0" y2="-19" stroke="#1f2414" stroke-width="2" />
                    <line x1="8" y1="-2" x2="18" y2="-6" stroke="#1f2414" stroke-width="2" />
                    <line x1="5" y1="7" x2="12" y2="16" stroke="#1f2414" stroke-width="2" />
                    <line x1="-5" y1="7" x2="-12" y2="16" stroke="#1f2414" stroke-width="2" />
                    <line x1="-8" y1="-2" x2="-18" y2="-6" stroke="#1f2414" stroke-width="2" />
                  </g>
                </svg>
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#2c331c;">
                Hi <strong>${safeName}</strong>,
              </p>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:#464f33;">
                Your <strong>TalentMarket</strong> account is officially live! Whether you're stepping onto the pitch to showcase your game or scouting the next breakout star, you're now connected to our football network.
              </p>

              <!-- Feature Highlights Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7ef;border-left:4px solid #4b5320;border-radius:10px;margin-bottom:26px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#4b5320;">
                      Your Next Kickoff Steps
                    </p>
                    <p style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#2c331c;">
                      &#9917; Complete your player or scout profile so you stand out
                    </p>
                    <p style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#2c331c;">
                      &#128269; Browse verified players by position and ratings
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#2c331c;">
                      &#129309; Build your scouting shortlist and connect directly
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#5f6849;">
                See you on the pitch,<br />
                <strong style="color:#4b5320;">The TalentMarket Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f5f7ef;padding:18px 32px;text-align:center;border-top:1px solid #e2e7d3;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#6c7556;">
                &copy; ${new Date().getFullYear()} TalentMarket. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!sender) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  const { data, error } = await getEmailClient().emails.send({
    from: sender,
    to: email,
    subject: `Welcome to TalentMarket, ${name}!`,
    html: buildWelcomeEmailHtml(name),
  });

  if (error) {
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }

  console.log("Email sent successfully. ID:", data?.id);
};


