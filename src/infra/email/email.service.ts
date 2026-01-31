import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import pug from 'pug';
import path from 'path';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevoApiKey: string;
  private readonly smtpUsername: string;
  private readonly emailFrom: string;
  private readonly templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    this.smtpUsername = this.configService.get<string>('SMTP_USERNAME') || 'MGM Team';
    this.emailFrom = this.configService.get<string>('EMAIL_FROM') || 'hello@ryzer.app';
    // Support both development (src/templates) and production (dist/templates)
    this.templatesPath = path.join(
      process.cwd(),
      process.env.NODE_ENV === 'production' ? 'dist/templates' : 'src/templates',
    );

    if (!this.brevoApiKey) {
      this.logger.warn('⚠️ BREVO_API_KEY is not set in environment variables');
    }
  }

  /**
   * Renders a Pug template with the provided context
   * @param templateName - Name of the template file (without .pug extension)
   * @param context - Data to pass to the template
   * @returns Rendered HTML string
   */
  private renderTemplate(templateName: string, context: Record<string, any> = {}): string {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.pug`);
      return pug.renderFile(templatePath, context);
    } catch (error: any) {
      this.logger.error(`Error rendering template ${templateName}:`, error.message);
      throw new HttpException(
        `Failed to render email template: ${templateName}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Converts HTML content to plain text by stripping HTML tags
   * @param htmlContent - HTML string
   * @returns Plain text string
   */
  private htmlToText(htmlContent: string): string {
    return htmlContent.replace(/<[^>]+>/g, '').trim();
  }

  /**
   * Universal email sending method
   * @param email - Recipient email address
   * @param subject - Email subject
   * @param templateName - Name of the Pug template (without .pug extension)
   * @param context - Data to pass to the template (default: {})
   * @returns Promise with the API response
   */
  async sendEmail(
    email: string,
    subject: string,
    templateName: string,
    context: Record<string, any> = {},
  ): Promise<any> {
    try {
      if (!this.brevoApiKey) {
        throw new Error('BREVO_API_KEY is not configured');
      }

      // Render the template
      const htmlContent = this.renderTemplate(templateName, context);
      const textContent = this.htmlToText(htmlContent);

      // Send email via Brevo API
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: this.smtpUsername,
            email: this.emailFrom,
          },
          to: [{ email }],
          subject,
          htmlContent,
          textContent,
        },
        {
          headers: {
            accept: 'application/json',
            'api-key': this.brevoApiKey,
            'content-type': 'application/json',
          },
        },
      );

      this.logger.log(`✅ Email sent successfully to ${email}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error.message;
      this.logger.error(`❌ Error sending email to ${email}:`, errorMessage);
      throw new HttpException(
        `Failed to send email: ${errorMessage}`,
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send OTP email
   * @param email - Recipient email address
   * @param otp - OTP code to send
   */
  async sendOtpToEmail(email: string, otp: string): Promise<void> {
    await this.sendEmail(email, 'MGM User Verification Code', 'otp', { otp });
  }

  /**
   * Send Admin OTP email
   * @param email - Recipient admin email address
   * @param otp - OTP code to send
   */
  async sendAdminOtpToEmail(email: string, otp: string): Promise<void> {
    await this.sendEmail(email, 'MGM Admin Verification Code', 'admin-otp', { otp });
  }

  /**
   * Send welcome email
   * @param email - Recipient email address
   * @param context - Additional context for the template (e.g., { name: 'John Doe' })
   */
  async sendWelcomeEmail(email: string, context: Record<string, any> = {}): Promise<void> {
    await this.sendEmail(email, 'Welcome to MGM!', 'welcome', context);
  }

  /**
   * Send KYC verification reminder email
   * @param email - Recipient email address
   * @param context - Context with name and missingItems (e.g., { name: 'John', missingItems: ['ID', 'Address'] })
   */
  async sendKYCVerificationEmail(
    email: string,
    context: { name: string; missingItems: string[] },
  ): Promise<void> {
    await this.sendEmail(
      email,
      'Reminder: Complete Your KYC Verification',
      'kyc',
      context,
    );
  }

  /**
   * Send waitlist bulk email
   * @param email - Recipient email address
   * @param context - Context with name, assetName, and tokensInterested
   */
  async sendWaitlistBulkEmail(
    email: string,
    context: { name: string; assetName: string; tokensInterested: number },
  ): Promise<void> {
    await this.sendEmail(
      email,
      'Investment Opportunity Update - MGM',
      'waitlist-bulk',
      context,
    );
  }

  /**
   * Send agent registration success email
   * @param email - Agent email address
   * @param context - Context with name, email, and agentId
   */
  async sendAgentRegistrationSuccess(
    email: string,
    context: { name: string; email: string; agentId: string },
  ): Promise<void> {
    await this.sendEmail(
      email,
      'MGM Agent – Registration Successful',
      'agent-registration-success',
      context,
    );
  }

  /**
   * Send agent credentials email
   * @param email - Agent email address
   * @param context - Context with name, email, password, and loginUrl
   */
  async sendAgentCredentials(
    email: string,
    context: { name: string; email: string; password: string; loginUrl?: string },
  ): Promise<void> {
    await this.sendEmail(
      email,
      'Your Agent Account Has Been Approved - Login Credentials',
      'agent-credentials',
      context,
    );
  }
}

