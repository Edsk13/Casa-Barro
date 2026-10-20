// 1. INYECCIÓN DE COMPONENTES
async function cargarComponente(id, ruta) {
    const contenedor = document.getElementById(id);
    // Si la página no utiliza este componente, no hacemos nada.
    if (!contenedor) return;
    try {
        const respuesta = await fetch(ruta, {
            cache: "no-store"
        });
        if (!respuesta.ok) {
            throw new Error(
                `No se pudo cargar ${ruta}. HTTP ${respuesta.status}`
            );
        }
        const html = await respuesta.text();
        contenedor.innerHTML = html;
        console.log(`Componente cargado correctamente: ${ruta}`);
    } catch (error) {
        console.error(
            `Error cargando el componente ${ruta}:`,
            error
        );
    }
}

// 2. SISTEMA DE CARRITO PERSISTENTE Y DESCUENTOS
let carrito = JSON.parse(localStorage.getItem('casaBarro_carrito')) || [];
let propinaPorcentaje = 0;
let cuponAplicado = JSON.parse(localStorage.getItem('casaBarro_cupon')) || null;

window.mostrarProximamente = function() { Swal.fire({ title: '¡Próximamente!', text: 'Función disponible muy pronto.', icon: 'info', confirmButtonText: 'Entendido', confirmButtonColor: '#3c4a45' }); }
window.aplicarDescuento = function(codigo, porcentaje) { cuponAplicado = { codigo, porcentaje }; localStorage.setItem('casaBarro_cupon', JSON.stringify(cuponAplicado)); Swal.fire({ icon: 'success', title: '¡Aplicado!', text: `Cupón ${codigo} reflejado.`, confirmButtonColor: '#3c4a45' }).then(() => window.location.href = 'carrito.html'); }
window.mostrarPoliticas = function() { Swal.fire({ title: 'Políticas', html: `<p style="text-align:justify;">Cancelaciones no permitidas una vez en preparación...</p>`, confirmButtonColor: '#3c4a45' }); }
window.actualizarUI = function() { const cartCountElement = document.getElementById('cart-count'); if (cartCountElement) cartCountElement.innerText = carrito.reduce((t, i) => t + i.cantidad, 0); }
window.cambiarCantidad = function(cambio) { let el = document.getElementById('swal-cantidad'); let nueva = parseInt(el.innerText) + cambio; if (nueva >= 1) el.innerText = nueva; }
window.cambiarCantidadCarrito = function(index, cambio) { if (carrito[index].cantidad + cambio >= 1) { carrito[index].cantidad += cambio; localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito)); actualizarUI(); renderizarCarrito(); } }

window.confirmarAgregarAlCarrito = async function(
    nombre,
    precio,
    productoId = null
) {

    /*
    Si viene de un producto de la base de datos,
    verificamos nuevamente la disponibilidad real
    antes de agregarlo.
    */

    if (productoId) {

        try {

            const respuesta = await fetch(
                `http://localhost:3000/api/productos/${productoId}/disponibilidad`,
                {
                    cache: 'no-store'
                }
            );

            const resultado =
                await respuesta.json();

            if (!respuesta.ok) {

                throw new Error(
                    resultado.error ||
                    'No se pudo comprobar la disponibilidad.'
                );
            }

            const disponibles =
                Number(
                    resultado.disponibles || 0
                );

            if (disponibles <= 0) {

                return Swal.fire({

                    icon: 'warning',

                    title: 'Producto agotado',

                    text:
                        'Este producto ya no tiene disponibilidad suficiente para agregarse al carrito.',

                    confirmButtonColor:
                        '#3c4a45'
                });
            }

        } catch (error) {

            console.error(
                'Error comprobando disponibilidad:',
                error
            );

            return Swal.fire({

                icon: 'error',

                title:
                    'No se pudo comprobar la disponibilidad',

                text:
                    'Intenta nuevamente.',

                confirmButtonColor:
                    '#3c4a45'
            });
        }
    }

    const cantidad =
        parseInt(
            document.getElementById(
                'swal-cantidad'
            ).innerText
        );

    const opt =
        document.getElementById(
            'swal-opciones'
        )
            ? document.getElementById(
                'swal-opciones'
              ).value
            : null;

    const ext =
        document.getElementById(
            'swal-extras'
        )
            ? document.getElementById(
                'swal-extras'
              ).value
            : null;

    const stringOpcion =
        [opt, ext]
            .filter(Boolean)
            .join(' + ') ||
        null;

    carrito.push({

        producto:
            nombre,

        precio:
            precio,

        cantidad:
            cantidad,

        opcion:
            stringOpcion,

        producto_id:
            productoId
                ? Number(productoId)
                : null
    });

    localStorage.setItem(
        'casaBarro_carrito',
        JSON.stringify(carrito)
    );

    actualizarUI();

    Swal.fire({

        toast:
            true,

        position:
            'top-end',

        icon:
            'success',

        title:
            'Agregado al carrito',

        showConfirmButton:
            false,

        timer:
            1500
    });
}

window.cambiarPropina = function(porcentaje) { propinaPorcentaje = porcentaje; renderizarCarrito(); }

window.vaciarCarrito = function() {
    Swal.fire({ title: '¿Vaciar carrito?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí' }).then((res) => {
        if (res.isConfirmed) { carrito = []; localStorage.removeItem('casaBarro_carrito'); cuponAplicado = null; localStorage.removeItem('casaBarro_cupon'); actualizarUI(); renderizarCarrito(); }
    });
}

window.removerDescuento = function() { cuponAplicado = null; localStorage.removeItem('casaBarro_cupon'); renderizarCarrito(); }

window.validarCuponManual = function() {
    let input = document.getElementById('input-cupon').value.trim().toUpperCase(); 
    if (!input) return Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Escribe un código', showConfirmButton: false, timer: 2000 });
    let pct = input === 'MAÑANAS15' ? 10 : input === 'VIERNES20' ? 20 : input === 'SOYCLIENTE15' ? 15 : 0;
    if (pct === 0) return Swal.fire({ icon: 'error', title: 'Cupón inválido', confirmButtonColor: '#3c4a45' });
    cuponAplicado = { codigo: input, porcentaje: pct };
    localStorage.setItem('casaBarro_cupon', JSON.stringify(cuponAplicado)); renderizarCarrito(); 
}

window.renderizarCarrito = function() {
    const contenedor = document.getElementById('carrito-contenido');
    if (!contenedor) return; 
    if (carrito.length === 0) {
        contenedor.innerHTML = `<div class="carrito-vacio"><h2 style="color:var(--verde-logo);">Tu pedido está vacío</h2><a href="catalogo.html" class="btn-primary" style="display:inline-block; text-decoration:none; margin-top:15px;">Ver Menú</a></div>`;
        return;
    }
    let htmlItems = '<div class="carrito-grid"><div class="carrito-items"><div style="text-align: right; margin-bottom: 15px;"><button class="btn-eliminar" onclick="vaciarCarrito()">Vaciar carrito</button></div>';
    let subtotal = 0;
    carrito.forEach((item, index) => {
        const totalItem = item.precio * item.cantidad; subtotal += totalItem;
        const infoOpcion = item.opcion ? `<p style="font-size:0.85rem; color:#777; margin-bottom: 8px;">Opción: ${item.opcion}</p>` : '';
        htmlItems += `
            <div class="item-carrito" style="align-items: center;">
                <div style="flex-grow: 1;"><h4 style="color:var(--verde-logo); font-size: 1.1rem; margin-bottom: 5px;">${item.producto}</h4>${infoOpcion}<p style="font-size:1rem; color: #557268; font-weight:bold;">$${item.precio.toFixed(2)}</p></div>
                <div style="display: flex; align-items: center; gap: 12px; margin: 0 20px;"><button onclick="cambiarCantidadCarrito(${index}, -1)" style="background: #eae5db; border:none; border-radius:5px; width:30px; height:30px; cursor:pointer; font-weight:bold; color:#3c4a45; font-size: 1.2rem;">-</button><span style="font-weight:bold; font-size: 1.1rem; min-width: 20px; text-align: center;">${item.cantidad}</span><button onclick="cambiarCantidadCarrito(${index}, 1)" style="background: var(--verde-logo); border:none; border-radius:5px; width:30px; height:30px; cursor:pointer; font-weight:bold; color:white; font-size: 1.2rem;">+</button></div>
                <div style="text-align:right; min-width: 90px;"><p style="font-weight:bold; font-size: 1.2rem; color:#3c4a45; margin-bottom:10px;">$${totalItem.toFixed(2)}</p><button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">Quitar</button></div>
            </div>`;
    });
    htmlItems += '</div>';

    let montoDescuento = cuponAplicado ? subtotal * (cuponAplicado.porcentaje / 100) : 0;
    let htmlDescuento = cuponAplicado ? `<div style="display:flex; justify-content:space-between; margin-bottom:15px; color: #b7410e; font-weight: bold;"><span>Descuento (${cuponAplicado.codigo} - ${cuponAplicado.porcentaje}%):</span><span>-$${montoDescuento.toFixed(2)}</span></div><div style="text-align: right; margin-bottom: 15px;"><button onclick="removerDescuento()" style="background:none; border:none; color:#777; font-size:0.8rem; text-decoration:underline; cursor:pointer;">Quitar cupón</button></div>` : `<div style="margin-bottom: 20px;"><p style="color: #555; margin-bottom: 8px; font-size: 0.95rem;">¿Tienes un código de descuento?</p><div style="display: flex; gap: 10px;"><input type="text" id="input-cupon" placeholder="Ej. VIERNES20" style="flex:1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.95rem; outline: none; font-family: inherit; text-transform: uppercase;"><button onclick="validarCuponManual()" class="btn-primary" style="padding: 8px 15px; border-radius: 8px; font-size: 0.95rem;">Aplicar</button></div></div>`;
    let subtotalConDescuento = subtotal - montoDescuento;
    let propinaCalculada = subtotalConDescuento * (propinaPorcentaje / 100);
    let totalFinal = subtotalConDescuento + propinaCalculada;

    localStorage.setItem('casaBarro_totalFinal', totalFinal.toFixed(2));
    htmlItems += `<div class="resumen-carrito"><h3 style="color:var(--verde-logo); margin-bottom:20px; font-size: 1.3rem;">Resumen de Compra</h3><div style="display:flex; justify-content:space-between; margin-bottom:15px; color: #555;"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>${htmlDescuento}<div style="margin-bottom: 15px;"><p style="color: #555; margin-bottom: 8px; font-size: 0.95rem;">¿Deseas agregar propina?</p><div style="display: flex; gap: 8px;"><button onclick="cambiarPropina(0)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 0 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 0 ? 'white' : 'var(--verde-logo)'}; cursor: pointer;">0%</button><button onclick="cambiarPropina(10)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 10 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 10 ? 'white' : 'var(--verde-logo)'}; cursor: pointer;">10%</button><button onclick="cambiarPropina(15)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 15 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 15 ? 'white' : 'var(--verde-logo)'}; cursor: pointer;">15%</button><button onclick="cambiarPropina(20)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 20 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 20 ? 'white' : 'var(--verde-logo)'}; cursor: pointer;">20%</button></div></div><div style="display:flex; justify-content:space-between; margin-bottom:15px; color: #555;"><span>Propina (${propinaPorcentaje}%):</span><span>$${propinaCalculada.toFixed(2)}</span></div><div style="display:flex; justify-content:space-between; margin-top:20px; padding-top: 15px; border-top: 2px dashed #eae5db; font-weight:bold; font-size:1.4rem; color: var(--verde-logo);"><span>Total:</span><span>$${totalFinal.toFixed(2)}</span></div><button class="btn-primary" style="width:100%; margin-top: 25px; border-radius: 8px;" onclick="window.location.href='pago.html'">Ir a pagar</button></div></div>`;
    contenedor.innerHTML = htmlItems;
}

window.eliminarDelCarrito = function(index) { carrito.splice(index, 1); localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito)); actualizarUI(); renderizarCarrito(); }

window.abrirDetalleMejorado = function(
    nombre,
    descripcion,
    precioStr,
    imagenUrl,
    alineacion = 'center',
    opcionesStr = '',
    extrasStr = '',
    productoId = null,
    disponible = true
) {

    const precioNum =
        parseFloat(
            precioStr
                .replace('$', '')
                .replace(' MXN', '')
        );

    let opcionesHtml =
        '';

    if (opcionesStr) {

        opcionesHtml += `
            <select
                id="swal-opciones"
                class="swal2-select"
                style="
                    display:flex;
                    width:100%;
                    margin:10px 0
                    ${extrasStr ? '10px' : '20px'}
                    0;
                    font-size:1rem;
                "
            >

                ${
                    opcionesStr
                        .split(',')
                        .map(
                            (op, i) => `
                                <option
                                    value="${op.trim()}"
                                    ${i === 0 ? 'selected' : ''}
                                >
                                    ${op.trim()}
                                </option>
                            `
                        )
                        .join('')
                }

            </select>
        `;
    }

    if (extrasStr) {

        opcionesHtml += `
            <select
                id="swal-extras"
                class="swal2-select"

                style="
                    display:flex;
                    width:100%;
                    margin:0 0 20px 0;
                    font-size:1rem;
                "
            >

                ${
                    extrasStr
                        .split(',')
                        .map(
                            (ex, i) => `
                                <option
                                    value="${ex.trim()}"
                                    ${i === 0 ? 'selected' : ''}
                                >
                                    ${ex.trim()}
                                </option>
                            `
                        )
                        .join('')
                }

            </select>
        `;
    }

    const nombreSeguroJS =
        String(nombre)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'");

    let controlesCompra =
        '';

    if (disponible) {

        controlesCompra = `

            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:20px;
                    margin-bottom:25px;
                "
            >

                <button
                    onclick="cambiarCantidad(-1)"

                    style="
                        background-color:#eae5db;
                        border:none;
                        border-radius:50%;
                        width:40px;
                        height:40px;
                        font-size:1.5rem;
                        cursor:pointer;
                        color:#3c4a45;
                    "
                >
                    -
                </button>

                <span
                    id="swal-cantidad"

                    style="
                        font-size:1.4rem;
                        font-weight:bold;
                        min-width:30px;
                    "
                >
                    1
                </span>

                <button
                    onclick="cambiarCantidad(1)"

                    style="
                        background-color:var(--verde-logo);
                        border:none;
                        border-radius:50%;
                        width:40px;
                        height:40px;
                        font-size:1.5rem;
                        cursor:pointer;
                        color:white;
                    "
                >
                    +
                </button>

            </div>

            <button
                onclick="
                    confirmarAgregarAlCarrito(
                        '${nombreSeguroJS}',
                        ${precioNum},
                        ${
                            productoId
                                ? Number(productoId)
                                : 'null'
                        }
                    )
                "

                class="btn-primary"

                style="
                    width:100%;
                    padding:12px;
                    border-radius:30px;
                    margin-bottom:25px;
                "
            >
                Agregar al carrito
            </button>
        `;

    } else {

        controlesCompra = `

            <div
                style="
                    background:#eee;
                    color:#777;
                    padding:12px;
                    border-radius:10px;
                    text-align:center;
                    font-weight:bold;
                    margin:10px 0 20px 0;
                "
            >
                Producto agotado
            </div>

            <button
                disabled

                style="
                    width:100%;
                    padding:12px;
                    border:none;
                    border-radius:30px;
                    margin-bottom:25px;
                    background:#aaa;
                    color:white;
                    cursor:not-allowed;
                    font-weight:bold;
                "
            >
                No disponible
            </button>
        `;
    }

    Swal.fire({

        title:
            nombre,

        html: `

            <img
                src="${imagenUrl}"
                alt="${nombre}"

                style="
                    width:100%;
                    height:250px;
                    object-fit:cover;
                    object-position:${alineacion};
                    border-radius:12px;
                    margin-bottom:15px;
                "
            >

            <p
                style="
                    text-align:justify;
                    margin-bottom:15px;
                    color:#555;
                "
            >
                ${descripcion}
            </p>

            <h3
                style="
                    color:#3c4a45;
                    font-size:1.8rem;
                    margin-bottom:10px;
                "
            >
                ${precioStr}
            </h3>

            ${opcionesHtml}

            ${controlesCompra}
        `,

        showConfirmButton:
            false,

        showCloseButton:
            true,

        width:
            '480px'
    });
}

// ============================================================
// CATÁLOGO DINÁMICO
// ============================================================

let catalogoProductosCache = [];

function normalizarTextoCatalogo(texto) {

    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function obtenerClaseEtiquetaCatalogo(tipo) {

    switch (
        String(tipo || '')
            .toLowerCase()
    ) {

        case 'vendido':
            return 'badge-vendido';

        case 'oferta':
            return 'badge-oferta';

        case 'nuevo':
            return 'badge-nuevo';

        default:
            return '';
    }
}

function abrirDetalleProductoBD(productoId) {

    const producto =
        catalogoProductosCache.find(
            item =>
                Number(item.id) ===
                Number(productoId)
        );

    if (!producto) {
        return;
    }

    const grupos =
        Array.isArray(producto.grupos)
            ? producto.grupos
            : [];

    const opcionesStr =
        grupos[0]?.opciones
            ?.map(opcion =>
                opcion.nombre
            )
            .join(', ')
        || '';

    const extrasStr =
        grupos[1]?.opciones
            ?.map(opcion =>
                opcion.nombre
            )
            .join(', ')
        || '';

    const precio =
        `$${Number(
            producto.precio || 0
        ).toFixed(2)} MXN`;

    const estaDisponible =
    producto.estado === 'disponible' &&
    Number(producto.stock_actual || 0) > 0;

        abrirDetalleMejorado(
            producto.nombre,
            producto.descripcion || '',
            precio,
            producto.imagen,
            producto.imagen_posicion || 'center',
            opcionesStr,
            extrasStr,
            producto.id,
            estaDisponible
        );
}

function crearTarjetaCatalogo(producto) {

    const tarjeta =
        document.createElement('div');

    tarjeta.className =
        'tarjeta-producto';

    const grupos =
        Array.isArray(producto.grupos)
            ? producto.grupos
            : [];

    const nombresOpciones =
        grupos
            .flatMap(grupo =>
                (grupo.opciones || [])
                    .map(opcion =>
                        opcion.nombre
                    )
            )
            .join(' ');

    tarjeta.dataset.nombre =
        normalizarTextoCatalogo(
            `
            ${producto.nombre}
            ${producto.descripcion || ''}
            ${producto.categoria || ''}
            ${nombresOpciones}
            `
        );

    const posicion =
        ['top', 'center', 'bottom']
            .includes(
                producto.imagen_posicion
            )
            ? producto.imagen_posicion
            : 'center';

    let etiquetaHtml =
        '';

    if (
        producto.etiqueta &&
        producto.etiqueta_tipo
    ) {

        const clase =
            obtenerClaseEtiquetaCatalogo(
                producto.etiqueta_tipo
            );

        if (clase) {

            etiquetaHtml = `
                <div
                    class="
                        badge-etiqueta
                        ${clase}
                    "
                >
                    ${
                        escaparHtmlSCM(
                            producto.etiqueta
                        )
                    }
                </div>
            `;
        }
    }

    const agotado =
    producto.estado === 'agotado' ||
    Number(producto.stock_actual || 0) <= 0;

const agotadoHtml =
    agotado
        ? `
            <div
                style="
                    position:absolute;
                    bottom:70px;
                    left:12px;
                    background:#555;
                    color:white;
                    padding:5px 10px;
                    border-radius:12px;
                    font-size:.8rem;
                    font-weight:bold;
                    z-index:2;
                "
            >
                Agotado
            </div>
          `
        : '';

    tarjeta.innerHTML = `

        ${agotadoHtml}
        ${etiquetaHtml}
        if (agotado) {
            tarjeta.style.opacity = '0.75';
        }
        <img
            src="${
                escaparHtmlSCM(
                    producto.imagen
                )
            }"

            alt="${
                escaparHtmlSCM(
                    producto.nombre
                )
            }"

            style="
                object-position:
                ${posicion};
            "
        >

        <div class="info-producto">

            <h3>
                ${
                    escaparHtmlSCM(
                        producto.nombre
                    )
                }
            </h3>

            <p class="precio">
                $${Number(
                    producto.precio || 0
                ).toFixed(2)} MXN
            </p>

        </div>
    `;

    tarjeta.addEventListener(
        'click',
        () =>
            abrirDetalleProductoBD(
                producto.id
            )
    );

    return tarjeta;
}

function filtrarCatalogoBD() {

    const buscador =
        document.getElementById(
            'buscador-productos'
        );

    const filtroCategoria =
        document.getElementById(
            'filtro-categoria'
        );

    if (
        !buscador ||
        !filtroCategoria
    ) {
        return;
    }

    const texto =
        normalizarTextoCatalogo(
            buscador.value.trim()
        );

    const categoria =
        filtroCategoria.value;

    document
        .querySelectorAll(
            '.seccion-categoria'
        )
        .forEach(seccion => {

            const categoriaSeccion =
                seccion.dataset.categoria;

            const mostrarCategoria =
                categoria === 'todos' ||
                categoria ===
                    categoriaSeccion;

            let visibles =
                0;

            seccion
                .querySelectorAll(
                    '.tarjeta-producto'
                )
                .forEach(tarjeta => {

                    const coincideTexto =
                        (
                            tarjeta.dataset.nombre ||
                            ''
                        ).includes(texto);

                    const mostrar =
                        mostrarCategoria &&
                        coincideTexto;

                    tarjeta.style.display =
                        mostrar
                            ? ''
                            : 'none';

                    if (mostrar) {
                        visibles++;
                    }
                });

            seccion.style.display =
                visibles > 0
                    ? ''
                    : 'none';
        });
}

async function cargarProductosBD() {

    const contenedores = {

        alimentos:
            document.getElementById(
                'catalogo-alimentos'
            ),

        calientes:
            document.getElementById(
                'catalogo-calientes'
            ),

        frias:
            document.getElementById(
                'catalogo-frias'
            ),

        postres:
            document.getElementById(
                'catalogo-postres'
            )
    };

    if (
        !Object.values(contenedores)
            .some(Boolean)
    ) {
        return;
    }

    try {

        const respuesta =
            await fetch(
                'http://localhost:3000/api/catalogo/productos',
                {
                    cache: 'no-store'
                }
            );

        const resultado =
            await respuesta.json();

        if (!respuesta.ok) {

            throw new Error(
                resultado.error ||
                'No se pudo cargar el catálogo.'
            );
        }

        catalogoProductosCache =
            resultado.data || [];

        Object.values(
            contenedores
        ).forEach(contenedor => {

            if (contenedor) {
                contenedor.innerHTML =
                    '';
            }
        });

        catalogoProductosCache
            .forEach(producto => {

                const categoria =
                    normalizarCategoriaMenu(
                        producto.categoria
                    );

                const contenedor =
                    contenedores[
                        categoria
                    ];

                if (!contenedor) {

                    console.warn(
                        `Categoría no reconocida: ${producto.categoria}`
                    );

                    return;
                }

                contenedor.appendChild(
                    crearTarjetaCatalogo(
                        producto
                    )
                );
            });

        /*
        Ocultar categorías que no tengan
        productos publicados.
        */

        document
            .querySelectorAll(
                '.seccion-categoria'
            )
            .forEach(seccion => {

                const tarjetas =
                    seccion.querySelectorAll(
                        '.tarjeta-producto'
                    );

                seccion.style.display =
                    tarjetas.length > 0
                        ? ''
                        : 'none';
            });

        // FILTROS

        const buscador =
            document.getElementById(
                'buscador-productos'
            );

        const filtroCategoria =
            document.getElementById(
                'filtro-categoria'
            );

        if (
            buscador &&
            buscador.dataset.catalogoEventos !==
                '1'
        ) {

            buscador.addEventListener(
                'input',
                filtrarCatalogoBD
            );

            buscador.dataset.catalogoEventos =
                '1';
        }

        if (
            filtroCategoria &&
            filtroCategoria.dataset.catalogoEventos !==
                '1'
        ) {

            filtroCategoria.addEventListener(
                'change',
                filtrarCatalogoBD
            );

            filtroCategoria.dataset.catalogoEventos =
                '1';
        }

        filtrarCatalogoBD();

    } catch (error) {

        console.error(
            'Error cargando catálogo:',
            error
        );

        Swal.fire({

            icon:
                'error',

            title:
                'No se pudo cargar el menú',

            text:
                'Intenta nuevamente en unos momentos.',

            confirmButtonColor:
                '#3c4a45'
        });
    }
}

window.cargarProductosBD =
    cargarProductosBD;

window.abrirDetalleProductoBD =
    abrirDetalleProductoBD;

function activarAlertas() {
    const btnLogin = document.getElementById('btn-login');
    if(btnLogin) btnLogin.addEventListener('click', () => window.location.href = 'login.html');

    const formRegistro = document.getElementById('form-registro');
    if(formRegistro) formRegistro.addEventListener('submit', window.registrarUsuario);

    const formLogin = document.getElementById('form-login');
    if(formLogin) formLogin.addEventListener('submit', window.iniciarSesion);

    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if(btnCerrarSesion) btnCerrarSesion.addEventListener('click', () => {
        Swal.fire({
            title: '¿Quieres cerrar sesión?', text: 'Tendrás que volver a ingresar tus datos la próxima vez.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#557268', cancelButtonColor: '#8a8a8a', confirmButtonText: 'Sí, salir', cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('casaBarro_usuario');
                Swal.fire({ title: 'Sesión cerrada', text: '¡Esperamos verte pronto en Casa Barro!', icon: 'success', timer: 1500, showConfirmButton: false }).then(() => window.location.href = 'index.html');
            }
        });
    });

    const btnHistoria = document.getElementById('btn-historia');
    if(btnHistoria) btnHistoria.addEventListener('click', () => {
        Swal.fire({ title: 'Nuestra Historia ⋆☕︎⋆', html: `<div style="text-align: justify; line-height: 1.6; font-size: 1.05rem;"><p><strong>Casa Barro</strong> nació del amor por el buen café, la panadería artesanal y los momentos compartidos...</p></div>`, confirmButtonText: '¡Me encanta!', confirmButtonColor: '#3c4a45' });
    });

    const btnContacto = document.getElementById('btn-contacto');
    if(btnContacto) btnContacto.addEventListener('click', () => {
        Swal.fire({
            title: 'Contáctanos', html: `<input type="text" id="form-nombre" class="swal2-input" placeholder="Tu nombre (Opcional)" style="margin-bottom: 10px;"><input type="text" id="form-correo" class="swal2-input" placeholder="Tu correo electrónico (Opcional)" style="margin-bottom: 10px;"><textarea id="form-mensaje" class="swal2-textarea" placeholder="Mensaje..."></textarea>`, confirmButtonText: 'Enviar Mensaje', confirmButtonColor: '#3c4a45', showCancelButton: true
        }).then((result) => {
            if (result.isConfirmed) Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 1500 });
        });
    });
}

