-- Script para crear la base de datos y tablas
CREATE DATABASE IF NOT EXISTS sistema_meseros;
USE sistema_meseros;

-- Tabla de categorías
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(50),
    color VARCHAR(7) DEFAULT '#8B4513',
    activo BOOLEAN DEFAULT TRUE
);

-- Tabla de productos
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    imagen VARCHAR(255),
    categoria_id INT,
    activo BOOLEAN DEFAULT TRUE,
    complementos TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Tabla de mesas
CREATE TABLE mesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    estado ENUM('libre', 'ocupada', 'reservada') DEFAULT 'libre',
    capacidad INT DEFAULT 4,
    ubicacion VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pedidos
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mesa_id INT NOT NULL,
    estado ENUM('pendiente', 'preparando', 'listo', 'entregado', 'cancelado') DEFAULT 'pendiente',
    total DECIMAL(10,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
);

-- Tabla de items del pedido
CREATE TABLE pedido_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    complementos TEXT,
    observaciones TEXT,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Insertar datos de ejemplo
INSERT INTO categorias (nombre, icono, color) VALUES 
('Bebidas Calientes', '☕', '#8B4513'),
('Bebidas Frías', '🥤', '#1E90FF'),
('Entradas', '🥗', '#32CD32'),
('Platos Fuertes', '🍖', '#DC143C'),
('Postres', '🍰', '#FF69B4'),
('Cócteles', '🍹', '#FFD700');

INSERT INTO productos (nombre, descripcion, precio, categoria_id, complementos) VALUES
('Café Americano', 'Café negro recién preparado', 25.00, 1, '["Tamaño", "Tipo de azúcar"]'),
('Capuchino', 'Espresso con leche vaporizada y espuma', 35.00, 1, '["Tamaño", "Tipo de leche"]'),
('Mojito', 'Ron, hierbabuena, lima, azúcar y soda', 65.00, 6, '["Tipo de ron", "Dulzor"]'),
('Ensalada César', 'Lechuga romana, pollo, crutones y aderezo césar', 85.00, 3, '["Aderezo", "Extra"]'),
('Hamburguesa Clásica', 'Carne de res, lechuga, tomate, cebolla y queso', 120.00, 4, '["Punto de cocción", "Extras"]'),
('Tiramisú', 'Postre italiano con café y cacao', 45.00, 5, '[]');

INSERT INTO mesas (nombre, capacidad, ubicacion) VALUES
('Mesa 1', 4, 'Terraza'),
('Mesa 2', 4, 'Terraza'),
('Mesa 3', 6, 'Interior'),
('Mesa 4', 6, 'Interior'),
('Mesa 5', 2, 'Barra'),
('Mesa 6', 8, 'Sala Privada');