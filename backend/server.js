const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Servir el frontend desde la raíz del proyecto
const frontendPath = path.resolve(__dirname, '..');
app.use(express.static(frontendPath));

// ============================================================
// CONFIGURACIÓN DE LA BASE DE DATOS
// ============================================================
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('Error SQLite:', err.message);
    console.log('Conectado a SQLite.');
    db.serialize(() => inicializarTablas());
});

function asegurarColumna(tabla, columna, definicion) {
    db.all(`PRAGMA table_info(${tabla})`, [], (err, columnas) => {
        if (err) return console.error(`Error revisando tabla ${tabla}:`, err.message);
        if (!columnas.some(col => col.name === columna)) {
            db.run(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`, (error) => {
                if (error) console.error(`Error agregando ${tabla}.${columna}:`, error.message);
                else console.log(`SCM: columna agregada ${tabla}.${columna}`);
            });
        }
    });
}

function inicializarTablas() {
    db.run(`CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, estado TEXT DEFAULT 'disponible')`);
    db.run(`CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, correo TEXT UNIQUE NOT NULL, telefono TEXT, empresa TEXT, fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP, estado TEXT DEFAULT 'activo', etapa_crm TEXT DEFAULT 'Prospecto')`);
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, correo TEXT UNIQUE NOT NULL, password TEXT NOT NULL, rol TEXT DEFAULT 'cliente', empresa TEXT, telefono TEXT, fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS interacciones (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, usuario_id INTEGER, tipo TEXT, descripcion TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (cliente_id) REFERENCES clientes(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS bitacora_actividad (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER, usuario_nombre TEXT NOT NULL, rol TEXT NOT NULL, accion TEXT NOT NULL, modulo TEXT NOT NULL, descripcion TEXT NOT NULL, entidad TEXT, entidad_id INTEGER, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`);
    
    // SCM - Ampliación modelo producto
    asegurarColumna('productos', 'descripcion', 'TEXT');
    asegurarColumna('productos', 'categoria', 'TEXT');
    asegurarColumna('productos', 'stock_actual', 'INTEGER DEFAULT 0');
    asegurarColumna('productos', 'stock_minimo', 'INTEGER DEFAULT 0');
    asegurarColumna('productos', 'proveedor_id', 'INTEGER');
    asegurarColumna('productos', 'costo_unitario', 'REAL DEFAULT 0');
    asegurarColumna('productos', 'estrategia_logistica', "TEXT DEFAULT 'PULL'");

    db.run(`CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, contacto TEXT, correo TEXT, telefono TEXT, estado TEXT DEFAULT 'activo', fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS insumos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, descripcion TEXT, proveedor_id INTEGER, costo_porcion REAL DEFAULT 0, estado TEXT DEFAULT 'activo', fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (proveedor_id) REFERENCES proveedores(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS inventario (id INTEGER PRIMARY KEY AUTOINCREMENT, insumo_id INTEGER NOT NULL UNIQUE, stock_actual INTEGER DEFAULT 0, stock_minimo INTEGER DEFAULT 0, fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (insumo_id) REFERENCES insumos(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS producto_insumo (id INTEGER PRIMARY KEY AUTOINCREMENT, producto_id INTEGER NOT NULL, insumo_id INTEGER NOT NULL, porciones_requeridas INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (producto_id) REFERENCES productos(id), FOREIGN KEY (insumo_id) REFERENCES insumos(id), UNIQUE(producto_id, insumo_id))`);
    db.run(`CREATE TABLE IF NOT EXISTS movimientos_inventario (id INTEGER PRIMARY KEY AUTOINCREMENT, producto_id INTEGER, insumo_id INTEGER, tipo TEXT NOT NULL, cantidad INTEGER NOT NULL, motivo TEXT NOT NULL, usuario_id INTEGER, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (producto_id) REFERENCES productos(id), FOREIGN KEY (insumo_id) REFERENCES insumos(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, producto_id INTEGER, insumo_id INTEGER, proveedor_id INTEGER, cantidad INTEGER NOT NULL, tipo TEXT NOT NULL, estado TEXT DEFAULT 'pendiente', origen TEXT DEFAULT 'MANUAL', usuario_id INTEGER, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, fecha_surtido DATETIME, FOREIGN KEY (producto_id) REFERENCES productos(id), FOREIGN KEY (insumo_id) REFERENCES insumos(id), FOREIGN KEY (proveedor_id) REFERENCES proveedores(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS movimientos_logisticos (id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER, tipo TEXT, descripcion TEXT, estado TEXT, usuario_id INTEGER, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (pedido_id) REFERENCES pedidos(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS scm_config (id INTEGER PRIMARY KEY, nivel_scm TEXT DEFAULT 'Inicial', fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`INSERT OR IGNORE INTO scm_config (id, nivel_scm) VALUES (1, 'Inicial')`);

    db.get(`SELECT * FROM usuarios WHERE correo = ?`, ['admin@casabarro.com'], (err, row) => {
        if (err) return console.error('Error verificando admin inicial:', err.message);
        if (!row) {
            db.run(
                `INSERT INTO usuarios (nombre, correo, password, rol, telefono) VALUES (?, ?, ?, ?, ?)`,
                ['Administrador Maestro', 'admin@casabarro.com', 'admin123', 'admin', '4491234567'],
                (errInsert) => { if (!errInsert) console.log('Cuenta de Admin inicial creada automáticamente.'); }
            );
        }
    });
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
function registrarActividad(usuarioId, accion, modulo, descripcion, entidad = null, entidadId = null) {
    if (!usuarioId) return;
    db.get(`SELECT nombre, rol FROM usuarios WHERE id = ?`, [usuarioId], (err, usuario) => {
        if (err || !usuario) return console.warn(`Error o usuario no encontrado (${usuarioId}) para registrar actividad.`);
        db.run(
            `INSERT INTO bitacora_actividad (usuario_id, usuario_nombre, rol, accion, modulo, descripcion, entidad, entidad_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [usuarioId, usuario.nombre, usuario.rol, accion, modulo, descripcion, entidad, entidadId],
            (error) => { if (error) console.error('Error registrando actividad:', error.message); }
        );
    });
}

