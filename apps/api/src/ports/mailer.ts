import type { AppUser } from "./user-repo.js";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

/** What UserService depends on — it must not know about tokens or templates. */
export interface InvitationSender {
  sendInvitation(user: AppUser): Promise<void>;
}