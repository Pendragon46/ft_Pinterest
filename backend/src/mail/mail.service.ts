import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Envoi transactionnel pour les opérations RGPD. Volontairement tolérant
// aux pannes : un e-mail non parti ne doit jamais faire échouer la
// suppression ou l'export de données de l'utilisateur.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Sans configuration SMTP on reste en mode journalisation : l'app
    // tourne en développement sans exiger de compte mail.
    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — mails will be logged only');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: { user, pass },
    });
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[MAIL:noop] to=${to} subject="${subject}"`);
      return;
    }
    try {
      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? 'no-reply@atlaas.local',
        to,
        subject,
        text,
      });
      // Ethereal renvoie une URL de prévisualisation : utile en dev pour
      // prouver l'envoi sans boîte mail réelle.
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) this.logger.log(`Mail preview: ${preview}`);
    } catch (error) {
      // Journaliser sans relancer : l'opération métier prime sur l'e-mail.
      this.logger.error(`Mail delivery failed for ${to}`, error as Error);
    }
  }

  async sendDataExportReady(to: string, username: string): Promise<void> {
    await this.send(
      to,
      'Your data export is ready',
      `Hello ${username},\n\nYour personal data export has been generated ` +
        `and downloaded from your browser.\n\nIf you did not request this, ` +
        `please secure your account immediately.\n\n— Atlaas`,
    );
  }

  async sendAccountDeleted(to: string, username: string): Promise<void> {
    await this.send(
      to,
      'Your account has been deleted',
      `Hello ${username},\n\nYour account and all associated content have ` +
        `been permanently deleted.\n\nThis action cannot be undone.\n\n— Atlaas`,
    );
  }
}
