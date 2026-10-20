const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Servir el frontend desde la raíz del proyecto
const frontendPath = path.resolve(__dirname, '..');
app.use(express.static(frontendPath));

// ============================================================
// IMÁGENES DE PRODUCTOS
// ============================================================

const productosImagenesPath = path.join(
    frontendPath,
    'img',
    'productos'
);

fs.mkdirSync(
    productosImagenesPath,
    { recursive: true }
);

const almacenamientoImagenProducto = multer.diskStorage({

    destination: function(req, file, cb) {
        cb(null, productosImagenesPath);
    },

    filename: function(req, file, cb) {

        const extension =
            path.extname(file.originalname).toLowerCase();

        const nombreBase =
            path.parse(file.originalname).name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9_-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .toLowerCase();

        cb(
            null,
            `${nombreBase}-${Date.now()}${extension}`
        );
    }
});

const subirImagenProducto = multer({

    storage: almacenamientoImagenProducto,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function(req, file, cb) {

        const permitidos = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!permitidos.includes(file.mimetype)) {

            return cb(
                new Error(
                    'Solo se permiten imágenes JPG, PNG o WEBP.'
                )
            );
        }

        cb(null, true);
    }
});

// ============================================================
// CONFIGURACIÓN DE LA BASE DE DATOS
// ============================================================
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {

    if (err) {
        return console.error(
            'Error SQLite:',
            err.message
        );
    }
    console.log(
        'Conectado a SQLite.'
    );
    db.serialize(() => {
        inicializarTablas();
        recalcularDisponibilidadTodosProductos(
            error => {
                if (error) {console.error('Error recalculando disponibilidad:',error.message);
                    return;
                }
                console.log('Disponibilidad de productos recalculada.');
            }
        );
    });
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

    // Información del catálogo público
    asegurarColumna(
        'productos',
        'imagen',
        'TEXT'
    );

    asegurarColumna(
        'productos',
        'imagen_posicion',
        "TEXT NOT NULL DEFAULT 'center'"
    );

    asegurarColumna(
        'productos',
        'publicado',
        'INTEGER NOT NULL DEFAULT 0'
    );

    asegurarColumna(
        'productos',
        'etiqueta',
        'TEXT'
    );

    asegurarColumna(
        'productos',
        'etiqueta_tipo',
        'TEXT'
    );

    asegurarColumna(
        'productos',
        'orden_catalogo',
        'INTEGER NOT NULL DEFAULT 999'
    );

    db.run(`CREATE TABLE IF NOT EXISTS proveedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, contacto TEXT, correo TEXT, telefono TEXT, estado TEXT DEFAULT 'activo', fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS insumos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, descripcion TEXT, proveedor_id INTEGER, costo_porcion REAL DEFAULT 0, estado TEXT DEFAULT 'activo', fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (proveedor_id) REFERENCES proveedores(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS inventario (id INTEGER PRIMARY KEY AUTOINCREMENT, insumo_id INTEGER NOT NULL UNIQUE, stock_actual INTEGER DEFAULT 0, stock_minimo INTEGER DEFAULT 0, fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (insumo_id) REFERENCES insumos(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS producto_insumo (id INTEGER PRIMARY KEY AUTOINCREMENT, producto_id INTEGER NOT NULL, insumo_id INTEGER NOT NULL, porciones_requeridas INTEGER NOT NULL DEFAULT 1, FOREIGN KEY (producto_id) REFERENCES productos(id), FOREIGN KEY (insumo_id) REFERENCES insumos(id), UNIQUE(producto_id, insumo_id))`);
    db.run(`CREATE TABLE IF NOT EXISTS movimientos_inventario (id INTEGER PRIMARY KEY AUTOINCREMENT, producto_id INTEGER, insumo_id INTEGER, tipo TEXT NOT NULL, cantidad INTEGER NOT NULL, motivo TEXT NOT NULL, usuario_id INTEGER, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (producto_id) REFERENCES productos(id), FOREIGN KEY (insumo_id) REFERENCES insumos(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, producto_id INTEGER, insumo_id INTEGER, proveedor_id INTEGER, cantidad INTEGER NOT NULL, tipo TEXT NOT NULL, estado TEXT DEFAULT 'pendiente', origen TEXT DEFAULT 'MANUAL', usuario_id INTEGER, fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP, fecha_surtido DATETIME, FOREIGN KEY (producto_id) REFERENCES productos(id), FOREIGN KEY (insumo_id) REFERENCES insumos(id), FOREIGN KEY (proveedor_id) REFERENCES proveedores(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS movimientos_logisticos (id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER, tipo TEXT, descripcion TEXT, estado TEXT, usuario_id INTEGER, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (pedido_id) REFERENCES pedidos(id), FOREIGN KEY (usuario_id) REFERENCES usuarios(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS scm_config (id INTEGER PRIMARY KEY, nivel_scm TEXT DEFAULT 'Inicial', fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`INSERT OR IGNORE INTO scm_config (id, nivel_scm) VALUES (1, 'Inicial')`);
    // ============================================================
    // ERP - NÚCLEO EMPRESARIAL
    // ============================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS ordenes_empresariales(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            estado TEXT NOT NULL DEFAULT 'pendiente',
            total REAL NOT NULL DEFAULT 0,
            usuario_id INTEGER,
            inventario_aplicado INTEGER NOT NULL DEFAULT 0,
            fecha_procesado DATETIME,
            FOREIGN KEY(cliente_id) REFERENCES clientes(id),
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS orden_detalle(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orden_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY(orden_id) REFERENCES ordenes_empresariales(id),
            FOREIGN KEY(producto_id) REFERENCES productos(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS procesos_erp(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orden_id INTEGER,
            tipo TEXT NOT NULL,
            descripcion TEXT,
            estado TEXT,
            usuario_id INTEGER,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(orden_id) REFERENCES ordenes_empresariales(id),
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS recursos_erp(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            estado TEXT NOT NULL DEFAULT 'activo',
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reportes_erp(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            nombre TEXT NOT NULL,
            datos_json TEXT,
            usuario_id INTEGER,
            fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS erp_config(
            id INTEGER PRIMARY KEY,
            nivel TEXT NOT NULL DEFAULT 'Básico',
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        INSERT OR IGNORE INTO erp_config(id,nivel)
        VALUES(1,'Básico')
    `);

    // Compatibilidad si ya habías creado la tabla
    // con la primera versión del Día 1.
    asegurarColumna(
        'ordenes_empresariales',
        'inventario_aplicado',
        'INTEGER NOT NULL DEFAULT 0'
    );

    asegurarColumna(
        'ordenes_empresariales',
        'fecha_procesado',
        'DATETIME'
    );

    // Si hiciste pruebas con los estados de la propuesta anterior,
    // los adaptamos a los estados originales de Casa Barro.
    db.run(`
        UPDATE ordenes_empresariales
        SET estado='pendiente'
        WHERE estado='confirmada'
    `);

    db.run(`
        UPDATE ordenes_empresariales
        SET estado='preparacion'
        WHERE estado='procesando'
    `);

    db.run(`
        UPDATE ordenes_empresariales
        SET estado='entregado'
        WHERE estado='procesada'
    `);

    // SCM - Reposición por insumo y recepción de pedidos
    asegurarColumna('insumos','estrategia_reposicion',"TEXT NOT NULL DEFAULT 'PUSH'");
    asegurarColumna('insumos', 'dias_cobertura', 'INTEGER NOT NULL DEFAULT 7');
    asegurarColumna('pedidos', 'cantidad_recibida', 'INTEGER NOT NULL DEFAULT 0');
    asegurarColumna('pedidos', 'costo_unitario', 'REAL NOT NULL DEFAULT 0');
    asegurarColumna('pedidos', 'observaciones', 'TEXT');
    asegurarColumna('pedidos', 'fecha_pedido', 'DATETIME');

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

    const {
        nombre,
        descripcion,
        categoria,
        precio,
        stock_actual,
        stock_minimo,
        proveedor_id,
        costo_unitario,
        estrategia_logistica,
        estado,
        usuario_id,

        publicado,
        imagen_posicion,
        etiqueta,
        etiqueta_tipo,
        orden_catalogo

    } = req.body;

    if (!nombre?.trim()) {
        return res.status(400).json({
            error: 'El nombre del producto es obligatorio.'
        });
    }

    const pNum =
        Number(precio || 0);

    const sAct =
        Number(stock_actual || 0);

    const sMin =
        Number(stock_minimo || 0);

    const cNum =
        Number(costo_unitario || 0);

    if (
        [pNum, sAct, sMin, cNum]
            .some(
                n =>
                    !Number.isFinite(n) ||
                    n < 0
            )
    ) {
        return res.status(400).json({
            error:
                'Precio, costo y existencias deben ser números no negativos.'
        });
    }

    const estrategia =
        estrategia_logistica || 'PULL';

    if (
        !['PUSH', 'PULL']
            .includes(estrategia)
    ) {
        return res.status(400).json({
            error:
                'La estrategia logística debe ser PUSH o PULL.'
        });
    }

    const estadoFinal =
        estado || 'disponible';

    if (
        ![
            'disponible',
            'agotado',
            'inactivo'
        ].includes(estadoFinal)
    ) {
        return res.status(400).json({
            error:
                'Estado de producto no válido.'
        });
    }

    const proveedorFinal =
        proveedor_id
            ? Number(proveedor_id)
            : null;

    const publicadoFinal =
        Number(publicado) === 1
            ? 1
            : 0;

    const posicionesValidas = [
        'top',
        'center',
        'bottom'
    ];

    const posicionFinal =
        posicionesValidas.includes(
            imagen_posicion
        )
            ? imagen_posicion
            : 'center';

    const tiposEtiquetaValidos = [
        '',
        'nuevo',
        'vendido',
        'oferta'
    ];

    const etiquetaTipoFinal =
        tiposEtiquetaValidos.includes(
            String(etiqueta_tipo || '')
        )
            ? String(etiqueta_tipo || '')
            : '';

    const ordenNumero =
        Number(orden_catalogo);

    const ordenFinal =
        Number.isInteger(ordenNumero) &&
        ordenNumero >= 0
            ? ordenNumero
            : 999;

    const insertarProducto = () => {

        db.run(
            `
            INSERT INTO productos (
                nombre,
                descripcion,
                categoria,
                precio,
                stock_actual,
                stock_minimo,
                proveedor_id,
                costo_unitario,
                estrategia_logistica,
                estado,

                publicado,
                imagen_posicion,
                etiqueta,
                etiqueta_tipo,
                orden_catalogo
            )

            VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?
            )
            `,
            [
                nombre.trim(),
                descripcion?.trim() || null,
                categoria?.trim() || null,
                pNum,
                sAct,
                sMin,
                proveedorFinal,
                cNum,
                estrategia,
                estadoFinal,

                publicadoFinal,
                posicionFinal,
                etiqueta?.trim() || null,
                etiquetaTipoFinal || null,
                ordenFinal
            ],
            function(err) {

                if (err) {
                    return res.status(500).json({
                        error: err.message
                    });
                }
                registrarActividad(
                    usuario_id,
                    'ALTA',
                    'Productos',
                    `Registró el producto ${nombre.trim()}`,
                    'producto',
                    this.lastID
                );
                res.status(201).json({
                    mensaje:
                        'Producto registrado correctamente',
                    id: this.lastID
                });
            }
        );
    };
    if (!proveedorFinal) {
        return insertarProducto();
    }
    db.get(
        `
        SELECT id
        FROM proveedores
        WHERE id = ?
        AND estado = 'activo'
        `,
        [proveedorFinal],
        (err, proveedor) => {

            if (err) {
                return res.status(500).json({
                    error: err.message
                });
            }
            if (!proveedor) {
                return res.status(400).json({
                    error:
                        'Proveedor inactivo o inexistente.'
                });
            }
            insertarProducto();
        }
    );
});

