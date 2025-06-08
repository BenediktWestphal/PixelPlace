const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    // Check if the pixels table exists
    const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'pixels'
      );
    `);

    if (!res.rows[0].exists) {
      // Create the pixels table if it doesn't exist
      await client.query(`
        CREATE TABLE pixels (
          id SERIAL PRIMARY KEY,
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          color VARCHAR(7) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Pixels table created successfully.');

      // Optional: Add an index for faster lookups by coordinates
      await client.query('CREATE INDEX IF NOT EXISTS idx_pixels_coordinates ON pixels (x, y);');
      console.log('Index on x, y coordinates created.');
    } else {
      console.log('Pixels table already exists.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
    // It's often better to let the application fail fast if DB setup fails
    process.exit(1);
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDB,
  pool, // Export pool for potential direct use if needed
};
