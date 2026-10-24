require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cristal_floricultura',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado ao MySQL com sucesso (banco: %s)', process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('❌ Falha ao conectar ao MySQL:', err.message);
    console.error('   Verifique se o MySQL está rodando e se o arquivo .env está correto.');
  }
}

module.exports = { pool, testConnection };
