const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de PostgreSQL para Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Verificar conexión a la base de datos
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err);
  } else {
    console.log('✅ Conectado a PostgreSQL en Render');
    release();
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    database: 'PostgreSQL en Render'
  });
});

app.get('/api/mesas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, 
             (SELECT COUNT(*) FROM pedidos p WHERE p.mesa_id = m.id AND p.estado NOT IN ('entregado', 'cancelado')) as pedidos_activos
      FROM mesas m
      ORDER BY m.nombre
    `);
    
    const mesas = result.rows.map(mesa => ({
      ...mesa,
      estado: mesa.pedidos_activos > 0 ? 'ocupada' : (mesa.estado === 'reservada' ? 'reservada' : 'libre')
    }));
    
    res.json(mesas);
  } catch (error) {
    console.error('Error en /api/mesas:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mesas/libres', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.* 
      FROM mesas m 
      WHERE m.estado = 'libre' 
      AND m.id NOT IN (
        SELECT mesa_id FROM pedidos WHERE estado NOT IN ('entregado', 'cancelado')
      )
      ORDER BY m.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error en /api/mesas/libres:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias WHERE activo = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error en /api/categorias:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos WHERE activo = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error en /api/productos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/productos/categoria/:categoriaId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM productos WHERE categoria_id = $1 AND activo = true ORDER BY nombre',
      [req.params.categoriaId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error en /api/productos/categoria:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { mesa_id, items, observaciones } = req.body;
    
    // Insertar pedido
    const pedidoResult = await client.query(
      'INSERT INTO pedidos (mesa_id, observaciones, total) VALUES ($1, $2, 0) RETURNING id',
      [mesa_id, observaciones]
    );
    
    const pedido_id = pedidoResult.rows[0].id;
    let total = 0;
    
    // Insertar items del pedido
    for (const item of items) {
      await client.query(
        'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, complementos) VALUES ($1, $2, $3, $4, $5)',
        [pedido_id, item.producto_id, item.cantidad, item.precio, JSON.stringify(item.complementos)]
      );
      
      total += item.precio * item.cantidad;
    }
    
    // Actualizar total
    await client.query(
      'UPDATE pedidos SET total = $1 WHERE id = $2',
      [total, pedido_id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      pedido_id: pedido_id,
      total: total
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en /api/pedidos:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/pedidos/mesa/:mesaId', async (req, res) => {
  try {
    const result = await client.query(
      'SELECT * FROM pedidos WHERE mesa_id = $1 AND estado NOT IN ($2, $3) ORDER BY created_at DESC',
      [req.params.mesaId, 'entregado', 'cancelado']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error en /api/pedidos/mesa:', error);
    res.status(500).json({ error: error.message });
  }
});

// Inicializar tablas si no existen
async function initDatabase() {
  try {
    // Crear tablas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        icono VARCHAR(50),
        color VARCHAR(7) DEFAULT '#8B4513',
        activo BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        precio DECIMAL(10,2) NOT NULL,
        imagen VARCHAR(255),
        categoria_id INTEGER,
        activo BOOLEAN DEFAULT TRUE,
        complementos TEXT
      );

      CREATE TABLE IF NOT EXISTS mesas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        estado VARCHAR(20) DEFAULT 'libre',
        capacidad INTEGER DEFAULT 4,
        ubicacion VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        mesa_id INTEGER NOT NULL,
        estado VARCHAR(20) DEFAULT 'pendiente',
        total DECIMAL(10,2) DEFAULT 0,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pedido_items (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        precio_unitario DECIMAL(10,2) NOT NULL,
        complementos TEXT,
        observaciones TEXT
      );
    `);

    // Insertar datos de ejemplo
    await pool.query(`
      INSERT INTO categorias (nombre, icono, color) VALUES 
      ('Bebidas Calientes', '☕', '#8B4513'),
      ('Bebidas Frías', '🥤', '#1E90FF'),
      ('Entradas', '🥗', '#32CD32'),
      ('Platos Fuertes', '🍖', '#DC143C'),
      ('Postres', '🍰', '#FF69B4'),
      ('Cócteles', '🍹', '#FFD700')
      ON CONFLICT DO NOTHING;

      INSERT INTO productos (nombre, descripcion, precio, categoria_id, complementos) VALUES
      ('Café Americano', 'Café negro recién preparado', 25.00, 1, '["Tamaño", "Tipo de azúcar"]'),
      ('Capuchino', 'Espresso con leche vaporizada y espuma', 35.00, 1, '["Tamaño", "Tipo de leche"]'),
      ('Mojito', 'Ron, hierbabuena, lima, azúcar y soda', 65.00, 6, '["Tipo de ron", "Dulzor"]'),
      ('Ensalada César', 'Lechuga romana, pollo, crutones y aderezo césar', 85.00, 3, '["Aderezo", "Extra"]'),
      ('Hamburguesa Clásica', 'Carne de res, lechuga, tomate, cebolla y queso', 120.00, 4, '["Punto de cocción", "Extras"]'),
      ('Tiramisú', 'Postre italiano con café y cacao', 45.00, 5, '[]')
      ON CONFLICT DO NOTHING;

      INSERT INTO mesas (nombre, capacidad, ubicacion) VALUES
      ('Mesa 1', 4, 'Terraza'),
      ('Mesa 2', 4, 'Terraza'),
      ('Mesa 3', 6, 'Interior'),
      ('Mesa 4', 6, 'Interior'),
      ('Mesa 5', 2, 'Barra'),
      ('Mesa 6', 8, 'Sala Privada')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando BD:', error);
  }
}

// Inicializar la base de datos al iniciar
initDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Health check: https://tu-app.onrender.com/api/health`);
});
