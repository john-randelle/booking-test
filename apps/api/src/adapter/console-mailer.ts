import type { Mailer, EmailMessage } from "../ports/mailer.js";

export class ConsoleMailer implements Mailer {
  async send(message: EmailMessage): Promise<void> {
    console.info(`\n[mail] to: ${message.to}\n[mail] ${message.subject}\n${message.text}\n`);
  }
}