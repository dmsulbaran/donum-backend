const pool = require('../config/db');

async function setupDatabase() {
  try {
    console.log('[Setup] Conectando a PostgreSQL...');

    // 1. Tabla de Usuarios para Autenticación y Sesiones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[Setup] Tabla users lista.');

    // 2. Insertar usuario de demostración si la tabla está vacía
    const userCheck = await pool.query('SELECT id FROM users LIMIT 1');
    if (userCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (name, email, phone, password_hash, role)
        VALUES ('Cliente Donum', 'cliente@donum.com', '04121234567', 'hash_secure_password', 'customer')
      `);
      console.log('[Setup] Usuario demo creado (cliente@donum.com).');
    }

    // 3. Verificar productos esenciales en la base de datos
    const missingProducts = [
      {
        name: 'Apple & App Store $25 (USA)',
        description: 'Tarjeta de saldo oficial para App Store y servicios Apple',
        price_usd: 25.00,
        profit_margin: 1.10,
        bitrefill_id: 'apple-usa',
        category: 'Software',
        stock: 50
      },
      {
        name: 'Xbox Game Pass & Store $15',
        description: 'Suscripción Xbox Game Pass y fondos Microsoft Store',
        price_usd: 15.00,
        profit_margin: 1.10,
        bitrefill_id: 'xbox-usa',
        category: 'Gaming',
        stock: 50
      },
      {
        name: 'Amazon Gift Card $25 (USA)',
        description: 'Saldo directo en Amazon.com sin vencimiento',
        price_usd: 25.00,
        profit_margin: 1.10,
        bitrefill_id: 'amazon-usa',
        category: 'Lifestyle',
        stock: 50
      }
    ];

    for (const item of missingProducts) {
      const exists = await pool.query(
        'SELECT id FROM products WHERE bitrefill_id = $1 OR name ILIKE $2',
        [item.bitrefill_id, `%${item.name.split(' ')[0]}%`]
      );

      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO products (name, description, price_usd, profit_margin, bitrefill_id, category, stock)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.name, item.description, item.price_usd, item.profit_margin, item.bitrefill_id, item.category, item.stock]
        );
        console.log(`[Setup] Producto insertado: ${item.name}`);
      }
    }

    const currentProducts = await pool.query('SELECT id, name, price_usd, bitrefill_id, category FROM products ORDER BY id ASC');
    console.log(`[Setup] Catálogo completo en PostgreSQL (${currentProducts.rows.length} productos):`);
    currentProducts.rows.forEach(p => console.log(` - ID ${p.id}: ${p.name} ($${p.price_usd} USD)`));

  } catch (error) {
    console.error('[Setup Error]', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