app.put('/api/productos/:id', (req, res) => {

    const productoId =
        Number(req.params.id);

    if (
        !Number.isInteger(productoId) ||
        productoId <= 0
    ) {
        return res.status(400).json({
            error: 'ID de producto no válido.'
        });
    }

    const {
        nombre,
        descripcion,
        categoria,
        precio,
        stock_actual,
        stock_minimo,
        proveedor_id,
        costo_unitario,
        estrategia_logistica,
        estado,
        usuario_id,

        publicado,
        imagen_posicion,
        etiqueta,
        etiqueta_tipo,
        orden_catalogo

    } = req.body;

    if (!nombre?.trim()) {

        return res.status(400).json({
            error:
                'El nombre del producto es obligatorio.'
        });
    }

    const pNum =
        Number(precio || 0);

    const sAct =
        Number(stock_actual || 0);

    const sMin =
        Number(stock_minimo || 0);

    const cNum =
        Number(costo_unitario || 0);

    if (
        [pNum, sAct, sMin, cNum]
            .some(
                n =>
                    !Number.isFinite(n) ||
                    n < 0
            )
    ) {
        return res.status(400).json({
            error:
                'Valores numéricos no válidos o negativos.'
        });
    }

    const estrategiaFinal =
        estrategia_logistica || 'PULL';

    if (
        !['PUSH', 'PULL']
            .includes(estrategiaFinal)
    ) {
        return res.status(400).json({
            error:
                'Estrategia debe ser PUSH o PULL.'
        });
    }

    const estadoFinal =
        estado || 'disponible';

    if (
        ![
            'disponible',
            'agotado',
            'inactivo'
        ].includes(estadoFinal)
    ) {
        return res.status(400).json({
            error:
                'Estado no válido.'
        });
    }

    const proveedorFinal =
        proveedor_id
            ? Number(proveedor_id)
            : null;

    const publicadoFinal =
        Number(publicado) === 1
            ? 1
            : 0;

    const posicionesValidas = [
        'top',
        'center',
        'bottom'
    ];

    const posicionFinal =
        posicionesValidas.includes(
            imagen_posicion
        )
            ? imagen_posicion
            : 'center';

    const tiposEtiquetaValidos = [
        '',
        'nuevo',
        'vendido',
        'oferta'
    ];

    const etiquetaTipoFinal =
        tiposEtiquetaValidos.includes(
            String(etiqueta_tipo || '')
        )
            ? String(etiqueta_tipo || '')
            : '';

    const ordenNumero =
        Number(orden_catalogo);

    const ordenFinal =
        Number.isInteger(ordenNumero) &&
        ordenNumero >= 0
            ? ordenNumero
            : 999;

    const actualizarProducto = () => {

        db.run(
            `
            UPDATE productos

            SET
                nombre = ?,
                descripcion = ?,
                categoria = ?,
                precio = ?,
                stock_actual = ?,
                stock_minimo = ?,
                proveedor_id = ?,
                costo_unitario = ?,
                estrategia_logistica = ?,
                estado = ?,

                publicado = ?,
                imagen_posicion = ?,
                etiqueta = ?,
                etiqueta_tipo = ?,
                orden_catalogo = ?

            WHERE id = ?
            `,
            [
                nombre.trim(),
                descripcion?.trim() || null,
                categoria?.trim() || null,
                pNum,
                sAct,
                sMin,
                proveedorFinal,
                cNum,
                estrategiaFinal,
                estadoFinal,

                publicadoFinal,
                posicionFinal,
                etiqueta?.trim() || null,
                etiquetaTipoFinal || null,
                ordenFinal,

                productoId
            ],
            function(err) {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });
                }

                registrarActividad(
                    usuario_id,
                    'EDICION',
                    'Productos',
                    `Actualizó el producto ${nombre.trim()}`,
                    'producto',
                    productoId
                );

                res.json({
                    mensaje:
                        'Producto actualizado correctamente'
                });
            }
        );
    };

    db.get(
        `
        SELECT id
        FROM productos
        WHERE id = ?
        `,
        [productoId],
        (err, producto) => {

            if (err) {

                return res.status(500).json({
                    error: err.message
                });
            }

            if (!producto) {

                return res.status(404).json({
                    error:
                        'Producto no encontrado.'
                });
            }

            if (!proveedorFinal) {

                return actualizarProducto();
            }

            db.get(
                `
                SELECT id
                FROM proveedores
                WHERE id = ?
                `,
                [proveedorFinal],
                (errP, proveedor) => {

                    if (errP) {

                        return res.status(500).json({
                            error: errP.message
                        });
                    }

                    if (!proveedor) {

                        return res.status(400).json({
                            error:
                                'El proveedor no existe.'
                        });
                    }

                    actualizarProducto();
                }
            );
        }
    );
});

app.delete('/api/productos/:id', (req, res) => {
    const productoId = Number(req.params.id);
    if (!Number.isInteger(productoId) || productoId <= 0) return res.status(400).json({ error: 'ID de producto no válido.' });

    db.get('SELECT nombre FROM productos WHERE id = ?', [productoId], (err, producto) => {
        if (err || !producto) return res.status(err ? 500 : 404).json({ error: err ? err.message : 'Producto no encontrado.' });
        db.run(`UPDATE productos SET estado = 'inactivo', publicado = 0 WHERE id = ?`, [productoId], function(errEl) {
            if (errEl) return res.status(500).json({ error: errEl.message });
            registrarActividad(req.body?.usuario_id, 'BAJA', 'Productos', `Dio de baja el producto ${producto.nombre}`, 'producto', productoId);
            res.json({ mensaje: 'Producto dado de baja correctamente' });
        });
    });
});

// ============================================================
// SUBIR / CAMBIAR IMAGEN DE PRODUCTO
// ============================================================

app.post(
    '/api/productos/:id/imagen',
    subirImagenProducto.single('imagen'),
    (req, res) => {

        const productoId =
            Number(req.params.id);

        if (
            !Number.isInteger(productoId) ||
            productoId <= 0
        ) {
            return res.status(400).json({
                error: 'Producto no válido.'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No se recibió ninguna imagen.'
            });
        }

        db.get(
            `
            SELECT
                id,
                nombre,
                imagen
            FROM productos
            WHERE id = ?
            `,
            [productoId],
            (err, producto) => {

                if (err) {
                    return res.status(500).json({
                        error: err.message
                    });
                }

                if (!producto) {
                    return res.status(404).json({
                        error: 'Producto no encontrado.'
                    });
                }

                const nuevaRuta =
                    `img/productos/${req.file.filename}`;

                db.run(
                    `
                    UPDATE productos
                    SET imagen = ?
                    WHERE id = ?
                    `,
                    [
                        nuevaRuta,
                        productoId
                    ],
                    function(errorUpdate) {

                        if (errorUpdate) {
                            return res.status(500).json({
                                error: errorUpdate.message
                            });
                        }

                        registrarActividad(
                            req.body?.usuario_id || null,
                            'EDICION',
                            'Productos',
                            `Actualizó la imagen de ${producto.nombre}`,
                            'producto',
                            productoId
                        );

                        res.json({
                            mensaje:
                                'Imagen actualizada correctamente.',
                            imagen: nuevaRuta
                        });
                    }
                );
            }
        );
    }
);

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
        SELECT
            pi.porciones_requeridas,
            COALESCE(inv.stock_actual, 0) AS stock_actual

        FROM producto_insumo pi

        LEFT JOIN inventario inv
            ON inv.insumo_id = pi.insumo_id

        WHERE pi.producto_id = ?
    `;

    db.all(sql, [productoId], (err, rows) => {

        if (err) {
            return callback(err);
        }

        const disponibles =
            rows.length === 0
                ? 0
                : Math.min(
                    ...rows.map(row =>
                        Math.floor(
                            Number(row.stock_actual || 0)
                            /
                            Number(row.porciones_requeridas || 1)
                        )
                    )
                );

        db.run(
            `
            UPDATE productos

            SET
                stock_actual = ?,

                estado =
                    CASE
                        WHEN estado = 'inactivo'
                            THEN 'inactivo'

                        WHEN ? > 0
                            THEN 'disponible'

                        ELSE 'agotado'
                    END

            WHERE id = ?
            `,
            [
                disponibles,
                disponibles,
                productoId
            ],
            errUpdate => {

                callback(
                    errUpdate,
                    disponibles
                );
            }
        );
    });
}

function recalcularProductosPorInsumo(insumoId) {
    db.all('SELECT DISTINCT producto_id FROM producto_insumo WHERE insumo_id = ?', [insumoId], (err, rows) => {
        if (err) return console.error('Error recalculando productos:', err.message);
        rows.forEach(row => recalcularDisponibilidadProducto(row.producto_id));
    });
}

function recalcularDisponibilidadTodosProductos(callback = () => {}) {

    db.all(
        `
        SELECT id
        FROM productos
        ORDER BY id
        `,
        [],
        (err, productos) => {

            if (err) {
                return callback(err);
            }

            if (!productos.length) {
                return callback(null);
            }

            let pendientes = productos.length;
            let primerError = null;

            productos.forEach(producto => {

                recalcularDisponibilidadProducto(
                    producto.id,
                    errCalc => {

                        if (
                            errCalc &&
                            !primerError
                        ) {
                            primerError = errCalc;
                        }

                        pendientes--;

                        if (pendientes === 0) {
                            callback(primerError);
                        }
                    }
                );
            });
        }
    );
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
        SELECT
            inv.id,
            inv.insumo_id,
            i.nombre AS insumo_nombre,
            i.estado AS insumo_estado,
            i.proveedor_id,
            p.nombre AS proveedor_nombre,
            COALESCE(NULLIF(UPPER(i.estrategia_reposicion), ''), 'PUSH') AS estrategia_reposicion,
            COALESCE(i.dias_cobertura, 7) AS dias_cobertura,
            inv.stock_actual,
            inv.stock_minimo,
            inv.fecha_actualizacion,
            pe.id AS pedido_abierto_id,
            pe.estado AS pedido_estado,
            pe.cantidad AS pedido_solicitado,
            COALESCE(pe.cantidad_recibida, 0) AS pedido_recibido,
            CASE
                WHEN pe.id IS NULL THEN 0
                ELSE MAX(pe.cantidad - COALESCE(pe.cantidad_recibida, 0), 0)
            END AS pedido_pendiente,
            CASE
                WHEN inv.stock_actual <= 0 THEN 'agotado'
                WHEN inv.stock_actual <= inv.stock_minimo THEN 'bajo'
                ELSE 'normal'
            END AS estado
        FROM inventario inv
        INNER JOIN insumos i ON i.id = inv.insumo_id
        LEFT JOIN proveedores p ON p.id = i.proveedor_id
        LEFT JOIN pedidos pe ON pe.id = (
            SELECT p2.id
            FROM pedidos p2
            WHERE p2.insumo_id = i.id
              AND p2.estado IN ('pendiente', 'enviado', 'parcial')
            ORDER BY p2.id DESC
            LIMIT 1
        )
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
                                    if(tipoFinal==='salida'){
                                        verificarReposicionAutomaticaPush(insumoId,usuario_id||null).then(resultado=>{
                                            if(resultado.creado) console.log(`Pedido PUSH automático creado: #${resultado.pedido_id}`);
                                        }).catch(error=>console.error('Error verificando PUSH automático:',error.message));
                                    }
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

// ============================================================
// CATÁLOGO PÚBLICO
// ============================================================

