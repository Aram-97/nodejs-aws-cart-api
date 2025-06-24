import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CartEntity } from './cart.entity';

@Entity()
export class CartItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('numeric')
  count: number;

  @Column({ type: 'uuid', nullable: false })
  productId: string;

  @ManyToOne(() => CartEntity, (cart) => cart.items, { nullable: false })
  @JoinColumn({ name: 'cart_id' })
  cart: CartEntity;
}
