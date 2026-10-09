import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

type ReportEmailData = {
  reason: string;
  description: string;
  status: string;
  createdAt: Date;
  evidenceUrls: string[];
};

let transporterPromise: Promise<Transporter> | undefined;
let usesEthereal = false;

async function getTransporter(): Promise<Transporter> {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (env.nodeEnv === 'test') {
      return nodemailer.createTransport({ jsonTransport: true });
    }

    if (env.smtpHost) {
      usesEthereal = false;
      return nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: env.smtpUser && env.smtpPass ? { user: env.smtpUser, pass: env.smtpPass } : undefined
      });
    }

    usesEthereal = true;
    const account = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass }
    });
  })();

  return transporterPromise;
}

export async function sendReportCreatedEmail(report: ReportEmailData, channelName: string): Promise<void> {
  // TODO V6 MAIL 1 (COMPLETADO): Construir el aviso de reporte nuevo con canal, detalles y evidencias.
  const transporter = await getTransporter();
  const evidence = report.evidenceUrls.length
    ? `\nEvidence:\n${report.evidenceUrls.join('\n')}`
    : '';
  const info = await transporter.sendMail({
    from: env.smtpFrom,
    to: env.reportNotificationEmail,
    subject: 'TV Hub - New Report',
    text: `TV Hub - New Report\n\nChannel: ${channelName}\nReason: ${report.reason}\nDescription: ${report.description}\nStatus: ${report.status}\nCreated date: ${report.createdAt.toLocaleString()}${evidence}`
  });

  if (usesEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`Email preview: ${previewUrl}`);
  }
}

export async function sendReportResolvedEmail(report: ReportEmailData, channelName: string, recipient: string): Promise<void> {
  // TODO V6 MAIL 2 (COMPLETADO): Enviar al reportante la notificación de resolución.
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.smtpFrom,
    to: recipient,
    subject: 'TV Hub - Your Report Was Resolved',
    text: `TV Hub - Your Report Was Resolved\n\nChannel: ${channelName}\nReason: ${report.reason}\nDescription: ${report.description}\nStatus: ${report.status}\nCreated date: ${report.createdAt.toLocaleString()}\n\nSupport has closed this report.`
  });

  if (usesEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`Email preview: ${previewUrl}`);
  }
}
