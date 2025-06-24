import { Module } from '@nestjs/common';
import { OrderService } from './services/order.service';

@Module({
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
