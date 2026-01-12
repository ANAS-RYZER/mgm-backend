"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const pug_1 = __importDefault(require("pug"));
const path_1 = __importDefault(require("path"));
const common_2 = require("@nestjs/common");
let EmailService = EmailService_1 = class EmailService {
    configService;
    logger = new common_1.Logger(EmailService_1.name);
    brevoApiKey;
    smtpUsername;
    emailFrom;
    templatesPath;
    constructor(configService) {
        this.configService = configService;
        this.brevoApiKey = this.configService.get('BREVO_API_KEY') || '';
        this.smtpUsername = this.configService.get('SMTP_USERNAME') || 'MGM Team';
        this.emailFrom = this.configService.get('EMAIL_FROM') || 'hello@ryzer.app';
        this.templatesPath = path_1.default.join(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/templates' : 'src/templates');
        if (!this.brevoApiKey) {
            this.logger.warn('⚠️ BREVO_API_KEY is not set in environment variables');
        }
    }
    renderTemplate(templateName, context = {}) {
        try {
            const templatePath = path_1.default.join(this.templatesPath, `${templateName}.pug`);
            return pug_1.default.renderFile(templatePath, context);
        }
        catch (error) {
            this.logger.error(`Error rendering template ${templateName}:`, error.message);
            throw new common_2.HttpException(`Failed to render email template: ${templateName}`, common_2.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    htmlToText(htmlContent) {
        return htmlContent.replace(/<[^>]+>/g, '').trim();
    }
    async sendEmail(email, subject, templateName, context = {}) {
        try {
            if (!this.brevoApiKey) {
                throw new Error('BREVO_API_KEY is not configured');
            }
            const htmlContent = this.renderTemplate(templateName, context);
            const textContent = this.htmlToText(htmlContent);
            const response = await axios_1.default.post('https://api.brevo.com/v3/smtp/email', {
                sender: {
                    name: this.smtpUsername,
                    email: this.emailFrom,
                },
                to: [{ email }],
                subject,
                htmlContent,
                textContent,
            }, {
                headers: {
                    accept: 'application/json',
                    'api-key': this.brevoApiKey,
                    'content-type': 'application/json',
                },
            });
            this.logger.log(`✅ Email sent successfully to ${email}`);
            return response.data;
        }
        catch (error) {
            const errorMessage = error?.response?.data?.message || error.message;
            this.logger.error(`❌ Error sending email to ${email}:`, errorMessage);
            throw new common_2.HttpException(`Failed to send email: ${errorMessage}`, error?.response?.status || common_2.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async sendOtpToEmail(email, otp) {
        await this.sendEmail(email, 'MGM User Verification Code', 'otp', { otp });
    }
    async sendWelcomeEmail(email, context = {}) {
        await this.sendEmail(email, 'Welcome to MGM!', 'welcome', context);
    }
    async sendKYCVerificationEmail(email, context) {
        await this.sendEmail(email, 'Reminder: Complete Your KYC Verification', 'kyc', context);
    }
    async sendWaitlistBulkEmail(email, context) {
        await this.sendEmail(email, 'Investment Opportunity Update - MGM', 'waitlist-bulk', context);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map