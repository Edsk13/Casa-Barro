const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error SQLite:', err.message);
    } else {
        console.log('Conectado a SQLite.');
        
        db.run(`CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            precio REAL,
            estado TEXT DEFAULT 'disponible'
        )`);

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

        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            correo TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            rol TEXT DEFAULT 'cliente',
            empresa TEXT,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// Autenticación (Registro y sincronización con CRM)
app.post('/api/registro', (req, res) => {
    const { nombre, correo, password, rol, empresa } = req.body;

    if (!nombre || !correo || !password) {
        return res.status(400).json({ error: "Nombre, correo y contraseña requeridos" });
    }

    const rolUsuario = rol || 'cliente';

    db.run(`INSERT INTO usuarios (nombre, correo, password, rol, empresa) VALUES (?, ?, ?, ?, ?)`, 
    [nombre, correo, password, rolUsuario, empresa], function(err) {
        if (err) return res.status(400).json({ error: "El correo ya está registrado." });
        
        db.run(`INSERT INTO clientes (nombre, correo, empresa) VALUES (?, ?, ?)`, 
        [nombre, correo, empresa], function(errCrm) {
            res.status(201).json({ mensaje: "Usuario registrado y añadido al CRM", id: this.lastID });
        });
    });
});

// Autenticación (Login)
app.post('/api/login', (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ error: "Correo y contraseña requeridos" });
    }

    db.get("SELECT id, nombre, correo, rol, empresa FROM usuarios WHERE correo = ? AND password = ?", [correo, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: "Credenciales incorrectas" });
        
        res.json({ mensaje: "Éxito", usuario: row });
    });
});

// Módulo CRM (Crear cliente/admin y sincronizar con Auth)
app.post('/api/clientes', (req, res) => {
    const { nombre, correo, telefono, empresa, password, rol } = req.body;
    
    if (!nombre || !correo || !password) {
        return res.status(400).json({ error: "Nombre, correo y contraseña son obligatorios" });
    }

    db.run(`INSERT INTO clientes (nombre, correo, telefono, empresa) VALUES (?, ?, ?, ?)`, 
    [nombre, correo, telefono, empresa], function(err) {
        if (err) return res.status(400).json({ error: "El correo ya existe en el CRM" });
        
        db.run(`INSERT INTO usuarios (nombre, correo, password, rol, empresa) VALUES (?, ?, ?, ?, ?)`, 
        [nombre, correo, password, rol, empresa], function(errUser) {
            res.status(201).json({ mensaje: "Cuenta creada con éxito" });
        });
    });
});

// Módulo CRM (Actualizar cliente/etapa desde el panel)
app.put('/api/clientes/:id', (req, res) => {
    const { nombre, correo, telefono, empresa, etapa_crm, estado } = req.body;
    const { id } = req.params;

    const sql = `UPDATE clientes SET nombre = ?, correo = ?, telefono = ?, empresa = ?, etapa_crm = ?, estado = ? WHERE id = ?`;
    
    db.run(sql, [nombre, correo, telefono, empresa, etapa_crm, estado, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Cliente actualizado exitosamente" });
    });
});

// Módulo CRM (Leer clientes)
app.get('/api/clientes', (req, res) => {
    db.all("SELECT * FROM clientes", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Éxito", data: rows });
    });
});

// Dashboard CRM (Métricas)
app.get('/api/metricas-crm', (req, res) => {
    db.get("SELECT COUNT(*) as total FROM clientes", [], (err, rowTotal) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get("SELECT COUNT(*) as activos FROM clientes WHERE etapa_crm IN ('Activo', 'Frecuente')", [], (err, rowActivos) => {
            db.get("SELECT COUNT(*) as inactivos FROM clientes WHERE etapa_crm IN ('Prospecto', 'Inactivo')", [], (err, rowInactivos) => {
                db.all("SELECT nombre, etapa_crm FROM clientes WHERE etapa_crm IN ('Prospecto', 'Inactivo') LIMIT 4", [], (err, rowsRiesgo) => {
                    res.json({ 
                        mensaje: "Éxito", 
                        total: rowTotal.total,
                        activos: rowActivos ? rowActivos.activos : 0,
                        inactivos: rowInactivos ? rowInactivos.inactivos : 0,
                        listaRiesgo: rowsRiesgo || []
                    });
                });
            });
        });
    });
});

// Leer productos
app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos WHERE estado = 'disponible'", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Éxito", data: rows });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});