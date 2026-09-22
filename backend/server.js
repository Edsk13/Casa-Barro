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

// Agrega una columna únicamente si todavía no existe.
// Esto permite conservar database.sqlite sin borrarlo.
function asegurarColumna(tabla, columna, definicion) {

    db.all(
        `PRAGMA table_info(${tabla})`,
        [],
        (err, columnas) => {

            if (err) {
                console.error(
                    `Error revisando tabla ${tabla}:`,
                    err.message
                );
                return;
            }

            const existe = columnas.some(
                col => col.name === columna
            );

            if (!existe) {

                db.run(
                    `
                    ALTER TABLE ${tabla}
                    ADD COLUMN ${columna} ${definicion}
                    `,
                    (error) => {

                        if (error) {

                            console.error(
                                `Error agregando ${tabla}.${columna}:`,
                                error.message
                            );

                        } else {

                            console.log(
                                `SCM: columna agregada ${tabla}.${columna}`
                            );

                        }

                    }
                );

            }

        }
    );
}


// ============================================================
// CONEXIÓN SQLITE
// ============================================================

const dbPath = path.resolve(
    __dirname,
    'database.sqlite'
);

const db = new sqlite3.Database(
    dbPath,
    (err) => {

        if (err) {

            console.error(
                'Error SQLite:',
                err.message
            );

            return;
        }

        console.log(
            'Conectado a SQLite.'
        );


        // Ejecutamos la creación de tablas en orden
        db.serialize(() => {


            // =================================================
            // TABLA PRODUCTOS
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS productos (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    nombre TEXT,

                    precio REAL,

                    estado TEXT
                        DEFAULT 'disponible'

                )
            `);


            // =================================================
            // TABLA CLIENTES
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS clientes (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    nombre TEXT
                        NOT NULL,

                    correo TEXT
                        UNIQUE
                        NOT NULL,

                    telefono TEXT,

                    empresa TEXT,

                    fecha_registro DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    estado TEXT
                        DEFAULT 'activo',

                    etapa_crm TEXT
                        DEFAULT 'Prospecto'

                )
            `);


            // =================================================
            // TABLA USUARIOS
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS usuarios (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    nombre TEXT
                        NOT NULL,

                    correo TEXT
                        UNIQUE
                        NOT NULL,

                    password TEXT
                        NOT NULL,

                    rol TEXT
                        DEFAULT 'cliente',

                    empresa TEXT,

                    telefono TEXT,

                    fecha_registro DATETIME
                        DEFAULT CURRENT_TIMESTAMP

                )
            `);


            // =================================================
            // CRM - INTERACCIONES
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS interacciones (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    cliente_id INTEGER,

                    usuario_id INTEGER,

                    tipo TEXT,

                    descripcion TEXT,

                    fecha DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (cliente_id)
                        REFERENCES clientes(id),

                    FOREIGN KEY (usuario_id)
                        REFERENCES usuarios(id)

                )
            `);


            // =================================================
            // BITÁCORA GENERAL
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS bitacora_actividad (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    usuario_id INTEGER,

                    usuario_nombre TEXT
                        NOT NULL,

                    rol TEXT
                        NOT NULL,

                    accion TEXT
                        NOT NULL,

                    modulo TEXT
                        NOT NULL,

                    descripcion TEXT
                        NOT NULL,

                    entidad TEXT,

                    entidad_id INTEGER,

                    fecha DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (usuario_id)
                        REFERENCES usuarios(id)

                )
            `);


            // =================================================
            // SCM - AMPLIACIÓN DEL MODELO PRODUCTO
            // =================================================

            asegurarColumna(
                'productos',
                'descripcion',
                'TEXT'
            );

            asegurarColumna(
                'productos',
                'categoria',
                'TEXT'
            );

            asegurarColumna(
                'productos',
                'stock_actual',
                'INTEGER DEFAULT 0'
            );

            asegurarColumna(
                'productos',
                'stock_minimo',
                'INTEGER DEFAULT 0'
            );

            asegurarColumna(
                'productos',
                'proveedor_id',
                'INTEGER'
            );

            asegurarColumna(
                'productos',
                'costo_unitario',
                'REAL DEFAULT 0'
            );

            asegurarColumna(
                'productos',
                'estrategia_logistica',
                "TEXT DEFAULT 'PULL'"
            );


            // =================================================
            // SCM - PROVEEDORES
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS proveedores (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    nombre TEXT
                        NOT NULL,

                    contacto TEXT,

                    correo TEXT,

                    telefono TEXT,

                    estado TEXT
                        DEFAULT 'activo',

                    fecha_registro DATETIME
                        DEFAULT CURRENT_TIMESTAMP

                )
            `);


            // =================================================
            // SCM - INSUMOS
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS insumos (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    nombre TEXT
                        NOT NULL,

                    descripcion TEXT,

                    proveedor_id INTEGER,

                    costo_porcion REAL
                        DEFAULT 0,

                    estado TEXT
                        DEFAULT 'activo',

                    fecha_registro DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (proveedor_id)
                        REFERENCES proveedores(id)

                )
            `);


            // =================================================
            // SCM - INVENTARIO DE INSUMOS
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS inventario (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    insumo_id INTEGER
                        NOT NULL
                        UNIQUE,

                    stock_actual INTEGER
                        DEFAULT 0,

                    stock_minimo INTEGER
                        DEFAULT 0,

                    fecha_actualizacion DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (insumo_id)
                        REFERENCES insumos(id)

                )
            `);


            // =================================================
            // SCM - RECETA PRODUCTO / INSUMO
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS producto_insumo (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    producto_id INTEGER
                        NOT NULL,

                    insumo_id INTEGER
                        NOT NULL,

                    porciones_requeridas INTEGER
                        NOT NULL
                        DEFAULT 1,

                    FOREIGN KEY (producto_id)
                        REFERENCES productos(id),

                    FOREIGN KEY (insumo_id)
                        REFERENCES insumos(id),

                    UNIQUE(
                        producto_id,
                        insumo_id
                    )

                )
            `);


            // =================================================
            // SCM - MOVIMIENTOS DE INVENTARIO
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS movimientos_inventario (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    producto_id INTEGER,

                    insumo_id INTEGER,

                    tipo TEXT
                        NOT NULL,

                    cantidad INTEGER
                        NOT NULL,

                    motivo TEXT
                        NOT NULL,

                    usuario_id INTEGER,

                    fecha DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (producto_id)
                        REFERENCES productos(id),

                    FOREIGN KEY (insumo_id)
                        REFERENCES insumos(id),

                    FOREIGN KEY (usuario_id)
                        REFERENCES usuarios(id)

                )
            `);


            // =================================================
            // SCM - PEDIDOS
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS pedidos (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    producto_id INTEGER,

                    insumo_id INTEGER,

                    proveedor_id INTEGER,

                    cantidad INTEGER
                        NOT NULL,

                    tipo TEXT
                        NOT NULL,

                    estado TEXT
                        DEFAULT 'pendiente',

                    origen TEXT
                        DEFAULT 'MANUAL',

                    usuario_id INTEGER,

                    fecha_creacion DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    fecha_surtido DATETIME,

                    FOREIGN KEY (producto_id)
                        REFERENCES productos(id),

                    FOREIGN KEY (insumo_id)
                        REFERENCES insumos(id),

                    FOREIGN KEY (proveedor_id)
                        REFERENCES proveedores(id),

                    FOREIGN KEY (usuario_id)
                        REFERENCES usuarios(id)

                )
            `);


            // =================================================
            // SCM - MOVIMIENTOS LOGÍSTICOS
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS movimientos_logisticos (

                    id INTEGER
                        PRIMARY KEY AUTOINCREMENT,

                    pedido_id INTEGER,

                    tipo TEXT,

                    descripcion TEXT,

                    estado TEXT,

                    usuario_id INTEGER,

                    fecha DATETIME
                        DEFAULT CURRENT_TIMESTAMP,

                    FOREIGN KEY (pedido_id)
                        REFERENCES pedidos(id),

                    FOREIGN KEY (usuario_id)
                        REFERENCES usuarios(id)

                )
            `);


            // =================================================
            // SCM - NIVEL DE MADUREZ
            // =================================================

            db.run(`
                CREATE TABLE IF NOT EXISTS scm_config (

                    id INTEGER
                        PRIMARY KEY,

                    nivel_scm TEXT
                        DEFAULT 'Inicial',

                    fecha_actualizacion DATETIME
                        DEFAULT CURRENT_TIMESTAMP

                )
            `);


            // Configuración inicial del SCM

            db.run(`
                INSERT OR IGNORE INTO scm_config
                (
                    id,
                    nivel_scm
                )
                VALUES
                (
                    1,
                    'Inicial'
                )
            `);


            // =================================================
            // ADMINISTRADOR INICIAL
            // =================================================

            db.get(
                `
                SELECT *
                FROM usuarios
                WHERE correo = ?
                `,
                [
                    'admin@casabarro.com'
                ],
                (errAdmin, row) => {

                    if (errAdmin) {

                        console.error(
                            'Error verificando admin inicial:',
                            errAdmin.message
                        );

                        return;
                    }

                    if (!row) {

                        db.run(
                            `
                            INSERT INTO usuarios
                            (
                                nombre,
                                correo,
                                password,
                                rol,
                                telefono
                            )
                            VALUES (?, ?, ?, ?, ?)
                            `,
                            [
                                'Administrador Maestro',
                                'admin@casabarro.com',
                                'admin123',
                                'admin',
                                '4491234567'
                            ],
                            (errInsert) => {

                                if (!errInsert) {

                                    console.log(
                                        'Cuenta de Admin inicial creada automáticamente.'
                                    );

                                }

                            }
                        );

                    }

                }
            );

        })

    }
);