const esRolInterno = (rol) => ['admin', 'vendedor', 'logistica'].includes(rol);

// ============================================================
// AUTENTICACIÓN PÚBLICA
// ============================================================
app.post('/api/registro', (req, res) => {
    const { nombre, correo, password, rol, empresa } = req.body;
    if (!nombre || !correo || !password) return res.status(400).json({ error: 'Datos incompletos' });

    const rolUsuario = rol || 'cliente';
    db.run(`INSERT INTO usuarios (nombre, correo, password, rol, empresa) VALUES (?, ?, ?, ?, ?)`, 
    [nombre, correo, password, rolUsuario, empresa], function(err) {
        if (err) return res.status(400).json({ error: 'El correo ya está registrado.' });
        const nuevoUsuarioId = this.lastID;

        db.run(`INSERT INTO clientes (nombre, correo, empresa) VALUES (?, ?, ?)`, [nombre, correo, empresa], function(errCrm) {
            if (errCrm) return res.status(400).json({ error: 'No se pudo crear el registro CRM.' });
            res.status(201).json({ mensaje: 'Usuario registrado', id: nuevoUsuarioId });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { correo, password } = req.body;
    if (!correo || !password) return res.status(400).json({ error: 'Datos incompletos' });

    db.get(`SELECT id, nombre, correo, rol, empresa, password, telefono FROM usuarios WHERE correo = ? AND password = ?`, 
    [correo, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Credenciales incorrectas' });

        if (esRolInterno(row.rol)) registrarActividad(row.id, 'SESION', 'Sistema', 'Inició sesión en el sistema', 'usuario', row.id);
        res.json({ mensaje: 'Éxito', usuario: row });
    });
});

app.post('/api/logout', (req, res) => {
    const { usuario_id } = req.body;
    if (usuario_id) registrarActividad(usuario_id, 'SESION', 'Sistema', 'Cerró sesión en el sistema', 'usuario', usuario_id);
    res.json({ mensaje: 'Sesión cerrada' });
});

// ============================================================
// GESTIÓN DE PERSONAL
// ============================================================
app.post('/api/personal', (req, res) => {
    const { nombre, correo, password, rol, telefono, usuario_id_actor } = req.body;
    if (!nombre || !correo || !password || !rol) return res.status(400).json({ error: 'Datos incompletos' });
    if (!esRolInterno(rol)) return res.status(400).json({ error: 'Rol de empleado no válido.' });

    db.run(`INSERT INTO usuarios (nombre, correo, password, rol, telefono) VALUES (?, ?, ?, ?, ?)`,
    [nombre, correo, password, rol, telefono], function(err) {
        if (err) return res.status(400).json({ error: 'El correo ya está registrado.' });
        const empleadoId = this.lastID;
        registrarActividad(usuario_id_actor, 'ALTA', 'Personal', `Registró a ${nombre} con el rol ${rol}`, 'usuario', empleadoId);
        res.status(201).json({ mensaje: 'Empleado registrado exitosamente', id: empleadoId });
    });
});

app.get('/api/personal', (req, res) => {
    db.all(`SELECT id, nombre, correo, rol, telefono FROM usuarios WHERE rol IN ('admin', 'vendedor', 'logistica')`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.put('/api/usuarios/:id', (req, res) => {
    const { nombre, correo, password, telefono, rol, usuario_id_actor } = req.body;
    const { id } = req.params;

    db.get(`SELECT * FROM usuarios WHERE id = ?`, [id], (errBuscar, usuarioAnterior) => {
        if (errBuscar) return res.status(500).json({ error: errBuscar.message });
        if (!usuarioAnterior) return res.status(404).json({ error: 'Usuario no encontrado' });

        const passwordFinal = password?.trim() ? password : usuarioAnterior.password;
        const rolFinal = rol || usuarioAnterior.rol;

        if (rol && !esRolInterno(rol)) return res.status(400).json({ error: 'Rol de empleado no válido.' });

        db.run(`UPDATE usuarios SET nombre = ?, correo = ?, password = ?, telefono = ?, rol = ? WHERE id = ?`,
        [nombre, correo, passwordFinal, telefono, rolFinal, id], function(errActualizar) {
            if (errActualizar) return res.status(500).json({ error: errActualizar.message });

            const actorId = usuario_id_actor || Number(id);
            const esPerfilPropio = Number(actorId) === Number(id) && !rol;
            
            registrarActividad(actorId, 'EDICION', esPerfilPropio ? 'Configuración' : 'Personal', 
                esPerfilPropio ? 'Actualizó la configuración de su cuenta' : `Actualizó los datos de ${nombre}`, 'usuario', Number(id));
            res.json({ mensaje: 'Usuario actualizado exitosamente' });
        });
    });
});

app.delete('/api/usuarios/:id', (req, res) => {
    const { usuario_id_actor } = req.body || {};
    const targetId = Number(req.params.id);

    if (usuario_id_actor && Number(usuario_id_actor) === targetId) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta desde este panel.' });
    }

    db.get(`SELECT nombre, rol FROM usuarios WHERE id = ?`, [targetId], (errBuscar, empleado) => {
        if (errBuscar) return res.status(500).json({ error: errBuscar.message });
        if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

        db.run(`DELETE FROM usuarios WHERE id = ?`, [targetId], function(errEliminar) {
            if (errEliminar) return res.status(500).json({ error: errEliminar.message });
            registrarActividad(usuario_id_actor, 'BAJA', 'Personal', `Eliminó a ${empleado.nombre} (${empleado.rol})`, 'usuario', targetId);
            res.json({ mensaje: 'Empleado eliminado correctamente' });
        });
    });
});

// ============================================================
// CRM - CLIENTES E INTERACCIONES
// ============================================================
app.post('/api/clientes', (req, res) => {
    const { nombre, correo, telefono, empresa, password, usuario_id } = req.body;
    if (!nombre || !correo || !password) return res.status(400).json({ error: 'Nombre, correo y contraseña obligatorios' });

    db.run(`INSERT INTO clientes (nombre, correo, telefono, empresa) VALUES (?, ?, ?, ?)`, [nombre, correo, telefono, empresa], function(err) {
        if (err) return res.status(400).json({ error: 'El correo ya existe en el CRM' });
        const nuevoClienteId = this.lastID;

        db.run(`INSERT INTO usuarios (nombre, correo, password, rol, empresa, telefono) VALUES (?, ?, ?, 'cliente', ?, ?)`, 
        [nombre, correo, password, empresa, telefono], function(errUser) {
            if (errUser) return res.status(400).json({ error: 'No se pudo crear el acceso del cliente.' });
            
            if (usuario_id) {
                db.run(`INSERT INTO interacciones (cliente_id, usuario_id, tipo, descripcion) VALUES (?, ?, 'Registro', 'Alta de nuevo cliente en el sistema CRM.')`, 
                [nuevoClienteId, usuario_id]);
                registrarActividad(usuario_id, 'ALTA', 'Clientes', `Registró al cliente ${nombre}`, 'cliente', nuevoClienteId);
            }
            res.status(201).json({ mensaje: 'Cliente creado exitosamente', id: nuevoClienteId });
        });
    });
});

app.put('/api/clientes/:id', (req, res) => {
    const { nombre, correo, telefono, empresa, etapa_crm, estado, usuario_id } = req.body;
    const clienteId = Number(req.params.id);

    db.get(`SELECT * FROM clientes WHERE id = ?`, [clienteId], (errBuscar, clienteAnterior) => {
        if (errBuscar) return res.status(500).json({ error: errBuscar.message });
        if (!clienteAnterior) return res.status(404).json({ error: 'Cliente no encontrado' });

        db.run(`UPDATE clientes SET nombre = ?, correo = ?, telefono = ?, empresa = ?, etapa_crm = ?, estado = ? WHERE id = ?`, 
        [nombre, correo, telefono, empresa, etapa_crm, estado, clienteId], function(errActualizar) {
            if (errActualizar) return res.status(500).json({ error: errActualizar.message });
            registrarActividad(usuario_id, 'EDICION', 'Clientes', `Actualizó los datos del cliente ${nombre}`, 'cliente', clienteId);
            res.json({ mensaje: 'Actualizado' });
        });
    });
});

app.delete('/api/clientes/:id', (req, res) => {
    const { usuario_id } = req.body || {};
    const clienteId = Number(req.params.id);

    db.get(`SELECT nombre FROM clientes WHERE id = ?`, [clienteId], (errBuscar, cliente) => {
        if (errBuscar) return res.status(500).json({ error: errBuscar.message });
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

        db.run(`DELETE FROM clientes WHERE id = ?`, [clienteId], function(errEliminar) {
            if (errEliminar) return res.status(500).json({ error: errEliminar.message });
            registrarActividad(usuario_id, 'BAJA', 'Clientes', `Eliminó al cliente ${cliente.nombre}`, 'cliente', clienteId);
            res.json({ mensaje: 'Cliente eliminado correctamente' });
        });
    });
});

app.get('/api/clientes', (req, res) => {
    db.all(`SELECT c.* FROM clientes c LEFT JOIN usuarios u ON c.correo = u.correo WHERE u.rol = 'cliente' OR u.rol IS NULL`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.get('/api/clientes/:id', (req, res) => {
    db.get(`SELECT * FROM clientes WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json({ mensaje: 'Éxito', data: row });
    });
});

app.post('/api/interacciones', (req, res) => {
    const { cliente_id, usuario_id, tipo, descripcion } = req.body;
    if (!cliente_id || !usuario_id || !tipo) return res.status(400).json({ error: 'Datos incompletos' });

    db.run(`INSERT INTO interacciones (cliente_id, usuario_id, tipo, descripcion) VALUES (?, ?, ?, ?)`, 
    [cliente_id, usuario_id, tipo, descripcion], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get(`SELECT nombre FROM clientes WHERE id = ?`, [cliente_id], (errCliente, cliente) => {
            const nombreCliente = cliente ? cliente.nombre : `#${cliente_id}`;
            const descFiltro = descripcion ? `: ${descripcion}` : '';
            registrarActividad(usuario_id, 'CRM', 'Clientes', `Registró ${String(tipo).toLowerCase()} con ${nombreCliente}${descFiltro}`, 'cliente', Number(cliente_id));
        });
        res.status(201).json({ mensaje: 'Contacto registrado' });
    });
});

app.get('/api/clientes/:id/interacciones', (req, res) => {
    db.all(`SELECT * FROM interacciones WHERE cliente_id = ? ORDER BY fecha DESC`, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.get('/api/metricas-crm', (req, res) => {
    const baseJoin = `FROM clientes c LEFT JOIN usuarios u ON c.correo = u.correo WHERE (u.rol = 'cliente' OR u.rol IS NULL)`;
    
    db.get(`SELECT COUNT(c.id) AS total ${baseJoin}`, [], (err, rowTotal) => {
        db.get(`SELECT COUNT(c.id) AS activos ${baseJoin} AND c.etapa_crm IN ('Activo', 'Frecuente')`, [], (err, rowActivos) => {
            db.get(`SELECT COUNT(c.id) AS inactivos ${baseJoin} AND c.etapa_crm IN ('Prospecto', 'Inactivo')`, [], (err, rowInactivos) => {
                db.get(`SELECT COUNT(*) AS total_interacciones FROM interacciones`, [], (err, rowInteracciones) => {
                    db.all(`SELECT c.nombre, c.etapa_crm ${baseJoin} AND c.etapa_crm IN ('Prospecto', 'Inactivo') LIMIT 4`, [], (err, rowsRiesgo) => {
                        res.json({
                            mensaje: 'Éxito',
                            total: rowTotal?.total || 0,
                            activos: rowActivos?.activos || 0,
                            inactivos: rowInactivos?.inactivos || 0,
                            interacciones_totales: rowInteracciones?.total_interacciones || 0,
                            listaRiesgo: rowsRiesgo || []
                        });
                    });
                });
            });
        });
    });
});

app.get('/api/mis-interacciones/:usuario_id', (req, res) => {
    db.all(`SELECT i.*, c.nombre AS cliente_nombre FROM interacciones i LEFT JOIN clientes c ON i.cliente_id = c.id WHERE i.usuario_id = ? ORDER BY i.fecha DESC`, 
    [req.params.usuario_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.get('/api/mis-actividades/:usuario_id', (req, res) => {
    db.all(`SELECT * FROM bitacora_actividad WHERE usuario_id = ? ORDER BY fecha DESC, id DESC`, [req.params.usuario_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

// ============================================================
// MÓDULO SCM - PRODUCTOS
// ============================================================
app.get('/api/productos', (req, res) => {
    const mostrarTodos = req.query.todos === '1';
    db.all(`SELECT p.*, pr.nombre AS proveedor_nombre FROM productos p LEFT JOIN proveedores pr ON p.proveedor_id = pr.id ${mostrarTodos ? '' : "WHERE p.estado = 'disponible'"} ORDER BY p.id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.post('/api/productos', (req, res) => {
    const { nombre, descripcion, categoria, precio, stock_actual, stock_minimo, proveedor_id, costo_unitario, estrategia_logistica, estado, usuario_id } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });

    const [pNum, sAct, sMin, cNum] = [Number(precio||0), Number(stock_actual||0), Number(stock_minimo||0), Number(costo_unitario||0)];
    if ([pNum, sAct, sMin, cNum].some(n => !Number.isFinite(n) || n < 0)) {
        return res.status(400).json({ error: 'Precio, costo y existencias deben ser números no negativos.' });
    }

    const estrategia = estrategia_logistica || 'PULL';
    if (!['PUSH', 'PULL'].includes(estrategia)) return res.status(400).json({ error: 'La estrategia logística debe ser PUSH o PULL.' });
    
    const estadoFinal = estado || 'disponible';
    if (!['disponible', 'agotado', 'inactivo'].includes(estadoFinal)) return res.status(400).json({ error: 'Estado de producto no válido.' });

    const proveedorFinal = proveedor_id ? Number(proveedor_id) : null;
    const insertarProducto = () => {
        db.run(`INSERT INTO productos (nombre, descripcion, categoria, precio, stock_actual, stock_minimo, proveedor_id, costo_unitario, estrategia_logistica, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre.trim(), descripcion?.trim() || null, categoria?.trim() || null, pNum, sAct, sMin, proveedorFinal, cNum, estrategia, estadoFinal], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            registrarActividad(usuario_id, 'ALTA', 'Productos', `Registró el producto ${nombre.trim()}`, 'producto', this.lastID);
            res.status(201).json({ mensaje: 'Producto registrado correctamente', id: this.lastID });
        });
    };

    if (!proveedorFinal) return insertarProducto();
    db.get(`SELECT id FROM proveedores WHERE id = ? AND estado = 'activo'`, [proveedorFinal], (err, proveedor) => {
        if (err || !proveedor) return res.status(400).json({ error: err ? err.message : 'Proveedor inactivo o inexistente.' });
        insertarProducto();
    });
});

app.put('/api/productos/:id', (req, res) => {
    const productoId = Number(req.params.id);
    if (!Number.isInteger(productoId) || productoId <= 0) return res.status(400).json({ error: 'ID de producto no válido.' });

    const { nombre, descripcion, categoria, precio, stock_actual, stock_minimo, proveedor_id, costo_unitario, estrategia_logistica, estado, usuario_id } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });

    const [pNum, sAct, sMin, cNum] = [Number(precio||0), Number(stock_actual||0), Number(stock_minimo||0), Number(costo_unitario||0)];
    if ([pNum, sAct, sMin, cNum].some(n => !Number.isFinite(n) || n < 0)) return res.status(400).json({ error: 'Valores numéricos no válidos o negativos.' });
    if (!['PUSH', 'PULL'].includes(estrategia_logistica)) return res.status(400).json({ error: 'Estrategia debe ser PUSH o PULL.' });
    if (!['disponible', 'agotado', 'inactivo'].includes(estado)) return res.status(400).json({ error: 'Estado no válido.' });

    const proveedorFinal = proveedor_id ? Number(proveedor_id) : null;
    const actualizarProducto = () => {
        db.run(`UPDATE productos SET nombre=?, descripcion=?, categoria=?, precio=?, stock_actual=?, stock_minimo=?, proveedor_id=?, costo_unitario=?, estrategia_logistica=?, estado=? WHERE id=?`,
        [nombre.trim(), descripcion?.trim() || null, categoria?.trim() || null, pNum, sAct, sMin, proveedorFinal, cNum, estrategia_logistica, estado, productoId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            registrarActividad(usuario_id, 'EDICION', 'Productos', `Actualizó el producto ${nombre.trim()}`, 'producto', productoId);
            res.json({ mensaje: 'Producto actualizado correctamente' });
        });
    };

    db.get('SELECT id FROM productos WHERE id = ?', [productoId], (err, producto) => {
        if (err || !producto) return res.status(err ? 500 : 404).json({ error: err ? err.message : 'Producto no encontrado.' });
        if (!proveedorFinal) return actualizarProducto();
        
        db.get('SELECT id FROM proveedores WHERE id = ?', [proveedorFinal], (errP, proveedor) => {
            if (errP || !proveedor) return res.status(400).json({ error: errP ? errP.message : 'El proveedor no existe.' });
            actualizarProducto();
        });
    });
});

app.delete('/api/productos/:id', (req, res) => {
    const productoId = Number(req.params.id);
    if (!Number.isInteger(productoId) || productoId <= 0) return res.status(400).json({ error: 'ID de producto no válido.' });

    db.get('SELECT nombre FROM productos WHERE id = ?', [productoId], (err, producto) => {
        if (err || !producto) return res.status(err ? 500 : 404).json({ error: err ? err.message : 'Producto no encontrado.' });
        db.run(`UPDATE productos SET estado = 'inactivo' WHERE id = ?`, [productoId], function(errEl) {
            if (errEl) return res.status(500).json({ error: errEl.message });
            registrarActividad(req.body?.usuario_id, 'BAJA', 'Productos', `Dio de baja el producto ${producto.nombre}`, 'producto', productoId);
            res.json({ mensaje: 'Producto dado de baja correctamente' });
        });
    });
});

// ============================================================
// MÓDULO SCM - PROVEEDORES
// ============================================================
app.get('/api/proveedores', (req, res) => {
    db.all(`SELECT * FROM proveedores ${req.query.activos === '1' ? "WHERE estado = 'activo'" : ''} ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.post('/api/proveedores', (req, res) => {
    const { nombre, contacto, correo, telefono, usuario_id } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del proveedor es obligatorio.' });

    db.run(`INSERT INTO proveedores (nombre, contacto, correo, telefono, estado) VALUES (?, ?, ?, ?, 'activo')`,
    [nombre.trim(), contacto?.trim() || null, correo?.trim() || null, telefono?.trim() || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        registrarActividad(usuario_id, 'ALTA', 'Proveedores', `Registró al proveedor ${nombre.trim()}`, 'proveedor', this.lastID);
        res.status(201).json({ mensaje: 'Proveedor registrado correctamente', id: this.lastID });
    });
});

app.put('/api/proveedores/:id', (req, res) => {
    const proveedorId = Number(req.params.id);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) return res.status(400).json({ error: 'ID de proveedor no válido.' });

    const { nombre, contacto, correo, telefono, estado, usuario_id } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del proveedor es obligatorio.' });
    if (!['activo', 'inactivo'].includes(estado || 'activo')) return res.status(400).json({ error: 'Estado no válido.' });

    db.get('SELECT id FROM proveedores WHERE id = ?', [proveedorId], (err, proveedor) => {
        if (err || !proveedor) return res.status(err ? 500 : 404).json({ error: err ? err.message : 'Proveedor no encontrado.' });
        db.run(`UPDATE proveedores SET nombre=?, contacto=?, correo=?, telefono=?, estado=? WHERE id=?`,
        [nombre.trim(), contacto?.trim() || null, correo?.trim() || null, telefono?.trim() || null, estado || 'activo', proveedorId], function(errAct) {
            if (errAct) return res.status(500).json({ error: errAct.message });
            registrarActividad(usuario_id, 'EDICION', 'Proveedores', `Actualizó al proveedor ${nombre.trim()}`, 'proveedor', proveedorId);
            res.json({ mensaje: 'Proveedor actualizado correctamente' });
        });
    });
});

app.delete('/api/proveedores/:id', (req, res) => {
    const proveedorId = Number(req.params.id);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) return res.status(400).json({ error: 'ID no válido.' });

    db.get('SELECT nombre FROM proveedores WHERE id = ?', [proveedorId], (err, proveedor) => {
        if (err || !proveedor) return res.status(err ? 500 : 404).json({ error: err ? err.message : 'Proveedor no encontrado.' });
        db.run(`UPDATE proveedores SET estado = 'inactivo' WHERE id = ?`, [proveedorId], function(errEl) {
            if (errEl) return res.status(500).json({ error: errEl.message });
            registrarActividad(req.body?.usuario_id, 'BAJA', 'Proveedores', `Dio de baja al proveedor ${proveedor.nombre}`, 'proveedor', proveedorId);
            res.json({ mensaje: 'Proveedor dado de baja correctamente' });
        });
    });
});


// ============================================================
// SCM: INSUMOS, INVENTARIO Y RECETAS
// ============================================================

function recalcularDisponibilidadProducto(productoId, callback = () => {}) {
    const sql = `
        SELECT pi.porciones_requeridas, COALESCE(inv.stock_actual, 0) AS stock_actual
        FROM producto_insumo pi
        LEFT JOIN inventario inv ON inv.insumo_id = pi.insumo_id
        WHERE pi.producto_id = ?
    `;

    db.all(sql, [productoId], (err, rows) => {
        if (err) return callback(err);

        const disponibles = rows.length === 0
            ? 0
            : Math.min(...rows.map(row => Math.floor(Number(row.stock_actual || 0) / Number(row.porciones_requeridas || 1))));

        db.run('UPDATE productos SET stock_actual = ? WHERE id = ?', [disponibles, productoId], (errUpdate) => {
            callback(errUpdate, disponibles);
        });
    });
}

function recalcularProductosPorInsumo(insumoId) {
    db.all('SELECT DISTINCT producto_id FROM producto_insumo WHERE insumo_id = ?', [insumoId], (err, rows) => {
        if (err) return console.error('Error recalculando productos:', err.message);
        rows.forEach(row => recalcularDisponibilidadProducto(row.producto_id));
    });
}

// -------------------- INSUMOS --------------------
app.get('/api/insumos', (req, res) => {
    const soloActivos = req.query.activos === '1';
    const sql = `
        SELECT i.*, p.nombre AS proveedor_nombre,
               COALESCE(inv.stock_actual, 0) AS stock_actual,
               COALESCE(inv.stock_minimo, 0) AS stock_minimo,
               CASE
                   WHEN COALESCE(inv.stock_actual, 0) <= 0 THEN 'agotado'
                   WHEN COALESCE(inv.stock_actual, 0) <= COALESCE(inv.stock_minimo, 0) THEN 'bajo'
                   ELSE 'normal'
               END AS estado_inventario
        FROM insumos i
        LEFT JOIN proveedores p ON p.id = i.proveedor_id
        LEFT JOIN inventario inv ON inv.insumo_id = i.id
        ${soloActivos ? "WHERE i.estado = 'activo'" : ''}
        ORDER BY i.id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.post('/api/insumos', (req, res) => {
    const { nombre, descripcion, proveedor_id, costo_porcion, stock_actual, stock_minimo, usuario_id } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del insumo es obligatorio.' });

    const costo = Number(costo_porcion || 0);
    const stock = Number(stock_actual || 0);
    const minimo = Number(stock_minimo || 0);
    if ([costo, stock, minimo].some(n => !Number.isFinite(n) || n < 0)) {
        return res.status(400).json({ error: 'Costo y existencias deben ser números no negativos.' });
    }

    const proveedorFinal = proveedor_id ? Number(proveedor_id) : null;
    const crear = () => {
        db.run(
            `INSERT INTO insumos (nombre, descripcion, proveedor_id, costo_porcion, estado) VALUES (?, ?, ?, ?, 'activo')`,
            [nombre.trim(), descripcion?.trim() || null, proveedorFinal, costo],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const insumoId = this.lastID;

                db.run(
                    `INSERT INTO inventario (insumo_id, stock_actual, stock_minimo, fecha_actualizacion) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                    [insumoId, stock, minimo],
                    (errInv) => {
                        if (errInv) return res.status(500).json({ error: errInv.message });

                        const finalizarAlta = () => {
                            registrarActividad(usuario_id, 'ALTA', 'Insumos', `Registró el insumo ${nombre.trim()}`, 'insumo', insumoId);
                            res.status(201).json({ mensaje: 'Insumo registrado correctamente', id: insumoId });
                        };

                        if (stock > 0) {
                            db.run(
                                `INSERT INTO movimientos_inventario (insumo_id, tipo, cantidad, motivo, usuario_id) VALUES (?, 'entrada', ?, 'stock inicial', ?)`,
                                [insumoId, stock, usuario_id || null],
                                (errMov) => {
                                    if (errMov) return res.status(500).json({ error: errMov.message });
                                    finalizarAlta();
                                }
                            );
                        } else {
                            finalizarAlta();
                        }
                    }
                );
            }
        );
    };

    if (!proveedorFinal) return crear();
    db.get(`SELECT id FROM proveedores WHERE id = ? AND estado = 'activo'`, [proveedorFinal], (err, proveedor) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!proveedor) return res.status(400).json({ error: 'El proveedor seleccionado no existe o está inactivo.' });
        crear();
    });
});

app.put('/api/insumos/:id', (req, res) => {
    const insumoId = Number(req.params.id);
    if (!Number.isInteger(insumoId) || insumoId <= 0) return res.status(400).json({ error: 'ID de insumo no válido.' });

    const { nombre, descripcion, proveedor_id, costo_porcion, stock_minimo, estado, usuario_id } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del insumo es obligatorio.' });

    const costo = Number(costo_porcion || 0);
    const minimo = Number(stock_minimo || 0);
    if (![costo, minimo].every(Number.isFinite) || costo < 0 || minimo < 0) {
        return res.status(400).json({ error: 'Costo y stock mínimo deben ser números no negativos.' });
    }

    const estadoFinal = estado || 'activo';
    if (!['activo', 'inactivo'].includes(estadoFinal)) return res.status(400).json({ error: 'Estado de insumo no válido.' });

    const proveedorFinal = proveedor_id ? Number(proveedor_id) : null;
    const actualizar = () => {
        db.run(
            `UPDATE insumos SET nombre = ?, descripcion = ?, proveedor_id = ?, costo_porcion = ?, estado = ? WHERE id = ?`,
            [nombre.trim(), descripcion?.trim() || null, proveedorFinal, costo, estadoFinal, insumoId],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: 'Insumo no encontrado.' });

                db.run(
                    `UPDATE inventario SET stock_minimo = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE insumo_id = ?`,
                    [minimo, insumoId],
                    (errInv) => {
                        if (errInv) return res.status(500).json({ error: errInv.message });
                        registrarActividad(usuario_id, 'EDICION', 'Insumos', `Actualizó el insumo ${nombre.trim()}`, 'insumo', insumoId);
                        res.json({ mensaje: 'Insumo actualizado correctamente' });
                    }
                );
            }
        );
    };

    if (!proveedorFinal) return actualizar();
    db.get('SELECT id FROM proveedores WHERE id = ?', [proveedorFinal], (err, proveedor) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!proveedor) return res.status(400).json({ error: 'El proveedor seleccionado no existe.' });
        actualizar();
    });
});

app.delete('/api/insumos/:id', (req, res) => {
    const insumoId = Number(req.params.id);
    const { usuario_id } = req.body || {};
    if (!Number.isInteger(insumoId) || insumoId <= 0) return res.status(400).json({ error: 'ID de insumo no válido.' });

    db.get('SELECT nombre FROM insumos WHERE id = ?', [insumoId], (err, insumo) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado.' });

        db.run(`UPDATE insumos SET estado = 'inactivo' WHERE id = ?`, [insumoId], (errUpdate) => {
            if (errUpdate) return res.status(500).json({ error: errUpdate.message });
            registrarActividad(usuario_id, 'BAJA', 'Insumos', `Dio de baja el insumo ${insumo.nombre}`, 'insumo', insumoId);
            res.json({ mensaje: 'Insumo dado de baja correctamente' });
        });
    });
});

// -------------------- INVENTARIO --------------------
app.get('/api/inventario', (req, res) => {
    const sql = `
        SELECT inv.id, inv.insumo_id, i.nombre AS insumo_nombre, i.estado AS insumo_estado,
               p.nombre AS proveedor_nombre, inv.stock_actual, inv.stock_minimo, inv.fecha_actualizacion,
               CASE
                   WHEN inv.stock_actual <= 0 THEN 'agotado'
                   WHEN inv.stock_actual <= inv.stock_minimo THEN 'bajo'
                   ELSE 'normal'
               END AS estado
        FROM inventario inv
        INNER JOIN insumos i ON i.id = inv.insumo_id
        LEFT JOIN proveedores p ON p.id = i.proveedor_id
        ORDER BY i.nombre ASC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.post('/api/inventario/movimiento', (req, res) => {
    const { insumo_id, producto_id, tipo, cantidad, motivo, usuario_id } = req.body;
    const insumoId = Number(insumo_id);
    const cantidadNum = Number(cantidad);
    const tipoFinal = String(tipo || '').toLowerCase();
    const motivoFinal = String(motivo || '').toLowerCase();

    if (!Number.isInteger(insumoId) || insumoId <= 0) return res.status(400).json({ error: 'Insumo no válido.' });
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) return res.status(400).json({ error: 'La cantidad debe ser un entero mayor que cero.' });
    if (!['entrada', 'salida'].includes(tipoFinal)) return res.status(400).json({ error: 'El tipo debe ser entrada o salida.' });
    if (!motivoFinal) return res.status(400).json({ error: 'El motivo es obligatorio.' });

    db.get(
        `SELECT inv.stock_actual, i.nombre FROM inventario inv INNER JOIN insumos i ON i.id = inv.insumo_id WHERE inv.insumo_id = ?`,
        [insumoId],
        (err, inventario) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!inventario) return res.status(404).json({ error: 'No existe inventario para ese insumo.' });

            const nuevoStock = tipoFinal === 'entrada'
                ? Number(inventario.stock_actual) + cantidadNum
                : Number(inventario.stock_actual) - cantidadNum;

            if (nuevoStock < 0) return res.status(400).json({ error: 'No hay porciones suficientes para registrar la salida.' });

            db.run('BEGIN TRANSACTION', (errBegin) => {
                if (errBegin) return res.status(500).json({ error: errBegin.message });

                db.run(
                    `UPDATE inventario SET stock_actual = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE insumo_id = ?`,
                    [nuevoStock, insumoId],
                    (errUpdate) => {
                        if (errUpdate) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: errUpdate.message });
                        }

                        db.run(
                            `INSERT INTO movimientos_inventario (producto_id, insumo_id, tipo, cantidad, motivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)`,
                            [producto_id ? Number(producto_id) : null, insumoId, tipoFinal, cantidadNum, motivoFinal, usuario_id || null],
                            function(errMov) {
                                if (errMov) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: errMov.message });
                                }

                                db.run('COMMIT', (errCommit) => {
                                    if (errCommit) return res.status(500).json({ error: errCommit.message });

                                    recalcularProductosPorInsumo(insumoId);
                                    registrarActividad(
                                        usuario_id,
                                        'INVENTARIO',
                                        'Inventario',
                                        `Registró ${tipoFinal} de ${cantidadNum} porciones de ${inventario.nombre} por ${motivoFinal}`,
                                        'insumo',
                                        insumoId
                                    );

                                    res.status(201).json({
                                        mensaje: 'Movimiento registrado correctamente',
                                        stock_anterior: Number(inventario.stock_actual),
                                        stock_actual: nuevoStock,
                                        movimiento_id: this.lastID
                                    });
                                });
                            }
                        );
                    }
                );
            });
        }
    );
});

app.get('/api/inventario/movimientos', (req, res) => {
    const sql = `
        SELECT m.*, i.nombre AS insumo_nombre, p.nombre AS producto_nombre, u.nombre AS usuario_nombre
        FROM movimientos_inventario m
        LEFT JOIN insumos i ON i.id = m.insumo_id
        LEFT JOIN productos p ON p.id = m.producto_id
        LEFT JOIN usuarios u ON u.id = m.usuario_id
        ORDER BY m.fecha DESC, m.id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.get('/api/insumos/:id/movimientos', (req, res) => {
    const insumoId = Number(req.params.id);
    db.all(
        `SELECT m.*, i.nombre AS insumo_nombre, u.nombre AS usuario_nombre FROM movimientos_inventario m LEFT JOIN insumos i ON i.id = m.insumo_id LEFT JOIN usuarios u ON u.id = m.usuario_id WHERE m.insumo_id = ? ORDER BY m.fecha DESC, m.id DESC`,
        [insumoId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ mensaje: 'Éxito', data: rows });
        }
    );
});

app.get('/api/productos/:id/movimientos', (req, res) => {
    const productoId = Number(req.params.id);
    const sql = `
        SELECT DISTINCT m.*, i.nombre AS insumo_nombre, u.nombre AS usuario_nombre
        FROM movimientos_inventario m
        LEFT JOIN insumos i ON i.id = m.insumo_id
        LEFT JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.producto_id = ?
           OR m.insumo_id IN (SELECT insumo_id FROM producto_insumo WHERE producto_id = ?)
        ORDER BY m.fecha DESC, m.id DESC
    `;

    db.all(sql, [productoId, productoId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

// -------------------- RECETAS PRODUCTO / INSUMO --------------------
app.get('/api/productos/:id/insumos', (req, res) => {
    const productoId = Number(req.params.id);
    const sql = `
        SELECT pi.id, pi.producto_id, pi.insumo_id, pi.porciones_requeridas,
               i.nombre AS insumo_nombre, i.estado AS insumo_estado,
               COALESCE(inv.stock_actual, 0) AS stock_actual
        FROM producto_insumo pi
        INNER JOIN insumos i ON i.id = pi.insumo_id
        LEFT JOIN inventario inv ON inv.insumo_id = i.id
        WHERE pi.producto_id = ?
        ORDER BY i.nombre ASC
    `;

    db.all(sql, [productoId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Éxito', data: rows });
    });
});

app.post('/api/productos/:id/insumos', (req, res) => {
    const productoId = Number(req.params.id);
    const { insumo_id, porciones_requeridas, usuario_id } = req.body;
    const insumoId = Number(insumo_id);
    const porciones = Number(porciones_requeridas);

    if (!Number.isInteger(productoId) || productoId <= 0) return res.status(400).json({ error: 'Producto no válido.' });
    if (!Number.isInteger(insumoId) || insumoId <= 0) return res.status(400).json({ error: 'Insumo no válido.' });
    if (!Number.isInteger(porciones) || porciones <= 0) return res.status(400).json({ error: 'Las porciones requeridas deben ser un entero mayor que cero.' });

    db.get('SELECT nombre FROM productos WHERE id = ?', [productoId], (errProducto, producto) => {
        if (errProducto) return res.status(500).json({ error: errProducto.message });
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });

        db.get(`SELECT nombre FROM insumos WHERE id = ? AND estado = 'activo'`, [insumoId], (errInsumo, insumo) => {
            if (errInsumo) return res.status(500).json({ error: errInsumo.message });
            if (!insumo) return res.status(400).json({ error: 'El insumo no existe o está inactivo.' });

            db.run(
                `INSERT INTO producto_insumo (producto_id, insumo_id, porciones_requeridas)
                 VALUES (?, ?, ?)
                 ON CONFLICT(producto_id, insumo_id)
                 DO UPDATE SET porciones_requeridas = excluded.porciones_requeridas`,
                [productoId, insumoId, porciones],
                (errRelacion) => {
                    if (errRelacion) return res.status(500).json({ error: errRelacion.message });

                    recalcularDisponibilidadProducto(productoId, (errCalc, disponibles) => {
                        if (errCalc) return res.status(500).json({ error: errCalc.message });
                        registrarActividad(usuario_id, 'EDICION', 'Productos', `Configuró ${insumo.nombre} (${porciones} porciones) en la receta de ${producto.nombre}`, 'producto', productoId);
                        res.json({ mensaje: 'Receta actualizada correctamente', disponibles });
                    });
                }
            );
        });
    });
});

app.delete('/api/productos/:productoId/insumos/:insumoId', (req, res) => {
    const productoId = Number(req.params.productoId);
    const insumoId = Number(req.params.insumoId);
    const { usuario_id } = req.body || {};

    db.run(
        `DELETE FROM producto_insumo WHERE producto_id = ? AND insumo_id = ?`,
        [productoId, insumoId],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'El insumo no forma parte de la receta.' });

            recalcularDisponibilidadProducto(productoId, (errCalc, disponibles) => {
                if (errCalc) return res.status(500).json({ error: errCalc.message });
                registrarActividad(usuario_id, 'EDICION', 'Productos', 'Eliminó un insumo de la receta del producto', 'producto', productoId);
                res.json({ mensaje: 'Insumo eliminado de la receta', disponibles });
            });
        }
    );
});

app.get('/api/productos/:id/disponibilidad', (req, res) => {
    const productoId = Number(req.params.id);

    db.get('SELECT id, nombre FROM productos WHERE id = ?', [productoId], (errProducto, producto) => {
        if (errProducto) return res.status(500).json({ error: errProducto.message });
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });

        recalcularDisponibilidadProducto(productoId, (errCalc, disponibles) => {
            if (errCalc) return res.status(500).json({ error: errCalc.message });

            db.all(
                `SELECT i.nombre AS insumo, pi.porciones_requeridas, COALESCE(inv.stock_actual, 0) AS stock_actual,
                        CAST(COALESCE(inv.stock_actual, 0) / pi.porciones_requeridas AS INTEGER) AS productos_posibles
                 FROM producto_insumo pi
                 INNER JOIN insumos i ON i.id = pi.insumo_id
                 LEFT JOIN inventario inv ON inv.insumo_id = pi.insumo_id
                 WHERE pi.producto_id = ?
                 ORDER BY i.nombre`,
                [productoId],
                (errDetalle, detalle) => {
                    if (errDetalle) return res.status(500).json({ error: errDetalle.message });
                    res.json({
                        mensaje: 'Éxito',
                        producto_id: producto.id,
                        producto: producto.nombre,
                        disponibles,
                        receta: detalle
                    });
                }
            );
        });
    });
});

app.put('/api/insumos/:id/estrategia', (req, res) => {

    const id = Number(req.params.id);

    const estrategia = String(
        req.body?.estrategia_reposicion || ''
    ).toUpperCase();

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'ID de insumo no válido.'
        });
    }

    if (!['PUSH', 'PULL'].includes(estrategia)) {
        return res.status(400).json({
            error: 'Estrategia no válida.'
        });
    }

    db.run(
        `UPDATE insumos
         SET estrategia_reposicion = ?
         WHERE id = ?`,
        [estrategia, id],
        function(error) {

            if (error) {
                return res.status(500).json({
                    error: error.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'Insumo no encontrado.'
                });
            }

            registrarActividad(
                req.body?.usuario_id,
                'EDICION',
                'Insumos',
                `Cambió estrategia de reposición a ${estrategia}`,
                'insumo',
                id
            );

            res.json({
                mensaje: 'Estrategia actualizada',
                estrategia_reposicion: estrategia
            });
        }
    );
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});