import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('tenants_storage')
export class TenantsStorageTypeOrm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  tenant: string;

  @Column({ type: 'text', nullable: true })
  settings: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