// ============================================================
// MÓDULO SCM - PRODUCTOS Y PROVEEDORES
// ============================================================

let productosAdminCache = [];
let proveedoresSCMCache = [];

// Categorías existentes en el menú público de Casa Barro.
const CATEGORIAS_MENU = [
    { valor: 'alimentos', nombre: 'Alimentos' },
    { valor: 'calientes', nombre: 'Bebidas Calientes' },
    { valor: 'frias', nombre: 'Bebidas Frías' },
    { valor: 'postres', nombre: 'Postres' }
];

function normalizarCategoriaMenu(valor) {
    const categoria = String(valor ?? '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['bebidas calientes', 'bebida caliente', 'b. calientes'].includes(categoria)) return 'calientes';
    if (['bebidas frias', 'bebida fria', 'b. frias'].includes(categoria)) return 'frias';
    return categoria;
}

function opcionesCategoriaProducto(valorActual = '') {
    const actual = normalizarCategoriaMenu(valorActual);
    let opciones = '<option value="">Selecciona una categoría</option>';
    opciones += CATEGORIAS_MENU.map(({ valor, nombre }) =>
        `<option value="${valor}" ${actual === valor ? 'selected' : ''}>${nombre}</option>`
    ).join('');

    // No perder la categoría de un producto guardado anteriormente con texto libre.
    if (valorActual && !CATEGORIAS_MENU.some(item => item.valor === actual)) {
        opciones += `<option value="${escaparHtmlSCM(valorActual)}" selected>${escaparHtmlSCM(valorActual)} (categoría anterior)</option>`;
    }
    return opciones;
}

function escaparHtmlSCM(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================
// PRODUCTOS
// ============================================================

// ============================================================
// IMAGEN DE PRODUCTO
// ============================================================

window.previsualizarImagenProducto = function(input) {

    const preview =
        document.getElementById(
            'producto-imagen-preview'
        );

    const vacio =
        document.getElementById(
            'producto-preview-vacio'
        );

    if (!preview || !vacio) {
        return;
    }

    const archivo =
        input.files?.[0];

    if (!archivo) {

        preview.style.display = 'none';
        preview.removeAttribute('src');

        vacio.style.display = 'flex';

        return;
    }

    const tiposPermitidos = [
        'image/jpeg',
        'image/png',
        'image/webp'
    ];

    if (!tiposPermitidos.includes(archivo.type)) {

        input.value = '';

        return Swal.fire({
            icon: 'warning',
            title: 'Imagen no válida',
            text: 'Selecciona una imagen JPG, PNG o WEBP.',
            confirmButtonColor: '#3c4a45'
        });
    }

    const maximo =
        5 * 1024 * 1024;

    if (archivo.size > maximo) {

        input.value = '';

        return Swal.fire({
            icon: 'warning',
            title: 'Imagen demasiado grande',
            text: 'La imagen debe pesar como máximo 5 MB.',
            confirmButtonColor: '#3c4a45'
        });
    }

    const urlTemporal =
        URL.createObjectURL(archivo);

    preview.onload = function() {
        URL.revokeObjectURL(
            urlTemporal
        );
    };

    preview.src =
        urlTemporal;

    preview.style.display =
        'block';

    vacio.style.display =
        'none';

    actualizarPosicionPreviewProducto();
};

window.actualizarPosicionPreviewProducto = function() {

    const preview =
        document.getElementById(
            'producto-imagen-preview'
        );

    const select =
        document.getElementById(
            'producto-imagen-posicion'
        );

    if (!preview || !select) {
        return;
    }

    const posiciones = [
        'top',
        'center',
        'bottom'
    ];

    preview.style.objectPosition =
        posiciones.includes(select.value)
            ? select.value
            : 'center';
};

async function subirImagenProductoAdmin(
    productoId,
    archivo,
    usuarioId
) {

    if (!archivo) {
        return null;
    }

    const formulario =
        new FormData();

    formulario.append(
        'imagen',
        archivo
    );

    if (usuarioId) {

        formulario.append(
            'usuario_id',
            usuarioId
        );
    }

    const respuesta =
        await fetch(
            `http://localhost:3000/api/productos/${productoId}/imagen`,
            {
                method: 'POST',
                body: formulario
            }
        );

    const resultado =
        await respuesta.json();

    if (!respuesta.ok) {

        throw new Error(
            resultado.error ||
            'No se pudo subir la imagen.'
        );
    }

    return resultado.imagen;
}

window.cargarProductosAdmin = async function() {

    const tabla =
        document.getElementById(
            'tabla-productos-admin'
        );

    if (!tabla) return;

    try {

        const respuesta =
            await fetch(
                'http://localhost:3000/api/productos?todos=1',
                {
                    cache: 'no-store'
                }
            );

        const resultado =
            await respuesta.json();

        if (!respuesta.ok) {

            throw new Error(
                resultado.error ||
                'No se pudieron cargar los productos'
            );
        }

        productosAdminCache =
            resultado.data || [];

        if (
            productosAdminCache.length === 0
        ) {

            tabla.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        style="
                            text-align:center;
                            padding:30px;
                            color:#777;
                        "
                    >
                        No hay productos registrados.
                    </td>
                </tr>
            `;

            actualizarFiltroCategoriasProductos();

            return;
        }

        tabla.innerHTML =
            productosAdminCache
                .map(producto => {

                    let colorEstado =
                        '#557268';

                    if (
                        producto.estado ===
                        'agotado'
                    ) {
                        colorEstado =
                            '#d9822b';
                    }

                    if (
                        producto.estado ===
                        'inactivo'
                    ) {
                        colorEstado =
                            '#777';
                    }

                    const posiciones = [
                        'top',
                        'center',
                        'bottom'
                    ];

                    const posicionImagen =
                        posiciones.includes(
                            producto.imagen_posicion
                        )
                            ? producto.imagen_posicion
                            : 'center';

                    const imagen =
                        producto.imagen
                            ? escaparHtmlSCM(
                                producto.imagen
                              )
                            : '';

                    const publicado =
                        Number(
                            producto.publicado
                        ) === 1;

                    const etiqueta =
                        producto.etiqueta
                            ? escaparHtmlSCM(
                                producto.etiqueta
                              )
                            : '';

                    return `

                        <tr
                            class="
                                admin-row
                                producto-admin-row
                            "

                            data-nombre="${
                                escaparHtmlSCM(
                                    producto.nombre
                                ).toLowerCase()
                            }"

                            data-categoria="${
                                escaparHtmlSCM(
                                    producto.categoria ||
                                    ''
                                )
                            }"

                            data-estado="${
                                escaparHtmlSCM(
                                    producto.estado ||
                                    ''
                                )
                            }"

                            style="
                                border-bottom:
                                1px solid #eae5db;
                            "
                        >

                            <!-- ID -->

                            <td style="padding:10px;">

                                ${producto.id}

                            </td>

                            <!-- IMAGEN -->

                            <td
                                style="
                                    padding:8px;
                                    text-align:center;
                                "
                            >

                                ${
                                    imagen
                                        ? `
                                            <img
                                                src="${imagen}"

                                                alt="${
                                                    escaparHtmlSCM(
                                                        producto.nombre
                                                    )
                                                }"

                                                class="
                                                    admin-producto-miniatura
                                                "

                                                style="
                                                    object-position:
                                                    ${posicionImagen};
                                                "
                                            >
                                          `
                                        : `
                                            <span
                                                class="
                                                    producto-sin-imagen
                                                "
                                            >
                                                Sin
                                                imagen
                                            </span>
                                          `
                                }

                            </td>

                            <!-- PRODUCTO -->

                            <td style="padding:10px;">

                                <strong>
                                    ${
                                        escaparHtmlSCM(
                                            producto.nombre
                                        )
                                    }
                                </strong>

                                <br>

                                <small
                                    style="
                                        color:#777;
                                    "
                                >
                                    ${
                                        escaparHtmlSCM(
                                            producto.descripcion ||
                                            'Sin descripción'
                                        )
                                    }
                                </small>

                            </td>

                            <!-- CATEGORÍA -->

                            <td style="padding:10px;">

                                ${
                                    escaparHtmlSCM(
                                        producto.categoria ||
                                        'Sin categoría'
                                    )
                                }

                            </td>

                            <!-- PRECIO -->

                            <td style="padding:10px;">

                                $${Number(
                                    producto.precio || 0
                                ).toFixed(2)}

                            </td>

                            <!-- DISPONIBILIDAD -->

                            <td
                                style="
                                    padding:10px;
                                    text-align:center;
                                "
                            >

                                <strong>

                                    ${Number(
                                        producto.stock_actual ||
                                        0
                                    )}

                                </strong>

                            </td>

                            <!-- ESTADO -->

                            <td style="padding:10px;">

                                <span
                                    style="
                                        background:
                                        ${colorEstado};

                                        color:white;

                                        padding:
                                        3px 8px;

                                        border-radius:
                                        12px;

                                        font-size:
                                        .8rem;
                                    "
                                >

                                    ${
                                        escaparHtmlSCM(
                                            producto.estado ||
                                            'disponible'
                                        )
                                    }

                                </span>

                            </td>

                            <!-- CATÁLOGO -->

                            <td
                                style="
                                    padding:10px;
                                    text-align:center;
                                "
                            >

                                <span
                                    class="${
                                        publicado
                                            ? 'badge-publicado'
                                            : 'badge-no-publicado'
                                    }"
                                >

                                    ${
                                        publicado
                                            ? 'Publicado'
                                            : 'No publicado'
                                    }

                                </span>

                                ${
                                    etiqueta
                                        ? `
                                            <br>

                                            <small
                                                style="
                                                    display:inline-block;
                                                    margin-top:5px;
                                                    color:#777;
                                                "
                                            >
                                                ${etiqueta}
                                            </small>
                                          `
                                        : ''
                                }

                            </td>

                            <!-- ACCIONES -->

                            <td
                                class="admin-actions"

                                style="
                                    padding:10px;
                                    display:flex;
                                    gap:5px;
                                    align-items:center;
                                    flex-wrap:wrap;
                                "
                            >

                                <button
                                    onclick="
                                        gestionarReceta(
                                            ${producto.id}
                                        )
                                    "
                                    style="
                                        background:#557268;
                                        color:white;
                                    "
                                >
                                    Receta
                                </button>

                                <button
                                    onclick="
                                        editarProductoAdmin(
                                            ${producto.id}
                                        )
                                    "
                                >
                                    Editar
                                </button>

                                <button
                                    onclick="
                                        eliminarProductoAdmin(
                                            ${producto.id}
                                        )
                                    "

                                    style="
                                        background:#b7410e;
                                        color:white;
                                        border:none;
                                        padding:5px 10px;
                                        border-radius:5px;
                                        cursor:pointer;
                                    "
                                >
                                    Eliminar
                                </button>

                            </td>

                        </tr>
                    `;

                })
                .join('');

        actualizarFiltroCategoriasProductos();

        filtrarProductosAdmin();

    } catch (error) {

        console.error(
            'Error cargando productos:',
            error
        );

        tabla.innerHTML = `
            <tr>

                <td
                    colspan="9"

                    style="
                        text-align:center;
                        padding:30px;
                        color:#b7410e;
                    "
                >
                    No se pudieron cargar los productos.
                </td>

            </tr>
        `;
    }
}

window.actualizarFiltroCategoriasProductos = function() {
    const select = document.getElementById('admin-filter-cat');
    if (!select) return;

    const anterior = select.value;
    select.innerHTML = '<option value="todos">Todas las categorías</option>' +
        CATEGORIAS_MENU.map(item => `<option value="${item.valor}">${item.nombre}</option>`).join('');

    // Conserva las categorías antiguas que se hayan escrito libremente.
    const extras = [...new Set(productosAdminCache.map(p => String(p.categoria || '').trim()).filter(Boolean))]
        .filter(c => !CATEGORIAS_MENU.some(item => item.valor === normalizarCategoriaMenu(c)))
        .sort((a, b) => a.localeCompare(b, 'es'));
    extras.forEach(c => {
        select.innerHTML += `<option value="${escaparHtmlSCM(c)}">${escaparHtmlSCM(c)}</option>`;
    });
    if ([...select.options].some(op => op.value === anterior)) select.value = anterior;
}

window.filtrarProductosAdmin = function() {
    const inputBusqueda = document.getElementById('admin-search');
    const selectCategoria = document.getElementById('admin-filter-cat');
    const selectEstado = document.getElementById('admin-filter-status');

    if (!inputBusqueda || !selectCategoria || !selectEstado) return;

    const texto = inputBusqueda.value.toLowerCase().trim();
    const categoria = selectCategoria.value;
    const estado = selectEstado.value;

    document.querySelectorAll('.producto-admin-row').forEach(fila => {
        const nombre = fila.dataset.nombre || '';
        const categoriaFila = fila.dataset.categoria || '';
        const estadoFila = fila.dataset.estado || '';

        const coincideTexto = nombre.includes(texto);
        const coincideCategoria = categoria === 'todos' || normalizarCategoriaMenu(categoriaFila) === normalizarCategoriaMenu(categoria);
        const coincideEstado = estado === 'todos' || estadoFila === estado;

        fila.style.display = coincideTexto && coincideCategoria && coincideEstado
            ? ''
            : 'none';
    });
}

window.guardarProducto = async function(event) {

    event.preventDefault();

    const usuarioActual =
        JSON.parse(
            localStorage.getItem(
                'casaBarro_usuario'
            )
        );

    const inputImagen =
        document.getElementById(
            'producto-imagen'
        );

    const archivoImagen =
        inputImagen?.files?.[0] ||
        null;

    const publicado =
        Number(
            document.getElementById(
                'producto-publicado'
            ).value
        );

    /*
    Si el administrador quiere publicarlo
    inmediatamente, debe existir una imagen.
    */

    if (
        publicado === 1 &&
        !archivoImagen
    ) {

        return Swal.fire({
            icon: 'warning',

            title:
                'Falta la imagen',

            text:
                'Para publicar un producto nuevo en el catálogo debes seleccionar una imagen.',

            confirmButtonColor:
                '#3c4a45'
        });
    }

    const data = {

        nombre:
            document.getElementById(
                'producto-nombre'
            ).value.trim(),

        descripcion:
            document.getElementById(
                'producto-descripcion'
            ).value.trim(),

        categoria:
            document.getElementById(
                'producto-categoria'
            ).value.trim(),

        precio:
            Number(
                document.getElementById(
                    'producto-precio'
                ).value
            ),

        stock_actual: 0,

        stock_minimo: 0,

        proveedor_id: null,

        costo_unitario:
            Number(
                document.getElementById(
                    'producto-costo'
                ).value || 0
            ),

        estrategia_logistica:
            'PULL',

        estado:
            document.getElementById(
                'producto-estado'
            ).value,

        // DATOS DEL CATÁLOGO

        publicado:
            publicado,

        imagen_posicion:
            document.getElementById(
                'producto-imagen-posicion'
            ).value,

        etiqueta:
            document.getElementById(
                'producto-etiqueta'
            ).value.trim(),

        etiqueta_tipo:
            document.getElementById(
                'producto-etiqueta-tipo'
            ).value,

        orden_catalogo:
            999,

        usuario_id:
            usuarioActual
                ? usuarioActual.id
                : null
    };

    try {

        /*
        PRIMERO:
        crear el producto para obtener su ID.
        */

        const respuesta =
            await fetch(
                'http://localhost:3000/api/productos',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(
                            data
                        )
                }
            );

        const resultado =
            await respuesta.json();

        if (!respuesta.ok) {

            return Swal.fire({
                icon: 'error',

                title:
                    resultado.error ||
                    'No se pudo registrar',

                confirmButtonColor:
                    '#3c4a45'
            });
        }

        /*
        SEGUNDO:
        si seleccionó imagen,
        subirla al producto recién creado.
        */

        let errorImagen =
            null;

        if (archivoImagen) {

            try {

                await subirImagenProductoAdmin(
                    resultado.id,
                    archivoImagen,
                    usuarioActual
                        ? usuarioActual.id
                        : null
                );

            } catch (error) {

                errorImagen =
                    error.message;
            }
        }

        /*
        Si el producto se creó pero falló
        únicamente la fotografía, no decimos
        que todo el registro falló.
        */

        if (errorImagen) {

            await Swal.fire({

                icon: 'warning',

                title:
                    'Producto creado',

                text:
                    `El producto se registró, pero la imagen no pudo guardarse: ${errorImagen}`,

                confirmButtonColor:
                    '#3c4a45'
            });

        } else {

            Swal.fire({

                toast: true,

                position:
                    'top-end',

                icon:
                    'success',

                title:
                    'Producto registrado',

                showConfirmButton:
                    false,

                timer:
                    2000
            });
        }

        // LIMPIAR FORMULARIO

        document.getElementById(
            'form-alta-producto'
        ).reset();

        document.getElementById(
            'producto-precio'
        ).value = 0;

        document.getElementById(
            'producto-costo'
        ).value = 0;

        document.getElementById(
            'producto-estado'
        ).value =
            'disponible';

        document.getElementById(
            'producto-publicado'
        ).value =
            '0';

        document.getElementById(
            'producto-imagen-posicion'
        ).value =
            'center';

        document.getElementById(
            'producto-etiqueta-tipo'
        ).value =
            '';

        // LIMPIAR PREVIEW

        const preview =
            document.getElementById(
                'producto-imagen-preview'
            );

        const vacio =
            document.getElementById(
                'producto-preview-vacio'
            );

        if (preview) {

            preview.style.display =
                'none';

            preview.removeAttribute(
                'src'
            );

            preview.style.objectPosition =
                'center';
        }

        if (vacio) {

            vacio.style.display =
                'flex';
        }

        // RECARGAR TABLA

        await cargarProductosAdmin();

    } catch (error) {

        console.error(
            'Error registrando producto:',
            error
        );

        Swal.fire({

            icon:
                'error',

            title:
                'Error de conexión',

            text:
                error.message,

            confirmButtonColor:
                '#3c4a45'
        });
    }
}

window.editarProductoAdmin = async function(id) {

    const producto = productosAdminCache.find(
        item => Number(item.id) === Number(id)
    );

    if (!producto) {
        return;
    }

    // ============================================================
    // DATOS ACTUALES DEL PRODUCTO
    // ============================================================

    const imagenActual =
        producto.imagen
            ? escaparHtmlSCM(producto.imagen)
            : '';

    const posicionActual =
        ['top', 'center', 'bottom'].includes(
            producto.imagen_posicion
        )
            ? producto.imagen_posicion
            : 'center';

    const publicadoActual =
        Number(producto.publicado) === 1;

    const etiquetaActual =
        escaparHtmlSCM(
            producto.etiqueta || ''
        );

    const tipoEtiquetaActual =
        producto.etiqueta_tipo || '';

    // ============================================================
    // MODAL DE EDICIÓN
    // ============================================================

    const result = await Swal.fire({

        title: 'Editar Producto',

        width: '700px',

        html: `

            <div
                style="
                    display:flex;
                    flex-direction:column;
                    gap:12px;
                    text-align:left;
                "
            >

                <!-- ==========================================
                     IMAGEN
                =========================================== -->

                <label style="font-weight:bold;">
                    Imagen del producto:
                </label>

                <div
                    style="
                        display:flex;
                        gap:16px;
                        align-items:center;
                        flex-wrap:wrap;
                    "
                >

                    <div
                        style="
                            width:180px;
                            height:125px;
                            border-radius:12px;
                            overflow:hidden;
                            background:#eee;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            flex-shrink:0;
                        "
                    >

                        ${
                            imagenActual
                                ? `
                                    <img
                                        id="edit-producto-preview"
                                        src="${imagenActual}"
                                        alt="${escaparHtmlSCM(producto.nombre)}"

                                        style="
                                            width:100%;
                                            height:100%;
                                            object-fit:cover;
                                            object-position:${posicionActual};
                                        "
                                    >
                                `
                                : `
                                    <span
                                        id="edit-producto-sin-imagen"

                                        style="
                                            color:#888;
                                            font-size:.8rem;
                                        "
                                    >
                                        Sin imagen
                                    </span>

                                    <img
                                        id="edit-producto-preview"

                                        style="
                                            display:none;
                                            width:100%;
                                            height:100%;
                                            object-fit:cover;
                                            object-position:${posicionActual};
                                        "
                                    >
                                `
                        }

                    </div>

                    <div style="flex:1; min-width:220px;">

                        <input
                            type="file"

                            id="edit-producto-imagen"

                            accept="
                                image/jpeg,
                                image/png,
                                image/webp
                            "

                            style="
                                width:100%;
                            "
                        >

                        <small
                            style="
                                display:block;
                                color:#777;
                                margin-top:6px;
                            "
                        >
                            Déjalo vacío para conservar la imagen actual.
                            JPG, PNG o WEBP. Máximo 5 MB.
                        </small>

                    </div>

                </div>

                <!-- ==========================================
                     ENCUADRE
                =========================================== -->

                <label style="font-weight:bold;">
                    Encuadre de la imagen:
                </label>

                <select
                    id="edit-producto-imagen-posicion"
                    class="swal2-select"

                    style="
                        margin:0;
                        width:100%;
                    "
                >

                    <option
                        value="center"
                        ${posicionActual === 'center' ? 'selected' : ''}
                    >
                        Centrado
                    </option>

                    <option
                        value="top"
                        ${posicionActual === 'top' ? 'selected' : ''}
                    >
                        Parte superior
                    </option>

                    <option
                        value="bottom"
                        ${posicionActual === 'bottom' ? 'selected' : ''}
                    >
                        Parte inferior
                    </option>

                </select>

                <!-- ==========================================
                     NOMBRE
                =========================================== -->

                <label style="font-weight:bold;">
                    Nombre:
                </label>

                <input
                    type="text"

                    id="edit-producto-nombre"

                    class="swal2-input"

                    style="
                        margin:0;
                        width:100%;
                    "

                    value="${escaparHtmlSCM(producto.nombre)}"
                >

                <!-- ==========================================
                     DESCRIPCIÓN
                =========================================== -->

                <label style="font-weight:bold;">
                    Descripción:
                </label>

                <textarea
                    id="edit-producto-descripcion"

                    class="swal2-textarea"

                    style="
                        margin:0;
                        width:100%;
                        min-height:120px;
                    "
                >${escaparHtmlSCM(producto.descripcion || '')}</textarea>

                <!-- ==========================================
                     CATEGORÍA
                =========================================== -->

                <label style="font-weight:bold;">
                    Categoría:
                </label>

                <select
                    id="edit-producto-categoria"

                    class="swal2-select"

                    style="
                        margin:0;
                        width:100%;
                    "
                >
                    ${
                        opcionesCategoriaProducto(
                            producto.categoria || ''
                        )
                    }
                </select>

                <!-- ==========================================
                     PRECIO / COSTO
                =========================================== -->

                <div
                    style="
                        display:flex;
                        gap:12px;
                        flex-wrap:wrap;
                    "
                >

                    <div
                        style="
                            flex:1;
                            min-width:200px;
                        "
                    >

                        <label
                            style="
                                display:block;
                                margin-bottom:6px;
                                font-weight:bold;
                            "
                        >
                            Precio:
                        </label>

                        <input
                            type="number"

                            id="edit-producto-precio"

                            class="swal2-input"

                            min="0"
                            step="0.01"

                            style="
                                margin:0;
                                width:100%;
                            "

                            value="${Number(producto.precio || 0)}"
                        >

                    </div>

                    <div
                        style="
                            flex:1;
                            min-width:200px;
                        "
                    >

                        <label
                            style="
                                display:block;
                                margin-bottom:6px;
                                font-weight:bold;
                            "
                        >
                            Costo unitario:
                        </label>

                        <input
                            type="number"

                            id="edit-producto-costo"

                            class="swal2-input"

                            min="0"
                            step="0.01"

                            style="
                                margin:0;
                                width:100%;
                            "

                            value="${Number(producto.costo_unitario || 0)}"
                        >

                    </div>

                </div>

                <!-- ==========================================
                     ETIQUETA
                =========================================== -->

                <label style="font-weight:bold;">
                    Texto de etiqueta:
                </label>

                <input
                    type="text"

                    id="edit-producto-etiqueta"

                    class="swal2-input"

                    maxlength="30"

                    placeholder="Ej. Nuevo, Favorito, Más Vendido..."

                    style="
                        margin:0;
                        width:100%;
                    "

                    value="${etiquetaActual}"
                >

                <!-- ==========================================
                     TIPO DE ETIQUETA
                =========================================== -->

                <label style="font-weight:bold;">
                    Estilo de etiqueta:
                </label>

                <select
                    id="edit-producto-etiqueta-tipo"

                    class="swal2-select"

                    style="
                        margin:0;
                        width:100%;
                    "
                >

                    <option
                        value=""
                        ${tipoEtiquetaActual === '' ? 'selected' : ''}
                    >
                        Sin etiqueta
                    </option>

                    <option
                        value="nuevo"
                        ${tipoEtiquetaActual === 'nuevo' ? 'selected' : ''}
                    >
                        Nuevo
                    </option>

                    <option
                        value="vendido"
                        ${tipoEtiquetaActual === 'vendido' ? 'selected' : ''}
                    >
                        Destacado / Más vendido
                    </option>

                    <option
                        value="oferta"
                        ${tipoEtiquetaActual === 'oferta' ? 'selected' : ''}
                    >
                        Oferta
                    </option>

                </select>

                <!-- ==========================================
                     DISPONIBILIDAD
                =========================================== -->

                <label style="font-weight:bold;">
                    Disponibilidad calculada por receta:
                </label>

                <input
                    type="number"

                    readonly

                    class="swal2-input"

                    style="
                        margin:0;
                        width:100%;
                        background:#f3f3f3;
                    "

                    value="${Number(producto.stock_actual || 0)}"
                >

                <small
                    style="
                        color:#777;
                    "
                >
                    La disponibilidad se calcula automáticamente
                    utilizando los insumos de la receta.
                </small>

                <!-- ==========================================
                     PUBLICACIÓN
                =========================================== -->

                <div
                    style="
                        margin-top:8px;
                        padding:14px;
                        border:1px solid #d9d4ca;
                        border-radius:10px;
                        background:#faf9f6;
                    "
                >

                    <label
                        for="edit-producto-publicado"

                        style="
                            display:block;
                            font-weight:bold;
                            color:#3c4a45;
                            margin-bottom:7px;
                        "
                    >
                        Publicación en catálogo:
                    </label>

                    <select
                        id="edit-producto-publicado"

                        class="swal2-select"

                        style="
                            margin:0;
                            width:100%;
                            background:white;
                        "
                    >

                        <option
                            value="1"
                            ${publicadoActual ? 'selected' : ''}
                        >
                            Publicado en catálogo
                        </option>

                        <option
                            value="0"
                            ${!publicadoActual ? 'selected' : ''}
                        >
                            No publicado
                        </option>

                    </select>

                    <small
                        style="
                            display:block;
                            color:#777;
                            margin-top:7px;
                        "
                    >
                        Define si este producto aparece en
                        el menú público de Casa Barro.
                    </small>

                </div>

                <!-- ==========================================
                     ESTADO
                =========================================== -->

                <label
                    style="
                        font-weight:bold;
                        margin-top:5px;
                    "
                >
                    Estado:
                </label>

                <select
                    id="edit-producto-estado"

                    class="swal2-select"

                    style="
                        margin:0;
                        width:100%;
                    "
                >

                    <option
                        value="disponible"
                        ${
                            producto.estado === 'disponible'
                                ? 'selected'
                                : ''
                        }
                    >
                        Disponible
                    </option>

                    <option
                        value="agotado"
                        ${
                            producto.estado === 'agotado'
                                ? 'selected'
                                : ''
                        }
                    >
                        Agotado
                    </option>

                    <option
                        value="inactivo"
                        ${
                            producto.estado === 'inactivo'
                                ? 'selected'
                                : ''
                        }
                    >
                        Inactivo
                    </option>

                </select>

            </div>
        `,

        showCancelButton: true,

        confirmButtonText: 'Actualizar',

        cancelButtonText: 'Cancelar',

        confirmButtonColor: '#3c4a45',

        cancelButtonColor: '#7b858e',

        // ========================================================
        // AL ABRIR EL MODAL
        // ========================================================

        didOpen: () => {

            const inputImagen =
                document.getElementById(
                    'edit-producto-imagen'
                );

            const selectPosicion =
                document.getElementById(
                    'edit-producto-imagen-posicion'
                );

            const preview =
                document.getElementById(
                    'edit-producto-preview'
                );

            const sinImagen =
                document.getElementById(
                    'edit-producto-sin-imagen'
                );

            // ------------------------------------------
            // ACTUALIZAR ENCUADRE EN TIEMPO REAL
            // ------------------------------------------

            const actualizarPreview = () => {

                if (
                    preview &&
                    selectPosicion
                ) {

                    preview.style.objectPosition =
                        selectPosicion.value;
                }
            };

            if (selectPosicion) {

                selectPosicion.addEventListener(
                    'change',
                    actualizarPreview
                );
            }

            // ------------------------------------------
            // CAMBIO DE IMAGEN
            // ------------------------------------------

            if (inputImagen) {

                inputImagen.addEventListener(
                    'change',
                    () => {

                        const archivo =
                            inputImagen.files?.[0];

                        if (!archivo) {
                            return;
                        }

                        const tiposPermitidos = [
                            'image/jpeg',
                            'image/png',
                            'image/webp'
                        ];

                        if (
                            !tiposPermitidos.includes(
                                archivo.type
                            )
                        ) {

                            inputImagen.value = '';

                            Swal.showValidationMessage(
                                'Selecciona una imagen JPG, PNG o WEBP.'
                            );

                            return;
                        }

                        const maximo =
                            5 * 1024 * 1024;

                        if (
                            archivo.size >
                            maximo
                        ) {

                            inputImagen.value = '';

                            Swal.showValidationMessage(
                                'La imagen debe pesar máximo 5 MB.'
                            );

                            return;
                        }

                        Swal.resetValidationMessage();

                        if (sinImagen) {

                            sinImagen.style.display =
                                'none';
                        }

                        const urlTemporal =
                            URL.createObjectURL(
                                archivo
                            );

                        if (preview) {

                            preview.onload =
                                function() {

                                    URL.revokeObjectURL(
                                        urlTemporal
                                    );
                                };

                            preview.src =
                                urlTemporal;

                            preview.style.display =
                                'block';

                            actualizarPreview();
                        }
                    }
                );
            }
        },

        // ========================================================
        // VALIDAR Y OBTENER DATOS
        // ========================================================

        preConfirm: () => {

            const nombre =
                document.getElementById(
                    'edit-producto-nombre'
                ).value.trim();

            const descripcion =
                document.getElementById(
                    'edit-producto-descripcion'
                ).value.trim();

            const categoria =
                document.getElementById(
                    'edit-producto-categoria'
                ).value.trim();

            const precio =
                Number(
                    document.getElementById(
                        'edit-producto-precio'
                    ).value
                );

            const costo =
                Number(
                    document.getElementById(
                        'edit-producto-costo'
                    ).value
                );

            const publicado =
                Number(
                    document.getElementById(
                        'edit-producto-publicado'
                    ).value
                );

            const imagenPosicion =
                document.getElementById(
                    'edit-producto-imagen-posicion'
                ).value;

            const etiqueta =
                document.getElementById(
                    'edit-producto-etiqueta'
                ).value.trim();

            const etiquetaTipo =
                document.getElementById(
                    'edit-producto-etiqueta-tipo'
                ).value;

            const estado =
                document.getElementById(
                    'edit-producto-estado'
                ).value;

            const inputImagen =
                document.getElementById(
                    'edit-producto-imagen'
                );

            const archivoImagen =
                inputImagen?.files?.[0] ||
                null;

            // ------------------------------------------
            // VALIDACIONES
            // ------------------------------------------

            if (!nombre) {

                Swal.showValidationMessage(
                    'El nombre del producto es obligatorio.'
                );

                return false;
            }

            if (!categoria) {

                Swal.showValidationMessage(
                    'Selecciona una categoría.'
                );

                return false;
            }

            if (
                !Number.isFinite(precio) ||
                precio < 0
            ) {

                Swal.showValidationMessage(
                    'El precio debe ser un número no negativo.'
                );

                return false;
            }

            if (
                !Number.isFinite(costo) ||
                costo < 0
            ) {

                Swal.showValidationMessage(
                    'El costo debe ser un número no negativo.'
                );

                return false;
            }

            /*
            Para publicar tiene que existir
            una imagen actual o una nueva.
            */

            if (
                publicado === 1 &&
                !producto.imagen &&
                !archivoImagen
            ) {

                Swal.showValidationMessage(
                    'Para publicar el producto debes asignarle una imagen.'
                );

                return false;
            }

            /*
            Si está inactivo no tiene sentido
            dejarlo publicado.
            */

            if (
                estado === 'inactivo' &&
                publicado === 1
            ) {

                Swal.showValidationMessage(
                    'Un producto inactivo no puede permanecer publicado.'
                );

                return false;
            }

            // ------------------------------------------
            // RESULTADO DEL MODAL
            // ------------------------------------------

            return {

                nombre,

                descripcion,

                categoria,

                precio,

                costo_unitario:
                    costo,

                /*
                Estos datos se conservan.
                La disponibilidad real se administra
                mediante la receta.
                */

                stock_actual:
                    Number(
                        producto.stock_actual ||
                        0
                    ),

                stock_minimo:
                    Number(
                        producto.stock_minimo ||
                        0
                    ),

                proveedor_id:
                    producto.proveedor_id ||
                    null,

                estrategia_logistica:
                    producto.estrategia_logistica ||
                    'PULL',

                estado,

                // DATOS DEL CATÁLOGO

                publicado,

                imagen_posicion:
                    imagenPosicion,

                etiqueta,

                etiqueta_tipo:
                    etiquetaTipo,

                orden_catalogo:
                    Number(
                        producto.orden_catalogo ??
                        999
                    ),

                /*
                El archivo no se puede enviar
                dentro del JSON.
                Se sube después mediante FormData.
                */

                archivoImagen
            };
        }
    });

    // ============================================================
    // CANCELÓ LA EDICIÓN
    // ============================================================

    if (!result.isConfirmed) {
        return;
    }

    // Sacamos el archivo para no enviarlo en JSON.

    const {
        archivoImagen,
        ...datosProducto
    } = result.value;

    const usuarioActual =
        JSON.parse(
            localStorage.getItem(
                'casaBarro_usuario'
            )
        );

    datosProducto.usuario_id =
        usuarioActual
            ? usuarioActual.id
            : null;

    try {

        // ========================================================
        // 1. ACTUALIZAR DATOS DEL PRODUCTO
        // ========================================================

        const respuesta =
            await fetch(
                `http://localhost:3000/api/productos/${id}`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(
                            datosProducto
                        )
                }
            );

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {

            return Swal.fire({

                icon: 'error',

                title:
                    datos.error ||
                    'No se pudo actualizar',

                confirmButtonColor:
                    '#3c4a45'
            });
        }

        // ========================================================
        // 2. CAMBIAR IMAGEN SI SE SELECCIONÓ UNA NUEVA
        // ========================================================

        if (archivoImagen) {

            await subirImagenProductoAdmin(
                id,
                archivoImagen,
                usuarioActual
                    ? usuarioActual.id
                    : null
            );
        }

        // ========================================================
        // 3. MOSTRAR RESULTADO
        // ========================================================

        Swal.fire({

            toast: true,

            position:
                'top-end',

            icon:
                'success',

            title:
                datosProducto.publicado === 1
                    ? 'Producto actualizado y publicado'
                    : 'Producto actualizado',

            showConfirmButton:
                false,

            timer:
                2000
        });

        // ========================================================
        // 4. RECARGAR TABLA
        // ========================================================

        await cargarProductosAdmin();

    } catch (error) {

        console.error(
            'Error actualizando producto:',
            error
        );

        Swal.fire({

            icon:
                'error',

            title:
                'No se pudo actualizar',

            text:
                error.message,

            confirmButtonColor:
                '#3c4a45'
        });
    }
}