// ============================================================
// FUNCIÓN CENTRAL DE BITÁCORA
// ============================================================

function registrarActividad(
    usuarioId,
    accion,
    modulo,
    descripcion,
    entidad = null,
    entidadId = null
) {

    if (!usuarioId) return;


    db.get(
        `
        SELECT
            nombre,
            rol
        FROM usuarios
        WHERE id = ?
        `,
        [
            usuarioId
        ],
        (err, usuario) => {

            if (err) {

                console.error(
                    'Error buscando usuario para bitácora:',
                    err.message
                );

                return;
            }


            if (!usuario) {

                console.warn(
                    `No se encontró el usuario ${usuarioId} para registrar actividad.`
                );

                return;
            }


            db.run(
                `
                INSERT INTO bitacora_actividad
                (
                    usuario_id,
                    usuario_nombre,
                    rol,
                    accion,
                    modulo,
                    descripcion,
                    entidad,
                    entidad_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    usuarioId,
                    usuario.nombre,
                    usuario.rol,
                    accion,
                    modulo,
                    descripcion,
                    entidad,
                    entidadId
                ],
                (error) => {

                    if (error) {

                        console.error(
                            'Error registrando actividad:',
                            error.message
                        );

                    }

                }
            );

        }
    );
}


function esRolInterno(rol) {

    return [
        'admin',
        'vendedor',
        'logistica'
    ].includes(rol);

}


// ============================================================
// AUTENTICACIÓN PÚBLICA
// ============================================================

app.post(
    '/api/registro',
    (req, res) => {

        const {
            nombre,
            correo,
            password,
            rol,
            empresa
        } = req.body;


        if (
            !nombre ||
            !correo ||
            !password
        ) {

            return res.status(400).json({
                error: 'Datos incompletos'
            });

        }


        const rolUsuario =
            rol || 'cliente';


        db.run(
            `
            INSERT INTO usuarios
            (
                nombre,
                correo,
                password,
                rol,
                empresa
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                nombre,
                correo,
                password,
                rolUsuario,
                empresa
            ],
            function(err) {

                if (err) {

                    return res.status(400).json({
                        error:
                            'El correo ya está registrado.'
                    });

                }


                const nuevoUsuarioId =
                    this.lastID;


                db.run(
                    `
                    INSERT INTO clientes
                    (
                        nombre,
                        correo,
                        empresa
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        nombre,
                        correo,
                        empresa
                    ],
                    function(errCrm) {

                        if (errCrm) {

                            return res.status(400).json({
                                error:
                                    'No se pudo crear el registro CRM.'
                            });

                        }


                        res.status(201).json({
                            mensaje:
                                'Usuario registrado',

                            id:
                                nuevoUsuarioId
                        });

                    }
                );

            }
        );

    }
);


// ============================================================
// LOGIN
// ============================================================

app.post(
    '/api/login',
    (req, res) => {

        const {
            correo,
            password
        } = req.body;


        if (
            !correo ||
            !password
        ) {

            return res.status(400).json({
                error: 'Datos incompletos'
            });

        }


        db.get(
            `
            SELECT
                id,
                nombre,
                correo,
                rol,
                empresa,
                password,
                telefono

            FROM usuarios

            WHERE
                correo = ?
                AND password = ?
            `,
            [
                correo,
                password
            ],
            (err, row) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                if (!row) {

                    return res.status(401).json({
                        error:
                            'Credenciales incorrectas'
                    });

                }


                if (
                    esRolInterno(
                        row.rol
                    )
                ) {

                    registrarActividad(
                        row.id,
                        'SESION',
                        'Sistema',
                        'Inició sesión en el sistema',
                        'usuario',
                        row.id
                    );

                }


                res.json({
                    mensaje: 'Éxito',
                    usuario: row
                });

            }
        );

    }
);


// ============================================================
// LOGOUT
// ============================================================

app.post(
    '/api/logout',
    (req, res) => {

        const {
            usuario_id
        } = req.body;


        if (usuario_id) {

            registrarActividad(
                usuario_id,
                'SESION',
                'Sistema',
                'Cerró sesión en el sistema',
                'usuario',
                usuario_id
            );

        }


        res.json({
            mensaje:
                'Sesión cerrada'
        });

    }
);


// ============================================================
// GESTIÓN DE PERSONAL
// ============================================================

app.post(
    '/api/personal',
    (req, res) => {

        const {
            nombre,
            correo,
            password,
            rol,
            telefono,
            usuario_id_actor
        } = req.body;


        if (
            !nombre ||
            !correo ||
            !password ||
            !rol
        ) {

            return res.status(400).json({
                error:
                    'Datos incompletos'
            });

        }


        if (
            !esRolInterno(rol)
        ) {

            return res.status(400).json({
                error:
                    'Rol de empleado no válido.'
            });

        }


        db.run(
            `
            INSERT INTO usuarios
            (
                nombre,
                correo,
                password,
                rol,
                telefono
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                nombre,
                correo,
                password,
                rol,
                telefono
            ],
            function(err) {

                if (err) {

                    return res.status(400).json({
                        error:
                            'El correo ya está registrado.'
                    });

                }


                const empleadoId =
                    this.lastID;


                registrarActividad(
                    usuario_id_actor,
                    'ALTA',
                    'Personal',
                    `Registró a ${nombre} con el rol ${rol}`,
                    'usuario',
                    empleadoId
                );


                res.status(201).json({
                    mensaje:
                        'Empleado registrado exitosamente',

                    id:
                        empleadoId
                });

            }
        );

    }
);


// ============================================================
// LISTAR PERSONAL
// ============================================================

app.get(
    '/api/personal',
    (req, res) => {

        db.all(
            `
            SELECT
                id,
                nombre,
                correo,
                rol,
                telefono

            FROM usuarios

            WHERE rol IN (
                'admin',
                'vendedor',
                'logistica'
            )
            `,
            [],
            (err, rows) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                res.json({
                    mensaje: 'Éxito',
                    data: rows
                });

            }
        );

    }
);


// ============================================================
// ACTUALIZAR PERSONAL / PERFIL
// ============================================================

app.put(
    '/api/usuarios/:id',
    (req, res) => {

        const {
            nombre,
            correo,
            password,
            telefono,
            rol,
            usuario_id_actor
        } = req.body;


        const {
            id
        } = req.params;


        db.get(
            `
            SELECT *
            FROM usuarios
            WHERE id = ?
            `,
            [
                id
            ],
            (
                errBuscar,
                usuarioAnterior
            ) => {

                if (errBuscar) {

                    return res.status(500).json({
                        error:
                            errBuscar.message
                    });

                }


                if (!usuarioAnterior) {

                    return res.status(404).json({
                        error:
                            'Usuario no encontrado'
                    });

                }


                const passwordFinal =
                    password &&
                    password.trim() !== ''

                        ? password

                        : usuarioAnterior.password;


                const rolFinal =
                    rol ||
                    usuarioAnterior.rol;


                if (
                    rol &&
                    !esRolInterno(rol)
                ) {

                    return res.status(400).json({
                        error:
                            'Rol de empleado no válido.'
                    });

                }


                db.run(
                    `
                    UPDATE usuarios

                    SET
                        nombre = ?,
                        correo = ?,
                        password = ?,
                        telefono = ?,
                        rol = ?

                    WHERE id = ?
                    `,
                    [
                        nombre,
                        correo,
                        passwordFinal,
                        telefono,
                        rolFinal,
                        id
                    ],
                    function(errActualizar) {

                        if (errActualizar) {

                            return res.status(500).json({
                                error:
                                    errActualizar.message
                            });

                        }


                        const actorId =
                            usuario_id_actor ||
                            Number(id);


                        const esPerfilPropio =
                            Number(actorId) ===
                            Number(id)
                            &&
                            !rol;


                        registrarActividad(
                            actorId,
                            'EDICION',

                            esPerfilPropio
                                ? 'Configuración'
                                : 'Personal',

                            esPerfilPropio

                                ? 'Actualizó la configuración de su cuenta'

                                : `Actualizó los datos de ${nombre}`,

                            'usuario',

                            Number(id)
                        );


                        res.json({
                            mensaje:
                                'Usuario actualizado exitosamente'
                        });

                    }
                );

            }
        );

    }
);


// ============================================================
// ELIMINAR PERSONAL
// ============================================================

app.delete(
    '/api/usuarios/:id',
    (req, res) => {

        const {
            usuario_id_actor
        } = req.body || {};


        const targetId =
            Number(
                req.params.id
            );


        if (
            usuario_id_actor &&
            Number(usuario_id_actor) ===
            targetId
        ) {

            return res.status(400).json({
                error:
                    'No puedes eliminar tu propia cuenta desde este panel.'
            });

        }


        db.get(
            `
            SELECT
                nombre,
                rol

            FROM usuarios

            WHERE id = ?
            `,
            [
                targetId
            ],
            (
                errBuscar,
                empleado
            ) => {

                if (errBuscar) {

                    return res.status(500).json({
                        error:
                            errBuscar.message
                    });

                }


                if (!empleado) {

                    return res.status(404).json({
                        error:
                            'Empleado no encontrado'
                    });

                }


                db.run(
                    `
                    DELETE FROM usuarios
                    WHERE id = ?
                    `,
                    [
                        targetId
                    ],
                    function(errEliminar) {

                        if (errEliminar) {

                            return res.status(500).json({
                                error:
                                    errEliminar.message
                            });

                        }


                        registrarActividad(
                            usuario_id_actor,
                            'BAJA',
                            'Personal',
                            `Eliminó a ${empleado.nombre} (${empleado.rol})`,
                            'usuario',
                            targetId
                        );


                        res.json({
                            mensaje:
                                'Empleado eliminado correctamente'
                        });

                    }
                );

            }
        );

    }
);


// ============================================================
// CRM - CREAR CLIENTE
// ============================================================

app.post(
    '/api/clientes',
    (req, res) => {

        const {
            nombre,
            correo,
            telefono,
            empresa,
            password,
            usuario_id
        } = req.body;


        if (
            !nombre ||
            !correo ||
            !password
        ) {

            return res.status(400).json({
                error:
                    'Nombre, correo y contraseña obligatorios'
            });

        }


        db.run(
            `
            INSERT INTO clientes
            (
                nombre,
                correo,
                telefono,
                empresa
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                nombre,
                correo,
                telefono,
                empresa
            ],
            function(err) {

                if (err) {

                    return res.status(400).json({
                        error:
                            'El correo ya existe en el CRM'
                    });

                }


                const nuevoClienteId =
                    this.lastID;


                db.run(
                    `
                    INSERT INTO usuarios
                    (
                        nombre,
                        correo,
                        password,
                        rol,
                        empresa,
                        telefono
                    )
                    VALUES (?, ?, ?, 'cliente', ?, ?)
                    `,
                    [
                        nombre,
                        correo,
                        password,
                        empresa,
                        telefono
                    ],
                    function(errUser) {

                        if (errUser) {

                            return res.status(400).json({
                                error:
                                    'No se pudo crear el acceso del cliente.'
                            });

                        }


                        if (usuario_id) {

                            db.run(
                                `
                                INSERT INTO interacciones
                                (
                                    cliente_id,
                                    usuario_id,
                                    tipo,
                                    descripcion
                                )
                                VALUES
                                (
                                    ?,
                                    ?,
                                    'Registro',
                                    'Alta de nuevo cliente en el sistema CRM.'
                                )
                                `,
                                [
                                    nuevoClienteId,
                                    usuario_id
                                ]
                            );


                            registrarActividad(
                                usuario_id,
                                'ALTA',
                                'Clientes',
                                `Registró al cliente ${nombre}`,
                                'cliente',
                                nuevoClienteId
                            );

                        }


                        res.status(201).json({
                            mensaje:
                                'Cliente creado exitosamente',

                            id:
                                nuevoClienteId
                        });

                    }
                );

            }
        );

    }
);


// ============================================================
// CRM - ACTUALIZAR CLIENTE
// ============================================================

app.put(
    '/api/clientes/:id',
    (req, res) => {

        const {
            nombre,
            correo,
            telefono,
            empresa,
            etapa_crm,
            estado,
            usuario_id
        } = req.body;


        const clienteId =
            Number(
                req.params.id
            );


        db.get(
            `
            SELECT *
            FROM clientes
            WHERE id = ?
            `,
            [
                clienteId
            ],
            (
                errBuscar,
                clienteAnterior
            ) => {

                if (errBuscar) {

                    return res.status(500).json({
                        error:
                            errBuscar.message
                    });

                }


                if (!clienteAnterior) {

                    return res.status(404).json({
                        error:
                            'Cliente no encontrado'
                    });

                }


                db.run(
                    `
                    UPDATE clientes

                    SET
                        nombre = ?,
                        correo = ?,
                        telefono = ?,
                        empresa = ?,
                        etapa_crm = ?,
                        estado = ?

                    WHERE id = ?
                    `,
                    [
                        nombre,
                        correo,
                        telefono,
                        empresa,
                        etapa_crm,
                        estado,
                        clienteId
                    ],
                    function(errActualizar) {

                        if (errActualizar) {

                            return res.status(500).json({
                                error:
                                    errActualizar.message
                            });

                        }


                        registrarActividad(
                            usuario_id,
                            'EDICION',
                            'Clientes',
                            `Actualizó los datos del cliente ${nombre}`,
                            'cliente',
                            clienteId
                        );


                        res.json({
                            mensaje:
                                'Actualizado'
                        });

                    }
                );

            }
        );

    }
);


// ============================================================
// CRM - ELIMINAR CLIENTE
// ============================================================

app.delete(
    '/api/clientes/:id',
    (req, res) => {

        const {
            usuario_id
        } = req.body || {};


        const clienteId =
            Number(
                req.params.id
            );


        db.get(
            `
            SELECT nombre
            FROM clientes
            WHERE id = ?
            `,
            [
                clienteId
            ],
            (
                errBuscar,
                cliente
            ) => {

                if (errBuscar) {

                    return res.status(500).json({
                        error:
                            errBuscar.message
                    });

                }


                if (!cliente) {

                    return res.status(404).json({
                        error:
                            'Cliente no encontrado'
                    });

                }


                db.run(
                    `
                    DELETE FROM clientes
                    WHERE id = ?
                    `,
                    [
                        clienteId
                    ],
                    function(errEliminar) {

                        if (errEliminar) {

                            return res.status(500).json({
                                error:
                                    errEliminar.message
                            });

                        }


                        registrarActividad(
                            usuario_id,
                            'BAJA',
                            'Clientes',
                            `Eliminó al cliente ${cliente.nombre}`,
                            'cliente',
                            clienteId
                        );


                        res.json({
                            mensaje:
                                'Cliente eliminado correctamente'
                        });

                    }
                );

            }
        );

    }
);


// ============================================================
// CRM - LISTAR CLIENTES
// ============================================================

app.get(
    '/api/clientes',
    (req, res) => {

        const sql = `
            SELECT c.*

            FROM clientes c

            LEFT JOIN usuarios u
                ON c.correo = u.correo

            WHERE
                u.rol = 'cliente'
                OR u.rol IS NULL
        `;


        db.all(
            sql,
            [],
            (err, rows) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                res.json({
                    mensaje: 'Éxito',
                    data: rows
                });

            }
        );

    }
);


// ============================================================
// CRM - OBTENER CLIENTE
// ============================================================

app.get(
    '/api/clientes/:id',
    (req, res) => {

        db.get(
            `
            SELECT *
            FROM clientes
            WHERE id = ?
            `,
            [
                req.params.id
            ],
            (err, row) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                if (!row) {

                    return res.status(404).json({
                        error:
                            'Cliente no encontrado'
                    });

                }


                res.json({
                    mensaje: 'Éxito',
                    data: row
                });

            }
        );

    }
);


// ============================================================
// CRM - REGISTRAR INTERACCIÓN
// ============================================================

app.post(
    '/api/interacciones',
    (req, res) => {

        const {
            cliente_id,
            usuario_id,
            tipo,
            descripcion
        } = req.body;


        if (
            !cliente_id ||
            !usuario_id ||
            !tipo
        ) {

            return res.status(400).json({
                error:
                    'Datos de interacción incompletos'
            });

        }


        db.run(
            `
            INSERT INTO interacciones
            (
                cliente_id,
                usuario_id,
                tipo,
                descripcion
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                cliente_id,
                usuario_id,
                tipo,
                descripcion
            ],
            function(err) {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                db.get(
                    `
                    SELECT nombre
                    FROM clientes
                    WHERE id = ?
                    `,
                    [
                        cliente_id
                    ],
                    (
                        errCliente,
                        cliente
                    ) => {

                        const nombreCliente =
                            cliente

                                ? cliente.nombre

                                : `#${cliente_id}`;


                        registrarActividad(
                            usuario_id,
                            'CRM',
                            'Clientes',

                            `Registró ${String(tipo).toLowerCase()} con ${nombreCliente}${
                                descripcion
                                    ? `: ${descripcion}`
                                    : ''
                            }`,

                            'cliente',

                            Number(
                                cliente_id
                            )
                        );

                    }
                );


                res.status(201).json({
                    mensaje:
                        'Contacto registrado'
                });

            }
        );

    }
);


// ============================================================
// CRM - HISTORIAL DE CLIENTE
// ============================================================

app.get(
    '/api/clientes/:id/interacciones',
    (req, res) => {

        db.all(
            `
            SELECT *
            FROM interacciones
            WHERE cliente_id = ?
            ORDER BY fecha DESC
            `,
            [
                req.params.id
            ],
            (err, rows) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                res.json({
                    mensaje: 'Éxito',
                    data: rows
                });

            }
        );

    }
);


// ============================================================
// CRM - MÉTRICAS
// ============================================================

app.get(
    '/api/metricas-crm',
    (req, res) => {

        const baseJoin = `
            FROM clientes c

            LEFT JOIN usuarios u
                ON c.correo = u.correo

            WHERE
                (
                    u.rol = 'cliente'
                    OR u.rol IS NULL
                )
        `;


        db.get(
            `
            SELECT COUNT(c.id) AS total
            ${baseJoin}
            `,
            [],
            (err, rowTotal) => {

                db.get(
                    `
                    SELECT COUNT(c.id) AS activos
                    ${baseJoin}

                    AND c.etapa_crm
                    IN (
                        'Activo',
                        'Frecuente'
                    )
                    `,
                    [],
                    (
                        err,
                        rowActivos
                    ) => {

                        db.get(
                            `
                            SELECT COUNT(c.id) AS inactivos
                            ${baseJoin}

                            AND c.etapa_crm
                            IN (
                                'Prospecto',
                                'Inactivo'
                            )
                            `,
                            [],
                            (
                                err,
                                rowInactivos
                            ) => {

                                db.get(
                                    `
                                    SELECT COUNT(*) AS total_interacciones
                                    FROM interacciones
                                    `,
                                    [],
                                    (
                                        err,
                                        rowInteracciones
                                    ) => {

                                        db.all(
                                            `
                                            SELECT
                                                c.nombre,
                                                c.etapa_crm

                                            ${baseJoin}

                                            AND c.etapa_crm
                                            IN (
                                                'Prospecto',
                                                'Inactivo'
                                            )

                                            LIMIT 4
                                            `,
                                            [],
                                            (
                                                err,
                                                rowsRiesgo
                                            ) => {

                                                res.json({

                                                    mensaje:
                                                        'Éxito',

                                                    total:
                                                        rowTotal
                                                            ? rowTotal.total
                                                            : 0,

                                                    activos:
                                                        rowActivos
                                                            ? rowActivos.activos
                                                            : 0,

                                                    inactivos:
                                                        rowInactivos
                                                            ? rowInactivos.inactivos
                                                            : 0,

                                                    interacciones_totales:
                                                        rowInteracciones
                                                            ? rowInteracciones.total_interacciones
                                                            : 0,

                                                    listaRiesgo:
                                                        rowsRiesgo || []

                                                });

                                            }
                                        );

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


// ============================================================
// CRM - MIS INTERACCIONES
// ============================================================

app.get(
    '/api/mis-interacciones/:usuario_id',
    (req, res) => {

        const sql = `
            SELECT
                i.*,
                c.nombre AS cliente_nombre

            FROM interacciones i

            LEFT JOIN clientes c
                ON i.cliente_id = c.id

            WHERE i.usuario_id = ?

            ORDER BY i.fecha DESC
        `;


        db.all(
            sql,
            [
                req.params.usuario_id
            ],
            (err, rows) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                res.json({
                    mensaje: 'Éxito',
                    data: rows
                });

            }
        );

    }
);


// ============================================================
// BITÁCORA - MI ACTIVIDAD
// ============================================================

app.get(
    '/api/mis-actividades/:usuario_id',
    (req, res) => {

        const sql = `
            SELECT
                id,
                usuario_id,
                usuario_nombre,
                rol,
                accion,
                modulo,
                descripcion,
                entidad,
                entidad_id,
                fecha

            FROM bitacora_actividad

            WHERE usuario_id = ?

            ORDER BY
                fecha DESC,
                id DESC
        `;


        db.all(
            sql,
            [
                req.params.usuario_id
            ],
            (err, rows) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                res.json({
                    mensaje: 'Éxito',
                    data: rows
                });

            }
        );

    }
);


// ============================================================
// CATÁLOGO / PRODUCTOS
// ============================================================

app.get(
    '/api/productos',
    (req, res) => {

        db.all(
            `
            SELECT *
            FROM productos
            WHERE estado = 'disponible'
            `,
            [],
            (err, rows) => {

                if (err) {

                    return res.status(500).json({
                        error: err.message
                    });

                }


                res.json({
                    mensaje: 'Éxito',
                    data: rows
                });

            }
        );

    }
);


// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Servidor corriendo en http://localhost:${PORT}`
        );

    }
);