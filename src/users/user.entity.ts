import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CartEntity } from '../cart/cart.entity';

@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ type: 'varchar', nullable: false })
  password: string;

  @OneToOne(() => CartEntity, (cart) => cart.user, { cascade: true })
  cart: CartEntity;
}