window.eliminarProductoAdmin = function(id) {
    const producto = productosAdminCache.find(item => Number(item.id) === Number(id));
    if (!producto) return;

    Swal.fire({
        title: `¿Dar de baja ${producto.nombre}?`,
        text: 'El producto quedará inactivo y conservará su historial.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#b7410e',
        cancelButtonColor: '#8a8a8a',
        confirmButtonText: 'Sí, dar de baja',
        cancelButtonText: 'Cancelar'
    }).then(async result => {
        if (!result.isConfirmed) return;

        const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));

        try {
            const respuesta = await fetch(`http://localhost:3000/api/productos/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: usuarioActual ? usuarioActual.id : null
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                return Swal.fire({
                    icon: 'error',
                    title: datos.error || 'No se pudo dar de baja',
                    confirmButtonColor: '#3c4a45'
                });
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Producto dado de baja',
                showConfirmButton: false,
                timer: 2000
            });

            cargarProductosAdmin();

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                confirmButtonColor: '#3c4a45'
            });
        }
    });
}

// ============================================================
// PROVEEDORES
// ============================================================

window.obtenerProveedoresSCM = async function(soloActivos = false) {
    const url = soloActivos
        ? 'http://localhost:3000/api/proveedores?activos=1'
        : 'http://localhost:3000/api/proveedores';

    const respuesta = await fetch(url);
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(resultado.error || 'No se pudieron cargar los proveedores');
    }

    proveedoresSCMCache = resultado.data || [];
    return proveedoresSCMCache;
}

window.cargarProveedoresEnProductos = async function() {
    const select = document.getElementById('producto-proveedor');
    if (!select) return;

    try {
        const proveedores = await obtenerProveedoresSCM(true);
        select.innerHTML = '<option value="">Sin proveedor</option>';

        proveedores.forEach(proveedor => {
            select.innerHTML += `
                <option value="${proveedor.id}">
                    ${escaparHtmlSCM(proveedor.nombre)}
                </option>
            `;
        });

    } catch (error) {
        console.error('Error cargando proveedores:', error);
    }
}

window.cargarProveedores = async function() {
    const tabla = document.getElementById('tabla-proveedores');
    if (!tabla) return;

    try {
        const proveedores = await obtenerProveedoresSCM(false);

        if (proveedores.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:30px; color:#777;">
                        No hay proveedores registrados.
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';

        proveedores.forEach(proveedor => {
            const colorEstado = proveedor.estado === 'activo' ? '#557268' : '#777';

            html += `
                <tr
                    class="proveedor-row"
                    data-nombre="${escaparHtmlSCM(proveedor.nombre).toLowerCase()}"
                    data-contacto="${escaparHtmlSCM(proveedor.contacto || '').toLowerCase()}"
                    data-estado="${escaparHtmlSCM(proveedor.estado || 'activo')}"
                    style="border-bottom:1px solid #eae5db;"
                >
                    <td style="padding:10px;">${proveedor.id}</td>
                    <td style="padding:10px;"><strong>${escaparHtmlSCM(proveedor.nombre)}</strong></td>
                    <td style="padding:10px;">${escaparHtmlSCM(proveedor.contacto || '-')}</td>
                    <td style="padding:10px;">${escaparHtmlSCM(proveedor.correo || '-')}</td>
                    <td style="padding:10px;">${escaparHtmlSCM(proveedor.telefono || '-')}</td>
                    <td style="padding:10px;">
                        <span style="background:${colorEstado}; color:white; padding:3px 8px; border-radius:12px; font-size:0.8rem;">
                            ${escaparHtmlSCM(proveedor.estado || 'activo')}
                        </span>
                    </td>
                    <td class="admin-actions" style="padding:10px; display:flex; gap:5px; align-items:center;">
                        <button onclick="editarProveedor(${proveedor.id})">Editar</button>
                        <button
                            onclick="eliminarProveedor(${proveedor.id})"
                            style="background:#b7410e; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;"
                        >
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });

        tabla.innerHTML = html;
        filtrarProveedores();

    } catch (error) {
        console.error('Error cargando proveedores:', error);
        tabla.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:30px; color:#b7410e;">
                    No se pudieron cargar los proveedores.
                </td>
            </tr>
        `;
    }
}

window.guardarProveedor = async function(event) {
    event.preventDefault();

    const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));

    const data = {
        nombre: document.getElementById('proveedor-nombre').value.trim(),
        contacto: document.getElementById('proveedor-contacto').value.trim(),
        correo: document.getElementById('proveedor-correo').value.trim(),
        telefono: document.getElementById('proveedor-telefono').value.trim(),
        usuario_id: usuarioActual ? usuarioActual.id : null
    };

    try {
        const respuesta = await fetch('http://localhost:3000/api/proveedores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            return Swal.fire({
                icon: 'error',
                title: resultado.error || 'No se pudo registrar',
                confirmButtonColor: '#3c4a45'
            });
        }

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Proveedor registrado',
            showConfirmButton: false,
            timer: 2000
        });

        document.getElementById('form-alta-proveedor').reset();
        await cargarProveedores();

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            confirmButtonColor: '#3c4a45'
        });
    }
}

window.editarProveedor = function(id) {
    const proveedor = proveedoresSCMCache.find(item => Number(item.id) === Number(id));
    if (!proveedor) return;

    Swal.fire({
        title: 'Editar Proveedor',
        html: `
            <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
                <label>Nombre:</label>
                <input type="text" id="edit-proveedor-nombre" class="swal2-input" style="margin:0; width:100%;" value="${escaparHtmlSCM(proveedor.nombre)}">

                <label>Contacto:</label>
                <input type="text" id="edit-proveedor-contacto" class="swal2-input" style="margin:0; width:100%;" value="${escaparHtmlSCM(proveedor.contacto || '')}">

                <label>Correo:</label>
                <input type="email" id="edit-proveedor-correo" class="swal2-input" style="margin:0; width:100%;" value="${escaparHtmlSCM(proveedor.correo || '')}">

                <label>Teléfono:</label>
                <input type="text" id="edit-proveedor-telefono" class="swal2-input" style="margin:0; width:100%;" value="${escaparHtmlSCM(proveedor.telefono || '')}">

                <label>Estado:</label>
                <select id="edit-proveedor-estado" class="swal2-select" style="margin:0; width:100%;">
                    <option value="activo" ${proveedor.estado === 'activo' ? 'selected' : ''}>Activo</option>
                    <option value="inactivo" ${proveedor.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3c4a45',
        preConfirm: () => {
            const nombre = document.getElementById('edit-proveedor-nombre').value.trim();

            if (!nombre) {
                Swal.showValidationMessage('El nombre es obligatorio');
                return false;
            }

            return {
                nombre,
                contacto: document.getElementById('edit-proveedor-contacto').value.trim(),
                correo: document.getElementById('edit-proveedor-correo').value.trim(),
                telefono: document.getElementById('edit-proveedor-telefono').value.trim(),
                estado: document.getElementById('edit-proveedor-estado').value
            };
        }
    }).then(async result => {
        if (!result.isConfirmed) return;

        const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));
        result.value.usuario_id = usuarioActual ? usuarioActual.id : null;

        try {
            const respuesta = await fetch(`http://localhost:3000/api/proveedores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.value)
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                return Swal.fire({
                    icon: 'error',
                    title: datos.error || 'No se pudo actualizar',
                    confirmButtonColor: '#3c4a45'
                });
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Proveedor actualizado',
                showConfirmButton: false,
                timer: 2000
            });

            cargarProveedores();

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                confirmButtonColor: '#3c4a45'
            });
        }
    });
}

window.eliminarProveedor = function(id) {
    const proveedor = proveedoresSCMCache.find(item => Number(item.id) === Number(id));
    if (!proveedor) return;

    Swal.fire({
        title: `¿Dar de baja ${proveedor.nombre}?`,
        text: 'El proveedor quedará inactivo y conservará su historial.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#b7410e',
        cancelButtonColor: '#8a8a8a',
        confirmButtonText: 'Sí, dar de baja',
        cancelButtonText: 'Cancelar'
    }).then(async result => {
        if (!result.isConfirmed) return;

        const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));

        try {
            const respuesta = await fetch(`http://localhost:3000/api/proveedores/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: usuarioActual ? usuarioActual.id : null
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                return Swal.fire({
                    icon: 'error',
                    title: datos.error || 'No se pudo dar de baja',
                    confirmButtonColor: '#3c4a45'
                });
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Proveedor dado de baja',
                showConfirmButton: false,
                timer: 2000
            });

            cargarProveedores();

            if (document.getElementById('producto-proveedor')) {
                cargarProveedoresEnProductos();
            }

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                confirmButtonColor: '#3c4a45'
            });
        }
    });
}

window.filtrarProveedores = function() {
    const input = document.getElementById('proveedor-busqueda');
    const selectEstado = document.getElementById('proveedor-estado');

    if (!input || !selectEstado) return;

    const texto = input.value.toLowerCase().trim();
    const estado = selectEstado.value;

    document.querySelectorAll('.proveedor-row').forEach(fila => {
        const nombre = fila.dataset.nombre || '';
        const contacto = fila.dataset.contacto || '';
        const estadoFila = fila.dataset.estado || '';

        const coincideTexto = nombre.includes(texto) || contacto.includes(texto);
        const coincideEstado = estado === 'todos' || estadoFila === estado;

        fila.style.display = coincideTexto && coincideEstado
            ? ''
            : 'none';
    });
}

// ============================================================
// SCM: INSUMOS, INVENTARIO Y RECETAS
// ============================================================

let insumosSCMCache = [];
let inventarioSCMCache = [];
let movimientosInventarioCache = [];

function usuarioSCMActual() {
    return JSON.parse(localStorage.getItem('casaBarro_usuario'));
}

