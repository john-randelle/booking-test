import { env } from "../lib/env.js";
import { createInviteToken } from "../lib/invite-token.js";
import { invitationEmail } from "../lib/email/invitation.js";
import type { InvitationSender, Mailer } from "../ports/mailer.js";
import type { AppUser } from "../ports/user-repo.js";

export class InvitationService implements InvitationSender {
  constructor(private readonly mailer: Mailer) {}

  async sendInvitation(user: AppUser): Promise<void> {
    const token = createInviteToken({
      userId: user.id,
      email: user.email,
      role: user.role ?? "referrer",
    });
    await this.mailer.send(
      invitationEmail({
        to: user.email,
        firstName: user.firstName ?? user.name,
        inviteUrl: `${env.WEB_ORIGIN}/invite/${token}`,
      }),
    );
  }
}