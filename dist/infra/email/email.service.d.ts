import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private readonly configService;
    private readonly logger;
    private readonly brevoApiKey;
    private readonly smtpUsername;
    private readonly emailFrom;
    private readonly templatesPath;
    constructor(configService: ConfigService);
    private renderTemplate;
    private htmlToText;
    sendEmail(email: string, subject: string, templateName: string, context?: Record<string, any>): Promise<any>;
    sendOtpToEmail(email: string, otp: string): Promise<void>;
    sendWelcomeEmail(email: string, context?: Record<string, any>): Promise<void>;
    sendKYCVerificationEmail(email: string, context: {
        name: string;
        missingItems: string[];
    }): Promise<void>;
    sendWaitlistBulkEmail(email: string, context: {
        name: string;
        assetName: string;
        tokensInterested: number;
    }): Promise<void>;
}