function fechaSCM(fecha) {
    if (!fecha) return '-';
    const iso = fecha.includes('T') ? fecha : fecha.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? fecha : d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

// -------------------- INSUMOS --------------------
window.cargarProveedoresEnInsumos = async function() {
    const select = document.getElementById('insumo-proveedor');
    if (!select) return;

    try {
        const proveedores = await obtenerProveedoresSCM(true);
        select.innerHTML = '<option value="">Sin proveedor</option>';
        proveedores.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${escaparHtmlSCM(p.nombre)}</option>`;
        });
    } catch (error) {
        console.error('Error cargando proveedores para insumos:', error);
    }
}

window.cargarInsumos=async function(){
    const tabla=document.getElementById('tabla-insumos');if(!tabla)return;
    try{
        const respuesta=await fetch('http://localhost:3000/api/insumos',{cache:'no-store'}),resultado=await respuesta.json();
        if(!respuesta.ok)throw new Error(resultado.error||'No se pudieron cargar los insumos');
        insumosSCMCache=resultado.data||[];
        if(!insumosSCMCache.length){tabla.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:#777;">No hay insumos registrados.</td></tr>';return;}
        tabla.innerHTML=insumosSCMCache.map(i=>{
            const estrategia=['PUSH','PULL'].includes(String(i.estrategia_reposicion||'').toUpperCase())?String(i.estrategia_reposicion).toUpperCase():'PUSH';
            const colorEstrategia=estrategia==='PUSH'?'#6f42c1':'#2980b9',colorEstado=i.estado==='activo'?'#557268':'#777';
            return `<tr class="insumo-row" data-nombre="${escaparHtmlSCM(i.nombre).toLowerCase()}" data-estado="${i.estado}" data-estrategia="${estrategia}" style="border-bottom:1px solid #eae5db;">
                <td>${i.id}</td><td><strong>${escaparHtmlSCM(i.nombre)}</strong><br><small style="color:#777;">${escaparHtmlSCM(i.descripcion||'Sin descripción')}</small></td>
                <td>${escaparHtmlSCM(i.proveedor_nombre||'Sin proveedor')}</td><td>$${Number(i.costo_porcion||0).toFixed(2)}</td>
                <td><span style="background:${colorEstrategia};color:white;padding:3px 8px;border-radius:12px;font-size:.8rem;font-weight:bold;">${estrategia}</span></td>
                <td>${Number(i.dias_cobertura||7)} días</td><td>${Number(i.stock_minimo||0)}</td>
                <td><span style="background:${colorEstado};color:white;padding:3px 8px;border-radius:12px;font-size:.8rem;">${escaparHtmlSCM(i.estado||'activo')}</span></td>
                <td class="admin-actions" style="display:flex;gap:5px;flex-wrap:wrap;"><button onclick="editarInsumo(${i.id})">Editar</button><button onclick="eliminarInsumo(${i.id})" style="background:#b7410e;color:white;">Eliminar</button></td></tr>`;
        }).join('');filtrarInsumos();
    }catch(error){console.error(error);tabla.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:#b7410e;">No se pudieron cargar los insumos.</td></tr>';}
}
window.guardarInsumo=async function(event){
    event.preventDefault();const usuario=usuarioSCMActual();
    const estrategia=document.getElementById('insumo-estrategia').value,dias_cobertura=Number(document.getElementById('insumo-cobertura').value),stock_minimo=Number(document.getElementById('insumo-minimo').value);
    const data={nombre:document.getElementById('insumo-nombre').value.trim(),descripcion:document.getElementById('insumo-descripcion').value.trim(),proveedor_id:document.getElementById('insumo-proveedor').value||null,costo_porcion:Number(document.getElementById('insumo-costo').value),stock_actual:Number(document.getElementById('insumo-stock').value),stock_minimo,usuario_id:usuario?.id||null};
    if(!data.nombre)return Swal.fire({icon:'warning',title:'Nombre obligatorio',confirmButtonColor:'#3c4a45'});
    if([data.costo_porcion,data.stock_actual,stock_minimo].some(n=>!Number.isFinite(n)||n<0)||!Number.isInteger(data.stock_actual)||!Number.isInteger(stock_minimo))return Swal.fire({icon:'warning',title:'Valores no válidos',text:'Costo y existencias deben ser números no negativos; los stocks deben ser enteros.',confirmButtonColor:'#3c4a45'});
    if(!['PUSH','PULL'].includes(estrategia)||!Number.isInteger(dias_cobertura)||dias_cobertura<1||dias_cobertura>90)return Swal.fire({icon:'warning',title:'Configuración logística no válida',confirmButtonColor:'#3c4a45'});
    try{
        const respuesta=await fetch('http://localhost:3000/api/insumos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),resultado=await respuesta.json();
        if(!respuesta.ok)return Swal.fire({icon:'error',title:resultado.error||'No se pudo registrar',confirmButtonColor:'#3c4a45'});
        const rc=await fetch(`http://localhost:3000/api/scm/insumos/${resultado.id}/configuracion`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({estrategia_reposicion:estrategia,dias_cobertura,stock_minimo,usuario_id:usuario?.id||null})}),cfg=await rc.json();
        if(!rc.ok)await Swal.fire({icon:'warning',title:'Insumo creado con configuración pendiente',text:cfg.error||'No se pudo guardar PUSH/PULL.',confirmButtonColor:'#3c4a45'});
        else Swal.fire({toast:true,position:'top-end',icon:'success',title:cfg.pedido_automatico?.creado?`Insumo creado. Pedido PUSH #${cfg.pedido_automatico.pedido_id} generado.`:'Insumo registrado',showConfirmButton:false,timer:2200});
        document.getElementById('form-alta-insumo').reset();document.getElementById('insumo-costo').value=0;document.getElementById('insumo-stock').value=0;document.getElementById('insumo-minimo').value=0;document.getElementById('insumo-cobertura').value=7;document.getElementById('insumo-estrategia').value='PUSH';await cargarInsumos();
    }catch(error){Swal.fire({icon:'error',title:'Error de conexión',text:error.message,confirmButtonColor:'#3c4a45'});}
}
window.editarInsumo=async function(id){
    const i=insumosSCMCache.find(x=>Number(x.id)===Number(id));if(!i)return;
    let proveedores=[];try{proveedores=await obtenerProveedoresSCM(false);}catch(e){}
    let opciones='<option value="">Sin proveedor</option>';proveedores.forEach(p=>opciones+=`<option value="${p.id}" ${Number(p.id)===Number(i.proveedor_id)?'selected':''}>${escaparHtmlSCM(p.nombre)}${p.estado==='inactivo'?' (Inactivo)':''}</option>`);
    const estrategiaActual=['PUSH','PULL'].includes(String(i.estrategia_reposicion||'').toUpperCase())?String(i.estrategia_reposicion).toUpperCase():'PUSH';
    const result=await Swal.fire({title:'Editar Insumo',width:'600px',showCancelButton:true,confirmButtonText:'Actualizar',cancelButtonText:'Cancelar',confirmButtonColor:'#3c4a45',html:`<div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
        <label>Nombre:</label><input id="edit-insumo-nombre" class="swal2-input" style="margin:0;width:100%;" value="${escaparHtmlSCM(i.nombre)}">
        <label>Descripción:</label><textarea id="edit-insumo-descripcion" class="swal2-textarea" style="margin:0;width:100%;">${escaparHtmlSCM(i.descripcion||'')}</textarea>
        <label>Proveedor:</label><select id="edit-insumo-proveedor" class="swal2-select" style="margin:0;width:100%;">${opciones}</select>
        <label>Costo por porción:</label><input type="number" id="edit-insumo-costo" class="swal2-input" min="0" step="0.01" style="margin:0;width:100%;" value="${Number(i.costo_porcion||0)}">
        <label>Estrategia:</label><select id="edit-insumo-estrategia" class="swal2-select" style="margin:0;width:100%;"><option value="PUSH" ${estrategiaActual==='PUSH'?'selected':''}>PUSH - reposición automática planificada</option><option value="PULL" ${estrategiaActual==='PULL'?'selected':''}>PULL - reposición según demanda</option></select>
        <label>Días de cobertura:</label><input type="number" id="edit-insumo-cobertura" class="swal2-input" min="1" max="90" step="1" style="margin:0;width:100%;" value="${Number(i.dias_cobertura||7)}">
        <label>Stock mínimo:</label><input type="number" id="edit-insumo-minimo" class="swal2-input" min="0" step="1" style="margin:0;width:100%;" value="${Number(i.stock_minimo||0)}">
        <label>Estado:</label><select id="edit-insumo-estado" class="swal2-select" style="margin:0;width:100%;"><option value="activo" ${i.estado==='activo'?'selected':''}>Activo</option><option value="inactivo" ${i.estado==='inactivo'?'selected':''}>Inactivo</option></select>
        <small style="color:#777;">PUSH calcula y genera la reposición automáticamente según consumo y cobertura. PULL reacciona a la demanda y deja el pedido para confirmación manual. El stock actual se modifica desde Inventario.</small></div>`,preConfirm:()=>{
            const nombre=document.getElementById('edit-insumo-nombre').value.trim(),costo=Number(document.getElementById('edit-insumo-costo').value),stock_minimo=Number(document.getElementById('edit-insumo-minimo').value),dias_cobertura=Number(document.getElementById('edit-insumo-cobertura').value),estrategia_reposicion=document.getElementById('edit-insumo-estrategia').value;
            if(!nombre)return Swal.showValidationMessage('El nombre es obligatorio');if(!Number.isFinite(costo)||costo<0||!Number.isInteger(stock_minimo)||stock_minimo<0)return Swal.showValidationMessage('Costo o stock mínimo no válido');if(!Number.isInteger(dias_cobertura)||dias_cobertura<1||dias_cobertura>90)return Swal.showValidationMessage('La cobertura debe estar entre 1 y 90 días.');
            return {nombre,descripcion:document.getElementById('edit-insumo-descripcion').value.trim(),proveedor_id:document.getElementById('edit-insumo-proveedor').value||null,costo_porcion:costo,stock_minimo,estado:document.getElementById('edit-insumo-estado').value,estrategia_reposicion,dias_cobertura};
        }});
    if(!result.isConfirmed)return;result.value.usuario_id=usuarioSCMActual()?.id||null;
    try{
        const respuesta=await fetch(`http://localhost:3000/api/insumos/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(result.value)}),datos=await respuesta.json();
        if(!respuesta.ok)return Swal.fire({icon:'error',title:datos.error||'No se pudo actualizar',confirmButtonColor:'#3c4a45'});
        const rc=await fetch(`http://localhost:3000/api/scm/insumos/${id}/configuracion`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({estrategia_reposicion:result.value.estrategia_reposicion,dias_cobertura:result.value.dias_cobertura,stock_minimo:result.value.stock_minimo,usuario_id:result.value.usuario_id})}),cfg=await rc.json();
        if(!rc.ok)return Swal.fire({icon:'warning',title:'Datos actualizados, configuración logística pendiente',text:cfg.error||'',confirmButtonColor:'#3c4a45'});
        Swal.fire({toast:true,position:'top-end',icon:'success',title:cfg.pedido_automatico?.creado?`Insumo actualizado. Pedido PUSH #${cfg.pedido_automatico.pedido_id} generado.`:'Insumo actualizado',showConfirmButton:false,timer:2200});await cargarInsumos();
    }catch(e){Swal.fire({icon:'error',title:'Error de conexión',text:e.message,confirmButtonColor:'#3c4a45'});}
}
window.eliminarInsumo=function(id){
    const i=insumosSCMCache.find(x=>Number(x.id)===Number(id));if(!i)return;
    Swal.fire({title:`¿Dar de baja ${i.nombre}?`,text:'El historial de inventario y las recetas se conservarán.',icon:'warning',showCancelButton:true,confirmButtonColor:'#b7410e',confirmButtonText:'Sí, dar de baja',cancelButtonText:'Cancelar'}).then(async r=>{
        if(!r.isConfirmed)return;try{const respuesta=await fetch(`http://localhost:3000/api/insumos/${id}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario_id:usuarioSCMActual()?.id||null})}),datos=await respuesta.json();if(!respuesta.ok)return Swal.fire({icon:'error',title:datos.error||'No se pudo dar de baja',confirmButtonColor:'#3c4a45'});Swal.fire({toast:true,position:'top-end',icon:'success',title:'Insumo dado de baja',showConfirmButton:false,timer:1800});await cargarInsumos();}catch(e){Swal.fire({icon:'error',title:'Error de conexión',confirmButtonColor:'#3c4a45'});}
    });
}
window.filtrarInsumos=function(){
    const texto=(document.getElementById('insumo-busqueda')?.value||'').toLowerCase().trim(),estado=document.getElementById('insumo-estado')?.value||'todos',estrategia=document.getElementById('insumo-estrategia-filtro')?.value||'todos';
    document.querySelectorAll('.insumo-row').forEach(f=>{const okTexto=(f.dataset.nombre||'').includes(texto),okEstado=estado==='todos'||f.dataset.estado===estado,okEstrategia=estrategia==='todos'||f.dataset.estrategia===estrategia;f.style.display=okTexto&&okEstado&&okEstrategia?'':'none';});
}

// -------------------- INVENTARIO --------------------
window.cargarInventario = async function() {
    const tabla = document.getElementById('tabla-inventario');
    if (!tabla) return;

    try {
        const respuesta = await fetch('http://localhost:3000/api/inventario', { cache:'no-store' });
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo cargar el inventario');

        inventarioSCMCache = resultado.data || [];

        const total = inventarioSCMCache.filter(i => i.insumo_estado === 'activo').length;
        const bajos = inventarioSCMCache.filter(i => i.insumo_estado === 'activo' && i.estado === 'bajo').length;
        const agotados = inventarioSCMCache.filter(i => i.insumo_estado === 'activo' && i.estado === 'agotado').length;
        const pedidos = inventarioSCMCache.filter(i => i.pedido_abierto_id).length;

        const setKpi = (id, valor) => {
            const el = document.getElementById(id);
            if (el) el.textContent = valor;
        };
        setKpi('inventario-k-total', total);
        setKpi('inventario-k-bajo', bajos);
        setKpi('inventario-k-agotado', agotados);
        setKpi('inventario-k-pedidos', pedidos);

        if (inventarioSCMCache.length === 0) {
            tabla.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#777;">No hay inventario configurado.</td></tr>';
            return;
        }

        tabla.innerHTML = inventarioSCMCache.map(item => {
            const color = item.estado === 'agotado' ? '#b7410e' : item.estado === 'bajo' ? '#d9822b' : '#557268';
            const textoEstado = item.estado === 'bajo' ? 'Stock bajo' : item.estado === 'agotado' ? 'Agotado' : 'Normal';
            const estrategia = String(item.estrategia_reposicion || 'PUSH').toUpperCase();
            const colorEstrategia = estrategia === 'PUSH' ? '#6f42c1' : '#2980b9';

            let pedidoHtml = '<span style="color:#777;">Sin pedido</span>';
            let pendienteHtml = '—';
            if (item.pedido_abierto_id) {
                const estados = {
                    pendiente: ['Pendiente', '#fff3cd', '#7a5b00'],
                    enviado: ['Enviado', '#dbeafe', '#1d4ed8'],
                    parcial: ['Parcial', '#fde68a', '#8a5d00']
                };
                const conf = estados[item.pedido_estado] || [item.pedido_estado, '#eee', '#444'];
                pedidoHtml = `<strong>#${item.pedido_abierto_id}</strong><br><span style="display:inline-block; margin-top:4px; padding:3px 8px; border-radius:12px; background:${conf[1]}; color:${conf[2]}; font-size:.78rem; font-weight:bold;">${escaparHtmlSCM(conf[0])}</span>`;
                pendienteHtml = `${Number(item.pedido_pendiente || 0)} porciones`;
            }

            return `<tr class="inventario-row"
                        data-nombre="${escaparHtmlSCM(item.insumo_nombre).toLowerCase()}"
                        data-estado="${item.estado}"
                        data-estrategia="${estrategia}"
                        data-pedido="${item.pedido_abierto_id ? 'abierto' : 'sin'}">
                <td>${item.insumo_id}</td>
                <td><strong>${escaparHtmlSCM(item.insumo_nombre)}</strong></td>
                <td>${escaparHtmlSCM(item.proveedor_nombre || 'Sin proveedor')}</td>
                <td><span style="background:${colorEstrategia}; color:white; padding:3px 8px; border-radius:12px; font-size:.8rem; font-weight:bold;">${estrategia}</span></td>
                <td>${Number(item.stock_actual || 0)}</td>
                <td>${Number(item.stock_minimo || 0)}</td>
                <td>${pedidoHtml}</td>
                <td>${pendienteHtml}</td>
                <td><span style="background:${color}; color:white; padding:3px 8px; border-radius:12px; font-size:.8rem;">${textoEstado}</span></td>
                <td class="admin-actions" style="display:flex; gap:5px; flex-wrap:wrap;">
                    <button onclick="abrirMovimientoInventario(${item.insumo_id})">Movimiento</button>
                    <button onclick="verMovimientosInsumo(${item.insumo_id})" style="background:#557268; color:white;">Historial</button>
                    <button onclick="irLogistica(${item.insumo_id}, '${escaparHtmlSCM(item.insumo_nombre).replace(/'/g, '&#39;')}')" style="background:#6f42c1; color:white;">Logística</button>
                </td>
            </tr>`;
        }).join('');

        filtrarInventario();
    } catch (error) {
        console.error(error);
        tabla.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#b7410e;">No se pudo cargar el inventario.</td></tr>';
    }
}

window.irLogistica = function(insumoId, nombre = '') {
    localStorage.setItem('casaBarro_logistica_insumo', JSON.stringify({ id:Number(insumoId), nombre:String(nombre || '') }));
    window.location.href = 'admin-logistica.html';
}

window.cargarMovimientosInventario = async function() {
    const tabla = document.getElementById('tabla-movimientos-inventario');
    if (!tabla) return;

    try {
        const respuesta = await fetch('http://localhost:3000/api/inventario/movimientos');
        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.error || 'No se pudieron cargar los movimientos');
        movimientosInventarioCache = resultado.data || [];

        tabla.innerHTML = movimientosInventarioCache.length ? movimientosInventarioCache.map(m => {
            const color = m.tipo === 'entrada' ? '#198754' : '#b7410e';
            return `<tr class="movimiento-inventario-row" data-tipo="${m.tipo}"><td>${fechaSCM(m.fecha)}</td><td>${escaparHtmlSCM(m.insumo_nombre || '-')}</td><td><span style="background:${color}; color:white; padding:3px 8px; border-radius:12px; font-size:0.8rem;">${escaparHtmlSCM(m.tipo)}</span></td><td>${m.cantidad}</td><td>${escaparHtmlSCM(m.motivo)}</td><td>${escaparHtmlSCM(m.usuario_nombre || '-')}</td></tr>`;
        }).join('') : '<tr><td colspan="6" style="text-align:center; padding:30px; color:#777;">No hay movimientos registrados.</td></tr>';

        filtrarMovimientosInventario();
    } catch (error) {
        console.error(error);
    }
}

window.filtrarInventario = function() {
    const texto = (document.getElementById('inventario-busqueda')?.value || '').toLowerCase().trim();
    const estado = document.getElementById('inventario-estado')?.value || 'todos';
    const estrategia = document.getElementById('inventario-estrategia')?.value || 'todos';
    const pedido = document.getElementById('inventario-pedido')?.value || 'todos';

    document.querySelectorAll('.inventario-row').forEach(fila => {
        const coincideTexto = (fila.dataset.nombre || '').includes(texto);
        const coincideEstado = estado === 'todos' || fila.dataset.estado === estado;
        const coincideEstrategia = estrategia === 'todos' || fila.dataset.estrategia === estrategia;
        const coincidePedido = pedido === 'todos' || fila.dataset.pedido === pedido;
        fila.style.display = coincideTexto && coincideEstado && coincideEstrategia && coincidePedido ? '' : 'none';
    });
}

window.filtrarMovimientosInventario = function() {
    const tipo = document.getElementById('movimiento-tipo')?.value || 'todos';
    document.querySelectorAll('.movimiento-inventario-row').forEach(fila => {
        fila.style.display = tipo === 'todos' || fila.dataset.tipo === tipo ? '' : 'none';
    });
}

window.abrirMovimientoInventario = async function(insumoPreseleccionado = null) {
    let insumos = [];
    try {
        const res = await fetch('http://localhost:3000/api/insumos?activos=1');
        const datos = await res.json();
        if (!res.ok) throw new Error(datos.error);
        insumos = datos.data || [];
    } catch (e) {
        return Swal.fire({ icon:'error', title:'No se pudieron cargar los insumos', confirmButtonColor:'#3c4a45' });
    }

    if (insumos.length === 0) return Swal.fire({ icon:'info', title:'Primero registra un insumo', confirmButtonColor:'#3c4a45' });
    const opciones = insumos.map(i => `<option value="${i.id}" ${Number(i.id) === Number(insumoPreseleccionado) ? 'selected' : ''}>${escaparHtmlSCM(i.nombre)} (${i.stock_actual} porciones)</option>`).join('');

    const result = await Swal.fire({
        title:'Registrar Movimiento', width:'520px', showCancelButton:true, confirmButtonText:'Registrar', cancelButtonText:'Cancelar', confirmButtonColor:'#3c4a45',
        html:`<div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
            <label>Insumo:</label><select id="mov-insumo" class="swal2-select" style="margin:0; width:100%;">${opciones}</select>
            <label>Tipo:</label><select id="mov-tipo" class="swal2-select" style="margin:0; width:100%;"><option value="entrada">Entrada</option><option value="salida">Salida</option></select>
            <label>Cantidad de porciones:</label><input type="number" id="mov-cantidad" class="swal2-input" min="1" step="1" value="1" style="margin:0; width:100%;">
            <label>Motivo:</label><select id="mov-motivo" class="swal2-select" style="margin:0; width:100%;"><option value="reposición">Reposición</option><option value="venta">Venta</option><option value="ajuste">Ajuste</option><option value="merma">Merma</option></select>
        </div>`,
        preConfirm:() => {
            const cantidad = Number(document.getElementById('mov-cantidad').value);
            if (!Number.isInteger(cantidad) || cantidad <= 0) return Swal.showValidationMessage('La cantidad debe ser mayor que cero');
            return { insumo_id:Number(document.getElementById('mov-insumo').value), tipo:document.getElementById('mov-tipo').value, cantidad, motivo:document.getElementById('mov-motivo').value };
        }
    });

    if (!result.isConfirmed) return;
    result.value.usuario_id = usuarioSCMActual()?.id || null;

    try {
        const respuesta = await fetch('http://localhost:3000/api/inventario/movimiento', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(result.value) });
        const datos = await respuesta.json();
        if (!respuesta.ok) return Swal.fire({ icon:'error', title:datos.error || 'No se pudo registrar', confirmButtonColor:'#3c4a45' });
        Swal.fire({ toast:true, position:'top-end', icon:'success', title:`Movimiento registrado. Stock: ${datos.stock_actual}`, showConfirmButton:false, timer:2200 });
        await cargarInventario();
        await cargarMovimientosInventario();
        if (document.getElementById('tabla-productos-admin')) cargarProductosAdmin();
    } catch (e) {
        Swal.fire({ icon:'error', title:'Error de conexión', confirmButtonColor:'#3c4a45' });
    }
}

window.verMovimientosInsumo = async function(insumoId) {
    try {
        const res = await fetch(`http://localhost:3000/api/insumos/${insumoId}/movimientos`);
        const datos = await res.json();
        if (!res.ok) throw new Error(datos.error);
        const filas = (datos.data || []).map(m => `<tr><td style="padding:6px;">${fechaSCM(m.fecha)}</td><td style="padding:6px;">${escaparHtmlSCM(m.tipo)}</td><td style="padding:6px;">${m.cantidad}</td><td style="padding:6px;">${escaparHtmlSCM(m.motivo)}</td></tr>`).join('');
        Swal.fire({ title:'Historial del Insumo', width:'700px', confirmButtonColor:'#3c4a45', html:`<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; text-align:left;"><thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th></tr></thead><tbody>${filas || '<tr><td colspan="4" style="padding:15px; text-align:center;">Sin movimientos</td></tr>'}</tbody></table></div>` });
    } catch (e) {
        Swal.fire({ icon:'error', title:'No se pudo cargar el historial', confirmButtonColor:'#3c4a45' });
    }
}

// -------------------- RECETAS --------------------
window.gestionarReceta = async function(productoId) {
    const producto = productosAdminCache.find(p => Number(p.id) === Number(productoId));
    if (!producto) return;

    try {
        const [resReceta, resInsumos, resDisp] = await Promise.all([
            fetch(`http://localhost:3000/api/productos/${productoId}/insumos`),
            fetch('http://localhost:3000/api/insumos?activos=1'),
            fetch(`http://localhost:3000/api/productos/${productoId}/disponibilidad`)
        ]);
        const [recetaData, insumosData, dispData] = await Promise.all([resReceta.json(), resInsumos.json(), resDisp.json()]);
        if (!resReceta.ok || !resInsumos.ok || !resDisp.ok) throw new Error(recetaData.error || insumosData.error || dispData.error);

        const receta = recetaData.data || [];
        const insumos = insumosData.data || [];
        const opciones = insumos.map(i => `<option value="${i.id}">${escaparHtmlSCM(i.nombre)} (${i.stock_actual} disponibles)</option>`).join('');
        const filas = receta.map(r => `<tr><td style="padding:7px;">${escaparHtmlSCM(r.insumo_nombre)}</td><td style="padding:7px; text-align:center;">${r.porciones_requeridas}</td><td style="padding:7px; text-align:center;">${r.stock_actual}</td><td style="padding:7px; text-align:center;"><button type="button" onclick="eliminarInsumoReceta(${productoId}, ${r.insumo_id})" style="background:#b7410e; color:white; border:none; padding:5px 8px; border-radius:5px; cursor:pointer;">Quitar</button></td></tr>`).join('');

        const result = await Swal.fire({
            title:`Receta: ${producto.nombre}`, width:'720px', showCancelButton:true, showConfirmButton:insumos.length > 0,
            confirmButtonText:'Agregar / actualizar', cancelButtonText:'Cerrar', confirmButtonColor:'#3c4a45',
            html:`<div style="text-align:left;">
                <div style="background:#f4f7f6; border-radius:10px; padding:12px; margin-bottom:15px;"><strong>Platillos disponibles:</strong> ${Number(dispData.disponibles || 0)}</div>
                <div style="overflow-x:auto; margin-bottom:16px;"><table style="width:100%; border-collapse:collapse;"><thead><tr><th>Insumo</th><th>Porciones</th><th>Stock</th><th></th></tr></thead><tbody>${filas || '<tr><td colspan="4" style="padding:15px; text-align:center; color:#777;">La receta aún no tiene insumos.</td></tr>'}</tbody></table></div>
                ${insumos.length ? `<label style="font-weight:bold;">Insumo:</label><select id="receta-insumo" class="swal2-select" style="margin:6px 0 10px 0; width:100%;">${opciones}</select><label style="font-weight:bold;">Porciones requeridas:</label><input id="receta-porciones" type="number" min="1" step="1" value="1" class="swal2-input" style="margin:6px 0 0 0; width:100%;">` : '<p style="color:#b7410e;">No hay insumos activos. Registra insumos antes de configurar la receta.</p>'}
            </div>`,
            preConfirm:() => {
                if (!insumos.length) return false;
                const porciones = Number(document.getElementById('receta-porciones').value);
                if (!Number.isInteger(porciones) || porciones <= 0) return Swal.showValidationMessage('Las porciones deben ser un entero mayor que cero');
                return { insumo_id:Number(document.getElementById('receta-insumo').value), porciones_requeridas:porciones };
            }
        });

        if (!result.isConfirmed) return;
        result.value.usuario_id = usuarioSCMActual()?.id || null;
        const respuesta = await fetch(`http://localhost:3000/api/productos/${productoId}/insumos`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(result.value) });
        const datos = await respuesta.json();
        if (!respuesta.ok) return Swal.fire({ icon:'error', title:datos.error || 'No se pudo actualizar la receta', confirmButtonColor:'#3c4a45' });

        await cargarProductosAdmin();
        gestionarReceta(productoId);
    } catch (error) {
        console.error(error);
        Swal.fire({ icon:'error', title:'No se pudo cargar la receta', text:error.message || '', confirmButtonColor:'#3c4a45' });
    }
}

window.eliminarInsumoReceta = async function(productoId, insumoId) {
    try {
        const res = await fetch(`http://localhost:3000/api/productos/${productoId}/insumos/${insumoId}`, {
            method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ usuario_id:usuarioSCMActual()?.id || null })
        });
        const datos = await res.json();
        if (!res.ok) return Swal.fire({ icon:'error', title:datos.error || 'No se pudo quitar el insumo', confirmButtonColor:'#3c4a45' });
        Swal.close();
        await cargarProductosAdmin();
        gestionarReceta(productoId);
    } catch (e) {
        Swal.fire({ icon:'error', title:'Error de conexión', confirmButtonColor:'#3c4a45' });
    }
}

// ============================================================
// ERP - ÓRDENES DE CLIENTES
// ============================================================

let ordenesAdminCache=[];


// ============================================================
// UTILIDADES ERP
// ============================================================

function usuarioERPActual(){
    try{
        return JSON.parse(
            localStorage.getItem(
                'casaBarro_usuario'
            )
        );
    }catch(_){
        return null;
    }
}

function escaparHtmlERP(valor){
    return escaparHtmlSCM(
        valor==null
            ?''
            :String(valor)
    );
}

function fechaERP(fecha){
    if(!fecha){
        return '—';
    }

    const valor=
        new Date(
            String(fecha).includes('T')
                ?fecha
                :String(fecha).replace(' ','T')
        );

    if(Number.isNaN(valor.getTime())){
        return escaparHtmlERP(fecha);
    }

    return valor.toLocaleString(
        'es-MX',
        {
            dateStyle:'short',
            timeStyle:'short'
        }
    );
}

async function apiERP(ruta,opciones={}){
    const config={
        ...opciones,
        headers:{
            'Content-Type':'application/json',
            ...(opciones.headers||{})
        }
    };

    const respuesta=
        await fetch(
            `http://localhost:3000${ruta}`,
            config
        );

    let datos={};

    try{
        datos=await respuesta.json();
    }catch(_){}

    if(!respuesta.ok){
        throw new Error(
            datos.error||
            `Error HTTP ${respuesta.status}`
        );
    }

    return datos;
}

