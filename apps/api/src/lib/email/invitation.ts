import type { EmailMessage } from "../../ports/mailer.js";

export function invitationEmail(input: {
  to: string;
  firstName: string;
  inviteUrl: string;
}): EmailMessage {
  const greeting = input.firstName ? `Hi ${input.firstName},` : "Hi,";

  const text = [
    greeting,
    "",
    "An account has been created for you. Set your password to get started:",
    "",
    input.inviteUrl,
    "",
    "This link expires in 14 days. If it has expired, ask an administrator to send a new one.",
  ].join("\n");

  const html = `
    <p>${greeting}</p>
    <p>An account has been created for you. Set your password to get started:</p>
    <p><a href="${input.inviteUrl}">Set your password</a></p>
    <p style="color:#666;font-size:13px">
      This link expires in 14 days. If it has expired, ask an administrator to send a new one.
    </p>
  `.trim();

  return { to: input.to, subject: "Set up your account", text, html };
}