import 'reflect-metadata';
import '../env';
import { DataSource } from 'typeorm';
import { UserInfo, UserContact, UserAddress, School } from '../users/entities';
import { InitialProfiles1791410000000 } from './migration';
export const makeDataSource = (url = process.env.DATABASE_URL) => {
  if (!url) throw new Error('DATABASE_URL is required. Copy .env.example and start PostgreSQL.');
  return new DataSource({
    type: 'postgres',
    url,
    entities: [UserInfo, UserContact, UserAddress, School],
    migrations: [InitialProfiles1791410000000],
    synchronize: false,
    migrationsRun: true,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized: true,
            ...(process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : {}),
          }
        : false,
    extra: {
      max: Number(process.env.DATABASE_POOL_SIZE || 10),
      connectionTimeoutMillis: 10000,
    },
  });
};
