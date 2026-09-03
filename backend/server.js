const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE LA BASE DE DATOS
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error SQLite:', err.message);
    } else {
        console.log('Conectado a SQLite.');
        
        db.run(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, estado TEXT DEFAULT 'disponible')`);
        db.run(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, correo TEXT UNIQUE NOT NULL, telefono TEXT, empresa TEXT, fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP, estado TEXT DEFAULT 'activo', etapa_crm TEXT DEFAULT 'Prospecto')`);
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, correo TEXT UNIQUE NOT NULL, password TEXT NOT NULL, rol TEXT DEFAULT 'cliente', empresa TEXT, telefono TEXT, fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS interacciones (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, usuario_id INTEGER, tipo TEXT, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (cliente_id) REFERENCES clientes(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`, () => {
            
            db.get("SELECT * FROM usuarios WHERE correo = ?", ["admin@casabarro.com"], (err, row) => {
                if (!row) {
                    db.run(`INSERT INTO usuarios (nombre, correo, password, rol, telefono) VALUES (?, ?, ?, ?, ?)`,
                    ["Administrador Maestro", "admin@casabarro.com", "admin123", "admin", "4491234567"], (err) => {
                        if (!err) console.log("Cuenta de Admin inicial creada automáticamente.");
                    });
                }
            });

        });
    }
});


// AUTENTICACIÓN PÚBLICA (LOGIN / REGISTRO)
app.post('/api/registro', (req, res) => {
    const { nombre, correo, password, rol, empresa } = req.body;
    if (!nombre || !correo || !password) return res.status(400).json({ error: "Datos incompletos" });

    const rolUsuario = rol || 'cliente';
    db.run(`INSERT INTO usuarios (nombre, correo, password, rol, empresa) VALUES (?, ?, ?, ?, ?)`, 
    [nombre, correo, password, rolUsuario, empresa], function(err) {
        if (err) return res.status(400).json({ error: "El correo ya está registrado." });
        db.run(`INSERT INTO clientes (nombre, correo, empresa) VALUES (?, ?, ?)`, 
        [nombre, correo, empresa], function(errCrm) {
            res.status(201).json({ mensaje: "Usuario registrado", id: this.lastID });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { correo, password } = req.body;
    if (!correo || !password) return res.status(400).json({ error: "Datos incompletos" });

    db.get("SELECT id, nombre, correo, rol, empresa, password, telefono FROM usuarios WHERE correo = ? AND password = ?", [correo, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: "Credenciales incorrectas" });
        res.json({ mensaje: "Éxito", usuario: row });
    });
});

// GESTIÓN DE PERSONAL (USUARIOS INTERNOS)
app.post('/api/personal', (req, res) => {
    const { nombre, correo, password, rol, telefono } = req.body;
    if (!nombre || !correo || !password || !rol) return res.status(400).json({ error: "Datos incompletos" });

    db.run(`INSERT INTO usuarios (nombre, correo, password, rol, telefono) VALUES (?, ?, ?, ?, ?)`, 
    [nombre, correo, password, rol, telefono], function(err) {
        if (err) return res.status(400).json({ error: "El correo ya está registrado." });
        res.status(201).json({ mensaje: "Empleado registrado exitosamente" });
    });
});

app.get('/api/personal', (req, res) => {
    db.all("SELECT id, nombre, correo, rol, telefono FROM usuarios WHERE rol IN ('admin', 'vendedor')", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Éxito", data: rows });
    });
});

app.put('/api/usuarios/:id', (req, res) => {
    const { nombre, correo, password, telefono, rol } = req.body;
    const { id } = req.params;
    
    let sql = `UPDATE usuarios SET nombre = ?, correo = ?, password = ?, telefono = ? WHERE id = ?`;
    let params = [nombre, correo, password, telefono, id];

    if (rol) {
        sql = `UPDATE usuarios SET nombre = ?, correo = ?, password = ?, telefono = ?, rol = ? WHERE id = ?`;
        params = [nombre, correo, password, telefono, rol, id];
    }

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Usuario actualizado exitosamente" });
    });
});

app.delete('/api/usuarios/:id', (req, res) => {
    db.run(`DELETE FROM usuarios WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Empleado eliminado correctamente" });
    });
});

