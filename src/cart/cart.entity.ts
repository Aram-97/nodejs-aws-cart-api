import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CartItemEntity } from './cart-item.entity';
import { UserEntity } from '../users/user.entity';

export enum CartStatus {
  OPEN = 'OPEN',
  ORDERED = 'ORDERED',
}

@Entity()
export class CartEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => UserEntity, (user) => user.cart, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column('enum', { enum: CartStatus, default: CartStatus.OPEN })
  status: CartStatus;

  @OneToMany(() => CartItemEntity, (item) => item.cart, { cascade: true })
  items: CartItemEntity[];
}