function textoEstadoOrdenERP(estado){
    const nombres={
        pendiente:'Pendiente',
        preparacion:'En Preparación',
        entregado:'Entregado',
        cancelado:'Cancelado'
    };

    return nombres[estado]||estado||'—';
}

function textoTipoProcesoERP(tipo){
    const nombres={
        CREACION:'Creación de orden',
        PROCESAMIENTO:'Inicio del procesamiento',
        VALIDACION_CLIENTE:'Validación de cliente',
        VALIDACION_INVENTARIO:'Validación de inventario',
        ACTUALIZACION_INVENTARIO:'Actualización de inventario',
        MOVIMIENTOS_INVENTARIO:'Movimientos de inventario',
        INTEGRACION_CRM:'Integración CRM',
        FINALIZACION:'Finalización',
        CAMBIO_ESTADO:'Cambio de estado',
        ERROR_PROCESAMIENTO:'Error de procesamiento'
    };

    return nombres[tipo]||tipo||'Movimiento';
}


// ============================================================
// CARGAR ÓRDENES
// ============================================================

window.cargarOrdenesAdmin=
async function(){

    const tabla=
        document.getElementById(
            'tabla-ordenes-admin'
        );

    if(!tabla){
        return;
    }

    tabla.innerHTML=`
        <tr>
            <td
                colspan="7"
                style="
                    text-align:center;
                    padding:25px;
                "
            >
                Cargando...
            </td>
        </tr>
    `;

    try{
        const respuesta=
            await apiERP(
                '/api/ordenes'
            );

        ordenesAdminCache=
            respuesta.data||[];

        renderOrdenesAdmin();

    }catch(error){
        console.error(
            'Error cargando órdenes:',
            error
        );

        tabla.innerHTML=`
            <tr>
                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:30px;
                        color:#b7410e;
                    "
                >
                    ${escaparHtmlERP(error.message)}
                </td>
            </tr>
        `;
    }
}


// ============================================================
// FILTRAR
// ============================================================

window.filtrarOrdenesAdmin=
function(){
    renderOrdenesAdmin();
}


function renderOrdenesAdmin(){

    const tabla=
        document.getElementById(
            'tabla-ordenes-admin'
        );

    if(!tabla){
        return;
    }

    const texto=
        (
            document.getElementById(
                'ordenes-busqueda'
            )?.value||''
        )
        .trim()
        .toLowerCase();

    const estado=
        document.getElementById(
            'ordenes-estado'
        )?.value||
        'todos';

    const ordenes=
        ordenesAdminCache.filter(
            orden=>{
                const cadena=
                    `#${orden.id} ${orden.cliente_nombre||''}`
                    .toLowerCase();

                const coincideTexto=
                    !texto||
                    cadena.includes(texto);

                const coincideEstado=
                    estado==='todos'||
                    orden.estado===estado;

                return coincideTexto&&coincideEstado;
            }
        );

    if(!ordenes.length){
        tabla.innerHTML=`
            <tr>
                <td
                    colspan="7"
                    class="orden-vacio"
                >
                    No hay órdenes que coincidan con el filtro.
                </td>
            </tr>
        `;
        return;
    }

    tabla.innerHTML=
        ordenes.map(
            orden=>{
                let acciones=`
                    <button
                        class="orden-btn orden-ver"
                        onclick="verDetallePedidoAdmin(${orden.id})"
                    >
                        Ver
                    </button>
                `;

                // Una orden pendiente todavía no ha descontado inventario.
                if(orden.estado==='pendiente'){
                    acciones+=`
                        <button
                            class="orden-btn orden-avanzar"
                            onclick="cambiarEstadoPedidoAdmin(${orden.id})"
                        >
                            Iniciar preparación
                        </button>
                    `;

                    acciones+=`
                        <button
                            class="orden-btn orden-cancelar"
                            onclick="cancelarOrdenAdmin(${orden.id})"
                        >
                            Cancelar
                        </button>
                    `;
                }

                // Después de aplicar inventario ya no mostramos cancelar.
                if(orden.estado==='preparacion'){
                    acciones+=`
                        <button
                            class="orden-btn orden-avanzar"
                            onclick="cambiarEstadoPedidoAdmin(${orden.id})"
                        >
                            Marcar entregado
                        </button>
                    `;
                }

                return `
                    <tr>
                        <td>
                            <strong>#${orden.id}</strong>
                        </td>

                        <td>
                            <strong>
                                ${escaparHtmlERP(orden.cliente_nombre)}
                            </strong>

                            ${
                                orden.cliente_empresa
                                    ?`
                                        <br>
                                        <small style="color:#777;">
                                            ${escaparHtmlERP(orden.cliente_empresa)}
                                        </small>
                                    `
                                    :''
                            }
                        </td>

                        <td>
                            ${fechaERP(orden.fecha)}
                        </td>

                        <td>
                            ${Number(orden.productos_total||0)}
                        </td>

                        <td>
                            <strong>
                                $${Number(orden.total||0).toFixed(2)}
                            </strong>
                        </td>

                        <td>
                            <span
                                class="badge-status ${orden.estado}"
                            >
                                ${textoEstadoOrdenERP(orden.estado)}
                            </span>
                        </td>

                        <td class="admin-actions">
                            ${acciones}
                        </td>
                    </tr>
                `;
            }
        ).join('');
}


// ============================================================
// VER DETALLE
// ============================================================

window.verDetallePedidoAdmin=
async function(ordenId){

    try{
        const respuesta=
            await apiERP(
                `/api/ordenes/${ordenId}`
            );

        const orden=
            respuesta.data;

        const productos=
            orden.productos||[];

        const historial=
            orden.historial||[];

        const productosHtml=
            productos.length
                ?productos.map(
                    producto=>`
                        <tr>
                            <td style="padding:8px;text-align:left;">
                                ${escaparHtmlERP(producto.producto_nombre)}
                            </td>

                            <td style="padding:8px;">
                                ${Number(producto.cantidad)}
                            </td>

                            <td style="padding:8px;">
                                $${Number(producto.precio_unitario).toFixed(2)}
                            </td>

                            <td style="padding:8px;">
                                <strong>
                                    $${Number(producto.subtotal).toFixed(2)}
                                </strong>
                            </td>
                        </tr>
                    `
                ).join('')
                :`
                    <tr>
                        <td colspan="4" style="padding:15px;color:#777;">
                            Sin productos.
                        </td>
                    </tr>
                `;

        const historialHtml=
            historial.length
                ?historial.map(
                    movimiento=>{
                        const esError=
                            movimiento.estado==='error'||
                            movimiento.tipo==='ERROR_PROCESAMIENTO';

                        return `
                            <div
                                style="
                                    padding:10px 0;
                                    border-bottom:1px solid #eee;
                                "
                            >
                                <strong
                                    style="color:${esError?'#a83c21':'#3c4a45'};"
                                >
                                    ${
                                        escaparHtmlERP(
                                            textoTipoProcesoERP(
                                                movimiento.tipo
                                            )
                                        )
                                    }
                                </strong>

                                <div style="margin-top:3px;">
                                    ${escaparHtmlERP(movimiento.descripcion||'')}
                                </div>

                                <small style="color:#777;">
                                    ${fechaERP(movimiento.fecha)}
                                    ${
                                        movimiento.usuario_nombre
                                            ?` · ${escaparHtmlERP(movimiento.usuario_nombre)}`
                                            :''
                                    }
                                </small>
                            </div>
                        `;
                    }
                ).join('')
                :`
                    <p style="color:#777;">
                        Sin movimientos registrados.
                    </p>
                `;

        const inventarioAplicado=
            Number(
                orden.inventario_aplicado||0
            )===1;

        Swal.fire({
            title:`Orden #${orden.id}`,
            width:'780px',
            html:`
                <div style="text-align:left;">
                    <div
                        style="
                            background:#f8f6f1;
                            padding:14px;
                            border-radius:10px;
                            margin-bottom:15px;
                            line-height:1.7;
                        "
                    >
                        <strong>Cliente:</strong>
                        ${escaparHtmlERP(orden.cliente_nombre)}
                        <br>

                        ${
                            orden.cliente_correo
                                ?`
                                    <strong>Correo:</strong>
                                    ${escaparHtmlERP(orden.cliente_correo)}
                                    <br>
                                `
                                :''
                        }

                        ${
                            orden.cliente_telefono
                                ?`
                                    <strong>Teléfono:</strong>
                                    ${escaparHtmlERP(orden.cliente_telefono)}
                                    <br>
                                `
                                :''
                        }

                        <strong>Fecha:</strong>
                        ${fechaERP(orden.fecha)}
                        <br>

                        <strong>Estado:</strong>
                        <span class="badge-status ${orden.estado}">
                            ${textoEstadoOrdenERP(orden.estado)}
                        </span>
                        <br>

                        <strong>Inventario:</strong>
                        ${
                            inventarioAplicado
                                ?`
                                    <span
                                        style="
                                            color:#2f6b46;
                                            font-weight:bold;
                                        "
                                    >
                                        Aplicado ✓
                                    </span>
                                `
                                :`
                                    <span
                                        style="
                                            color:#7a5b00;
                                            font-weight:bold;
                                        "
                                    >
                                        Pendiente
                                    </span>
                                `
                        }

                        ${
                            orden.fecha_procesado
                                ?`
                                    <br>
                                    <strong>Procesada:</strong>
                                    ${fechaERP(orden.fecha_procesado)}
                                `
                                :''
                        }
                    </div>

                    <div style="overflow-x:auto;">
                        <table
                            style="
                                width:100%;
                                border-collapse:collapse;
                                text-align:center;
                            "
                        >
                            <thead>
                                <tr style="border-bottom:1px solid #ddd;">
                                    <th style="padding:8px;text-align:left;">
                                        Producto
                                    </th>
                                    <th style="padding:8px;">Cant.</th>
                                    <th style="padding:8px;">Precio</th>
                                    <th style="padding:8px;">Subtotal</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${productosHtml}
                            </tbody>
                        </table>
                    </div>

                    <div
                        style="
                            text-align:right;
                            margin-top:15px;
                            font-size:1.3rem;
                        "
                    >
                        <strong>
                            Total: $${Number(orden.total||0).toFixed(2)}
                        </strong>
                    </div>

                    <h3 style="margin-top:22px;">
                        Historial ERP
                    </h3>

                    ${historialHtml}
                </div>
            `,
            confirmButtonText:'Cerrar',
            confirmButtonColor:'#3c4a45'
        });

    }catch(error){
        Swal.fire({
            icon:'error',
            title:'No se pudo cargar la orden',
            text:error.message,
            confirmButtonColor:'#3c4a45'
        });
    }
}


// ============================================================
// AVANZAR ESTADO
// ============================================================

window.cambiarEstadoPedidoAdmin=
async function(ordenId){

    const orden=
        ordenesAdminCache.find(
            item=>
                Number(item.id)===
                Number(ordenId)
        );

    if(!orden){
        return Swal.fire({
            icon:'error',
            title:'Orden no encontrada',
            confirmButtonColor:'#3c4a45'
        });
    }

    // Pendiente -> procesamiento automático ERP.
    if(orden.estado==='pendiente'){
        return procesarOrdenERP(
            ordenId
        );
    }

    // Preparación -> entregado.
    if(orden.estado==='preparacion'){
        const confirmacion=
            await Swal.fire({
                icon:'question',
                title:`Entregar orden #${ordenId}`,
                text:'La orden se marcará como entregada al cliente.',
                showCancelButton:true,
                confirmButtonText:'Sí, entregar',
                cancelButtonText:'Cancelar',
                confirmButtonColor:'#3c4a45'
            });

        if(!confirmacion.isConfirmed){
            return;
        }

        try{
            await apiERP(
                `/api/ordenes/${ordenId}/estado`,
                {
                    method:'PUT',
                    body:JSON.stringify({
                        estado:'entregado',
                        usuario_id:
                            usuarioERPActual()?.id||
                            null
                    })
                }
            );

            await Swal.fire({
                icon:'success',
                title:'Orden entregada',
                text:`La orden #${ordenId} se marcó como entregada.`,
                confirmButtonColor:'#3c4a45'
            });

            await cargarOrdenesAdmin();

            if(
                document.getElementById(
                    'erp-resumen-panel'
                )
            ){
                await cargarResumenERP();
            }

        }catch(error){
            Swal.fire({
                icon:'error',
                title:'No se pudo actualizar la orden',
                text:error.message,
                confirmButtonColor:'#3c4a45'
            });
        }
    }
}


// ============================================================
// ERP - PROCESAMIENTO AUTOMÁTICO DE ORDEN
// ============================================================

window.procesarOrdenERP=
async function(ordenId){

    const confirmacion=
        await Swal.fire({
            icon:'question',
            title:`Iniciar preparación #${ordenId}`,
            html:`
                <div style="text-align:left;line-height:1.7;">
                    <p>
                        El ERP realizará automáticamente:
                    </p>

                    <div
                        style="
                            background:#f8f6f1;
                            padding:14px;
                            border-radius:10px;
                        "
                    >
                        ✓ Validar cliente CRM<br>
                        ✓ Consultar productos y recetas SCM<br>
                        ✓ Validar inventario completo<br>
                        ✓ Descontar insumos<br>
                        ✓ Registrar movimientos de salida<br>
                        ✓ Registrar la operación en CRM<br>
                        ✓ Recalcular disponibilidad<br>
                        ✓ Verificar reposición automática PUSH
                    </div>

                    <p
                        style="
                            color:#777;
                            margin-top:12px;
                        "
                    >
                        Si una validación falla, la transacción se revierte
                        y no se realizan descuentos parciales.
                    </p>
                </div>
            `,
            showCancelButton:true,
            confirmButtonText:'Procesar orden',
            cancelButtonText:'Cancelar',
            confirmButtonColor:'#3c4a45'
        });

    if(!confirmacion.isConfirmed){
        return;
    }

    Swal.fire({
        title:'Procesando orden...',
        html:`
            <div
                style="
                    text-align:left;
                    line-height:2;
                    margin-top:10px;
                "
            >
                <div>○ Validando cliente</div>
                <div>○ Consultando recetas</div>
                <div>○ Validando inventario</div>
                <div>○ Actualizando inventario</div>
                <div>○ Registrando movimientos</div>
                <div>○ Actualizando CRM</div>
                <div>○ Recalculando disponibilidad</div>
                <div>○ Finalizando operación</div>
            </div>
        `,
        allowOutsideClick:false,
        allowEscapeKey:false,
        showConfirmButton:false,
        didOpen:()=>{
            Swal.showLoading();
        }
    });

    try{
        const respuesta=
            await apiERP(
                `/api/ordenes/${ordenId}/procesar`,
                {
                    method:'POST',
                    body:JSON.stringify({
                        usuario_id:
                            usuarioERPActual()?.id||
                            null
                    })
                }
            );

        const pasos=
            (respuesta.pasos||[])
            .map(
                paso=>`
                    <div
                        style="
                            padding:6px 0;
                            border-bottom:1px solid #eee;
                        "
                    >
                        <span
                            style="
                                color:#2f6b46;
                                font-weight:bold;
                            "
                        >
                            ✓
                        </span>
                        ${escaparHtmlERP(paso.paso)}
                    </div>
                `
            )
            .join('');

        const insumos=
            (respuesta.insumos_descontados||[])
            .map(
                insumo=>`
                    <tr>
                        <td style="padding:6px;text-align:left;">
                            ${escaparHtmlERP(insumo.nombre)}
                        </td>
                        <td style="padding:6px;">
                            ${Number(insumo.stock_anterior)}
                        </td>
                        <td style="padding:6px;">
                            -${Number(insumo.utilizado)}
                        </td>
                        <td style="padding:6px;">
                            <strong>
                                ${Number(insumo.stock_actual)}
                            </strong>
                        </td>
                    </tr>
                `
            )
            .join('');

        const reposiciones=
            respuesta.reposiciones_automaticas||[];

        const reposicionHtml=
            reposiciones.length
                ?`
                    <div
                        style="
                            margin-top:15px;
                            padding:12px;
                            background:#f2ecfa;
                            border-radius:10px;
                        "
                    >
                        <strong>
                            Reposición automática SCM
                        </strong>
                        <br>
                        ${
                            reposiciones
                                .map(
                                    pedido=>
                                        `${escaparHtmlERP(pedido.insumo)} → pedido #${pedido.pedido_id}`
                                )
                                .join('<br>')
                        }
                    </div>
                `
                :'';

        await Swal.fire({
            icon:'success',
            title:'Operación exitosa',
            width:'780px',
            html:`
                <div style="text-align:left;">
                    <p>
                        La orden
                        <strong>#${respuesta.orden_id}</strong>
                        fue procesada correctamente.
                    </p>

                    <div
                        style="
                            background:#f1f5f2;
                            padding:14px;
                            border-radius:10px;
                            margin-bottom:15px;
                            line-height:1.7;
                        "
                    >
                        <strong>Estado:</strong>
                        En Preparación
                        <br>

                        <strong>Cliente:</strong>
                        ${escaparHtmlERP(respuesta.cliente?.nombre||'')}
                        <br>

                        <strong>Total:</strong>
                        $${Number(respuesta.total||0).toFixed(2)}
                    </div>

                    <h3>Proceso ERP</h3>
                    ${pasos}

                    <h3 style="margin-top:18px;">
                        Inventario utilizado
                    </h3>

                    <div style="overflow-x:auto;">
                        <table
                            style="
                                width:100%;
                                border-collapse:collapse;
                                text-align:center;
                            "
                        >
                            <thead>
                                <tr>
                                    <th style="padding:6px;text-align:left;">
                                        Insumo
                                    </th>
                                    <th style="padding:6px;">Antes</th>
                                    <th style="padding:6px;">Salida</th>
                                    <th style="padding:6px;">Ahora</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${insumos}
                            </tbody>
                        </table>
                    </div>

                    ${reposicionHtml}
                </div>
            `,
            confirmButtonText:'Aceptar',
            confirmButtonColor:'#3c4a45'
        });

        await cargarOrdenesAdmin();

        if(
            document.getElementById(
                'erp-resumen-panel'
            )
        ){
            await cargarResumenERP();
        }

    }catch(error){
        await Swal.fire({
            icon:'error',
            title:'No se pudo procesar la orden',
            html:`
                <div style="text-align:left;">
                    <p>
                        ${escaparHtmlERP(error.message)}
                    </p>

                    <div
                        style="
                            background:#fff3cd;
                            padding:12px;
                            border-radius:10px;
                            margin-top:12px;
                        "
                    >
                        No se realizaron cambios parciales en el inventario.
                    </div>
                </div>
            `,
            confirmButtonColor:'#3c4a45'
        });

        await cargarOrdenesAdmin();
    }
}


// ============================================================
// CANCELAR
// ============================================================

window.cancelarOrdenAdmin=
async function(ordenId){

    const confirmacion=
        await Swal.fire({

            icon:'warning',

            title:
                `Cancelar orden #${ordenId}`,

            text:
                'La orden permanecerá en el historial como cancelada.',

            showCancelButton:true,

            confirmButtonText:
                'Sí, cancelar',

            cancelButtonText:
                'Volver',

            confirmButtonColor:
                '#b7410e'
        });


    if(!confirmacion.isConfirmed){
        return;
    }


    try{
        await apiERP(
            `/api/ordenes/${ordenId}/estado`,
            {
                method:'PUT',

                body:
                    JSON.stringify({

                        estado:
                            'cancelado',

                        usuario_id:
                            usuarioERPActual()?.id||
                            null
                    })
            }
        );

        Swal.fire({
            toast:true,
            position:'top-end',
            icon:'success',
            title:'Orden cancelada',
            showConfirmButton:false,
            timer:1500
        });

        await cargarOrdenesAdmin();

    }catch(error){

        Swal.fire({
            icon:'error',
            title:'No se pudo cancelar',
            text:error.message,
            confirmButtonColor:'#3c4a45'
        });
    }
}

// ============================================================
// DASHBOARD ERP INICIAL
// ============================================================

window.cargarResumenERP=
async function(){

    if(
        !document.getElementById(
            'erp-resumen-panel'
        )
    ){
        return;
    }

    try{
        const respuesta=
            await apiERP(
                '/api/erp/resumen'
            );

        const data=
            respuesta.data||{};

        const valores={
            'erp-k-clientes':
                data.clientes_activos||0,

            'erp-k-ordenes':
                data.ordenes_total||0,

            'erp-k-pendientes':
                data.ordenes_pendientes||0,

            'erp-k-preparacion':
                data.ordenes_preparacion||0,

            'erp-k-entregadas':
                data.ordenes_entregadas||0,

            'erp-k-productos':
                data.productos_disponibles||0,

            'erp-k-inventario':
                data.inventario_porciones||0,

            'erp-k-atencion':
                data.insumos_atencion||0
        };

        Object.entries(valores)
        .forEach(([id,valor])=>{
            const elemento=
                document.getElementById(id);

            if(elemento){
                elemento.textContent=
                    valor;
            }
        });


        const tabla=
            document.getElementById(
                'erp-ordenes-recientes'
            );

        if(tabla){

            const ordenes=
                data.ordenes_recientes||
                [];

            tabla.innerHTML=
                ordenes.length

                    ?ordenes.map(
                        orden=>`
                            <tr>

                                <td>
                                    <strong>
                                        #${orden.id}
                                    </strong>
                                </td>

                                <td>
                                    ${fechaERP(orden.fecha)}
                                </td>

                                <td>
                                    ${
                                        escaparHtmlERP(
                                            orden.cliente_nombre
                                        )
                                    }
                                </td>

                                <td>
                                    $${
                                        Number(
                                            orden.total||
                                            0
                                        ).toFixed(2)
                                    }
                                </td>

                                <td>
                                    <span
                                        class="
                                            badge-status
                                            ${orden.estado}
                                        "
                                    >
                                        ${
                                            textoEstadoOrdenERP(
                                                orden.estado
                                            )
                                        }
                                    </span>
                                </td>

                            </tr>
                        `
                    ).join('')

                    :`
                        <tr>
                            <td
                                colspan="5"
                                style="
                                    text-align:center;
                                    padding:25px;
                                    color:#777;
                                "
                            >
                                Aún no hay órdenes registradas.
                            </td>
                        </tr>
                    `;
        }

    }catch(error){

        console.error(
            'Error cargando Dashboard ERP:',
            error
        );

        Swal.fire({
            icon:'error',
            title:'No se pudo cargar el ERP',
            text:error.message,
            confirmButtonColor:'#3c4a45'
        });
    }
}

// ============================================================
// ERP - NUEVA ORDEN
// ============================================================

let clientesNuevaOrdenERP=[];

let productosNuevaOrdenERP=[];

let nuevaOrdenERP={
    paso:1,
    cliente:null,
    items:[]
};


// ============================================================
// CARGAR DATOS
// ============================================================

window.cargarNuevaOrdenERP=
async function(){

    if(
        !document.getElementById(
            'erp-nueva-orden'
        )
    ){
        return;
    }


    try{

        const[
            respuestaClientes,
            respuestaProductos
        ]=await Promise.all([

            apiERP(
                '/api/clientes'
            ),

            apiERP(
                '/api/productos?todos=1'
            )

        ]);


        clientesNuevaOrdenERP=
            (
                respuestaClientes.data||
                []
            )
            .filter(
                cliente=>
                    cliente.estado===
                    'activo'
            );


        productosNuevaOrdenERP=
            (
                respuestaProductos.data||
                []
            )
            .filter(
                producto=>
                    producto.estado!==
                    'inactivo'
            );


        renderClientesNuevaOrdenERP();

        renderProductosNuevaOrdenERP();

        renderCarritoNuevaOrdenERP();

        actualizarPasosNuevaOrdenERP();


    }catch(error){

        console.error(
            'Error cargando nueva orden:',
            error
        );


        Swal.fire({

            icon:
                'error',

            title:
                'No se pudo preparar la orden',

            text:
                error.message,

            confirmButtonColor:
                '#3c4a45'

        });
    }
}


// ============================================================
// CLIENTES
// ============================================================

window.filtrarClientesNuevaOrdenERP=
function(){

    renderClientesNuevaOrdenERP();

}


function renderClientesNuevaOrdenERP(){

    const contenedor=
        document.getElementById(
            'erp-lista-clientes'
        );


    if(!contenedor){
        return;
    }


    const texto=
        normalizarTextoERP(
            document.getElementById(
                'erp-buscar-cliente'
            )?.value||''
        );


    const clientes=
        clientesNuevaOrdenERP.filter(
            cliente=>{

                const cadena=
                    normalizarTextoERP(`
                        ${cliente.nombre||''}
                        ${cliente.correo||''}
                        ${cliente.telefono||''}
                        ${cliente.empresa||''}
                    `);


                return(
                    !texto||
                    cadena.includes(texto)
                );
            }
        );


    if(!clientes.length){

        contenedor.innerHTML=`
            <p
                style="
                    color:#777;
                    grid-column:1/-1;
                "
            >
                No se encontraron clientes.
            </p>
        `;

        return;
    }


    contenedor.innerHTML=
        clientes.map(
            cliente=>{

                const seleccionado=
                    Number(
                        nuevaOrdenERP
                            .cliente?.id
                    )===
                    Number(
                        cliente.id
                    );


                return `
                    <div
                        class="
                            erp-cliente
                            ${
                                seleccionado
                                    ?'seleccionado'
                                    :''
                            }
                        "

                        onclick="
                            seleccionarClienteNuevaOrdenERP(
                                ${cliente.id}
                            )
                        "
                    >

                        <h3>
                            ${
                                escaparHtmlERP(
                                    cliente.nombre
                                )
                            }
                        </h3>


                        <p>
                            <strong>
                                Correo:
                            </strong>

                            ${
                                escaparHtmlERP(
                                    cliente.correo||
                                    'Sin correo'
                                )
                            }
                        </p>


                        <p>
                            <strong>
                                Teléfono:
                            </strong>

                            ${
                                escaparHtmlERP(
                                    cliente.telefono||
                                    'Sin teléfono'
                                )
                            }
                        </p>


                        ${
                            cliente.empresa
                                ?`
                                    <p>
                                        <strong>
                                            Empresa:
                                        </strong>

                                        ${
                                            escaparHtmlERP(
                                                cliente.empresa
                                            )
                                        }
                                    </p>
                                `
                                :''
                        }


                        ${
                            cliente.etapa_crm
                                ?`
                                    <p>
                                        <strong>
                                            CRM:
                                        </strong>

                                        ${
                                            escaparHtmlERP(
                                                cliente.etapa_crm
                                            )
                                        }
                                    </p>
                                `
                                :''
                        }

                    </div>
                `;
            }
        )
        .join('');
}


