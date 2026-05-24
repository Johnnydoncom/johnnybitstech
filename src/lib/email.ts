import nodemailer from "nodemailer";
import { query } from "@/lib/db";

export interface EmailOptions {
  to?: string; // Optional: if omitted, sends to the configured admin email
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, replyTo, subject, text, html }: EmailOptions) {
  // Fetch SMTP settings from the database
  const rows = await query("SELECT setting_key, setting_value FROM settings");
  const settings = rows.reduce((acc: Record<string, string>, row: any) => {
    acc[row.setting_key] = row.setting_value || "";
    return acc;
  }, {});

  const {
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_pass,
    smtp_from_email,
    smtp_from_name,
    smtp_to_email,
  } = settings;

  // Validate if SMTP is configured
  if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !smtp_from_email || !smtp_to_email) {
    console.error("SMTP settings are incomplete. Please configure them in the admin dashboard.");
    throw new Error("Email service is not configured properly.");
  }

  // Determine the recipient. If `to` is not provided, use the admin notification email.
  const recipient = to || smtp_to_email;

  // Setup Nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: smtp_host,
    port: parseInt(smtp_port, 10),
    secure: parseInt(smtp_port, 10) === 465, // true for 465, false for other ports
    auth: {
      user: smtp_user,
      pass: smtp_pass,
    },
  });

  const mailOptions = {
    from: `"${smtp_from_name || 'Johnnybits System'}" <${smtp_from_email}>`,
    to: recipient,
    replyTo: replyTo,
    subject,
    text,
    html,
  };

  // Send the email
  return await transporter.sendMail(mailOptions);
}