// MÓDULO CRM (CLIENTES E INTERACCIONES)
app.post('/api/clientes', (req, res) => {
    const { nombre, correo, telefono, empresa, password } = req.body;
    if (!nombre || !correo || !password) return res.status(400).json({ error: "Nombre, correo y contraseña obligatorios" });

    db.run(`INSERT INTO clientes (nombre, correo, telefono, empresa) VALUES (?, ?, ?, ?)`, 
    [nombre, correo, telefono, empresa], function(err) {
        if (err) return res.status(400).json({ error: "El correo ya existe en el CRM" });
        db.run(`INSERT INTO usuarios (nombre, correo, password, rol, empresa, telefono) VALUES (?, ?, ?, 'cliente', ?, ?)`, 
        [nombre, correo, password, empresa, telefono], function(errUser) {
            res.status(201).json({ mensaje: "Cliente creado exitosamente" });
        });
    });
});

app.put('/api/clientes/:id', (req, res) => {
    const { nombre, correo, telefono, empresa, etapa_crm, estado } = req.body;
    db.run(`UPDATE clientes SET nombre = ?, correo = ?, telefono = ?, empresa = ?, etapa_crm = ?, estado = ? WHERE id = ?`, 
    [nombre, correo, telefono, empresa, etapa_crm, estado, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Actualizado" });
    });
});

app.delete('/api/clientes/:id', (req, res) => {
    db.run(`DELETE FROM clientes WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Cliente eliminado correctamente" });
    });
});

app.get('/api/clientes', (req, res) => {
    const sql = `SELECT c.* FROM clientes c LEFT JOIN usuarios u ON c.correo = u.correo WHERE u.rol = 'cliente' OR u.rol IS NULL`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Éxito", data: rows });
    });
});

app.get('/api/clientes/:id', (req, res) => {
    db.get(`SELECT * FROM clientes WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Cliente no encontrado" });
        res.json({ mensaje: "Éxito", data: row });
    });
});

app.post('/api/interacciones', (req, res) => {
    const { cliente_id, usuario_id, tipo, descripcion } = req.body;
    db.run(`INSERT INTO interacciones (cliente_id, usuario_id, tipo, descripcion) VALUES (?, ?, ?, ?)`, 
    [cliente_id, usuario_id, tipo, descripcion], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ mensaje: "Contacto registrado" });
    });
});

app.get('/api/clientes/:id/interacciones', (req, res) => {
    db.all("SELECT * FROM interacciones WHERE cliente_id = ? ORDER BY fecha DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Éxito", data: rows });
    });
});

app.get('/api/metricas-crm', (req, res) => {
    const baseJoin = `FROM clientes c LEFT JOIN usuarios u ON c.correo = u.correo WHERE (u.rol = 'cliente' OR u.rol IS NULL)`;
    
    db.get(`SELECT COUNT(c.id) as total ${baseJoin}`, [], (err, rowTotal) => {
        db.get(`SELECT COUNT(c.id) as activos ${baseJoin} AND c.etapa_crm IN ('Activo', 'Frecuente')`, [], (err, rowActivos) => {
            db.get(`SELECT COUNT(c.id) as inactivos ${baseJoin} AND c.etapa_crm IN ('Prospecto', 'Inactivo')`, [], (err, rowInactivos) => {
                db.get(`SELECT COUNT(*) as total_interacciones FROM interacciones`, [], (err, rowInteracciones) => {
                    db.all(`SELECT c.nombre, c.etapa_crm ${baseJoin} AND c.etapa_crm IN ('Prospecto', 'Inactivo') LIMIT 4`, [], (err, rowsRiesgo) => {
                        res.json({ 
                            mensaje: "Éxito", 
                            total: rowTotal ? rowTotal.total : 0,
                            activos: rowActivos ? rowActivos.activos : 0,
                            inactivos: rowInactivos ? rowInactivos.inactivos : 0,
                            interacciones_totales: rowInteracciones ? rowInteracciones.total_interacciones : 0,
                            listaRiesgo: rowsRiesgo || []
                        });
                    });
                });
            });
        });
    });
});}

// MÓDULO CATÁLOGO
app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos WHERE estado = 'disponible'", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Éxito", data: rows });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});