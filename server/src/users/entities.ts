import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';

@Entity('UserInfoTB')
export class UserInfo {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('text') profilePhoto!: string;
  @Column('varchar', { length: 80 }) firstName!: string;
  @Column('varchar', { length: 80 }) lastName!: string;
  @Column('date') dob!: string;
  @Column('varchar', { length: 120 }) occupation!: string;
  @Column('varchar', { length: 32 }) gender!: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
  @OneToOne(() => UserContact, (c) => c.user)
  userContact!: Relation<UserContact>;
  @OneToOne(() => UserAddress, (a) => a.user)
  userAddress!: Relation<UserAddress>;
  @OneToMany(() => School, (s) => s.user) schools!: School[];
}

@Entity('UserContactTB')
export class UserContact {
  @PrimaryColumn('uuid') userId!: string;
  @Column('varchar', { length: 254, unique: true }) email!: string;
  @Column('varchar', { length: 30 }) phoneNumber!: string;
  @Column('varchar', { length: 30, nullable: true }) fax!: string | null;
  @Column('varchar', { length: 300, nullable: true }) linkedInUrl!: string | null;
  @OneToOne(() => UserInfo, (u) => u.userContact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserInfo;
}

// These quoted table names preserve the names in the supplied assessment (including typos).
@Entity('User addressTB')
export class UserAddress {
  @PrimaryColumn('uuid') userId!: string;
  @Column('varchar', { length: 250 }) address!: string;
  @Column('varchar', { length: 100 }) city!: string;
  @Column('varchar', { length: 100 }) state!: string;
  @Column('varchar', { length: 100 }) country!: string;
  @Column('varchar', { length: 20 }) zipCode!: string;
  @OneToOne(() => UserInfo, (u) => u.userAddress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserInfo;
}

@Entity('UserAcamesicsTB')
export class School {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') userId!: string;
  @Column('int') position!: number;
  @Column('varchar', { length: 160 }) schoolName!: string;
  @Column('varchar', { length: 120 }) qualification!: string;
  @Column('varchar', { length: 120 }) fieldOfStudy!: string;
  @Column('date') startDate!: string;
  @Column('date', { nullable: true }) endDate!: string | null;
  @ManyToOne(() => UserInfo, (u) => u.schools, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserInfo;
}