app.get('/api/catalogo/productos', async (req, res) => {

    try {

        const productos = await dbAllSCM(
            `
            SELECT
                id,
                nombre,
                descripcion,
                categoria,
                precio,
                estado,
                stock_actual,
                imagen,
                imagen_posicion,
                etiqueta,
                etiqueta_tipo,
                orden_catalogo

            FROM productos

            WHERE publicado = 1
              AND estado <> 'inactivo'
              AND imagen IS NOT NULL
              AND TRIM(imagen) <> ''

            ORDER BY

                CASE categoria

                    WHEN 'alimentos'
                        THEN 1

                    WHEN 'calientes'
                        THEN 2

                    WHEN 'frias'
                        THEN 3

                    WHEN 'postres'
                        THEN 4

                    ELSE 5

                END,

                orden_catalogo ASC,
                id ASC
            `
        );

        for (const producto of productos) {

            try {

                const grupos = await dbAllSCM(
                    `
                    SELECT
                        id,
                        producto_id,
                        nombre,
                        seleccion_minima,
                        seleccion_maxima

                    FROM producto_grupo

                    WHERE producto_id = ?

                    ORDER BY id ASC
                    `,
                    [producto.id]
                );

                for (const grupo of grupos) {

                    grupo.opciones = await dbAllSCM(
                        `
                        SELECT
                            id,
                            grupo_id,
                            nombre,
                            precio_extra

                        FROM producto_opcion

                        WHERE grupo_id = ?

                        ORDER BY id ASC
                        `,
                        [grupo.id]
                    );
                }

                producto.grupos = grupos;

            } catch (errorVariantes) {

                console.warn(
                    `No se pudieron cargar variantes del producto ${producto.id}:`,
                    errorVariantes.message
                );

                producto.grupos = [];
            }
        }

        res.json({
            mensaje: 'Éxito',
            data: productos
        });

    } catch (error) {

        console.error(
            'Error cargando catálogo:',
            error
        );

        res.status(500).json({
            error:
                'No se pudo cargar el catálogo.'
        });
    }
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

// ============================================================
// SCM: REPOSICIÓN PUSH/PULL Y PEDIDOS A PROVEEDORES
// ============================================================

// Helpers SQLite con Promesas para las rutas de logística SCM.
function dbRunSCM(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function dbGetSCM(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row || null);
        });
    });
}

function dbAllSCM(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
}
async function verificarReposicionAutomaticaPush(insumoId,usuarioId=null){
    try{
        const insumo=await dbGetSCM(`
            SELECT i.id,i.nombre,i.estado,i.proveedor_id,i.costo_porcion,
                   COALESCE(NULLIF(UPPER(i.estrategia_reposicion),''),'PUSH') AS estrategia_reposicion,
                   COALESCE(i.dias_cobertura,7) AS dias_cobertura,
                   p.nombre AS proveedor_nombre,p.estado AS proveedor_estado,
                   COALESCE(inv.stock_actual,0) AS stock_actual,COALESCE(inv.stock_minimo,0) AS stock_minimo,
                   COALESCE((SELECT SUM(m.cantidad) FROM movimientos_inventario m
                             WHERE m.insumo_id=i.id AND m.tipo='salida'
                             AND datetime(m.fecha)>=datetime('now','-30 days')),0) AS consumo_30d
            FROM insumos i
            LEFT JOIN proveedores p ON p.id=i.proveedor_id
            LEFT JOIN inventario inv ON inv.insumo_id=i.id
            WHERE i.id=?`,[insumoId]);
        if(!insumo) return {creado:false,motivo:'Insumo no encontrado.'};
        if(insumo.estado!=='activo') return {creado:false,motivo:'Insumo inactivo.'};
        if(insumo.estrategia_reposicion!=='PUSH') return {creado:false,motivo:'La estrategia no es PUSH.'};
        if(!insumo.proveedor_id||!insumo.proveedor_nombre) return {creado:false,motivo:'El insumo no tiene proveedor asignado.'};
        if(insumo.proveedor_estado!=='activo') return {creado:false,motivo:'El proveedor está inactivo.'};
        const stockActual=Number(insumo.stock_actual||0),stockMinimo=Number(insumo.stock_minimo||0);
        const consumo30=Number(insumo.consumo_30d||0),diasCobertura=Math.max(1,Number(insumo.dias_cobertura||7));
        if(consumo30<=0) return {creado:false,motivo:'No hay consumo registrado en los últimos 30 días para calcular PUSH.'};
        const promedioDiario=consumo30/30;
        const objetivo=Math.max(stockMinimo,Math.ceil(promedioDiario*diasCobertura));
        if(stockActual>=objetivo) return {creado:false,motivo:`Stock suficiente para la cobertura PUSH de ${diasCobertura} días.`,objetivo_stock:objetivo};
        const pedidoAbierto=await dbGetSCM(`SELECT id,estado FROM pedidos WHERE insumo_id=? AND estado IN ('pendiente','enviado','parcial') ORDER BY id DESC LIMIT 1`,[insumoId]);
        if(pedidoAbierto) return {creado:false,pedido_id:pedidoAbierto.id,motivo:`Ya existe el pedido #${pedidoAbierto.id} en estado ${pedidoAbierto.estado}.`};
        const cantidad=Math.max(1,Math.ceil(objetivo-stockActual));
        const resultado=await dbRunSCM(`
            INSERT INTO pedidos(producto_id,insumo_id,proveedor_id,cantidad,tipo,estado,origen,usuario_id,cantidad_recibida,costo_unitario,observaciones,fecha_pedido)
            VALUES(NULL,?,?,?,'PUSH','enviado','AUTOMATICO',?,0,?,?,CURRENT_TIMESTAMP)`,[
            insumoId,insumo.proveedor_id,cantidad,usuarioId,Number(insumo.costo_porcion||0),
            `Pedido automático PUSH por cobertura de ${diasCobertura} días. Consumo 30d: ${consumo30}.`
        ]);
        const pedidoId=resultado.lastID;
        await dbRunSCM(`INSERT INTO movimientos_logisticos(pedido_id,tipo,descripcion,estado,usuario_id) VALUES(?,'CREACION_AUTOMATICA',?,'enviado',?)`,[
            pedidoId,`PUSH automático: ${cantidad} porciones de ${insumo.nombre}. Stock ${stockActual}, objetivo ${objetivo}, cobertura ${diasCobertura} días.`,usuarioId
        ]);
        await dbRunSCM(`INSERT INTO movimientos_logisticos(pedido_id,tipo,descripcion,estado,usuario_id) VALUES(?,'ENVIO_AUTOMATICO',?,'enviado',?)`,[
            pedidoId,`Pedido #${pedidoId} enviado automáticamente al proveedor ${insumo.proveedor_nombre}.`,usuarioId
        ]);
        registrarActividad(usuarioId,'PEDIDO_AUTOMATICO','Logística',`El sistema creó y envió automáticamente el pedido #${pedidoId} de ${cantidad} porciones de ${insumo.nombre} mediante PUSH`,'pedido',pedidoId);
        console.log(`PUSH automático: pedido #${pedidoId} creado para ${insumo.nombre} (${cantidad} porciones).`);
        return {creado:true,pedido_id:pedidoId,cantidad,stock_actual:stockActual,stock_minimo:stockMinimo,consumo_30d:consumo30,dias_cobertura:diasCobertura,objetivo_stock:objetivo};
    }catch(error){
        console.error(`Error en reposición automática PUSH del insumo ${insumoId}:`,error.message);
        return {creado:false,error:error.message};
    }
}

