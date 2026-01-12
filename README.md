
## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ yarn install
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# MongoDB Configuration
# Local MongoDB:
MONGODB_URL=mongodb://localhost:27017/scalable-backend

# MongoDB Atlas (Cloud):
# Note: If your password contains special characters (@, :, /, ?, #, [, ], etc.), you MUST URL-encode them
# Example: If password is "P@ssw0rd", use "P%40ssw0rd" (where %40 is @)
# Common encodings: @ = %40, : = %3A, / = %2F, ? = %3F, # = %23
# MONGODB_URL=mongodb+srv://username:encoded_password@cluster.mongodb.net/database-name?retryWrites=true&w=majority

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_TLS=false

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-token-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (Brevo)
BREVO_API_KEY=your-brevo-api-key
SMTP_USERNAME=MGM Team
EMAIL_FROM=hello@ryzer.app
```

**Important:** The `.env` file is already in `.gitignore` and will not be committed to version control.

## Compile and run the project

```bash
# development with hot reload (auto-restart on file changes) - RECOMMENDED
$ yarn run start:dev

# development without watch mode
$ yarn run start

# debug mode with watch
$ yarn run start:debug

# production mode
$ yarn run start:prod
```

**Note:** Use `yarn start:dev` for development. It automatically reloads the application when you make changes to any file in the `src/` directory, so you don't need to manually restart the server.

## API Endpoints

### Authentication

#### 1. Sign Up
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "abc123...",
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isEmailVerified": false
  }
}
```

#### 2. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "abc123...",
  "user": { ... }
}
```

#### 3. Refresh Access Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 4. Get Current User Profile
```http
GET /auth/me
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "user": {
    "userId": "...",
    "sessionId": "..."
  }
}
```

#### 5. Logout
```http
POST /auth/logout
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Email Service

The application includes a centralized email service using Brevo (formerly Sendinblue) that can be used anywhere in your application. The `EmailService` is globally available and provides a universal `sendEmail` method along with convenience methods for common email types.

### Available Methods

#### Universal Method
```typescript
// Send any email with any template
await emailService.sendEmail(
  email: string,
  subject: string,
  templateName: string,
  context?: Record<string, any>
);
```

#### Convenience Methods
```typescript
// Send OTP email
await emailService.sendOtpToEmail(email: string, otp: string);

// Send welcome email
await emailService.sendWelcomeEmail(email: string, context?: { name?: string, ... });

// Send KYC verification reminder
await emailService.sendKYCVerificationEmail(
  email: string,
  context: { name: string; missingItems: string[] }
);

// Send waitlist bulk email
await emailService.sendWaitlistBulkEmail(
  email: string,
  context: { name: string; assetName: string; tokensInterested: number }
);
```

### Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { EmailService } from '../infra/email/email.service';

@Injectable()
export class YourService {
  constructor(private readonly emailService: EmailService) {}

  async sendVerificationCode(email: string, otp: string) {
    await this.emailService.sendOtpToEmail(email, otp);
  }

  async sendCustomEmail(email: string) {
    await this.emailService.sendEmail(
      email,
      'Custom Subject',
      'your-template-name',
      { customVar: 'value' }
    );
  }
}
```

### Email Templates

Email templates are stored in `src/templates/` as Pug files. Available templates:
- `otp.pug` - OTP verification code
- `welcome.pug` - Welcome email
- `kyc.pug` - KYC verification reminder
- `waitlist-bulk.pug` - Waitlist bulk notification

To create a new template, add a `.pug` file to the `src/templates/` directory and use it with the `sendEmail` method.

## How it Works

### Token Storage in Redis

- **Session Key Format:** `session:{sessionId}`
- **Storage:** Refresh tokens are stored in Redis as a hash with the following structure:
  ```json
  {
    "userId": "user-id",
    "refreshToken": "refresh-token-string",
    "createdAt": "timestamp"
  }
  ```
- **Expiration:** Sessions expire after 7 days (configurable)
- **Refresh Flow:** 
  1. Client sends refresh token to `/auth/refresh`
  2. Server validates refresh token and checks Redis session
  3. Server generates new access token and refreshes session expiry
  4. Client receives new access token

### Security Features

- Passwords are hashed using bcrypt (10 rounds)
- Access tokens expire in 15 minutes (configurable)
- Refresh tokens expire in 7 days (configurable)
- Refresh tokens are stored in Redis, not in the JWT itself
- Session validation ensures refresh token matches Redis storage

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