window.seleccionarClienteNuevaOrdenERP=
function(clienteId){

    const cliente=
        clientesNuevaOrdenERP.find(
            item=>
                Number(item.id)===
                Number(clienteId)
        );


    if(!cliente){
        return;
    }


    nuevaOrdenERP.cliente=
        cliente;


    renderClientesNuevaOrdenERP();


    const boton=
        document.getElementById(
            'erp-btn-cliente-siguiente'
        );


    if(boton){
        boton.disabled=
            false;
    }
}


// ============================================================
// PRODUCTOS
// ============================================================

window.filtrarProductosNuevaOrdenERP=
function(){

    renderProductosNuevaOrdenERP();

}


function renderProductosNuevaOrdenERP(){

    const contenedor=
        document.getElementById(
            'erp-lista-productos'
        );


    if(!contenedor){
        return;
    }


    const texto=
        normalizarTextoERP(
            document.getElementById(
                'erp-buscar-producto'
            )?.value||''
        );


    const productos=
        productosNuevaOrdenERP.filter(
            producto=>{

                const cadena=
                    normalizarTextoERP(`
                        ${producto.nombre||''}
                        ${producto.descripcion||''}
                        ${producto.categoria||''}
                    `);


                return(
                    !texto||
                    cadena.includes(texto)
                );
            }
        );


    if(!productos.length){

        contenedor.innerHTML=`
            <p
                style="
                    color:#777;
                    grid-column:1/-1;
                "
            >
                No se encontraron productos.
            </p>
        `;

        return;
    }


    contenedor.innerHTML=
        productos.map(
            producto=>{

                const disponibles=
                    Number(
                        producto.stock_actual||
                        0
                    );


                const agotado=
                    producto.estado!==
                        'disponible' ||
                    disponibles<=0;


                const imagen=
                    producto.imagen
                        ?escaparHtmlERP(
                            producto.imagen
                        )
                        :'';


                return `
                    <article
                        class="
                            erp-producto
                            ${
                                agotado
                                    ?'agotado'
                                    :''
                            }
                        "
                    >

                        ${
                            imagen
                                ?`
                                    <img
                                        src="${imagen}"
                                        alt="${
                                            escaparHtmlERP(
                                                producto.nombre
                                            )
                                        }"

                                        style="
                                            object-position:
                                                ${
                                                    escaparHtmlERP(
                                                        producto.imagen_posicion||
                                                        'center'
                                                    )
                                                };
                                        "
                                    >
                                `
                                :`
                                    <div
                                        style="
                                            height:145px;
                                            display:flex;
                                            align-items:center;
                                            justify-content:center;
                                            background:#eee;
                                            color:#777;
                                        "
                                    >
                                        Sin imagen
                                    </div>
                                `
                        }


                        <div class="erp-producto-info">

                            <h3>
                                ${
                                    escaparHtmlERP(
                                        producto.nombre
                                    )
                                }
                            </h3>


                            <div class="erp-producto-precio">

                                $${
                                    Number(
                                        producto.precio||
                                        0
                                    ).toFixed(2)
                                }

                            </div>


                            ${
                                agotado
                                    ?`
                                        <span class="erp-agotado">
                                            Agotado
                                        </span>
                                    `
                                    :`
                                        <div class="erp-stock">
                                            Disponibles:
                                            <strong>
                                                ${disponibles}
                                            </strong>
                                        </div>
                                    `
                            }


                            <button
                                class="erp-agregar"

                                ${
                                    agotado
                                        ?'disabled'
                                        :''
                                }

                                onclick="
                                    agregarProductoNuevaOrdenERP(
                                        ${producto.id}
                                    )
                                "
                            >
                                ${
                                    agotado
                                        ?'No disponible'
                                        :'Agregar'
                                }
                            </button>

                        </div>

                    </article>
                `;
            }
        )
        .join('');
}


// ============================================================
// AGREGAR PRODUCTO
// ============================================================

window.agregarProductoNuevaOrdenERP=
function(productoId){

    const producto=
        productosNuevaOrdenERP.find(
            item=>
                Number(item.id)===
                Number(productoId)
        );


    if(!producto){
        return;
    }


    const disponibles=
        Number(
            producto.stock_actual||
            0
        );


    if(
        producto.estado!==
            'disponible' ||
        disponibles<=0
    ){

        return Swal.fire({
            icon:'warning',
            title:'Producto no disponible',
            confirmButtonColor:'#3c4a45'
        });
    }


    const existente=
        nuevaOrdenERP.items.find(
            item=>
                Number(item.producto_id)===
                Number(productoId)
        );


    if(existente){

        if(
            existente.cantidad>=
            disponibles
        ){

            return Swal.fire({

                icon:'warning',

                title:'Límite disponible',

                text:
                    `Solo hay ${disponibles} unidad(es) disponibles de ${producto.nombre}.`,

                confirmButtonColor:
                    '#3c4a45'
            });
        }


        existente.cantidad++;

    }else{

        nuevaOrdenERP.items.push({

            producto_id:
                producto.id,

            nombre:
                producto.nombre,

            precio:
                Number(
                    producto.precio||
                    0
                ),

            disponibles,

            cantidad:
                1
        });
    }


    renderCarritoNuevaOrdenERP();
}


// ============================================================
// CAMBIAR CANTIDAD
// ============================================================

window.cambiarCantidadNuevaOrdenERP=
function(
    productoId,
    cambio
){

    const item=
        nuevaOrdenERP.items.find(
            producto=>
                Number(
                    producto.producto_id
                )===
                Number(productoId)
        );


    if(!item){
        return;
    }


    const nuevaCantidad=
        item.cantidad+
        Number(cambio);


    if(nuevaCantidad<=0){

        nuevaOrdenERP.items=
            nuevaOrdenERP.items.filter(
                producto=>
                    Number(
                        producto.producto_id
                    )!==
                    Number(productoId)
            );


        renderCarritoNuevaOrdenERP();

        return;
    }


    if(
        nuevaCantidad>
        item.disponibles
    ){

        return Swal.fire({

            icon:'warning',

            title:'No hay más disponibilidad',

            text:
                `El máximo disponible es ${item.disponibles}.`,

            confirmButtonColor:
                '#3c4a45'
        });
    }


    item.cantidad=
        nuevaCantidad;


    renderCarritoNuevaOrdenERP();
}


// ============================================================
// ELIMINAR PRODUCTO
// ============================================================

window.eliminarProductoNuevaOrdenERP=
function(productoId){

    nuevaOrdenERP.items=
        nuevaOrdenERP.items.filter(
            producto=>
                Number(
                    producto.producto_id
                )!==
                Number(productoId)
        );


    renderCarritoNuevaOrdenERP();
}


// ============================================================
// RENDER CARRITO
// ============================================================

function renderCarritoNuevaOrdenERP(){

    const contenedor=
        document.getElementById(
            'erp-carrito-items'
        );


    const totalElemento=
        document.getElementById(
            'erp-total-orden'
        );


    const btnSiguiente=
        document.getElementById(
            'erp-btn-productos-siguiente'
        );


    if(!contenedor){
        return;
    }


    if(!nuevaOrdenERP.items.length){

        contenedor.innerHTML=`
            <p style="color:#777;">
                No has agregado productos.
            </p>
        `;

    }else{

        contenedor.innerHTML=
            nuevaOrdenERP.items.map(
                item=>`

                    <div class="erp-item">

                        <div class="erp-item-titulo">

                            ${
                                escaparHtmlERP(
                                    item.nombre
                                )
                            }

                        </div>


                        <small style="color:#777;">

                            $${
                                Number(
                                    item.precio
                                ).toFixed(2)
                            }

                            c/u

                        </small>


                        <div class="erp-item-controles">


                            <div class="erp-cantidad">

                                <button
                                    class="erp-menos"

                                    onclick="
                                        cambiarCantidadNuevaOrdenERP(
                                            ${item.producto_id},
                                            -1
                                        )
                                    "
                                >
                                    −
                                </button>


                                <strong>
                                    ${item.cantidad}
                                </strong>


                                <button
                                    class="erp-mas"

                                    onclick="
                                        cambiarCantidadNuevaOrdenERP(
                                            ${item.producto_id},
                                            1
                                        )
                                    "
                                >
                                    +
                                </button>

                            </div>


                            <strong>

                                $${
                                    (
                                        item.precio*
                                        item.cantidad
                                    ).toFixed(2)
                                }

                            </strong>


                            <button
                                class="erp-eliminar"

                                onclick="
                                    eliminarProductoNuevaOrdenERP(
                                        ${item.producto_id}
                                    )
                                "
                            >
                                Quitar
                            </button>

                        </div>

                    </div>

                `
            )
            .join('');
    }


    const total=
        calcularTotalNuevaOrdenERP();


    if(totalElemento){

        totalElemento.textContent=
            `$${total.toFixed(2)}`;
    }


    if(btnSiguiente){

        btnSiguiente.disabled=
            nuevaOrdenERP.items.length===
            0;
    }
}


// ============================================================
// TOTAL
// ============================================================

function calcularTotalNuevaOrdenERP(){

    return nuevaOrdenERP.items.reduce(
        (total,item)=>
            total+
            (
                Number(item.precio)*
                Number(item.cantidad)
            ),
        0
    );
}


// ============================================================
// PASOS
// ============================================================

window.irPasoOrdenERP=
function(paso){

    const numero=
        Number(paso);


    if(
        numero===2 &&
        !nuevaOrdenERP.cliente
    ){

        return Swal.fire({

            icon:'warning',

            title:'Selecciona un cliente',

            confirmButtonColor:
                '#3c4a45'
        });
    }


    if(
        numero===3 &&
        !nuevaOrdenERP.items.length
    ){

        return Swal.fire({

            icon:'warning',

            title:'Agrega al menos un producto',

            confirmButtonColor:
                '#3c4a45'
        });
    }


    nuevaOrdenERP.paso=
        numero;


    actualizarPasosNuevaOrdenERP();


    if(numero===3){

        renderResumenNuevaOrdenERP();
    }


    window.scrollTo({
        top:0,
        behavior:'smooth'
    });
}


function actualizarPasosNuevaOrdenERP(){

    for(
        let paso=1;
        paso<=3;
        paso++
    ){

        const seccion=
            document.getElementById(
                `erp-paso-${paso}`
            );


        const indicador=
            document.getElementById(
                `erp-paso-indicador-${paso}`
            );


        if(seccion){

            seccion.style.display=
                paso===
                nuevaOrdenERP.paso
                    ?'block'
                    :'none';
        }


        if(indicador){

            indicador.classList.remove(
                'activo',
                'completado'
            );


            if(
                paso===
                nuevaOrdenERP.paso
            ){

                indicador.classList.add(
                    'activo'
                );

            }else if(
                paso<
                nuevaOrdenERP.paso
            ){

                indicador.classList.add(
                    'completado'
                );
            }
        }
    }
}


// ============================================================
// RESUMEN FINAL
// ============================================================

function renderResumenNuevaOrdenERP(){

    const cliente=
        nuevaOrdenERP.cliente;


    const contenedorCliente=
        document.getElementById(
            'erp-resumen-cliente'
        );


    const tabla=
        document.getElementById(
            'erp-resumen-productos'
        );


    const total=
        document.getElementById(
            'erp-resumen-total'
        );


    if(
        !cliente||
        !contenedorCliente||
        !tabla
    ){
        return;
    }


    contenedorCliente.innerHTML=`

        <h3>
            Cliente
        </h3>


        <strong>
            ${
                escaparHtmlERP(
                    cliente.nombre
                )
            }
        </strong>


        <p>

            ${
                escaparHtmlERP(
                    cliente.correo||
                    'Sin correo'
                )
            }

        </p>


        ${
            cliente.telefono
                ?`
                    <p>
                        ${
                            escaparHtmlERP(
                                cliente.telefono
                            )
                        }
                    </p>
                `
                :''
        }


        ${
            cliente.empresa
                ?`
                    <p>
                        <strong>
                            Empresa:
                        </strong>

                        ${
                            escaparHtmlERP(
                                cliente.empresa
                            )
                        }
                    </p>
                `
                :''
        }

    `;


    tabla.innerHTML=
        nuevaOrdenERP.items.map(
            item=>`

                <tr>

                    <td>

                        ${
                            escaparHtmlERP(
                                item.nombre
                            )
                        }

                    </td>

                    <td>
                        ${item.cantidad}
                    </td>

                    <td>

                        $${
                            Number(
                                item.precio
                            ).toFixed(2)
                        }

                    </td>

                    <td>

                        <strong>

                            $${
                                (
                                    item.precio*
                                    item.cantidad
                                ).toFixed(2)
                            }

                        </strong>

                    </td>

                </tr>

            `
        )
        .join('');


    if(total){

        total.textContent=
            `$${calcularTotalNuevaOrdenERP().toFixed(2)}`;
    }
}


// ============================================================
// CONFIRMAR ORDEN
// ============================================================

window.confirmarNuevaOrdenERP=
async function(){

    if(
        !nuevaOrdenERP.cliente||
        !nuevaOrdenERP.items.length
    ){

        return;
    }


    const boton=
        document.getElementById(
            'erp-btn-confirmar-orden'
        );


    const confirmacion=
        await Swal.fire({

            icon:'question',

            title:'Confirmar orden',

            html:`
                <p>
                    Cliente:
                    <strong>
                        ${
                            escaparHtmlERP(
                                nuevaOrdenERP
                                    .cliente
                                    .nombre
                            )
                        }
                    </strong>
                </p>

                <p>
                    Total:
                    <strong>
                        $${calcularTotalNuevaOrdenERP().toFixed(2)}
                    </strong>
                </p>

                <p>
                    La orden se registrará inicialmente como
                    <strong>Pendiente</strong>.
                </p>
            `,

            showCancelButton:true,

            confirmButtonText:
                'Registrar orden',

            cancelButtonText:
                'Revisar',

            confirmButtonColor:
                '#3c4a45'
        });


    if(!confirmacion.isConfirmed){
        return;
    }


    if(boton){

        boton.disabled=
            true;

        boton.textContent=
            'Registrando...';
    }


    try{

        const respuesta=
            await apiERP(
                '/api/ordenes',
                {
                    method:'POST',

                    body:
                        JSON.stringify({

                            cliente_id:
                                nuevaOrdenERP
                                    .cliente
                                    .id,

                            usuario_id:
                                usuarioERPActual()?.id||
                                null,

                            productos:
                                nuevaOrdenERP
                                    .items
                                    .map(
                                        item=>({

                                            producto_id:
                                                item.producto_id,

                                            cantidad:
                                                item.cantidad
                                        })
                                    )
                        })
                }
            );


        await Swal.fire({

            icon:'success',

            title:
                'Orden registrada',

            html:`
                <p>
                    La orden
                    <strong>
                        #${respuesta.id}
                    </strong>
                    se creó correctamente.
                </p>

                <p>
                    Total:
                    <strong>
                        $${Number(
                            respuesta.total||
                            0
                        ).toFixed(2)}
                    </strong>
                </p>

                <p>
                    Estado:
                    <strong>
                        Pendiente
                    </strong>
                </p>
            `,

            confirmButtonText:
                'Ver órdenes',

            confirmButtonColor:
                '#3c4a45'
        });


        window.location.href=
            'admin-ordenes.html';


    }catch(error){

        Swal.fire({

            icon:'error',

            title:
                'No se pudo registrar la orden',

            text:
                error.message,

            confirmButtonColor:
                '#3c4a45'
        });


        if(boton){

            boton.disabled=
                false;

            boton.textContent=
                'Confirmar Orden';
        }
    }
}


// ============================================================
// NORMALIZAR TEXTO
// ============================================================

function normalizarTextoERP(texto){

    return String(
        texto||
        ''
    )
    .toLowerCase()
    .normalize('NFD')
    .replace(
        /[\u0300-\u036f]/g,
        ''
    );
}

// INICIALIZADOR DE SEGURIDAD Y VISTAS
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Cargar Navbar y Footer (Vista cliente)
    await cargarComponente(
        'navbar-container',
        'components/navbar.html'
    );

    await cargarComponente(
        'footer-container',
        'components/footer.html'
    );


    // 2. Cargar Menú Lateral (Vista Admin)
    const adminSidebarContainer =
        document.getElementById(
            'admin-sidebar-container'
        );


    if (adminSidebarContainer) {

        await cargarComponente(
            'admin-sidebar-container',
            'components/admin-sidebar.html'
        );


        const acordeones =
            document.querySelectorAll(
                '.nav-accordion'
            );


        let menusAbiertos =
            JSON.parse(
                localStorage.getItem(
                    'casaBarro_menus_abiertos'
                )
            ) || [];


        acordeones.forEach(
            (btn, index) => {

                // Restaurar menús abiertos
                if (
                    menusAbiertos.includes(
                        index
                    )
                ) {

                    btn.classList.add(
                        'active'
                    );

                    btn.nextElementSibling.style.display =
                        'block';
                }


                // Abrir / cerrar acordeón
                btn.addEventListener(
                    'click',
                    function() {

                        this.classList.toggle(
                            'active'
                        );


                        const panel =
                            this.nextElementSibling;


                        if (
                            panel.style.display ===
                            'block'
                        ) {

                            panel.style.display =
                                'none';


                            menusAbiertos =
                                menusAbiertos.filter(
                                    i =>
                                        i !== index
                                );

                        } else {

                            panel.style.display =
                                'block';


                            if (
                                !menusAbiertos.includes(
                                    index
                                )
                            ) {

                                menusAbiertos.push(
                                    index
                                );
                            }
                        }


                        localStorage.setItem(
                            'casaBarro_menus_abiertos',
                            JSON.stringify(
                                menusAbiertos
                            )
                        );
                    }
                );
            }
        );


        // 3. Validar Seguridad del Usuario
        const usuarioActual =
            JSON.parse(
                localStorage.getItem(
                    'casaBarro_usuario'
                )
            );


        const spanUsuario =
            document.getElementById(
                'admin-user-name'
            );


        if (spanUsuario) {

            const rolesInternos = [
                'admin',
                'vendedor',
                'logistica'
            ];


            if (
                !usuarioActual ||
                !rolesInternos.includes(
                    usuarioActual.rol
                )
            ) {

                window.location.href =
                    'login.html';

                return;

            } else {

                spanUsuario.innerText =
                    `Hola, ${
                        usuarioActual.nombre
                            .split(' ')[0]
                    } ♡`;


                // Solo el Administrador Maestro
                // puede gestionar Personal
                if (
                    usuarioActual.rol !==
                    'admin'
                ) {

                    const btnPersonal =
                        document.getElementById(
                            'link-personal'
                        );


                    if (btnPersonal) {

                        btnPersonal.style.display =
                            'none';
                    }


                    if (
                        window.location.pathname
                            .includes(
                                'admin-personal.html'
                            )
                    ) {

                        Swal.fire({

                            icon:
                                'error',

                            title:
                                'Acceso Denegado',

                            text:
                                'Solo Administradores Maestros.',

                            confirmButtonColor:
                                '#3c4a45'

                        }).then(() => {

                            window.location.href =
                                'admin.html';
                        });


                        return;
                    }
                }
            }
        }
    }


    // ========================================================
    // 4. FUNCIONES GENERALES
    // ========================================================

    activarAlertas();

    actualizarUI();

    renderizarCarrito();


    const btnCarritoNav =
        document.getElementById(
            'btn-carrito-nav'
        );


    if (btnCarritoNav) {

        btnCarritoNav.addEventListener(
            'click',
            () => {

                window.location.href =
                    'carrito.html';
            }
        );
    }


    // ========================================================
    // 5. CARGAR VISTAS SEGÚN LA PÁGINA
    // ========================================================


    // CRM
    if (
        document.getElementById(
            'tabla-clientes-crm'
        )
    ) {

        cargarClientesCRM();
    }


    // PERSONAL
    if (
        document.getElementById(
            'tabla-personal'
        )
    ) {

        cargarPersonal();
    }


    // PRODUCTOS
    if (
        document.getElementById(
            'tabla-productos-admin'
        )
    ) {

        cargarProductosAdmin();

        cargarProveedoresEnProductos();
    }


    // PROVEEDORES
    if (
        document.getElementById(
            'tabla-proveedores'
        )
    ) {

        cargarProveedores();
    }


    // INSUMOS
    if (
        document.getElementById(
            'tabla-insumos'
        )
    ) {

        cargarInsumos();

        cargarProveedoresEnInsumos();
    }


    // INVENTARIO
    if (
        document.getElementById(
            'tabla-inventario'
        )
    ) {

        cargarInventario();

        cargarMovimientosInventario();
    }


    // CATÁLOGO PÚBLICO
    if (
        window.location.pathname.includes(
            'catalogo.html'
        ) &&
        typeof cargarProductosBD ===
            'function'
    ) {

        cargarProductosBD();
    }


    // ACTIVIDAD
    if (
        document.getElementById(
            'timeline-actividad'
        )
    ) {

        cargarMiActividad();
    }


    // ========================================================
    // ERP
    // ========================================================


    // ÓRDENES DE CLIENTES
    if (
        document.getElementById(
            'tabla-ordenes-admin'
        )
    ) {

        cargarOrdenesAdmin();
    }


    // DASHBOARD ERP
    if (
        document.getElementById(
            'erp-resumen-panel'
        )
    ) {

        cargarResumenERP();
    }

    if(
    document.getElementById(
        'erp-nueva-orden'
    )
){
    await cargarNuevaOrdenERP();
}

});

window.cerrarSesionAdmin = async function(e) {
    if (e) e.preventDefault();

    const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));

    if (usuarioActual && usuarioActual.id) {
        try {
            await fetch('http://localhost:3000/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: usuarioActual.id })
            });
        } catch (error) {
            console.warn('No se pudo registrar el cierre de sesión:', error);
        }
    }

    localStorage.removeItem('casaBarro_usuario');
    window.location.href = 'index.html';
}

window.intentarPublicar = function(tipo) {
    const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));
    if (!usuarioActual) {
        Swal.fire({ title: 'Atención', text: 'Debes iniciar sesión para publicar en el mercado', icon: 'warning', confirmButtonColor: '#3c4a45' }); return;
    }
    if (!usuarioActual.empresa) {
        Swal.fire({
            title: 'Información Incompleta', text: 'Para garantizar la seguridad de la comunidad, necesitas registrar el nombre de tu empresa en tu perfil antes de publicar.', icon: 'info', showCancelButton: true, confirmButtonText: 'Ir a mi Perfil', cancelButtonText: 'Cancelar', confirmButtonColor: '#3c4a45'
        }).then((result) => { if (result.isConfirmed) window.location.href = 'perfil.html'; }); return;
    }
    if (tipo === 'subasta') abrirFormularioSubasta(); else abrirFormularioArticulo();
}

window.abrirFormularioArticulo = function() {
    Swal.fire({
        title: 'Publicar Artículo',
        html: `<form style="display:flex; flex-direction:column; gap:12px; text-align:left; margin-top: 15px;"><input type="text" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Nombre del producto"><input type="number" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Precio MXN"></form>`,
        showCancelButton: true, confirmButtonText: 'Publicar', confirmButtonColor: '#3c4a45'
    }).then((result) => { if (result.isConfirmed) Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 1500 }); });
}

window.abrirFormularioSubasta = function() {
    Swal.fire({
        title: 'Crear Subasta',
        html: `<form style="display:flex; flex-direction:column; gap:12px; text-align:left; margin-top: 15px;"><input type="text" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Nombre del artículo"><input type="number" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Precio inicial"></form>`,
        showCancelButton: true, confirmButtonText: 'Iniciar Subasta', confirmButtonColor: '#3c4a45'
    }).then((result) => { if (result.isConfirmed) Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 1500 }); });
}

window.finalizarPedido = function() {
    let numeroPedido = Math.floor(Math.random() * 90000) + 10000;
    carrito = [];
    localStorage.removeItem('casaBarro_carrito');
    localStorage.removeItem('casaBarro_cupon');
    localStorage.removeItem('casaBarro_totalFinal');
    Swal.fire({ title: '¡Pago Aprobado!', text: `Folio: #CB-${numeroPedido}`, confirmButtonText: 'Factura', showCancelButton: true, cancelButtonText: 'Ir a mi perfil', confirmButtonColor: '#3c4a45' }).then(() => window.location.href = 'perfil.html');
}

