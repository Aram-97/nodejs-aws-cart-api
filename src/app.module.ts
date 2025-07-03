import { Module } from '@nestjs/common';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { UserEntity } from './users/user.entity';
import { CartEntity } from './cart/cart.entity';
import { CartItemEntity } from './cart/cart-item.entity';

@Module({
  imports: [
    AuthModule,
    CartModule,
    OrderModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<'postgres'>('DATABASE_TYPE'),
        host: configService.get<string>('DATABASE_HOST'),
        port: +configService.get<string>('DATABASE_PORT'),
        database: configService.get<string>('DATABASE_NAME'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        entities: [UserEntity, CartEntity, CartItemEntity],
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: true, // Avoid in prod, can result in data loss
        logging: true, // Enable logging for debugging
      }),
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
