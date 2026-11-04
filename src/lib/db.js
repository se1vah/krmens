import mysql from 'mysql2/promise';

let pool = global.mysqlPool;

export function getPool() {
  if (!pool) {
    const host = process.env.DB_HOST;

    if (!host) {
      // During Next.js build collection phase on Vercel/CI without DB credentials configured yet
      if (
        process.env.NEXT_PHASE === 'phase-production-build' ||
        process.env.npm_lifecycle_event === 'build'
      ) {
        return null;
      }

      if (process.env.VERCEL) {
        throw new Error(
          'Database configuration missing on Vercel: DB_HOST environment variable is not set. ' +
          'Please go to your Vercel Project Dashboard -> Settings -> Environment Variables and add DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.'
        );
      }
    }

    pool = mysql.createPool({
      host: host || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME || 'kr_mens',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 20000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      dateStrings: true,
      decimalNumbers: true,
    });

    global.mysqlPool = pool;
  }
  return pool;
}

export async function query(sql, params = []) {
  const p = getPool();
  if (!p) {
    throw new Error(
      'Database configuration missing: DB_HOST environment variable is not set. ' +
      'Please go to your Vercel Project Dashboard -> Settings -> Environment Variables and add DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.'
    );
  }
  try {
    const [rows] = await p.execute(sql, params);
    return rows;
  } catch (err) {
    if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
      const retryPool = getPool();
      const [rows] = await retryPool.execute(sql, params);
      return rows;
    }
    throw err;
  }
}

export async function getConnection() {
  const p = getPool();
  if (!p) {
    throw new Error(
      'Database configuration missing: DB_HOST environment variable is not set. ' +
      'Please go to your Vercel Project Dashboard -> Settings -> Environment Variables and add DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.'
    );
  }
  return await p.getConnection();
}

export default getPool;
