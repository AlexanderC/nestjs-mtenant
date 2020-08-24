import {
  Column,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
  DataType,
  AllowNull,
  PrimaryKey,
  AutoIncrement,
  Unique,
} from 'sequelize-typescript';

@Table({
  timestamps: true, // add the timestamp attributes (updatedAt, createdAt)
  paranoid: true, // don't delete database entries but set the newly added attribute deletedAt
})
export class TenantsStorage<T> extends Model<TenantsStorage<T>> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Unique
  @AllowNull(false)
  @Column
  tenant: string;

  @Column(DataType.BLOB) // 64 kb of data
  @AllowNull(true)
  settings: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
