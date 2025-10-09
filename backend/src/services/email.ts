import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

class CustomEmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!smtpUser || !smtpPass) {
      console.warn('SMTP credentials not provided, email service will not work');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false, // Use TLS
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      console.log('Custom email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@crypticcabin.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendOTPEmail(to: string, otpCode: string, leagueName: string, leagueLink: string): Promise<boolean> {
    const subject = `Join ${leagueName} - Your invitation code`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">You're invited to join ${leagueName}!</h2>

        <p>Hello,</p>

        <p>You've been invited to join the <strong>${leagueName}</strong> league on Cryptic Cabin Leagues.</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">Your invitation code:</h3>
          <div style="font-size: 32px; font-weight: bold; color: #f97316; letter-spacing: 2px; font-family: monospace;">
            ${otpCode}
          </div>
        </div>

        <p>To join the league:</p>
        <ol>
          <li>Sign up at <a href="https://leagues.crypticcabin.com" style="color: #f97316;">leagues.crypticcabin.com</a> by creating a username and password</li>
          <li>Go to the league: <a href="${leagueLink}" style="color: #f97316;">Click here to join ${leagueName}</a></li>
          <li>Choose your league name and faction</li>
          <li>Enter the OTP code above when prompted</li>
        </ol>

        <p>This code will expire in 3 months.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          This email was sent from Cryptic Cabin Leagues. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    const text = `
You're invited to join ${leagueName}!

Your invitation code: ${otpCode}

To join the league:
1. Sign up at https://leagues.crypticcabin.com by creating a username and password
2. Go to the league: ${leagueLink}
3. Choose your league name and faction
4. Enter the OTP code above when prompted

This code will expire in 3 months.
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    const subject = 'Reset your password - Cryptic Cabin Leagues';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Password Reset Request</h2>

        <p>Hello,</p>

        <p>We received a request to reset your password for your Cryptic Cabin Leagues account.</p>

        <p>Click the button below to reset your password:</p>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>

        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #6b7280; word-break: break-all;">${resetUrl}</p>

        <p style="margin-top: 30px;">This link will expire in 24 hours. If you didn't request this password reset, please ignore this email.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          Sent from Cabin Leagues
        </p>
      </div>
    `;

    const text = `
Password Reset Request

Hello,

We received a request to reset your password for your Cryptic Cabin Leagues account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 24 hours. If you didn't request this password reset, please ignore this email.
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }
}

export const customEmailService = new CustomEmailService();
