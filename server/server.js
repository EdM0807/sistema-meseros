const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'sistema_meseros',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Routes
app.get('/api/mesas', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT m.*, 
                   (SELECT COUNT(*) FROM pedidos p WHERE p.mesa_id = m.id AND p.estado NOT IN ('entregado', 'cancelado')) as pedidos_activos
            FROM mesas m
            ORDER BY m.nombre
        `);
        
        const mesas = rows.map(mesa => ({
            ...mesa,
            estado: mesa.pedidos_activos > 0 ? 'ocupada' : (mesa.estado === 'reservada' ? 'reservada' : 'libre')
        }));
        
        res.json(mesas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/mesas/libres', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT m.* 
            FROM mesas m 
            WHERE m.estado = 'libre' 
            AND m.id NOT IN (
                SELECT mesa_id FROM pedidos WHERE estado NOT IN ('entregado', 'cancelado')
            )
            ORDER BY m.nombre
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/categorias', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM categorias WHERE activo = true ORDER BY nombre');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/productos', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM productos WHERE activo = true ORDER BY nombre');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/productos/categoria/:categoriaId', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM productos WHERE categoria_id = ? AND activo = true ORDER BY nombre',
            [req.params.categoriaId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pedidos', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { mesa_id, items, observaciones } = req.body;
        
        // Insertar pedido
        const [pedidoResult] = await connection.execute(
            'INSERT INTO pedidos (mesa_id, observaciones, total) VALUES (?, ?, 0)',
            [mesa_id, observaciones]
        );
        
        const pedido_id = pedidoResult.insertId;
        let total = 0;
        
        // Insertar items del pedido
        for (const item of items) {
            const [itemResult] = await connection.execute(
                'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario, complementos) VALUES (?, ?, ?, ?, ?)',
                [pedido_id, item.producto_id, item.cantidad, item.precio, JSON.stringify(item.complementos)]
            );
            
            total += item.precio * item.cantidad;
        }
        
        // Actualizar total
        await connection.execute(
            'UPDATE pedidos SET total = ? WHERE id = ?',
            [total, pedido_id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            pedido_id: pedido_id,
            total: total
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.get('/api/pedidos/mesa/:mesaId', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM pedidos WHERE mesa_id = ? AND estado NOT IN ("entregado", "cancelado") ORDER BY created_at DESC',
            [req.params.mesaId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});