// MÓDULO CRM (CLIENTES) Y FILTROS MEJORADOS
window.cargarClientesCRM = async function() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/clientes');
        const resultado = await respuesta.json();
        
        if (resultado.mensaje === "Éxito") {
            const tabla = document.getElementById('tabla-clientes-crm');
            if (!tabla) return;
            
            let htmlFilas = '';
            resultado.data.forEach(cliente => {
                let colorEtapa = cliente.etapa_crm === 'Activo' || cliente.etapa_crm === 'Frecuente' ? '#557268' : '#b7410e';
                const clienteData = JSON.stringify(cliente).replace(/'/g, "\\'").replace(/"/g, "&quot;");

                htmlFilas += `
                    <tr class="crm-row" data-nombre="${cliente.nombre.toLowerCase()}" data-correo="${cliente.correo.toLowerCase()}" data-etapa="${cliente.etapa_crm}" data-estado="${cliente.estado}" style="border-bottom: 1px solid #eae5db;">
                        <td style="padding: 10px;">${cliente.id}</td>
                        <td style="padding: 10px;"><strong>${cliente.nombre}</strong><br><small>${cliente.correo}</small></td>
                        <td style="padding: 10px;">${cliente.empresa || '<span style="color:#aaa;">Sin registro</span>'}</td>
                        <td style="padding: 10px;"><span style="background:${colorEtapa}; color:white; padding:3px 8px; border-radius:12px; font-size:0.8rem;">${cliente.etapa_crm}</span></td>
                        <td class="admin-actions" style="padding: 10px; display:flex; gap:5px; align-items:center;">
                            <div class="action-icons">
                                <button class="btn-minimal" title="Registrar Llamada" onclick="registrarContactoFijo(${cliente.id}, '${cliente.nombre}', 'Llamada')">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                </button>
                                <button class="btn-minimal" title="Registrar Mensaje" onclick="registrarContactoFijo(${cliente.id}, '${cliente.nombre}', 'Mensaje')">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                </button>
                                <button class="btn-minimal" title="Registrar Correo" onclick="registrarContactoFijo(${cliente.id}, '${cliente.nombre}', 'Correo')">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                </button>
                            </div>
                            <button style="background:#557268;" onclick="window.location.href='admin-detalle.html?id=${cliente.id}'">Detalle</button>
                            <button onclick='editarClienteCRM(${clienteData})'>Editar</button>
                            <button style="background:#b7410e; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;" onclick="eliminarClienteCRM(${cliente.id}, '${cliente.nombre}')">Eliminar</button>
                        </td>
                    </tr>
                `;
            });
            tabla.innerHTML = htmlFilas;
        }
    } catch (error) { console.error("Error al cargar CRM:", error); }
}

window.filtrarClientesCRM = function() {
    let input = document.getElementById('crm-search');
    let filtroEtapa = document.getElementById('crm-filter-etapa');
    let filtroEstado = document.getElementById('crm-filter-estado');
    
    if(!input) return;
    
    let texto = input.value.toLowerCase();
    let etapaSeleccionada = filtroEtapa ? filtroEtapa.value : 'todos';
    let estadoSeleccionado = filtroEstado ? filtroEstado.value : 'todos';

    let filas = document.querySelectorAll('.crm-row');
    filas.forEach(fila => {
        let nombre = fila.getAttribute('data-nombre');
        let correo = fila.getAttribute('data-correo');
        let etapa = fila.getAttribute('data-etapa'); 
        let estado = fila.getAttribute('data-estado');

        let coincideTexto = nombre.includes(texto) || correo.includes(texto);
        let coincideEtapa = etapaSeleccionada === 'todos' || etapa === etapaSeleccionada;
        let coincideEstado = estadoSeleccionado === 'todos' || estado === estadoSeleccionado;

        if (coincideTexto && coincideEtapa && coincideEstado) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
}

window.editarClienteCRM = function(cliente) {
    Swal.fire({
        title: 'Editar Cliente / Etapa',
        html: `
            <form id="form-editar-cliente" style="display:flex; flex-direction:column; gap:12px; text-align:left; margin-top: 15px;">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Nombre:</label>
                <input type="text" id="edit-nombre" class="swal2-input" style="margin:0;" value="${cliente.nombre}">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Correo:</label>
                <input type="email" id="edit-correo" class="swal2-input" style="margin:0;" value="${cliente.correo}">
                <div style="display:flex; gap:15px;">
                    <div style="flex:1;"><label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Teléfono:</label><input type="text" id="edit-telefono" class="swal2-input" style="margin:0; width:100%;" value="${cliente.telefono || ''}"></div>
                    <div style="flex:1;"><label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Empresa:</label><input type="text" id="edit-empresa" class="swal2-input" style="margin:0; width:100%;" value="${cliente.empresa || ''}"></div>
                </div>
                <div style="display:flex; gap:15px;">
                    <div style="flex:1;">
                        <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Etapa CRM:</label>
                        <select id="edit-etapa" class="swal2-select" style="margin:0; width:100%;">
                            <option value="Prospecto" ${cliente.etapa_crm === 'Prospecto' ? 'selected' : ''}>Prospecto</option>
                            <option value="Activo" ${cliente.etapa_crm === 'Activo' ? 'selected' : ''}>Activo</option>
                            <option value="Frecuente" ${cliente.etapa_crm === 'Frecuente' ? 'selected' : ''}>Frecuente</option>
                            <option value="Inactivo" ${cliente.etapa_crm === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Estado:</label>
                        <select id="edit-estado" class="swal2-select" style="margin:0; width:100%;">
                            <option value="activo" ${cliente.estado === 'activo' ? 'selected' : ''}>Activo</option>
                            <option value="inactivo" ${cliente.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                </div>
            </form>
        `,
        showCancelButton: true, confirmButtonText: 'Actualizar', cancelButtonText: 'Cancelar', confirmButtonColor: '#3c4a45', width: '550px',
        preConfirm: () => {
            return {
                nombre: document.getElementById('edit-nombre').value, correo: document.getElementById('edit-correo').value, telefono: document.getElementById('edit-telefono').value, empresa: document.getElementById('edit-empresa').value, etapa_crm: document.getElementById('edit-etapa').value, estado: document.getElementById('edit-estado').value
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));
                result.value.usuario_id = usuarioActual ? usuarioActual.id : null;

                const res = await fetch(`http://localhost:3000/api/clientes/${cliente.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result.value)
                });

                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 2000 });
                    cargarClientesCRM();
                    if (document.getElementById('timeline-actividad')) cargarMiActividad();
                }
            } catch (error) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Sin conexión', showConfirmButton: false, timer: 3000 });
            }
        }
    });
}

window.eliminarClienteCRM = function(id, nombre) {
    Swal.fire({
        title: `¿Eliminar a ${nombre}?`,
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#b7410e',
        cancelButtonColor: '#8a8a8a',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));

                const res = await fetch(`http://localhost:3000/api/clientes/${id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario_id: usuarioActual ? usuarioActual.id : null
                    })
                });

                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente eliminado', showConfirmButton: false, timer: 2000 });
                    cargarClientesCRM();
                    if (document.getElementById('timeline-actividad')) cargarMiActividad();
                }
            } catch (e) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error de conexión', showConfirmButton: false, timer: 3000 });
            }
        }
    });
}

window.registrarContactoFijo = function(clienteId, clienteNombre, tipo) {
    Swal.fire({
        title: `Interacción por ${tipo}`,
        text: `Registrar en historial de ${clienteNombre}`,
        html: `<textarea id="desc-contacto-fijo" class="swal2-textarea" placeholder="¿Cuáles fueron los acuerdos o temas clave?..." style="width:100%; height:80px;"></textarea>`,
        showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar', confirmButtonColor: '#3c4a45',
        preConfirm: () => { 
            const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));
            const usuarioId = usuarioActual ? usuarioActual.id : null;
            return { cliente_id: clienteId, usuario_id: usuarioId, tipo: tipo, descripcion: document.getElementById('desc-contacto-fijo').value } 
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            await fetch('http://localhost:3000/api/interacciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.value) });
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Guardado en historial', showConfirmButton: false, timer: 2000 });
        }
    });
}

window.guardarNuevoCliente = async function(event) {
    event.preventDefault();
    const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));

    const data = {
        nombre: document.getElementById('crm-nombre').value,
        correo: document.getElementById('crm-correo').value,
        telefono: document.getElementById('crm-telefono').value,
        empresa: document.getElementById('crm-empresa').value,
        password: document.getElementById('crm-password').value,
        usuario_id: usuarioActual ? usuarioActual.id : null // Enviamos quién hace el registro
    };

    try {
        const res = await fetch('http://localhost:3000/api/clientes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (res.ok) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente agregado', showConfirmButton: false, timer: 2000 });
            document.getElementById('form-alta-cliente').reset();
            cargarClientesCRM(); 
            if(document.getElementById('timeline-actividad')) cargarMiActividad(); // Recargar línea de tiempo
        } else {
            const error = await res.json();
            Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: error.error || 'Error al guardar', showConfirmButton: false, timer: 3000 });
        }
    } catch (e) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Sin conexión', showConfirmButton: false, timer: 3000 });
    }
}

// MÓDULO GESTIÓN DE PERSONAL (CRUD)
window.cargarPersonal = async function() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/personal');
        const resultado = await respuesta.json();
        const tabla = document.getElementById('tabla-personal');
        if (!tabla) return;
        
        let htmlFilas = '';
        resultado.data.forEach(emp => {
            let badgeColor = emp.rol === 'admin' ? '#b7410e' : emp.rol === 'logistica' ? '#d9822b' : '#557268';
            const empData = JSON.stringify(emp).replace(/'/g, "\\'").replace(/"/g, "&quot;");

            htmlFilas += `
                <tr class="personal-row" data-nombre="${emp.nombre.toLowerCase()}" data-correo="${emp.correo.toLowerCase()}" style="border-bottom: 1px solid #eae5db;">
                    <td style="padding: 10px;">${emp.id}</td>
                    <td style="padding: 10px;"><strong>${emp.nombre}</strong><br><small>${emp.correo}</small></td>
                    <td style="padding: 10px;"><span style="background:${badgeColor}; color:white; padding:3px 8px; border-radius:12px; font-size:0.8rem; text-transform:uppercase;">${emp.rol}</span></td>
                    <td class="admin-actions" style="padding: 10px; display:flex; gap:5px; align-items:center;">
                        <button style="background:#557268;" onclick="window.location.href='admin-detalle-personal.html?id=${emp.id}'">Detalle</button>
                        <button onclick='editarPersonal(${empData})'>Editar</button>
                        <button style="background:#b7410e; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;" onclick="eliminarPersonal(${emp.id}, '${emp.nombre}')">Eliminar</button>
                    </td>
                </tr>`;
        });
        tabla.innerHTML = htmlFilas;
    } catch (e) { console.error(e); }
}

window.filtrarPersonal = function() {
    let input = document.getElementById('personal-search');
    if(!input) return;
    let texto = input.value.toLowerCase();
    let filas = document.querySelectorAll('.personal-row');
    filas.forEach(fila => {
        let nombre = fila.getAttribute('data-nombre');
        let correo = fila.getAttribute('data-correo');
        if (nombre.includes(texto) || correo.includes(texto)) fila.style.display = ''; else fila.style.display = 'none';
    });
}

window.guardarPersonal = async function(event) {
    event.preventDefault();

    const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));

    const data = {
        nombre: document.getElementById('emp-nombre').value,
        correo: document.getElementById('emp-correo').value,
        password: document.getElementById('emp-pass').value,
        rol: document.getElementById('emp-rol').value,
        telefono: document.getElementById('emp-telefono').value,
        usuario_id_actor: usuarioActual ? usuarioActual.id : null
    };

    try {
        const res = await fetch('http://localhost:3000/api/personal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const resultado = await res.json();

        if (res.ok) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Empleado Registrado', showConfirmButton: false, timer: 2000 });
            document.getElementById('form-alta-personal').reset();
            cargarPersonal();
            if (document.getElementById('timeline-actividad')) cargarMiActividad();
        } else {
            Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: resultado.error || 'Error al registrar', showConfirmButton: false, timer: 3000 });
        }
    } catch (error) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error de conexión', showConfirmButton: false, timer: 3000 });
    }
}

