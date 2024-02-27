import * as mongoose from 'mongoose';
import { createClient } from 'redis';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: (): Promise<typeof mongoose> =>
      mongoose.connect(process.env.MONGO_DB_HOST),
  },
  {
    provide: 'REDIS',
    useFactory: async () => {
      const client = createClient({
        socket: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
        },
        password: process.env.REDIS_PASSWORD,
      });
      await client.connect();
      return client;
    },
  },
];
