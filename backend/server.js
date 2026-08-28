const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Configuración básica
app.use(cors());
app.use(express.json());

// Conexión a Base de Datos
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error SQLite:', err.message);
    } else {
        console.log('Conectado a SQLite.');
        
        // Tabla: Productos
        db.run(`CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            precio REAL,
            estado TEXT DEFAULT 'disponible'
        )`);

        // Tabla: Clientes (CRM)
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            correo TEXT UNIQUE NOT NULL,
            telefono TEXT,
            empresa TEXT,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            estado TEXT DEFAULT 'activo',
            etapa_crm TEXT DEFAULT 'Prospecto'
        )`);
    }
});

// Rutas: Productos
app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos WHERE estado = 'disponible'", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Éxito", data: rows });
    });
});

// Rutas: Clientes (CRM)

// Leer clientes
app.get('/api/clientes', (req, res) => {
    db.all("SELECT * FROM clientes", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Éxito", data: rows });
    });
});

// Crear cliente
app.post('/api/clientes', (req, res) => {
    const { nombre, correo, telefono, empresa } = req.body;
    
    // Validar datos obligatorios
    if (!nombre || !correo) {
        return res.status(400).json({ error: "Nombre y correo son obligatorios" });
    }

    const sql = `INSERT INTO clientes (nombre, correo, telefono, empresa) VALUES (?, ?, ?, ?)`;
    db.run(sql, [nombre, correo, telefono, empresa], function(err) {
        if (err) {
            // Error si el correo ya existe
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "El correo ya está registrado" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ mensaje: "Cliente creado", id: this.lastID });
    });
});

// Encender servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});