window.editarPersonal = function(emp) {
    Swal.fire({
        title: 'Editar Empleado',
        html: `
            <form id="form-editar-emp" style="display:flex; flex-direction:column; gap:12px; text-align:left; margin-top: 15px;">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Nombre:</label>
                <input type="text" id="edit-emp-nombre" class="swal2-input" style="margin:0;" value="${emp.nombre}">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Correo:</label>
                <input type="email" id="edit-emp-correo" class="swal2-input" style="margin:0;" value="${emp.correo}">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Teléfono:</label>
                <input type="text" id="edit-emp-tel" class="swal2-input" style="margin:0;" value="${emp.telefono || ''}">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Contraseña:</label>
                <input type="text" id="edit-emp-pass" class="swal2-input" style="margin:0;" placeholder="Nueva contraseña">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Rol:</label>
                <select id="edit-emp-rol" class="swal2-select" style="margin:0; width:100%;">
                    <option value="vendedor" ${emp.rol === 'vendedor' ? 'selected' : ''}>Vendedor</option>
                    <option value="logistica" ${emp.rol === 'logistica' ? 'selected' : ''}>Logística</option>
                    <option value="admin" ${emp.rol === 'admin' ? 'selected' : ''}>Administrador Maestro</option>
                </select>
            </form>
        `,
        showCancelButton: true, confirmButtonText: 'Actualizar', cancelButtonText: 'Cancelar', confirmButtonColor: '#3c4a45', width: '500px',
        preConfirm: () => {
            return {
                nombre: document.getElementById('edit-emp-nombre').value,
                correo: document.getElementById('edit-emp-correo').value,
                telefono: document.getElementById('edit-emp-tel').value,
                password: document.getElementById('edit-emp-pass').value,
                rol: document.getElementById('edit-emp-rol').value
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));
                result.value.usuario_id_actor = usuarioActual ? usuarioActual.id : null;

                const res = await fetch(`http://localhost:3000/api/usuarios/${emp.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result.value)
                });

                const respuesta = await res.json();

                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Empleado actualizado', showConfirmButton: false, timer: 2000 });
                    cargarPersonal();
                } else {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: respuesta.error || 'No se pudo actualizar', showConfirmButton: false, timer: 3000 });
                }
            } catch (e) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error de conexión', showConfirmButton: false, timer: 3000 });
            }
        }
    });
}

window.eliminarPersonal = function(id, nombre) {
    Swal.fire({
        title: `¿Eliminar al empleado ${nombre}?`,
        text: "Perderá el acceso al panel administrativo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#b7410e',
        cancelButtonColor: '#8a8a8a',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));

                const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario_id_actor: usuarioActual ? usuarioActual.id : null
                    })
                });

                const respuesta = await res.json();

                if (res.ok) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Empleado eliminado', showConfirmButton: false, timer: 2000 });
                    cargarPersonal();
                } else {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: respuesta.error || 'No se pudo eliminar', showConfirmButton: false, timer: 3000 });
                }
            } catch (e) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error de conexión', showConfirmButton: false, timer: 3000 });
            }
        }
    });
}

// MÓDULO AUTENTICACIÓN
window.iniciarSesion = async function(event) {
    event.preventDefault();
    const correoInput = document.getElementById('login-correo');
    const passwordInput = document.getElementById('login-password');
    if(!correoInput || !passwordInput) return;

    try {
        const respuesta = await fetch('http://localhost:3000/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: correoInput.value, password: passwordInput.value }) });
        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.mensaje === "Éxito") {
            localStorage.setItem('casaBarro_usuario', JSON.stringify(resultado.usuario));
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 1500 }).then(() => {
                window.location.href = ['admin', 'vendedor', 'logistica'].includes(resultado.usuario.rol) ? 'admin.html' : 'perfil.html';
            });
        } else { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: resultado.error || 'Credenciales inválidas', showConfirmButton: false, timer: 2500 }); }
    } catch (error) { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Sin conexión', showConfirmButton: false, timer: 2500 }); }
}

window.registrarUsuario = async function(event) {
    event.preventDefault();
    const inputs = event.target.querySelectorAll('input');
    const data = { nombre: inputs[0] ? inputs[0].value : '', correo: inputs[1] ? inputs[1].value : '', password: inputs[2] ? inputs[2].value : '', rol: 'cliente', empresa: document.getElementById('reg-empresa') ? document.getElementById('reg-empresa').value : null };
    try {
        const respuesta = await fetch('http://localhost:3000/api/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (respuesta.ok) { Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 2000 }).then(() => window.location.href = 'login.html'); }
    } catch(e) { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Sin conexión', showConfirmButton: false, timer: 3000 }); }
}

window.guardarConfiguracion = async function(event) {
    event.preventDefault();
    const userLogueado = JSON.parse(localStorage.getItem('casaBarro_usuario'));
    if (!userLogueado) return;

    const nuevaData = {
        nombre: document.getElementById('conf-nombre').value,
        correo: document.getElementById('conf-correo').value,
        password: document.getElementById('conf-pass').value,
        telefono: document.getElementById('conf-telefono').value,
        usuario_id_actor: userLogueado.id
    };

    try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${userLogueado.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevaData) });
        if (res.ok) {
            userLogueado.nombre = nuevaData.nombre; userLogueado.correo = nuevaData.correo; userLogueado.password = nuevaData.password; userLogueado.telefono = nuevaData.telefono;
            localStorage.setItem('casaBarro_usuario', JSON.stringify(userLogueado));
            document.getElementById('admin-user-name').innerText = `Hola, ${nuevaData.nombre.split(' ')[0]} ♡`;
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 2000 });
        }
    } catch(e) { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Sin conexión', showConfirmButton: false, timer: 3000 }); }
}

// MI ACTIVIDAD: BITÁCORA GENERAL DEL SISTEMA
window.cargarMiActividad = async function() {
    const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));
    if (!usuarioActual) return;

    const contenedor = document.getElementById('timeline-actividad');
    if (!contenedor) return;

    contenedor.innerHTML = '<p style="color:#777; text-align:center; padding:20px;">Cargando actividad...</p>';

    try {
        const res = await fetch(`http://localhost:3000/api/mis-actividades/${usuarioActual.id}`);
        const resultado = await res.json();

        if (!res.ok) {
            throw new Error(resultado.error || 'No se pudo cargar la actividad');
        }

        if (!resultado.data || resultado.data.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:#777;">
                    <h3 style="color:var(--verde-logo); margin-bottom:8px;">Sin actividad registrada</h3>
                    <p>Tus altas, ediciones, bajas y demás movimientos aparecerán aquí.</p>
                </div>
            `;
            return;
        }

        const configuracion = {
            ALTA:       { icono: '+', color: '#198754' },
            EDICION:    { icono: '✎', color: '#d39e00' },
            BAJA:       { icono: '−', color: '#b7410e' },
            CRM:        { icono: '☎', color: '#2980b9' },
            SESION:     { icono: '↪', color: '#6c757d' },
            PEDIDO:     { icono: '▣', color: '#6f42c1' },
            INVENTARIO: { icono: '▤', color: '#17a2b8' },
            LOGISTICA:  { icono: '➜', color: '#d9822b' }
        };

        let html = '';

        resultado.data.forEach(act => {
            const estilo = configuracion[act.accion] || { icono: '•', color: '#557268' };

            let fechaTexto = '';
            if (act.fecha) {
                // SQLite guarda CURRENT_TIMESTAMP en UTC.
                const fechaISO = act.fecha.includes('T') ? act.fecha : act.fecha.replace(' ', 'T') + 'Z';
                const fecha = new Date(fechaISO);

                if (!Number.isNaN(fecha.getTime())) {
                    fechaTexto = fecha.toLocaleString('es-MX', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                    });
                }
            }

            const rolTexto = act.rol === 'admin'
                ? 'Administrador'
                : act.rol === 'vendedor'
                    ? 'Vendedor'
                    : act.rol === 'logistica'
                        ? 'Logística'
                        : act.rol;

            html += `
                <div class="actividad-item"
                     data-accion="${act.accion}"
                     data-modulo="${act.modulo}"
                     style="display:flex; gap:16px; align-items:flex-start;">

                    <div style="
                        width:42px;
                        height:42px;
                        min-width:42px;
                        border-radius:50%;
                        background:${estilo.color};
                        color:white;
                        display:flex;
                        justify-content:center;
                        align-items:center;
                        font-size:1.15rem;
                        font-weight:bold;
                        box-shadow:0 3px 8px rgba(0,0,0,0.12);">
                        ${estilo.icono}
                    </div>

                    <div style="
                        flex:1;
                        background:white;
                        border:1px solid #eae5db;
                        padding:16px 18px;
                        border-radius:12px;
                        box-shadow:0 2px 8px rgba(0,0,0,0.03);">

                        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:9px;">
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <span style="background:${estilo.color}; color:white; padding:4px 10px; border-radius:14px; font-size:0.75rem; font-weight:bold;">
                                    ${act.accion}
                                </span>
                                <strong style="color:var(--verde-logo);">${act.modulo}</strong>
                                <span style="color:#888; font-size:0.82rem;">${rolTexto || ''}</span>
                            </div>

                            <span style="color:#999; font-size:0.82rem;">${fechaTexto}</span>
                        </div>

                        <p style="margin:0; color:#444; line-height:1.5; font-size:0.95rem;">
                            ${act.descripcion}
                        </p>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = html;
        filtrarMiActividad();

    } catch (error) {
        console.error('Error cargando actividad:', error);
        contenedor.innerHTML = `
            <p style="color:#b7410e; text-align:center; padding:25px;">
                No fue posible cargar la actividad.
            </p>
        `;
    }
}

window.filtrarMiActividad = function() {
    const filtro = document.getElementById('actividad-filtro');
    const modulo = document.getElementById('actividad-modulo');
    const texto = document.getElementById('actividad-busqueda');

    const accionSeleccionada = filtro ? filtro.value : 'todos';
    const moduloSeleccionado = modulo ? modulo.value : 'todos';
    const busqueda = texto ? texto.value.toLowerCase().trim() : '';

    document.querySelectorAll('.actividad-item').forEach(item => {
        const accion = item.dataset.accion || '';
        const moduloItem = item.dataset.modulo || '';
        const contenido = item.innerText.toLowerCase();

        const coincideAccion = accionSeleccionada === 'todos' || accion === accionSeleccionada;
        const coincideModulo = moduloSeleccionado === 'todos' || moduloItem === moduloSeleccionado;
        const coincideTexto = !busqueda || contenido.includes(busqueda);

        item.style.display = (coincideAccion && coincideModulo && coincideTexto) ? 'flex' : 'none';
    });
}

// ============================================================
// SCM: LOGÍSTICA, PUSH/PULL Y PEDIDOS A PROVEEDORES
// ============================================================

let scmSugerencias = [];
let scmPedidos = [];

function usuarioSCM() {
    try {
        return JSON.parse(localStorage.getItem('casaBarro_usuario') || 'null');
    } catch (_) {
        return null;
    }
}

function escaparHtmlLogistica(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatearFechaLogistica(valor) {
    if (!valor) return '—';
    const texto = String(valor);
    const fechaISO = texto.includes('T') ? texto : texto.replace(' ', 'T') + 'Z';
    const fecha = new Date(fechaISO);
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString('es-MX');
}

async function apiLogistica(ruta, opciones = {}) {
    const respuesta = await fetch(ruta, {
        cache: 'no-store',
        ...opciones,
        headers: {
            'Content-Type': 'application/json',
            ...(opciones.headers || {})
        }
    });

    let datos = {};
    try { datos = await respuesta.json(); } catch (_) {}

    if (!respuesta.ok) {
        const error = new Error(datos.error || `Error HTTP ${respuesta.status}`);
        error.status = respuesta.status;
        error.data = datos;
        throw error;
    }

    return datos;
}

function badgeEstrategiaLogistica(estrategia){
    const valor=String(estrategia||'').toUpperCase();

    if(!['PUSH','PULL'].includes(valor)){
        return escaparHtmlLogistica(valor||'—');
    }

    const color=valor==='PUSH'
        ?'#6f42c1'
        :'#2980b9';

    return `
        <span style="
            display:inline-block;
            background:${color};
            color:white;
            padding:3px 8px;
            border-radius:12px;
            font-size:.8rem;
            font-weight:bold;
        ">
            ${valor}
        </span>
    `;
}

function badgePedidoLogistica(estado) {
    const nombres = {
        pendiente: 'Pendiente',
        enviado: 'Enviado',
        parcial: 'Parcial',
        recibido: 'Recibido',
        cancelado: 'Cancelado'
    };

    const fondos = {
        pendiente: '#fff3cd',
        enviado: '#dbeafe',
        parcial: '#fde68a',
        recibido: '#dcfce7',
        cancelado: '#fee2e2'
    };

    return `<span style="display:inline-block;padding:5px 10px;border-radius:16px;background:${fondos[estado] || '#eee'};font-weight:700;font-size:.82rem;">${nombres[estado] || escaparHtmlLogistica(estado)}</span>`;
}

window.cargarLogisticaSCM = async function() {
    const error = document.getElementById('logistica-error');
    if (error) error.textContent = '';

    try {
        const [sugerenciasR, pedidosR, resumenR] = await Promise.all([
            apiLogistica('/api/scm/sugerencias'),
            apiLogistica('/api/scm/pedidos'),
            apiLogistica('/api/scm/resumen')
        ]);

        scmSugerencias = sugerenciasR.data || [];
        scmPedidos = pedidosR.data || [];

        const focoGuardado = localStorage.getItem('casaBarro_logistica_insumo');
        if (focoGuardado) {
            try {
                const foco = JSON.parse(focoGuardado);
                const encontrado = scmSugerencias.find(i => Number(i.insumo_id) === Number(foco.id));
                const buscador = document.getElementById('logistica-buscar-insumo');
                const filtro = document.getElementById('logistica-filtro-sugerencia');
                if (buscador && encontrado) buscador.value = encontrado.insumo_nombre || foco.nombre || '';
                if (filtro) filtro.value = 'todos';
            } catch (_) {}
            localStorage.removeItem('casaBarro_logistica_insumo');
        }

        renderResumenLogistica(resumenR.data || {});
        renderSugerenciasLogistica();
        renderPedidosLogistica();

        const ultima = document.getElementById('logistica-actualizado');
        if (ultima) ultima.textContent = 'Actualizado: ' + new Date().toLocaleString('es-MX');
    } catch (e) {
        console.error('Error cargando logística SCM:', e);
        if (error) error.textContent = 'No se pudieron cargar los datos: ' + e.message;
    }
};

function renderResumenLogistica(r) {
    const valores = {
        'logistica-k-sugerencias': r.sugerencias_reposicion ?? 0,
        'logistica-k-pendientes': r.pedidos_pendientes ?? 0,
        'logistica-k-transito': Number(r.pedidos_enviados || 0) + Number(r.pedidos_parciales || 0),
        'logistica-k-recibidos': r.recibidos_hoy ?? 0
    };

    Object.entries(valores).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });
}

window.filtrarSugerenciasLogistica = function() {
    renderSugerenciasLogistica();
};

function renderSugerenciasLogistica() {
    const tbody = document.getElementById('logistica-tabla-sugerencias');
    if (!tbody) return;

    const texto = (document.getElementById('logistica-buscar-insumo')?.value || '').trim().toLowerCase();
    const filtro = document.getElementById('logistica-filtro-sugerencia')?.value || 'todos';

    const filas = scmSugerencias.filter(i => {
        const buscar = `${i.insumo_nombre || ''} ${i.proveedor_nombre || ''}`.toLowerCase();
        const coincideTexto = !texto || buscar.includes(texto);
        let coincideFiltro = true;

        if (filtro === 'reponer') coincideFiltro = !!i.necesita_reposicion;
        if (filtro === 'configurar') coincideFiltro = !!i.configuracion_pendiente;
        if (filtro === 'PUSH' || filtro === 'PULL') coincideFiltro = i.estrategia_reposicion === filtro;

        return coincideTexto && coincideFiltro;
    });

    if (!filas.length) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:25px;color:#777;">No hay insumos que coincidan con el filtro.</td></tr>`;
        return;
    }

    tbody.innerHTML = filas.map(i => {
        let estado;

        if (i.necesita_reposicion) {
            estado = `<span style="color:#b7410e;font-weight:700;">Reponer</span>`;
        } else if (i.configuracion_pendiente) {
            estado = `<span style="color:#9a6700;font-weight:700;">Configurar</span>`;
        } else {
            estado = `<span style="color:#2f6b46;font-weight:700;">Correcto</span>`;
        }
        
        return `
            <tr>
                <td><strong>${escaparHtmlLogistica(i.insumo_nombre)}</strong></td>
                <td>${escaparHtmlLogistica(i.proveedor_nombre || 'Sin proveedor')}</td>
                <td>${badgeEstrategiaLogistica(i.estrategia_reposicion)}</td>
                <td>${Number(i.stock_actual)}</td>
                <td>${Number(i.stock_minimo)}</td>
                <td>${Number(i.consumo_30d)}</td>
                <td>${Number(i.dias_cobertura)} días</td>
                <td>${Number(i.cantidad_sugerida)}</td>
                <td title="${escaparHtmlLogistica(i.motivo_sugerencia)}">${estado}</td>
                <td>
                    <div class="acciones-logistica-botones">
                        <button
                            class="btn-configurar-scm"
                            onclick="configurarReposicionInsumo(${i.insumo_id})"
                        >
                            Configurar
                        </button>
                        ${
                            i.estrategia_reposicion === 'PUSH'
                                ? `
                                    <span class="badge-auto-push">
                                        Automático
                                    </span>
                                `
                                : `
                                    <button
                                        class="btn-pedido-scm"
                                        onclick="crearPedidoReposicion(${i.insumo_id})"
                                        ${!i.proveedor_id ? 'disabled' : ''}
                                    >
                                        Pedido
                                    </button>
                                `
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.configurarReposicionInsumo = async function(insumoId) {
    const i = scmSugerencias.find(x => Number(x.insumo_id) === Number(insumoId));
    if (!i) return;

    const resultado = await Swal.fire({
        title: `Reposición: ${i.insumo_nombre}`,
        html: `
            <div style="text-align:left;display:grid;gap:10px;">
                <label>Estrategia
                    <select id="logistica-estrategia" class="swal2-select" style="width:100%;margin:4px 0 0 0;">
                        <option value="PUSH" ${i.estrategia_reposicion === 'PUSH' ? 'selected' : ''}>PUSH - reposición automática planificada</option>
                        <option value="PULL" ${i.estrategia_reposicion === 'PULL' ? 'selected' : ''}>PULL - reposición según demanda</option>
                    </select>
                </label>

                <label>Stock mínimo
                    <input id="logistica-minimo" type="number" min="0" step="1" class="swal2-input" value="${Number(i.stock_minimo)}" style="width:100%;margin:4px 0 0 0;">
                </label>

                <label>Días de cobertura para PUSH
                    <input id="logistica-dias" type="number" min="1" max="90" step="1" class="swal2-input" value="${Number(i.dias_cobertura || 7)}" style="width:100%;margin:4px 0 0 0;">
                </label>

                <small style="color:#777;">PUSH usa las salidas de los últimos 30 días y la cobertura para generar reposición automática. PULL usa la demanda real y el stock mínimo para sugerir un pedido manual.</small>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3c4a45',
        preConfirm: () => {
            const estrategia = document.getElementById('logistica-estrategia').value;
            const stock_minimo = Number(document.getElementById('logistica-minimo').value);
            const dias_cobertura = Number(document.getElementById('logistica-dias').value);

            if (!Number.isInteger(stock_minimo) || stock_minimo < 0) {
                Swal.showValidationMessage('El stock mínimo debe ser un entero mayor o igual que cero.');
                return false;
            }

            if (!Number.isInteger(dias_cobertura) || dias_cobertura < 1 || dias_cobertura > 90) {
                Swal.showValidationMessage('Los días deben estar entre 1 y 90.');
                return false;
            }

            return { estrategia_reposicion: estrategia, stock_minimo, dias_cobertura };
        }
    });

    if (!resultado.isConfirmed) return;

    try {
        await apiLogistica(`/api/scm/insumos/${insumoId}/configuracion`, {
            method: 'PUT',
            body: JSON.stringify({
                ...resultado.value,
                usuario_id: usuarioSCM()?.id || null
            })
        });

        await Swal.fire({
            icon: 'success',
            title: 'Configuración guardada',
            timer: 1200,
            showConfirmButton: false
        });

        await cargarLogisticaSCM();
    } catch (e) {
        Swal.fire({
            icon: 'error',
            title: 'No se pudo guardar',
            text: e.message,
            confirmButtonColor: '#3c4a45'
        });
    }
};

window.crearPedidoReposicion = async function(insumoId) {
    const i = scmSugerencias.find(x => Number(x.insumo_id) === Number(insumoId));
    if (!i) return;

    if (i.estrategia_reposicion === 'PUSH') return Swal.fire({icon:'info',title:'Reposición automática',text:'Los insumos PUSH generan el pedido automáticamente según consumo y cobertura.',confirmButtonColor:'#3c4a45'});

    if (!i.proveedor_id) {
        return Swal.fire({
            icon: 'warning',
            title: 'Sin proveedor',
            text: 'Asigna un proveedor antes de crear el pedido.'
        });
    }

    const sugerida = Math.max(1, Number(i.cantidad_sugerida || 1));

    const resultado = await Swal.fire({
        title: `Pedido: ${i.insumo_nombre}`,
        html: `
            <div style="text-align:left;line-height:1.6;">
                <p><strong>Proveedor:</strong> ${escaparHtmlLogistica(i.proveedor_nombre)}</p>
                <p><strong>Estrategia:</strong> ${escaparHtmlLogistica(i.estrategia_reposicion)}</p>
                <p><strong>Stock:</strong> ${Number(i.stock_actual)} · <strong>Mínimo:</strong> ${Number(i.stock_minimo)}</p>
                <p><strong>Sugerencia:</strong> ${Number(i.cantidad_sugerida)} porciones</p>

                <label>Cantidad a solicitar
                    <input id="logistica-cantidad-pedido" type="number" min="1" step="1" class="swal2-input" value="${sugerida}" style="width:100%;margin:4px 0 10px 0;">
                </label>

                <label>Observaciones
                    <textarea id="logistica-observaciones" class="swal2-textarea" placeholder="Opcional" style="width:100%;margin:4px 0 0 0;"></textarea>
                </label>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Crear pedido',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3c4a45',
        preConfirm: () => {
            const cantidad = Number(document.getElementById('logistica-cantidad-pedido').value);
            if (!Number.isInteger(cantidad) || cantidad <= 0) {
                Swal.showValidationMessage('La cantidad debe ser un entero mayor que cero.');
                return false;
            }

            return {
                cantidad,
                observaciones: document.getElementById('logistica-observaciones').value.trim()
            };
        }
    });

    if (!resultado.isConfirmed) return;

    try {
        await apiLogistica('/api/scm/pedidos', {
            method: 'POST',
            body: JSON.stringify({
                insumo_id: insumoId,
                cantidad: resultado.value.cantidad,
                observaciones: resultado.value.observaciones,
                origen: Number(i.cantidad_sugerida) > 0 ? 'SUGERENCIA' : 'MANUAL',
                usuario_id: usuarioSCM()?.id || null
            })
        });

        await Swal.fire({
            icon: 'success',
            title: 'Pedido creado',
            timer: 1300,
            showConfirmButton: false
        });

        await cargarLogisticaSCM();
    } catch (e) {
        Swal.fire({
            icon: e.status === 409 ? 'info' : 'error',
            title: e.status === 409 ? 'Pedido ya abierto' : 'No se pudo crear',
            text: e.message,
            confirmButtonColor: '#3c4a45'
        });
    }
};

window.filtrarPedidosLogistica = function() {
    renderPedidosLogistica();
};

function renderPedidosLogistica() {
    const tbody = document.getElementById('logistica-tabla-pedidos');
    if (!tbody) return;

    const filtro = document.getElementById('logistica-filtro-pedidos')?.value || 'todos';
    const texto = (document.getElementById('logistica-buscar-pedido')?.value || '').trim().toLowerCase();

    const filas = scmPedidos.filter(p => {
        const coincideEstado = filtro === 'todos' || p.estado === filtro;
        const buscar = `#${p.id} ${p.insumo_nombre || ''} ${p.proveedor_nombre || ''}`.toLowerCase();
        const coincideTexto = !texto || buscar.includes(texto);
        return coincideEstado && coincideTexto;
    });

    if (!filas.length) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:25px;color:#777;">No hay pedidos que coincidan con el filtro.</td></tr>`;
        return;
    }

    tbody.innerHTML = filas.map(p => {
        const restante = Number(
            p.cantidad_restante ?? (Number(p.cantidad) - Number(p.cantidad_recibida || 0))
        );

        const acciones = [];

        if (p.estado === 'pendiente') {
            acciones.push(`
                <button
                    class="btn-accion-pedido btn-enviar-pedido"
                    onclick="enviarPedidoReposicion(${p.id})"
                >
                    Enviar
                </button>
            `);
        }

        if (['enviado', 'parcial'].includes(p.estado) && restante > 0) {
            acciones.push(`
                <button
                    class="btn-accion-pedido btn-recibir-pedido"
                    onclick="recibirPedidoReposicion(${p.id})"
                >
                    Recibir
                </button>
            `);
        }

        if (['pendiente', 'enviado'].includes(p.estado)) {
            acciones.push(`
                <button
                    class="btn-accion-pedido btn-cancelar-pedido"
                    onclick="cancelarPedidoReposicion(${p.id})"
                >
                    Cancelar
                </button>
            `);
        }

        acciones.push(`
            <button
                class="btn-accion-pedido btn-historial-pedido"
                onclick="historialPedidoReposicion(${p.id})"
            >
                Historial
            </button>
        `);

        return `
            <tr>
                <td>#${p.id}</td>
                <td><strong>${escaparHtmlLogistica(p.insumo_nombre || '—')}</strong></td>
                <td>${escaparHtmlLogistica(p.proveedor_nombre || '—')}</td>
                <td>${badgeEstrategiaLogistica(p.tipo)}</td>
                <td>${Number(p.cantidad)}</td>
                <td>${Number(p.cantidad_recibida || 0)}</td>
                <td>${restante}</td>
                <td>$${Number(p.total_estimado || 0).toFixed(2)}</td>
                <td>${badgePedidoLogistica(p.estado)}</td>
                <td>${formatearFechaLogistica(p.fecha_creacion)}</td>

                <td>
                    <div class="acciones-pedido">
                        ${acciones.join('')}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.enviarPedidoReposicion = async function(pedidoId) {
    const r = await Swal.fire({
        icon: 'question',
        title: `Enviar pedido #${pedidoId}`,
        text: 'Se marcará como enviado al proveedor.',
        showCancelButton: true,
        confirmButtonText: 'Sí, enviar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3c4a45'
    });

    if (!r.isConfirmed) return;

    try {
        await apiLogistica(`/api/scm/pedidos/${pedidoId}/enviar`, {
            method: 'PUT',
            body: JSON.stringify({ usuario_id: usuarioSCM()?.id || null })
        });

        await cargarLogisticaSCM();
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
};

window.recibirPedidoReposicion = async function(pedidoId) {
    const p = scmPedidos.find(x => Number(x.id) === Number(pedidoId));
    if (!p) return;

    const restante = Number(
        p.cantidad_restante ?? (Number(p.cantidad) - Number(p.cantidad_recibida || 0))
    );

    const r = await Swal.fire({
        title: `Recibir pedido #${pedidoId}`,
        html: `
            <p style="text-align:left;"><strong>${escaparHtmlLogistica(p.insumo_nombre)}</strong></p>
            <p style="text-align:left;">Pendiente por recibir: <strong>${restante}</strong> porciones.</p>
            <input id="logistica-recibir-cantidad" class="swal2-input" type="number" min="1" max="${restante}" step="1" value="${restante}" style="width:100%;margin:5px 0 0 0;">
        `,
        showCancelButton: true,
        confirmButtonText: 'Registrar recepción',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3c4a45',
        preConfirm: () => {
            const cantidad = Number(document.getElementById('logistica-recibir-cantidad').value);
            if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > restante) {
                Swal.showValidationMessage(`Ingresa un entero entre 1 y ${restante}.`);
                return false;
            }
            return cantidad;
        }
    });

    if (!r.isConfirmed) return;

    try {
        const respuesta = await apiLogistica(`/api/scm/pedidos/${pedidoId}/recibir`, {
            method: 'PUT',
            body: JSON.stringify({
                cantidad_recibida: r.value,
                usuario_id: usuarioSCM()?.id || null
            })
        });

        await Swal.fire({
            icon: 'success',
            title: respuesta.estado === 'recibido' ? 'Pedido recibido' : 'Recepción parcial',
            text: `Inventario actualizado. Restante: ${respuesta.cantidad_restante}.`,
            confirmButtonColor: '#3c4a45'
        });

        await cargarLogisticaSCM();
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'No se pudo recibir', text: e.message });
    }
};

window.cancelarPedidoReposicion = async function(pedidoId) {
    const r = await Swal.fire({
        icon: 'warning',
        title: `Cancelar pedido #${pedidoId}`,
        text: 'El pedido quedará registrado como cancelado.',
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#b7410e'
    });

    if (!r.isConfirmed) return;

    try {
        await apiLogistica(`/api/scm/pedidos/${pedidoId}/cancelar`, {
            method: 'PUT',
            body: JSON.stringify({ usuario_id: usuarioSCM()?.id || null })
        });
        await cargarLogisticaSCM();
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'No se pudo cancelar', text: e.message });
    }
};

window.historialPedidoReposicion = async function(pedidoId) {
    try {
        const r = await apiLogistica(`/api/scm/pedidos/${pedidoId}/movimientos`);
        const filas = r.data || [];

        const html = filas.length
            ? filas.map(m => `
                <div style="text-align:left;border-bottom:1px solid #eee;padding:10px 0;">
                    <strong>${escaparHtmlLogistica(m.tipo || 'Movimiento')}</strong>
                    <div>${escaparHtmlLogistica(m.descripcion || '')}</div>
                    <small style="color:#777;">${formatearFechaLogistica(m.fecha)}${m.usuario_nombre ? ` · ${escaparHtmlLogistica(m.usuario_nombre)}` : ''}</small>
                </div>
            `).join('')
            : '<p>No hay movimientos.</p>';

        Swal.fire({
            title: `Historial pedido #${pedidoId}`,
            html,
            width: 650,
            confirmButtonColor: '#3c4a45'
        });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
};

// La logística SCM se activa únicamente si existe su tabla en la página actual.
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('logistica-tabla-sugerencias')) {
        cargarLogisticaSCM();
    }
});
// ============================================================
// SCM: ANALÍTICA, INDICADORES Y MADUREZ OPERATIVA
// ============================================================

function monedaSCM(valor) {
    return Number(valor || 0).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    });
}

function porcentajeVisualSCM(valor) {
    const numero = Math.max(0, Math.min(100, Number(valor || 0)));
    return `${numero}%`;
}

function escaparAnaliticaSCM(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[caracter]));
}

function textoEstadoStockSCM(item) {
    const actual = Number(item.stock_actual || 0);
    const minimo = Number(item.stock_minimo || 0);

    if (actual <= 0) return 'Agotado';
    if (actual <= minimo) return 'Stock bajo';
    if (item.configuracion_pendiente) return 'Configurar';
    if (item.necesita_reposicion) return 'Reponer';
    return 'Normal';
}

function colorEstadoStockSCM(item) {
    const actual = Number(item.stock_actual || 0);
    const minimo = Number(item.stock_minimo || 0);

    if (actual <= 0) return '#b7410e';
    if (actual <= minimo) return '#c9841d';
    if (item.configuracion_pendiente) return '#8b6f47';
    if (item.necesita_reposicion) return '#c9841d';
    return '#3c6e57';
}

window.cargarAnaliticaSCM = async function() {
    const error = document.getElementById('analitica-scm-error');
    const actualizado = document.getElementById('analitica-scm-actualizado');

    if (error) error.textContent = '';
    if (actualizado) actualizado.textContent = 'Actualizando...';

    try {
        const respuesta = await fetch('/api/scm/analitica', { cache: 'no-store' });
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.error || 'No se pudo cargar la analítica SCM.');
        }

        renderAnaliticaSCM(resultado.data || {});

        if (actualizado) {
            actualizado.textContent = `Actualizado: ${new Date().toLocaleString('es-MX')}`;
        }
    } catch (e) {
        console.error('Error cargando analítica SCM:', e);
        if (error) error.textContent = e.message;
        if (actualizado) actualizado.textContent = 'No se pudo actualizar';
    }
};

function renderAnaliticaSCM(data) {
    const k = data.kpis || {};
    const madurez = data.madurez || {};
    const estrategias = data.estrategias || {};
    const stock = data.stock || {};

    const setTexto = (id, valor) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    };

    setTexto('scm-k-productos', Number(k.productos_total || 0));
    setTexto('scm-k-insumos', Number(k.insumos_activos || 0));
    setTexto('scm-k-valor', monedaSCM(k.valor_inventario));
    setTexto('scm-k-agotados', Number(k.agotados || 0));
    setTexto('scm-k-bajos', Number(k.bajos || 0));
    setTexto('scm-k-reposiciones', Number(k.sugerencias_reposicion || 0));
    setTexto('scm-k-transito', Number(k.pedidos_enviados || 0) + Number(k.pedidos_parciales || 0));
    setTexto('scm-k-madurez', `${Number(madurez.puntaje || 0)}/100`);

    setTexto('scm-madurez-nivel', madurez.nivel || 'Inicial');
    setTexto('scm-madurez-puntaje', `${Number(madurez.puntaje || 0)}%`);
    setTexto('scm-madurez-aclaracion', madurez.aclaracion || '');

    const barraMadurez = document.getElementById('scm-madurez-barra');
    if (barraMadurez) barraMadurez.style.width = porcentajeVisualSCM(madurez.puntaje);

    const criterios = document.getElementById('scm-tabla-criterios');
    if (criterios) {
        criterios.innerHTML = (madurez.criterios || []).length
            ? madurez.criterios.map(c => `
                <tr>
                    <td><strong>${escaparAnaliticaSCM(c.nombre)}</strong></td>
                    <td>${Number(c.porcentaje || 0).toFixed(1)}%</td>
                    <td>${Number(c.peso || 0)} pts</td>
                    <td>${Number(c.puntos || 0).toFixed(1)} pts</td>
                    <td>
                        <div class="scm-mini-barra">
                            <span style="width:${porcentajeVisualSCM(c.porcentaje)}"></span>
                        </div>
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="5">Sin criterios disponibles.</td></tr>';
    }

    const recomendaciones = document.getElementById('scm-recomendaciones');
    if (recomendaciones) {
        recomendaciones.innerHTML = (madurez.recomendaciones || []).length
            ? madurez.recomendaciones.map(r => `<li>${escaparAnaliticaSCM(r)}</li>`).join('')
            : '<li>Sin recomendaciones pendientes.</li>';
    }

    const totalEstrategias = Number(estrategias.push || 0) + Number(estrategias.pull || 0);
    const pushPct = totalEstrategias ? (Number(estrategias.push || 0) / totalEstrategias) * 100 : 0;
    const pullPct = totalEstrategias ? (Number(estrategias.pull || 0) / totalEstrategias) * 100 : 0;

    setTexto('scm-push-total', Number(estrategias.push || 0));
    setTexto('scm-pull-total', Number(estrategias.pull || 0));
    setTexto('scm-push-pct', `${pushPct.toFixed(1)}%`);
    setTexto('scm-pull-pct', `${pullPct.toFixed(1)}%`);

    const pushBar = document.getElementById('scm-push-barra');
    const pullBar = document.getElementById('scm-pull-barra');
    if (pushBar) pushBar.style.width = `${pushPct}%`;
    if (pullBar) pullBar.style.width = `${pullPct}%`;

    const totalStock = Number(stock.agotados || 0) + Number(stock.bajos || 0) + Number(stock.normales || 0);
    const agotadoPct = totalStock ? (Number(stock.agotados || 0) / totalStock) * 100 : 0;
    const bajoPct = totalStock ? (Number(stock.bajos || 0) / totalStock) * 100 : 0;
    const normalPct = totalStock ? (Number(stock.normales || 0) / totalStock) * 100 : 0;

    setTexto('scm-stock-agotado', Number(stock.agotados || 0));
    setTexto('scm-stock-bajo', Number(stock.bajos || 0));
    setTexto('scm-stock-normal', Number(stock.normales || 0));

    const agotadoBar = document.getElementById('scm-stock-agotado-barra');
    const bajoBar = document.getElementById('scm-stock-bajo-barra');
    const normalBar = document.getElementById('scm-stock-normal-barra');
    if (agotadoBar) agotadoBar.style.width = `${agotadoPct}%`;
    if (bajoBar) bajoBar.style.width = `${bajoPct}%`;
    if (normalBar) normalBar.style.width = `${normalPct}%`;

    setTexto('scm-movimientos-30d', Number(k.movimientos_30d || 0));
    setTexto('scm-entradas-30d', Number(k.entradas_30d || 0));
    setTexto('scm-salidas-30d', Number(k.salidas_30d || 0));
    setTexto('scm-pedidos-pendientes', Number(k.pedidos_pendientes || 0));
    setTexto('scm-recibidos-30d', Number(k.recibidos_30d || 0));
    setTexto('scm-valor-pendiente', monedaSCM(k.valor_pendiente));
    setTexto('scm-compras-30d', monedaSCM(k.compras_recibidas_30d));

    const consumo = document.getElementById('scm-tabla-consumo');
    if (consumo) {
        consumo.innerHTML = (data.top_consumo || []).length
            ? data.top_consumo.map((item, indice) => `
                <tr>
                    <td>${indice + 1}</td>
                    <td><strong>${escaparAnaliticaSCM(item.insumo_nombre)}</strong></td>
                    <td>${Number(item.consumo_30d || 0)}</td>
                    <td>${Number(item.stock_actual || 0)}</td>
                    <td>${Number(item.stock_minimo || 0)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="5">Todavía no existen salidas de inventario suficientes para mostrar consumo.</td></tr>';
    }

    const proveedores = document.getElementById('scm-tabla-proveedores');
    if (proveedores) {
        proveedores.innerHTML = (data.proveedores || []).length
            ? data.proveedores.map(p => `
                <tr>
                    <td><strong>${escaparAnaliticaSCM(p.nombre)}</strong></td>
                    <td>${Number(p.insumos_asignados || 0)}</td>
                    <td>${Number(p.pedidos_abiertos || 0)}</td>
                    <td>${Number(p.porciones_pendientes || 0)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="4">No hay proveedores activos.</td></tr>';
    }

    const atencion = document.getElementById('scm-tabla-atencion');
    if (atencion) {
        atencion.innerHTML = (data.atencion || []).length
            ? data.atencion.map(item => {
                const estado = textoEstadoStockSCM(item);
                const color = colorEstadoStockSCM(item);
                const pedido = item.pedido_abierto_id
                    ? `#${item.pedido_abierto_id} · ${escaparAnaliticaSCM(item.pedido_estado)}<br><small>${Number(item.pedido_pendiente || 0)} pendientes</small>`
                    : '<span style="color:#777;">Sin pedido</span>';

                return `
                    <tr>
                        <td><strong>${escaparAnaliticaSCM(item.insumo_nombre)}</strong></td>
                        <td>${escaparAnaliticaSCM(item.proveedor_nombre || 'Sin proveedor')}</td>
                        <td>${escaparAnaliticaSCM(item.estrategia_reposicion || 'PUSH')}</td>
                        <td>${Number(item.stock_actual || 0)}</td>
                        <td>${Number(item.stock_minimo || 0)}</td>
                        <td>${Number(item.cantidad_sugerida || 0)}</td>
                        <td>${pedido}</td>
                        <td><strong style="color:${color};">${estado}</strong></td>
                    </tr>
                `;
            }).join('')
            : '<tr><td colspan="8">No hay insumos que requieran atención.</td></tr>';
    }
}

window.imprimirResumenSCM = function() {
    window.print();
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('scm-panel-analitica')) {
        cargarAnaliticaSCM();
    }
});