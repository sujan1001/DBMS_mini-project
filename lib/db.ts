import { Pool } from 'pg';

// This automatically uses the DATABASE_URL from your .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;