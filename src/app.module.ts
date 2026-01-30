import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminAuthModule } from './modules/admins/admin-auth.module';
import { AssetsModule } from './modules/assets/assets.module';
import { RedisModule } from './infra/redis/redis.module';
import { MongodbModule } from './infra/mongodb/mongodb.module';
import { EmailModule } from './infra/email/email.module';
import { ProductsModule } from './modules/products/products.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { AgentModule } from './modules/agents/agent.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    AdminAuthModule,
    AssetsModule,
    RedisModule,
    MongodbModule,
    EmailModule,
    ProductsModule,
    WishlistModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