function enteroPositivoSCM(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function usuarioIdSCM(req) {
    const numero = Number(req.body?.usuario_id);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

async function obtenerSugerenciasReposicion(){
    const filas=await dbAllSCM(`
        SELECT i.id AS insumo_id,i.nombre AS insumo_nombre,i.estado AS insumo_estado,i.proveedor_id,
               p.nombre AS proveedor_nombre,p.estado AS proveedor_estado,COALESCE(i.costo_porcion,0) AS costo_porcion,
               COALESCE(NULLIF(UPPER(i.estrategia_reposicion),''),'PUSH') AS estrategia_reposicion,
               COALESCE(i.dias_cobertura,7) AS dias_cobertura,COALESCE(inv.stock_actual,0) AS stock_actual,
               COALESCE(inv.stock_minimo,0) AS stock_minimo,
               COALESCE(SUM(CASE WHEN m.tipo='salida' AND datetime(m.fecha)>=datetime('now','-30 days') THEN m.cantidad ELSE 0 END),0) AS consumo_30d
        FROM insumos i
        LEFT JOIN proveedores p ON p.id=i.proveedor_id
        LEFT JOIN inventario inv ON inv.insumo_id=i.id
        LEFT JOIN movimientos_inventario m ON m.insumo_id=i.id
        WHERE i.estado='activo'
        GROUP BY i.id,i.nombre,i.estado,i.proveedor_id,p.nombre,p.estado,i.costo_porcion,i.estrategia_reposicion,i.dias_cobertura,inv.stock_actual,inv.stock_minimo
        ORDER BY i.nombre ASC`);
    return filas.map(fila=>{
        let estrategia=String(fila.estrategia_reposicion||'PUSH').toUpperCase();
        if(!['PUSH','PULL'].includes(estrategia)) estrategia='PUSH';
        const stockActual=Number(fila.stock_actual||0),stockMinimo=Number(fila.stock_minimo||0),consumo30=Number(fila.consumo_30d||0);
        const diasCobertura=Math.max(1,Number(fila.dias_cobertura||7)),promedioDiario=consumo30/30;
        let objetivoStock=0,cantidadSugerida=0,necesitaReposicion=false,configuracionPendiente=false,motivoSugerencia='';
        if(estrategia==='PUSH'){
            if(consumo30<=0){
                configuracionPendiente=true;
                motivoSugerencia='PUSH requiere historial de salidas de los últimos 30 días.';
            }else{
                objetivoStock=Math.max(stockMinimo,Math.ceil(promedioDiario*diasCobertura));
                cantidadSugerida=Math.max(0,Math.ceil(objetivoStock-stockActual));
                necesitaReposicion=cantidadSugerida>0;
                motivoSugerencia=necesitaReposicion
                    ?`PUSH automático: faltan ${cantidadSugerida} porciones para cubrir ${diasCobertura} días.`
                    :`PUSH: stock suficiente para ${diasCobertura} días de cobertura.`;
            }
        }else{
            if(stockMinimo<=0){
                configuracionPendiente=true;
                motivoSugerencia='PULL requiere configurar un stock mínimo mayor que cero.';
            }else{
                objetivoStock=stockMinimo*2;
                if(stockActual<=stockMinimo){
                    cantidadSugerida=Math.max(1,Math.ceil(objetivoStock-stockActual));
                    necesitaReposicion=true;
                    motivoSugerencia=`PULL por demanda: stock actual (${stockActual}) alcanzó el mínimo (${stockMinimo}).`;
                }else motivoSugerencia='PULL: existencia por encima del punto de reposición.';
            }
        }
        return {...fila,estrategia_reposicion:estrategia,stock_actual:stockActual,stock_minimo:stockMinimo,consumo_30d:consumo30,promedio_diario:Number(promedioDiario.toFixed(2)),dias_cobertura:diasCobertura,objetivo_stock:objetivoStock,cantidad_sugerida:cantidadSugerida,necesita_reposicion:necesitaReposicion,configuracion_pendiente:configuracionPendiente,motivo_sugerencia:motivoSugerencia};
    });
}

// -------------------- SUGERENCIAS PUSH/PULL --------------------
app.get('/api/scm/sugerencias', async (req, res) => {
    try {
        const datos = await obtenerSugerenciasReposicion();
        res.json({ mensaje: 'Éxito', data: datos });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -------------------- CONFIGURAR ESTRATEGIA DEL INSUMO --------------------
app.put('/api/scm/insumos/:id/configuracion', async (req, res) => {
    try {
        const insumoId = enteroPositivoSCM(req.params.id);
        if (!insumoId) return res.status(400).json({ error: 'ID de insumo no válido.' });

        const estrategia = String(req.body?.estrategia_reposicion || '').toUpperCase();
        const diasCobertura = Number(req.body?.dias_cobertura);
        const stockMinimo = Number(req.body?.stock_minimo);
        const usuarioId = usuarioIdSCM(req);

        if (!['PUSH', 'PULL'].includes(estrategia)) {
            return res.status(400).json({ error: 'La estrategia debe ser PUSH o PULL.' });
        }
        if (!Number.isInteger(diasCobertura) || diasCobertura < 1 || diasCobertura > 90) {
            return res.status(400).json({ error: 'Los días de cobertura deben ser un entero entre 1 y 90.' });
        }
        if (!Number.isInteger(stockMinimo) || stockMinimo < 0) {
            return res.status(400).json({ error: 'El stock mínimo debe ser un entero no negativo.' });
        }

        const insumo = await dbGetSCM(`SELECT id, nombre FROM insumos WHERE id = ?`, [insumoId]);
        if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado.' });

        await dbRunSCM(
            `UPDATE insumos SET estrategia_reposicion = ?, dias_cobertura = ? WHERE id = ?`,
            [estrategia, diasCobertura, insumoId]
        );

        await dbRunSCM(`
            INSERT INTO inventario (insumo_id, stock_actual, stock_minimo, fecha_actualizacion)
            VALUES (?, 0, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(insumo_id) DO UPDATE SET
                stock_minimo = excluded.stock_minimo,
                fecha_actualizacion = CURRENT_TIMESTAMP
        `, [insumoId, stockMinimo]);

        registrarActividad(
            usuarioId,
            'EDICION',
            'Logística',
            `Configuró ${insumo.nombre}: ${estrategia}, stock mínimo ${stockMinimo}, cobertura ${diasCobertura} días`,
            'insumo',
            insumoId
        );

        let pedidoAutomatico = null;
        if(estrategia==='PUSH') pedidoAutomatico=await verificarReposicionAutomaticaPush(insumoId,usuarioId);
        res.json({

            mensaje:
                pedidoAutomatico?.creado

                    ? `Configuración actualizada. ` +
                    `Se generó automáticamente el pedido ` +
                    `#${pedidoAutomatico.pedido_id}.`

                    : 'Configuración de reposición actualizada correctamente.',

            pedido_automatico:
                pedidoAutomatico
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -------------------- LISTAR PEDIDOS A PROVEEDORES --------------------
app.get('/api/scm/pedidos', async (req, res) => {
    try {
        const estado = String(req.query.estado || 'todos').toLowerCase();
        const permitidos = ['todos', 'pendiente', 'enviado', 'parcial', 'recibido', 'cancelado'];
        if (!permitidos.includes(estado)) return res.status(400).json({ error: 'Filtro de estado no válido.' });

        const where = estado === 'todos' ? '' : 'WHERE pe.estado = ?';
        const params = estado === 'todos' ? [] : [estado];

        const filas = await dbAllSCM(`
            SELECT
                pe.*,
                i.nombre AS insumo_nombre,
                pr.nombre AS proveedor_nombre,
                u.nombre AS usuario_nombre,
                COALESCE(inv.stock_actual, 0) AS stock_actual,
                (pe.cantidad - COALESCE(pe.cantidad_recibida, 0)) AS cantidad_restante,
                ROUND(pe.cantidad * COALESCE(pe.costo_unitario, 0), 2) AS total_estimado
            FROM pedidos pe
            LEFT JOIN insumos i ON i.id = pe.insumo_id
            LEFT JOIN proveedores pr ON pr.id = pe.proveedor_id
            LEFT JOIN usuarios u ON u.id = pe.usuario_id
            LEFT JOIN inventario inv ON inv.insumo_id = pe.insumo_id
            ${where}
            ORDER BY pe.fecha_creacion DESC, pe.id DESC
        `, params);

        res.json({ mensaje: 'Éxito', data: filas });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -------------------- CREAR PEDIDO A PROVEEDOR --------------------
app.post('/api/scm/pedidos', async (req, res) => {
    try {
        const insumoId = enteroPositivoSCM(req.body?.insumo_id);
        const cantidad = enteroPositivoSCM(req.body?.cantidad);
        const usuarioId = usuarioIdSCM(req);
        const observaciones = String(req.body?.observaciones || '').trim() || null;
        const origen = String(req.body?.origen || 'MANUAL').toUpperCase();

        if (!insumoId) return res.status(400).json({ error: 'Insumo no válido.' });
        if (!cantidad) return res.status(400).json({ error: 'La cantidad debe ser un entero mayor que cero.' });
        if (!['MANUAL', 'SUGERENCIA'].includes(origen)) {
            return res.status(400).json({ error: 'Origen del pedido no válido.' });
        }

        const insumo = await dbGetSCM(`
            SELECT
                i.id, i.nombre, i.proveedor_id, i.costo_porcion,
                COALESCE(NULLIF(UPPER(i.estrategia_reposicion), ''), 'PUSH') AS estrategia_reposicion,
                p.nombre AS proveedor_nombre,
                p.estado AS proveedor_estado
            FROM insumos i
            LEFT JOIN proveedores p ON p.id = i.proveedor_id
            WHERE i.id = ? AND i.estado = 'activo'
        `, [insumoId]);

        if (!insumo) return res.status(404).json({ error: 'Insumo activo no encontrado.' });
        if (!insumo.proveedor_id || !insumo.proveedor_nombre) {
            return res.status(400).json({ error: 'El insumo no tiene proveedor asignado.' });
        }
        if (insumo.proveedor_estado !== 'activo') {
            return res.status(400).json({ error: 'El proveedor asignado está inactivo.' });
        }

        const pedidoAbierto = await dbGetSCM(`
            SELECT id, estado
            FROM pedidos
            WHERE insumo_id = ? AND estado IN ('pendiente', 'enviado', 'parcial')
            ORDER BY id DESC
            LIMIT 1
        `, [insumoId]);

        if (pedidoAbierto) {
            return res.status(409).json({
                error: `Ya existe el pedido #${pedidoAbierto.id} en estado ${pedidoAbierto.estado}.`,
                pedido_id: pedidoAbierto.id
            });
        }

        let estrategia = String(insumo.estrategia_reposicion || 'PUSH').toUpperCase();
        if (!['PUSH','PULL'].includes(estrategia)) estrategia='PUSH';

        const resultado = await dbRunSCM(`
            INSERT INTO pedidos (
                producto_id, insumo_id, proveedor_id, cantidad, tipo, estado,
                origen, usuario_id, cantidad_recibida, costo_unitario, observaciones
            ) VALUES (NULL, ?, ?, ?, ?, 'pendiente', ?, ?, 0, ?, ?)
        `, [
            insumoId,
            insumo.proveedor_id,
            cantidad,
            estrategia,
            origen,
            usuarioId,
            Number(insumo.costo_porcion || 0),
            observaciones
        ]);

        await dbRunSCM(`
            INSERT INTO movimientos_logisticos (pedido_id, tipo, descripcion, estado, usuario_id)
            VALUES (?, 'CREACION', ?, 'pendiente', ?)
        `, [
            resultado.lastID,
            `Pedido creado para ${cantidad} porciones de ${insumo.nombre} mediante ${estrategia}.`,
            usuarioId
        ]);

        registrarActividad(
            usuarioId,
            'ALTA',
            'Logística',
            `Creó pedido #${resultado.lastID} de ${cantidad} porciones de ${insumo.nombre} (${estrategia})`,
            'pedido',
            resultado.lastID
        );

        res.status(201).json({ mensaje: 'Pedido creado correctamente.', id: resultado.lastID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -------------------- MARCAR PEDIDO COMO ENVIADO --------------------
app.put('/api/scm/pedidos/:id/enviar', async (req, res) => {
    try {
        const pedidoId = enteroPositivoSCM(req.params.id);
        const usuarioId = usuarioIdSCM(req);
        if (!pedidoId) return res.status(400).json({ error: 'ID de pedido no válido.' });

        const pedido = await dbGetSCM(`
            SELECT pe.*, i.nombre AS insumo_nombre
            FROM pedidos pe
            LEFT JOIN insumos i ON i.id = pe.insumo_id
            WHERE pe.id = ?
        `, [pedidoId]);

        if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
        if (pedido.estado !== 'pendiente') {
            return res.status(400).json({ error: 'Solo un pedido pendiente puede marcarse como enviado.' });
        }

        await dbRunSCM(`
            UPDATE pedidos
            SET estado = 'enviado', fecha_pedido = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [pedidoId]);

        await dbRunSCM(`
            INSERT INTO movimientos_logisticos (pedido_id, tipo, descripcion, estado, usuario_id)
            VALUES (?, 'ENVIO', ?, 'enviado', ?)
        `, [pedidoId, `Pedido #${pedidoId} enviado al proveedor.`, usuarioId]);

        registrarActividad(
            usuarioId,
            'PEDIDO',
            'Logística',
            `Marcó como enviado el pedido #${pedidoId} de ${pedido.insumo_nombre || 'insumo'}`,
            'pedido',
            pedidoId
        );

        res.json({ mensaje: 'Pedido marcado como enviado.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -------------------- RECIBIR PEDIDO --------------------
app.put('/api/scm/pedidos/:id/recibir', async (req, res) => {
    try {
        const pedidoId = enteroPositivoSCM(req.params.id);
        const cantidadRecibida = enteroPositivoSCM(req.body?.cantidad_recibida);
        const usuarioId = usuarioIdSCM(req);

        if (!pedidoId) return res.status(400).json({ error: 'ID de pedido no válido.' });
        if (!cantidadRecibida) {
            return res.status(400).json({ error: 'La cantidad recibida debe ser un entero mayor que cero.' });
        }

        const pedido = await dbGetSCM(`
            SELECT
                pe.*,
                i.nombre AS insumo_nombre,
                COALESCE(inv.stock_actual, 0) AS stock_actual
            FROM pedidos pe
            LEFT JOIN insumos i ON i.id = pe.insumo_id
            LEFT JOIN inventario inv ON inv.insumo_id = pe.insumo_id
            WHERE pe.id = ?
        `, [pedidoId]);

        if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
        if (!['enviado', 'parcial'].includes(pedido.estado)) {
            return res.status(400).json({ error: 'Primero debes marcar el pedido como enviado.' });
        }

        const recibidasAntes = Number(pedido.cantidad_recibida || 0);
        const restante = Number(pedido.cantidad) - recibidasAntes;
        if (cantidadRecibida > restante) {
            return res.status(400).json({ error: `Solo faltan ${restante} porciones por recibir.` });
        }

        const recibidasTotal = recibidasAntes + cantidadRecibida;
        const estadoNuevo = recibidasTotal >= Number(pedido.cantidad) ? 'recibido' : 'parcial';
        const nuevoStock = Number(pedido.stock_actual || 0) + cantidadRecibida;

        await dbRunSCM('BEGIN IMMEDIATE TRANSACTION');

        try {
            await dbRunSCM(`
                INSERT INTO inventario (insumo_id, stock_actual, stock_minimo, fecha_actualizacion)
                VALUES (?, ?, 0, CURRENT_TIMESTAMP)
                ON CONFLICT(insumo_id) DO UPDATE SET
                    stock_actual = stock_actual + excluded.stock_actual,
                    fecha_actualizacion = CURRENT_TIMESTAMP
            `, [pedido.insumo_id, cantidadRecibida]);

            await dbRunSCM(`
                INSERT INTO movimientos_inventario (
                    producto_id, insumo_id, tipo, cantidad, motivo, usuario_id
                ) VALUES (NULL, ?, 'entrada', ?, ?, ?)
            `, [pedido.insumo_id, cantidadRecibida, `recepcion pedido #${pedidoId}`, usuarioId]);

            await dbRunSCM(`
                UPDATE pedidos
                SET
                    cantidad_recibida = ?,
                    estado = ?,
                    fecha_surtido = CASE
                        WHEN ? = 'recibido' THEN CURRENT_TIMESTAMP
                        ELSE fecha_surtido
                    END
                WHERE id = ?
            `, [recibidasTotal, estadoNuevo, estadoNuevo, pedidoId]);

            await dbRunSCM(`
                INSERT INTO movimientos_logisticos (pedido_id, tipo, descripcion, estado, usuario_id)
                VALUES (?, 'RECEPCION', ?, ?, ?)
            `, [
                pedidoId,
                `Recepción de ${cantidadRecibida} porciones. Acumulado ${recibidasTotal}/${pedido.cantidad}.`,
                estadoNuevo,
                usuarioId
            ]);

            await dbRunSCM('COMMIT');
        } catch (errorInterno) {
            try { await dbRunSCM('ROLLBACK'); } catch (_) {}
            throw errorInterno;
        }

        recalcularProductosPorInsumo(pedido.insumo_id);

        registrarActividad(
            usuarioId,
            'INVENTARIO',
            'Logística',
            `Recibió ${cantidadRecibida} porciones del pedido #${pedidoId} de ${pedido.insumo_nombre || 'insumo'}`,
            'pedido',
            pedidoId
        );

        res.json({
            mensaje: estadoNuevo === 'recibido'
                ? 'Pedido recibido completamente e inventario actualizado.'
                : 'Recepción parcial registrada e inventario actualizado.',
            estado: estadoNuevo,
            cantidad_recibida_total: recibidasTotal,
            cantidad_restante: Number(pedido.cantidad) - recibidasTotal,
            stock_anterior: Number(pedido.stock_actual || 0),
            stock_actual: nuevoStock
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -------------------- CANCELAR PEDIDO --------------------
app.put('/api/scm/pedidos/:id/cancelar', async (req, res) => {
    try {
        const pedidoId = enteroPositivoSCM(req.params.id);
        const usuarioId = usuarioIdSCM(req);
        if (!pedidoId) return res.status(400).json({ error: 'ID de pedido no válido.' });

        const pedido = await dbGetSCM(`SELECT * FROM pedidos WHERE id = ?`, [pedidoId]);
        if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
        if (!['pendiente', 'enviado'].includes(pedido.estado)) {
            return res.status(400).json({ error: 'Solo pedidos pendientes o enviados pueden cancelarse.' });
        }

        await dbRunSCM(`UPDATE pedidos SET estado = 'cancelado' WHERE id = ?`, [pedidoId]);

        await dbRunSCM(`
            INSERT INTO movimientos_logisticos (pedido_id, tipo, descripcion, estado, usuario_id)
            VALUES (?, 'CANCELACION', ?, 'cancelado', ?)
        `, [pedidoId, `Pedido #${pedidoId} cancelado.`, usuarioId]);

        registrarActividad(
            usuarioId,
            'BAJA',
            'Logística',
            `Canceló el pedido #${pedidoId}`,
            'pedido',
            pedidoId
        );

        res.json({ mensaje: 'Pedido cancelado.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -------------------- HISTORIAL DEL PEDIDO --------------------
app.get('/api/scm/pedidos/:id/movimientos', async (req, res) => {
    try {
        const pedidoId = enteroPositivoSCM(req.params.id);
        if (!pedidoId) return res.status(400).json({ error: 'ID de pedido no válido.' });

        const filas = await dbAllSCM(`
            SELECT ml.*, u.nombre AS usuario_nombre
            FROM movimientos_logisticos ml
            LEFT JOIN usuarios u ON u.id = ml.usuario_id
            WHERE ml.pedido_id = ?
            ORDER BY ml.fecha DESC, ml.id DESC
        `, [pedidoId]);

        res.json({ mensaje: 'Éxito', data: filas });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// -------------------- RESUMEN SCM --------------------
app.get('/api/scm/resumen', async (req, res) => {
    try {
        const sugerencias = await obtenerSugerenciasReposicion();

        const conteos = await dbGetSCM(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
                SUM(CASE WHEN estado = 'enviado' THEN 1 ELSE 0 END) AS enviados,
                SUM(CASE WHEN estado = 'parcial' THEN 1 ELSE 0 END) AS parciales,
                SUM(CASE WHEN estado = 'recibido' THEN 1 ELSE 0 END) AS recibidos,
                SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados
            FROM pedidos
        `);

        const recibidosHoy = await dbGetSCM(`
            SELECT COUNT(*) AS total
            FROM pedidos
            WHERE estado = 'recibido'
              AND date(fecha_surtido, 'localtime') = date('now', 'localtime')
        `);

        res.json({
            mensaje: 'Éxito',
            data: {
                insumos_activos: sugerencias.length,
                sugerencias_reposicion: sugerencias.filter(s => s.necesita_reposicion).length,
                configuraciones_pendientes: sugerencias.filter(s => s.configuracion_pendiente).length,
                pedidos_total: Number(conteos?.total || 0),
                pedidos_pendientes: Number(conteos?.pendientes || 0),
                pedidos_enviados: Number(conteos?.enviados || 0),
                pedidos_parciales: Number(conteos?.parciales || 0),
                pedidos_recibidos: Number(conteos?.recibidos || 0),
                pedidos_cancelados: Number(conteos?.cancelados || 0),
                recibidos_hoy: Number(recibidosHoy?.total || 0)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// SCM: ANALÍTICA OPERATIVA Y MADUREZ
// ============================================================

function porcentajeSCM(parte, total) {
    const t = Number(total || 0);
    const p = Number(parte || 0);
    if (t <= 0) return 0;
    return Math.max(0, Math.min(100, Number(((p / t) * 100).toFixed(1))));
}

function nivelMadurezSCM(puntaje) {
    const n = Number(puntaje || 0);
    if (n >= 80) return 'Optimizado';
    if (n >= 60) return 'Integrado';
    if (n >= 40) return 'Básico';
    return 'Inicial';
}

app.get('/api/scm/analitica', async (req, res) => {
    try {
        const [
            catalogo,
            cobertura,
            movimientos,
            ordenes,
            estrategias,
            topConsumo,
            proveedores,
            sugerencias
        ] = await Promise.all([
            dbGetSCM(`
                SELECT
                    (SELECT COUNT(*) FROM productos) AS productos_total,
                    (SELECT COUNT(*) FROM productos p
                        WHERE EXISTS (
                            SELECT 1 FROM producto_insumo pi
                            WHERE pi.producto_id = p.id
                        )
                    ) AS productos_con_receta,
                    (SELECT COUNT(*) FROM insumos WHERE estado = 'activo') AS insumos_activos,
                    (SELECT COUNT(*) FROM proveedores WHERE estado = 'activo') AS proveedores_activos
            `),

            dbGetSCM(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN i.proveedor_id IS NOT NULL THEN 1 ELSE 0 END) AS con_proveedor,
                    SUM(CASE WHEN COALESCE(inv.stock_minimo, 0) > 0 THEN 1 ELSE 0 END) AS con_minimo,
                    SUM(CASE WHEN COALESCE(inv.stock_actual, 0) > 0 THEN 1 ELSE 0 END) AS con_stock,
                    SUM(CASE WHEN UPPER(COALESCE(i.estrategia_reposicion, '')) IN ('PUSH','PULL') THEN 1 ELSE 0 END) AS con_estrategia,
                    SUM(CASE WHEN COALESCE(inv.stock_actual, 0) <= 0 THEN 1 ELSE 0 END) AS agotados,
                    SUM(CASE WHEN COALESCE(inv.stock_actual, 0) > 0
                                   AND COALESCE(inv.stock_actual, 0) <= COALESCE(inv.stock_minimo, 0)
                             THEN 1 ELSE 0 END) AS bajos,
                    SUM(CASE WHEN COALESCE(inv.stock_actual, 0) > COALESCE(inv.stock_minimo, 0)
                             THEN 1 ELSE 0 END) AS normales,
                    ROUND(SUM(COALESCE(inv.stock_actual, 0) * COALESCE(i.costo_porcion, 0)), 2) AS valor_inventario
                FROM insumos i
                LEFT JOIN inventario inv ON inv.insumo_id = i.id
                WHERE i.estado = 'activo'
            `),

            dbGetSCM(`
                SELECT
                    COUNT(*) AS movimientos_30d,
                    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END), 0) AS entradas_30d,
                    COALESCE(SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END), 0) AS salidas_30d
                FROM movimientos_inventario
                WHERE datetime(fecha) >= datetime('now', '-30 days')
            `),

            dbGetSCM(`
                SELECT
                    COUNT(*) AS pedidos_total,
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
                    SUM(CASE WHEN estado = 'enviado' THEN 1 ELSE 0 END) AS enviados,
                    SUM(CASE WHEN estado = 'parcial' THEN 1 ELSE 0 END) AS parciales,
                    SUM(CASE WHEN estado = 'recibido' THEN 1 ELSE 0 END) AS recibidos,
                    SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
                    ROUND(COALESCE(SUM(
                        CASE WHEN estado IN ('pendiente','enviado','parcial')
                             THEN (cantidad - COALESCE(cantidad_recibida, 0)) * COALESCE(costo_unitario, 0)
                             ELSE 0 END
                    ), 0), 2) AS valor_pendiente,
                    ROUND(COALESCE(SUM(
                        CASE WHEN datetime(COALESCE(fecha_surtido, fecha_creacion)) >= datetime('now', '-30 days')
                                  AND COALESCE(cantidad_recibida, 0) > 0
                             THEN COALESCE(cantidad_recibida, 0) * COALESCE(costo_unitario, 0)
                             ELSE 0 END
                    ), 0), 2) AS compras_recibidas_30d,
                    SUM(CASE WHEN estado = 'recibido'
                                  AND datetime(fecha_surtido) >= datetime('now', '-30 days')
                             THEN 1 ELSE 0 END) AS recibidos_30d
                FROM pedidos
            `),

            dbGetSCM(`
                SELECT
                    SUM(CASE WHEN UPPER(COALESCE(estrategia_reposicion, 'PUSH')) = 'PUSH' THEN 1 ELSE 0 END) AS push,
                    SUM(CASE WHEN UPPER(COALESCE(estrategia_reposicion, 'PUSH')) = 'PULL' THEN 1 ELSE 0 END) AS pull
                FROM insumos
                WHERE estado = 'activo'
            `),

            dbAllSCM(`
                SELECT
                    i.id AS insumo_id,
                    i.nombre AS insumo_nombre,
                    COALESCE(SUM(m.cantidad), 0) AS consumo_30d,
                    COALESCE(inv.stock_actual, 0) AS stock_actual,
                    COALESCE(inv.stock_minimo, 0) AS stock_minimo
                FROM movimientos_inventario m
                INNER JOIN insumos i ON i.id = m.insumo_id
                LEFT JOIN inventario inv ON inv.insumo_id = i.id
                WHERE m.tipo = 'salida'
                  AND datetime(m.fecha) >= datetime('now', '-30 days')
                  AND i.estado = 'activo'
                GROUP BY i.id, i.nombre, inv.stock_actual, inv.stock_minimo
                ORDER BY consumo_30d DESC, i.nombre ASC
                LIMIT 10
            `),

            dbAllSCM(`
                SELECT
                    p.id,
                    p.nombre,
                    COUNT(DISTINCT i.id) AS insumos_asignados,
                    COUNT(DISTINCT CASE WHEN pe.estado IN ('pendiente','enviado','parcial') THEN pe.id END) AS pedidos_abiertos,
                    COALESCE(SUM(
                        CASE WHEN pe.estado IN ('pendiente','enviado','parcial')
                             THEN pe.cantidad - COALESCE(pe.cantidad_recibida, 0)
                             ELSE 0 END
                    ), 0) AS porciones_pendientes
                FROM proveedores p
                LEFT JOIN insumos i ON i.proveedor_id = p.id AND i.estado = 'activo'
                LEFT JOIN pedidos pe ON pe.proveedor_id = p.id
                WHERE p.estado = 'activo'
                GROUP BY p.id, p.nombre
                ORDER BY insumos_asignados DESC, p.nombre ASC
            `),

            obtenerSugerenciasReposicion()
        ]);

        const insumosActivos = Number(catalogo?.insumos_activos || 0);
        const productosTotal = Number(catalogo?.productos_total || 0);

        const coberturaProveedor = porcentajeSCM(cobertura?.con_proveedor, insumosActivos);
        const coberturaMinimo = porcentajeSCM(cobertura?.con_minimo, insumosActivos);
        const coberturaStock = porcentajeSCM(cobertura?.con_stock, insumosActivos);
        const coberturaEstrategia = porcentajeSCM(cobertura?.con_estrategia, insumosActivos);
        const coberturaRecetas = porcentajeSCM(catalogo?.productos_con_receta, productosTotal);

        const movimientos30 = Number(movimientos?.movimientos_30d || 0);
        const pedidosTotal = Number(ordenes?.pedidos_total || 0);
        const pedidosRecibidos = Number(ordenes?.recibidos || 0);

        const criterios = [
            {
                clave: 'proveedores',
                nombre: 'Insumos con proveedor',
                porcentaje: coberturaProveedor,
                peso: 15,
                puntos: Number((coberturaProveedor * 0.15).toFixed(1))
            },
            {
                clave: 'minimos',
                nombre: 'Stocks mínimos configurados',
                porcentaje: coberturaMinimo,
                peso: 20,
                puntos: Number((coberturaMinimo * 0.20).toFixed(1))
            },
            {
                clave: 'recetas',
                nombre: 'Productos con receta base',
                porcentaje: coberturaRecetas,
                peso: 20,
                puntos: Number((coberturaRecetas * 0.20).toFixed(1))
            },
            {
                clave: 'existencias',
                nombre: 'Insumos con existencia registrada',
                porcentaje: coberturaStock,
                peso: 15,
                puntos: Number((coberturaStock * 0.15).toFixed(1))
            },
            {
                clave: 'estrategias',
                nombre: 'Estrategias PUSH/PULL configuradas',
                porcentaje: coberturaEstrategia,
                peso: 10,
                puntos: Number((coberturaEstrategia * 0.10).toFixed(1))
            },
            {
                clave: 'movimientos',
                nombre: 'Trazabilidad de inventario',
                porcentaje: Math.min(100, movimientos30 * 10),
                peso: 10,
                puntos: Number(Math.min(10, movimientos30).toFixed(1))
            },
            {
                clave: 'pedidos',
                nombre: 'Uso del proceso de pedidos',
                porcentaje: pedidosTotal > 0 ? 100 : 0,
                peso: 5,
                puntos: pedidosTotal > 0 ? 5 : 0
            },
            {
                clave: 'recepciones',
                nombre: 'Ciclo de reposición completado',
                porcentaje: pedidosRecibidos > 0 ? 100 : 0,
                peso: 5,
                puntos: pedidosRecibidos > 0 ? 5 : 0
            }
        ];

        const puntaje = Math.round(
            criterios.reduce((total, criterio) => total + Number(criterio.puntos || 0), 0)
        );
        const nivel = nivelMadurezSCM(puntaje);

        const recomendaciones = [];
        if (coberturaProveedor < 100) {
            recomendaciones.push(`Asigna proveedor a ${Math.max(0, insumosActivos - Number(cobertura?.con_proveedor || 0))} insumos activos.`);
        }
        if (coberturaMinimo < 100) {
            recomendaciones.push(`Configura el stock mínimo de ${Math.max(0, insumosActivos - Number(cobertura?.con_minimo || 0))} insumos.`);
        }
        if (coberturaRecetas < 100) {
            recomendaciones.push(`Completa la receta base de ${Math.max(0, productosTotal - Number(catalogo?.productos_con_receta || 0))} productos.`);
        }
        if (coberturaStock < 70) {
            recomendaciones.push('Registra las existencias reales de los insumos para que las alertas y sugerencias representen la operación actual.');
        }
        if (movimientos30 < 10) {
            recomendaciones.push('Registra entradas y salidas de inventario de forma continua para fortalecer la trazabilidad y el cálculo PUSH.');
        }
        if (pedidosTotal === 0) {
            recomendaciones.push('Genera al menos un pedido de reposición desde Estrategia Logística para probar el flujo completo.');
        } else if (pedidosRecibidos === 0) {
            recomendaciones.push('Completa la recepción de un pedido para cerrar el ciclo pedido → inventario.');
        }
        if (Number(cobertura?.agotados || 0) > 0) {
            recomendaciones.push(`Revisa ${Number(cobertura?.agotados || 0)} insumos agotados y prioriza los que afectan más productos.`);
        }
        if (!recomendaciones.length) {
            recomendaciones.push('La configuración principal está completa. Mantén actualizados movimientos, mínimos y tiempos de reposición.');
        }

        const pedidosAbiertosPorInsumo = await dbAllSCM(`
            SELECT
                pe.id,
                pe.insumo_id,
                pe.estado,
                pe.cantidad,
                COALESCE(pe.cantidad_recibida, 0) AS cantidad_recibida
            FROM pedidos pe
            WHERE pe.estado IN ('pendiente','enviado','parcial')
            ORDER BY pe.id DESC
        `);

        const pedidoPorInsumo = new Map();
        for (const pedido of pedidosAbiertosPorInsumo) {
            if (!pedidoPorInsumo.has(Number(pedido.insumo_id))) {
                pedidoPorInsumo.set(Number(pedido.insumo_id), pedido);
            }
        }

        const atencion = sugerencias
            .filter(item => item.necesita_reposicion || item.configuracion_pendiente || Number(item.stock_actual) <= Number(item.stock_minimo))
            .map(item => {
                const pedido = pedidoPorInsumo.get(Number(item.insumo_id));
                return {
                    ...item,
                    pedido_abierto_id: pedido?.id || null,
                    pedido_estado: pedido?.estado || null,
                    pedido_pendiente: pedido
                        ? Math.max(0, Number(pedido.cantidad || 0) - Number(pedido.cantidad_recibida || 0))
                        : 0
                };
            })
            .sort((a, b) => {
                const aAgotado = Number(a.stock_actual) <= 0 ? 0 : 1;
                const bAgotado = Number(b.stock_actual) <= 0 ? 0 : 1;
                if (aAgotado !== bAgotado) return aAgotado - bAgotado;
                return Number(a.stock_actual) - Number(b.stock_actual);
            });

        await dbRunSCM(`
            UPDATE scm_config
            SET nivel_scm = ?, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [nivel]);

        res.json({
            mensaje: 'Éxito',
            data: {
                kpis: {
                    productos_total: productosTotal,
                    productos_con_receta: Number(catalogo?.productos_con_receta || 0),
                    insumos_activos: insumosActivos,
                    proveedores_activos: Number(catalogo?.proveedores_activos || 0),
                    valor_inventario: Number(cobertura?.valor_inventario || 0),
                    agotados: Number(cobertura?.agotados || 0),
                    bajos: Number(cobertura?.bajos || 0),
                    normales: Number(cobertura?.normales || 0),
                    sugerencias_reposicion: sugerencias.filter(s => s.necesita_reposicion).length,
                    configuraciones_pendientes: sugerencias.filter(s => s.configuracion_pendiente).length,
                    pedidos_pendientes: Number(ordenes?.pendientes || 0),
                    pedidos_enviados: Number(ordenes?.enviados || 0),
                    pedidos_parciales: Number(ordenes?.parciales || 0),
                    pedidos_recibidos: Number(ordenes?.recibidos || 0),
                    pedidos_cancelados: Number(ordenes?.cancelados || 0),
                    valor_pendiente: Number(ordenes?.valor_pendiente || 0),
                    compras_recibidas_30d: Number(ordenes?.compras_recibidas_30d || 0),
                    recibidos_30d: Number(ordenes?.recibidos_30d || 0),
                    movimientos_30d: movimientos30,
                    entradas_30d: Number(movimientos?.entradas_30d || 0),
                    salidas_30d: Number(movimientos?.salidas_30d || 0)
                },
                madurez: {
                    puntaje,
                    nivel,
                    aclaracion: 'Diagnóstico interno del proyecto; no corresponde a una certificación externa.',
                    criterios,
                    recomendaciones
                },
                estrategias: {
                    push: Number(estrategias?.push || 0),
                    pull: Number(estrategias?.pull || 0)
                },
                stock: {
                    agotados: Number(cobertura?.agotados || 0),
                    bajos: Number(cobertura?.bajos || 0),
                    normales: Number(cobertura?.normales || 0)
                },
                top_consumo: topConsumo,
                proveedores,
                atencion
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ERP - ÓRDENES DE CLIENTES
// ============================================================

function enteroPositivoERP(valor){
    const n=Number(valor);
    return Number.isInteger(n)&&n>0?n:null;
}

function usuarioIdERP(req){
    const n=Number(req.body?.usuario_id);
    return Number.isInteger(n)&&n>0?n:null;
}

function crearErrorERP(mensaje,status=400){
    const error=new Error(mensaje);
    error.status=status;
    return error;
}

function recalcularProductosERP(){
    return new Promise((resolve,reject)=>{
        recalcularDisponibilidadTodosProductos(error=>{
            if(error){
                return reject(error);
            }
            resolve();
        });
    });
}

// ============================================================
// GET /api/ordenes
// ============================================================

app.get('/api/ordenes',async(req,res)=>{
    try{
        const estado=String(req.query.estado||'todos').toLowerCase();

        const permitidos=[
            'todos',
            'pendiente',
            'preparacion',
            'entregado',
            'cancelado'
        ];

        if(!permitidos.includes(estado)){
            return res.status(400).json({
                error:'Estado de orden no válido.'
            });
        }

        const where=
            estado==='todos'
                ?''
                :'WHERE o.estado=?';

        const params=
            estado==='todos'
                ?[]
                :[estado];

        const ordenes=await dbAllSCM(`
            SELECT
                o.id,
                o.cliente_id,
                o.fecha,
                o.estado,
                o.total,
                o.usuario_id,
                o.inventario_aplicado,
                o.fecha_procesado,

                c.nombre AS cliente_nombre,
                c.correo AS cliente_correo,
                c.telefono AS cliente_telefono,
                c.empresa AS cliente_empresa,

                u.nombre AS usuario_nombre,

                COUNT(od.id) AS partidas,
                COALESCE(SUM(od.cantidad),0) AS productos_total

            FROM ordenes_empresariales o

            INNER JOIN clientes c
                ON c.id=o.cliente_id

            LEFT JOIN usuarios u
                ON u.id=o.usuario_id

            LEFT JOIN orden_detalle od
                ON od.orden_id=o.id

            ${where}

            GROUP BY
                o.id,
                o.cliente_id,
                o.fecha,
                o.estado,
                o.total,
                o.usuario_id,
                o.inventario_aplicado,
                o.fecha_procesado,
                c.nombre,
                c.correo,
                c.telefono,
                c.empresa,
                u.nombre

            ORDER BY
                o.fecha DESC,
                o.id DESC
        `,params);

        res.json({
            mensaje:'Éxito',
            data:ordenes
        });

    }catch(error){
        console.error(
            'Error cargando órdenes ERP:',
            error
        );

        res.status(500).json({
            error:'No se pudieron cargar las órdenes.'
        });
    }
});


// ============================================================
// GET /api/ordenes/:id
// ============================================================

app.get('/api/ordenes/:id',async(req,res)=>{
    try{
        const ordenId=
            enteroPositivoERP(req.params.id);

        if(!ordenId){
            return res.status(400).json({
                error:'ID de orden no válido.'
            });
        }

        const orden=await dbGetSCM(`
            SELECT
                o.*,

                c.nombre AS cliente_nombre,
                c.correo AS cliente_correo,
                c.telefono AS cliente_telefono,
                c.empresa AS cliente_empresa,

                u.nombre AS usuario_nombre

            FROM ordenes_empresariales o

            INNER JOIN clientes c
                ON c.id=o.cliente_id

            LEFT JOIN usuarios u
                ON u.id=o.usuario_id

            WHERE o.id=?
        `,[ordenId]);

        if(!orden){
            return res.status(404).json({
                error:'Orden no encontrada.'
            });
        }

        const productos=await dbAllSCM(`
            SELECT
                od.id,
                od.producto_id,
                od.cantidad,
                od.precio_unitario,
                od.subtotal,

                p.nombre AS producto_nombre,
                p.categoria,
                p.estado AS producto_estado

            FROM orden_detalle od

            INNER JOIN productos p
                ON p.id=od.producto_id

            WHERE od.orden_id=?

            ORDER BY od.id ASC
        `,[ordenId]);

        const historial=await dbAllSCM(`
            SELECT
                pe.*,
                u.nombre AS usuario_nombre

            FROM procesos_erp pe

            LEFT JOIN usuarios u
                ON u.id=pe.usuario_id

            WHERE pe.orden_id=?

            ORDER BY
                pe.fecha DESC,
                pe.id DESC
        `,[ordenId]);

        res.json({
            mensaje:'Éxito',

            data:{
                ...orden,
                productos,
                historial
            }
        });

    }catch(error){
        console.error(
            'Error consultando orden:',
            error
        );

        res.status(500).json({
            error:'No se pudo consultar la orden.'
        });
    }
});


// ============================================================
// POST /api/ordenes
// ============================================================

app.post('/api/ordenes',async(req,res)=>{
    let transaccion=false;

    try{
        const clienteId=
            enteroPositivoERP(
                req.body?.cliente_id
            );

        const usuarioId=
            usuarioIdERP(req);

        const productosEntrada=
            Array.isArray(req.body?.productos)
                ?req.body.productos
                :[];

        if(!clienteId){
            return res.status(400).json({
                error:'Selecciona un cliente válido.'
            });
        }

        if(!productosEntrada.length){
            return res.status(400).json({
                error:'La orden debe contener al menos un producto.'
            });
        }

        // CLIENTE CRM
        const cliente=await dbGetSCM(`
            SELECT
                id,
                nombre,
                correo,
                estado
            FROM clientes
            WHERE id=?
        `,[clienteId]);

        if(!cliente){
            return res.status(404).json({
                error:'El cliente no existe.'
            });
        }

        if(cliente.estado!=='activo'){
            return res.status(400).json({
                error:'El cliente está inactivo.'
            });
        }

        // AGRUPAR PRODUCTOS REPETIDOS
        const cantidades=new Map();

        for(const item of productosEntrada){
            const productoId=
                enteroPositivoERP(item?.producto_id);

            const cantidad=
                enteroPositivoERP(item?.cantidad);

            if(!productoId||!cantidad){
                return res.status(400).json({
                    error:'Producto o cantidad no válidos.'
                });
            }

            cantidades.set(
                productoId,
                (cantidades.get(productoId)||0)+cantidad
            );
        }

        // PRODUCTOS SCM
        const detalles=[];
        let total=0;

        for(const [productoId,cantidad] of cantidades.entries()){
            const producto=await dbGetSCM(`
                SELECT
                    id,
                    nombre,
                    precio,
                    estado,
                    stock_actual
                FROM productos
                WHERE id=?
            `,[productoId]);

            if(!producto){
                return res.status(404).json({
                    error:`El producto #${productoId} no existe.`
                });
            }

            if(producto.estado==='inactivo'){
                return res.status(400).json({
                    error:`${producto.nombre} está inactivo.`
                });
            }
            const disponibles=
                Number(
                    producto.stock_actual||0
                );

            if(
                producto.estado!=='disponible' ||
                disponibles<=0
            ){
                return res.status(400).json({
                    error:
                        `${producto.nombre} no está disponible actualmente.`
                });
            }

            if(cantidad>disponibles){
                return res.status(400).json({
                    error:
                        `Solo hay disponibilidad para ${disponibles} unidad(es) de ${producto.nombre}.`
                });
            }

            const precio=
                Number(producto.precio||0);

            const subtotal=
                Number(
                    (precio*cantidad).toFixed(2)
                );

            total+=subtotal;

            detalles.push({
                producto_id:producto.id,
                producto_nombre:producto.nombre,
                cantidad,
                precio_unitario:precio,
                subtotal
            });
        }

        total=
            Number(total.toFixed(2));

        // TRANSACCIÓN
        await dbRunSCM(
            'BEGIN IMMEDIATE TRANSACTION'
        );

        transaccion=true;

        const resultadoOrden=
            await dbRunSCM(`
                INSERT INTO ordenes_empresariales(
                    cliente_id,
                    estado,
                    total,
                    usuario_id,
                    inventario_aplicado
                )
                VALUES(
                    ?,
                    'pendiente',
                    ?,
                    ?,
                    0
                )
            `,[
                clienteId,
                total,
                usuarioId
            ]);

        const ordenId=
            resultadoOrden.lastID;

        for(const detalle of detalles){
            await dbRunSCM(`
                INSERT INTO orden_detalle(
                    orden_id,
                    producto_id,
                    cantidad,
                    precio_unitario,
                    subtotal
                )
                VALUES(?,?,?,?,?)
            `,[
                ordenId,
                detalle.producto_id,
                detalle.cantidad,
                detalle.precio_unitario,
                detalle.subtotal
            ]);
        }

        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,
                tipo,
                descripcion,
                estado,
                usuario_id
            )
            VALUES(
                ?,
                'CREACION',
                ?,
                'pendiente',
                ?
            )
        `,[
            ordenId,
            `Orden #${ordenId} creada para ${cliente.nombre}.`,
            usuarioId
        ]);

        await dbRunSCM('COMMIT');

        transaccion=false;

        registrarActividad(
            usuarioId,
            'ALTA',
            'ERP',
            `Creó la orden #${ordenId} para ${cliente.nombre} por $${total.toFixed(2)}`,
            'orden',
            ordenId
        );

        res.status(201).json({
            mensaje:'Orden registrada correctamente.',
            id:ordenId,
            estado:'pendiente',
            total,
            productos:detalles
        });

    }catch(error){
        if(transaccion){
            try{
                await dbRunSCM('ROLLBACK');
            }catch(_){}
        }

        console.error(
            'Error creando orden:',
            error
        );

        res.status(500).json({
            error:'No se pudo registrar la orden.'
        });
    }
});


// ============================================================
// PUT /api/ordenes/:id/estado
// ============================================================

app.put('/api/ordenes/:id/estado',async(req,res)=>{
    try{
        const ordenId=
            enteroPositivoERP(req.params.id);

        const nuevoEstado=
            String(
                req.body?.estado||''
            ).toLowerCase();

        const usuarioId=
            usuarioIdERP(req);

        if(!ordenId){
            return res.status(400).json({
                error:'ID de orden no válido.'
            });
        }

        const permitidos=[
            'pendiente',
            'preparacion',
            'entregado',
            'cancelado'
        ];

        if(!permitidos.includes(nuevoEstado)){
            return res.status(400).json({
                error:'Estado de orden no válido.'
            });
        }

        const orden=await dbGetSCM(`
            SELECT
                id,
                estado
            FROM ordenes_empresariales
            WHERE id=?
        `,[ordenId]);

        if(!orden){
            return res.status(404).json({
                error:'Orden no encontrada.'
            });
        }

        // FLUJO OPERATIVO
        const transiciones={

            pendiente:[
                'cancelado'
            ],

            preparacion:[
                'entregado'
            ],

            entregado:[],

            cancelado:[]
        };

        if(
            orden.estado!==nuevoEstado &&
            !(
                transiciones[orden.estado]||[]
            ).includes(nuevoEstado)
        ){
            return res.status(409).json({
                error:
                    `No se puede cambiar una orden de ${orden.estado} a ${nuevoEstado}.`
            });
        }

        if(orden.estado===nuevoEstado){
            return res.json({
                mensaje:'La orden ya tiene ese estado.',
                id:ordenId,
                estado:nuevoEstado
            });
        }

        await dbRunSCM(`
            UPDATE ordenes_empresariales
            SET estado=?
            WHERE id=?
        `,[
            nuevoEstado,
            ordenId
        ]);

        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,
                tipo,
                descripcion,
                estado,
                usuario_id
            )
            VALUES(
                ?,
                'CAMBIO_ESTADO',
                ?,
                ?,
                ?
            )
        `,[
            ordenId,
            `La orden cambió de ${orden.estado} a ${nuevoEstado}.`,
            nuevoEstado,
            usuarioId
        ]);

        registrarActividad(
            usuarioId,
            'EDICION',
            'ERP',
            `Cambió la orden #${ordenId} de ${orden.estado} a ${nuevoEstado}`,
            'orden',
            ordenId
        );

        res.json({
            mensaje:'Estado actualizado correctamente.',
            id:ordenId,
            estado:nuevoEstado
        });

    }catch(error){
        console.error(
            'Error actualizando estado ERP:',
            error
        );

        res.status(500).json({
            error:'No se pudo actualizar el estado.'
        });
    }
});


// ============================================================
// POST /api/ordenes/:id/procesar
// AUTOMATIZACIÓN ERP: CRM + SCM + INVENTARIO
// ============================================================

async function procesarOrdenERPBackend(req,res){
    const ordenId=
        enteroPositivoERP(
            req.params?.id ||
            req.body?.orden_id
        );

    const usuarioId=
        usuarioIdERP(req);

    let transaccion=false;
    let ordenCargada=null;

    if(!ordenId){
        return res.status(400).json({
            error:'ID de orden no válido.'
        });
    }

    try{
        // Bloquea escrituras concurrentes mientras validamos y descontamos.
        await dbRunSCM(
            'BEGIN IMMEDIATE TRANSACTION'
        );
        transaccion=true;

        // ----------------------------------------------------
        // 1. ORDEN + CLIENTE CRM
        // ----------------------------------------------------
        const orden=await dbGetSCM(`
            SELECT
                o.id,
                o.cliente_id,
                o.estado,
                o.total,
                o.usuario_id,
                o.inventario_aplicado,
                o.fecha,
                c.nombre AS cliente_nombre,
                c.correo AS cliente_correo,
                c.estado AS cliente_estado
            FROM ordenes_empresariales o
            INNER JOIN clientes c
                ON c.id=o.cliente_id
            WHERE o.id=?
        `,[ordenId]);

        ordenCargada=orden;

        if(!orden){
            throw crearErrorERP(
                'Orden no encontrada.',
                404
            );
        }

        if(orden.estado!=='pendiente'){
            throw crearErrorERP(
                'Solo una orden pendiente puede iniciar preparación.',
                409
            );
        }

        if(Number(orden.inventario_aplicado||0)===1){
            throw crearErrorERP(
                'El inventario de esta orden ya fue procesado.',
                409
            );
        }

        if(orden.cliente_estado!=='activo'){
            throw crearErrorERP(
                'El cliente asociado a la orden está inactivo.',
                409
            );
        }

        // ----------------------------------------------------
        // 2. PRODUCTOS DE LA ORDEN
        // ----------------------------------------------------
        const productos=await dbAllSCM(`
            SELECT
                od.producto_id,
                od.cantidad,
                od.precio_unitario,
                od.subtotal,
                p.nombre AS producto_nombre,
                p.estado AS producto_estado
            FROM orden_detalle od
            INNER JOIN productos p
                ON p.id=od.producto_id
            WHERE od.orden_id=?
            ORDER BY od.id ASC
        `,[ordenId]);

        if(!productos.length){
            throw crearErrorERP(
                'La orden no contiene productos.',
                409
            );
        }

        // ----------------------------------------------------
        // 3. RECETAS Y REQUERIMIENTOS DE INSUMOS
        // ----------------------------------------------------
        const requerimientos=new Map();
        const movimientosDetalle=[];

        for(const producto of productos){
            if(producto.producto_estado==='inactivo'){
                throw crearErrorERP(
                    `El producto ${producto.producto_nombre} se encuentra inactivo.`,
                    409
                );
            }

            const receta=await dbAllSCM(`
                SELECT
                    pi.insumo_id,
                    pi.porciones_requeridas,
                    i.nombre AS insumo_nombre,
                    i.estado AS insumo_estado,
                    COALESCE(inv.stock_actual,0) AS stock_actual,
                    COALESCE(inv.stock_minimo,0) AS stock_minimo
                FROM producto_insumo pi
                INNER JOIN insumos i
                    ON i.id=pi.insumo_id
                LEFT JOIN inventario inv
                    ON inv.insumo_id=i.id
                WHERE pi.producto_id=?
            `,[producto.producto_id]);

            if(!receta.length){
                throw crearErrorERP(
                    `El producto ${producto.producto_nombre} no tiene una receta configurada.`,
                    409
                );
            }

            for(const ingrediente of receta){
                if(ingrediente.insumo_estado!=='activo'){
                    throw crearErrorERP(
                        `El insumo ${ingrediente.insumo_nombre} está inactivo.`,
                        409
                    );
                }

                const cantidadNecesaria=
                    Number(ingrediente.porciones_requeridas||0) *
                    Number(producto.cantidad||0);

                if(!Number.isInteger(cantidadNecesaria) || cantidadNecesaria<=0){
                    throw crearErrorERP(
                        `La receta de ${producto.producto_nombre} contiene una cantidad inválida.`,
                        409
                    );
                }

                const actual=
                    requerimientos.get(
                        ingrediente.insumo_id
                    );

                if(actual){
                    actual.cantidad+=cantidadNecesaria;
                }else{
                    requerimientos.set(
                        ingrediente.insumo_id,
                        {
                            insumo_id:ingrediente.insumo_id,
                            nombre:ingrediente.insumo_nombre,
                            stock_actual:Number(ingrediente.stock_actual||0),
                            stock_minimo:Number(ingrediente.stock_minimo||0),
                            cantidad:cantidadNecesaria
                        }
                    );
                }

                movimientosDetalle.push({
                    producto_id:producto.producto_id,
                    producto_nombre:producto.producto_nombre,
                    insumo_id:ingrediente.insumo_id,
                    insumo_nombre:ingrediente.insumo_nombre,
                    cantidad:cantidadNecesaria
                });
            }
        }

        if(requerimientos.size===0){
            throw crearErrorERP(
                'No se encontraron insumos para procesar la orden.',
                409
            );
        }

        // ----------------------------------------------------
        // 4. VALIDAR TODO EL INVENTARIO ANTES DE DESCONTAR
        // ----------------------------------------------------
        for(const requerimiento of requerimientos.values()){
            if(requerimiento.stock_actual < requerimiento.cantidad){
                const faltante=
                    requerimiento.cantidad -
                    requerimiento.stock_actual;

                throw crearErrorERP(
                    `Inventario insuficiente de ${requerimiento.nombre}. ` +
                    `Se necesitan ${requerimiento.cantidad}, ` +
                    `hay ${requerimiento.stock_actual} y faltan ${faltante}.`,
                    409
                );
            }
        }

        // ----------------------------------------------------
        // 5. HISTORIAL: INICIO + VALIDACIONES
        // ----------------------------------------------------
        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,tipo,descripcion,estado,usuario_id
            )
            VALUES(
                ?,'PROCESAMIENTO',?,'procesando',?
            )
        `,[
            ordenId,
            `Se inició el procesamiento automático de la orden #${ordenId}.`,
            usuarioId
        ]);

        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,tipo,descripcion,estado,usuario_id
            )
            VALUES(
                ?,'VALIDACION_CLIENTE',?,'correcto',?
            )
        `,[
            ordenId,
            `Cliente ${orden.cliente_nombre} validado correctamente.`,
            usuarioId
        ]);

        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,tipo,descripcion,estado,usuario_id
            )
            VALUES(
                ?,'VALIDACION_INVENTARIO',?,'correcto',?
            )
        `,[
            ordenId,
            `Existencias suficientes para ${requerimientos.size} insumo(s).`,
            usuarioId
        ]);

        // ----------------------------------------------------
        // 6. DESCONTAR INVENTARIO
        // ----------------------------------------------------
        const insumosDescontados=[];

        for(const requerimiento of requerimientos.values()){
            const resultado=await dbRunSCM(`
                UPDATE inventario
                SET
                    stock_actual=stock_actual-?,
                    fecha_actualizacion=CURRENT_TIMESTAMP
                WHERE
                    insumo_id=?
                    AND stock_actual>=?
            `,[
                requerimiento.cantidad,
                requerimiento.insumo_id,
                requerimiento.cantidad
            ]);

            if(resultado.changes!==1){
                throw crearErrorERP(
                    `El inventario de ${requerimiento.nombre} cambió durante el procesamiento.`,
                    409
                );
            }

            insumosDescontados.push({
                insumo_id:requerimiento.insumo_id,
                nombre:requerimiento.nombre,
                stock_anterior:requerimiento.stock_actual,
                utilizado:requerimiento.cantidad,
                stock_actual:
                    requerimiento.stock_actual-
                    requerimiento.cantidad
            });
        }

        // ----------------------------------------------------
        // 7. MOVIMIENTOS DE INVENTARIO
        // ----------------------------------------------------
        for(const movimiento of movimientosDetalle){
            await dbRunSCM(`
                INSERT INTO movimientos_inventario(
                    producto_id,
                    insumo_id,
                    tipo,
                    cantidad,
                    motivo,
                    usuario_id
                )
                VALUES(
                    ?,?,'salida',?,?,?
                )
            `,[
                movimiento.producto_id,
                movimiento.insumo_id,
                movimiento.cantidad,
                `venta ERP orden #${ordenId}`,
                usuarioId
            ]);
        }

        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,tipo,descripcion,estado,usuario_id
            )
            VALUES(
                ?,'ACTUALIZACION_INVENTARIO',?,'correcto',?
            )
        `,[
            ordenId,
            `Se descontaron existencias de ${requerimientos.size} insumo(s).`,
            usuarioId
        ]);

        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,tipo,descripcion,estado,usuario_id
            )
            VALUES(
                ?,'MOVIMIENTOS_INVENTARIO',?,'correcto',?
            )
        `,[
            ordenId,
            `Se registraron ${movimientosDetalle.length} movimiento(s) de salida.`,
            usuarioId
        ]);

        // ----------------------------------------------------
        // 8. INTEGRACIÓN CRM
        // ----------------------------------------------------
        await dbRunSCM(`
            INSERT INTO interacciones(
                cliente_id,
                usuario_id,
                tipo,
                descripcion
            )
            VALUES(
                ?,?,'Venta ERP',?
            )
        `,[
            orden.cliente_id,
            usuarioId,
            `Orden #${ordenId} enviada a preparación por $${Number(orden.total||0).toFixed(2)}.`
        ]);

        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,tipo,descripcion,estado,usuario_id
            )
            VALUES(
                ?,'INTEGRACION_CRM',?,'correcto',?
            )
        `,[
            ordenId,
            `La operación fue registrada en el historial CRM de ${orden.cliente_nombre}.`,
            usuarioId
        ]);

        // ----------------------------------------------------
        // 9. FINALIZAR ORDEN
        // ----------------------------------------------------
        const actualizacionOrden=await dbRunSCM(`
            UPDATE ordenes_empresariales
            SET
                estado='preparacion',
                inventario_aplicado=1,
                fecha_procesado=CURRENT_TIMESTAMP
            WHERE
                id=?
                AND estado='pendiente'
                AND COALESCE(inventario_aplicado,0)=0
        `,[ordenId]);

        if(actualizacionOrden.changes!==1){
            throw crearErrorERP(
                'La orden cambió durante el procesamiento. Intenta nuevamente.',
                409
            );
        }

        await dbRunSCM(`
            INSERT INTO procesos_erp(
                orden_id,tipo,descripcion,estado,usuario_id
            )
            VALUES(
                ?,'FINALIZACION',?,'preparacion',?
            )
        `,[
            ordenId,
            `Orden #${ordenId} procesada correctamente y enviada a preparación.`,
            usuarioId
        ]);

        // ----------------------------------------------------
        // 10. CONFIRMAR TRANSACCIÓN
        // ----------------------------------------------------
        await dbRunSCM('COMMIT');
        transaccion=false;

        // ----------------------------------------------------
        // 11. RECALCULAR DISPONIBILIDAD SCM
        // ----------------------------------------------------
        try{
            await recalcularProductosERP();
        }catch(errorRecalculo){
            console.warn(
                'La orden se procesó, pero hubo un error recalculando productos:',
                errorRecalculo.message
            );
        }

        // ----------------------------------------------------
        // 12. VERIFICAR REPOSICIÓN AUTOMÁTICA PUSH
        // ----------------------------------------------------
        const reposicionesAutomaticas=[];

        for(const requerimiento of requerimientos.values()){
            try{
                const resultadoPush=
                    await verificarReposicionAutomaticaPush(
                        requerimiento.insumo_id,
                        usuarioId
                    );

                if(resultadoPush?.creado){
                    reposicionesAutomaticas.push({
                        insumo_id:requerimiento.insumo_id,
                        insumo:requerimiento.nombre,
                        pedido_id:resultadoPush.pedido_id
                    });
                }
            }catch(errorPush){
                console.warn(
                    `No se pudo verificar PUSH del insumo ${requerimiento.insumo_id}:`,
                    errorPush.message
                );
            }
        }

        registrarActividad(
            usuarioId,
            'INVENTARIO',
            'ERP',
            `Procesó automáticamente la orden #${ordenId}; se descontaron ${requerimientos.size} insumos`,
            'orden',
            ordenId
        );

        return res.json({
            mensaje:'Orden procesada correctamente.',
            orden_id:ordenId,
            estado:'preparacion',
            inventario_aplicado:true,
            cliente:{
                id:orden.cliente_id,
                nombre:orden.cliente_nombre
            },
            total:Number(orden.total||0),
            insumos_descontados:insumosDescontados,
            movimientos_registrados:movimientosDetalle.length,
            reposiciones_automaticas:reposicionesAutomaticas,
            pasos:[
                {paso:'Cliente validado',estado:'correcto'},
                {paso:'Productos y recetas validados',estado:'correcto'},
                {paso:'Inventario validado',estado:'correcto'},
                {paso:'Inventario actualizado',estado:'correcto'},
                {paso:'Movimientos registrados',estado:'correcto'},
                {paso:'CRM actualizado',estado:'correcto'},
                {paso:'Disponibilidad recalculada',estado:'correcto'},
                {paso:'Orden enviada a preparación',estado:'correcto'}
            ]
        });

    }catch(error){
        if(transaccion){
            try{
                await dbRunSCM('ROLLBACK');
            }catch(errorRollback){
                console.error(
                    'Error ejecutando ROLLBACK:',
                    errorRollback
                );
            }
        }

        // El intento fallido se registra fuera de la transacción.
        if(ordenCargada){
            try{
                await dbRunSCM(`
                    INSERT INTO procesos_erp(
                        orden_id,tipo,descripcion,estado,usuario_id
                    )
                    VALUES(
                        ?,'ERROR_PROCESAMIENTO',?,'error',?
                    )
                `,[
                    ordenId,
                    error.message,
                    usuarioId
                ]);
            }catch(errorHistorial){
                console.warn(
                    'No se pudo registrar el fallo ERP:',
                    errorHistorial.message
                );
            }
        }

        console.error(
            `Error procesando orden #${ordenId}:`,
            error
        );

        return res.status(
            error.status||500
        ).json({
            error:
                error.message||
                'No se pudo procesar la orden.'
        });
    }
}

app.post(
    '/api/ordenes/:id/procesar',
    procesarOrdenERPBackend
);

// Alias compatible con la especificación académica.
app.post(
    '/api/ordenes/procesar',
    procesarOrdenERPBackend
);


// ============================================================
// GET /api/erp/resumen
// ============================================================

app.get('/api/erp/resumen',async(req,res)=>{
    try{
        const[
            clientes,
            ordenes,
            productos,
            inventario,
            recientes
        ]=await Promise.all([

            dbGetSCM(`
                SELECT COUNT(*) AS total
                FROM clientes
                WHERE estado='activo'
            `),

            dbGetSCM(`
                SELECT
                    COUNT(*) AS total,

                    SUM(
                        CASE
                            WHEN estado='pendiente'
                            THEN 1
                            ELSE 0
                        END
                    ) AS pendientes,

                    SUM(
                        CASE
                            WHEN estado='preparacion'
                            THEN 1
                            ELSE 0
                        END
                    ) AS preparacion,

                    SUM(
                        CASE
                            WHEN estado='entregado'
                            THEN 1
                            ELSE 0
                        END
                    ) AS entregadas

                FROM ordenes_empresariales
            `),

            dbGetSCM(`
                SELECT COUNT(*) AS total
                FROM productos
                WHERE estado='disponible'
            `),

            dbGetSCM(`
                SELECT
                    COALESCE(
                        SUM(stock_actual),
                        0
                    ) AS porciones,

                    SUM(
                        CASE
                            WHEN stock_actual<=stock_minimo
                            THEN 1
                            ELSE 0
                        END
                    ) AS atencion

                FROM inventario
            `),

            dbAllSCM(`
                SELECT
                    o.id,
                    o.fecha,
                    o.estado,
                    o.total,
                    c.nombre AS cliente_nombre

                FROM ordenes_empresariales o

                INNER JOIN clientes c
                    ON c.id=o.cliente_id

                ORDER BY
                    o.fecha DESC,
                    o.id DESC

                LIMIT 5
            `)
        ]);

        res.json({
            mensaje:'Éxito',

            data:{
                clientes_activos:
                    Number(clientes?.total||0),

                ordenes_total:
                    Number(ordenes?.total||0),

                ordenes_pendientes:
                    Number(ordenes?.pendientes||0),

                ordenes_preparacion:
                    Number(ordenes?.preparacion||0),

                ordenes_entregadas:
                    Number(ordenes?.entregadas||0),

                productos_disponibles:
                    Number(productos?.total||0),

                inventario_porciones:
                    Number(inventario?.porciones||0),

                insumos_atencion:
                    Number(inventario?.atencion||0),

                ordenes_recientes:
                    recientes
            }
        });

    }catch(error){
        console.error(
            'Error cargando resumen ERP:',
            error
        );

        res.status(500).json({
            error:'No se pudo cargar el resumen ERP.'
        });
    }
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});