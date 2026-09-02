// 1. INYECCIÓN DE COMPONENTES
async function cargarComponente(id, ruta) {
    try {
        const respuesta = await fetch(ruta);
        const html = await respuesta.text();
        document.getElementById(id).innerHTML = html;
    } catch (error) {
        console.error("Error al cargar " + ruta, error);
    }
}

// 2. SISTEMA DE CARRITO PERSISTENTE Y DESCUENTOS
let carrito = JSON.parse(localStorage.getItem('casaBarro_carrito')) || [];
let propinaPorcentaje = 0;
let cuponAplicado = JSON.parse(localStorage.getItem('casaBarro_cupon')) || null;

window.mostrarProximamente = function() {
    Swal.fire({ title: '¡Próximamente!', text: 'Esta función estará disponible muy pronto.', icon: 'info', confirmButtonText: 'Entendido', confirmButtonColor: '#3c4a45' });
}

window.aplicarDescuento = function(codigo, porcentaje) {
    cuponAplicado = { codigo: codigo, porcentaje: porcentaje };
    localStorage.setItem('casaBarro_cupon', JSON.stringify(cuponAplicado));
    
    Swal.fire({
        icon: 'success', title: '¡Descuento Aplicado!', text: `El cupón ${codigo} del ${porcentaje}% se reflejará en tu carrito.`,
        confirmButtonColor: '#3c4a45', confirmButtonText: 'Ir a mi pedido', showCancelButton: true, cancelButtonText: 'Seguir viendo'
    }).then((result) => {
        if (result.isConfirmed) window.location.href = 'carrito.html';
    });
}

window.mostrarPoliticas = function() {
    Swal.fire({
        title: 'Políticas de Compra y Venta',
        html: `
            <div style="text-align: left; font-size: 0.95rem; line-height: 1.6; color: #555; max-height: 350px; overflow-y: auto; padding-right: 10px;">
                <h4 style="color:var(--verde-logo); margin-bottom:5px;">1. Pedidos y Preparación</h4>
                <p style="margin-bottom:15px;">Todos los platillos se preparan al momento. El tiempo estimado de entrega puede variar entre 25 a 45 minutos dependiendo de la demanda en la sucursal.</p>
                <h4 style="color:var(--verde-logo); margin-bottom:5px;">2. Cancelaciones</h4>
                <p style="margin-bottom:15px;">Una vez que el pedido pasa al estado de "En preparación" en la cocina, no se aceptarán cancelaciones ni devoluciones monetarias.</p>
                <h4 style="color:var(--verde-logo); margin-bottom:5px;">3. Alérgenos e Ingredientes</h4>
                <p style="margin-bottom:15px;">Es responsabilidad del cliente notificar cualquier alergia o intolerancia en las notas del pedido.</p>
                <h4 style="color:var(--verde-logo); margin-bottom:5px;">4. Reembolsos o Reposiciones</h4>
                <p style="margin-bottom:15px;">Si tu pedido llegó incompleto, incorrecto o en mal estado, cuentas con 30 minutos a partir de la entrega para reportarlo.</p>
            </div>
        `,
        confirmButtonText: 'Aceptar y Cerrar', confirmButtonColor: '#3c4a45', width: '500px'
    });
}

window.actualizarUI = function() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0);
        cartCountElement.innerText = totalItems;
    }
}

window.cambiarCantidad = function(cambio) {
    let el = document.getElementById('swal-cantidad');
    let cantidadActual = parseInt(el.innerText);
    let nuevaCantidad = cantidadActual + cambio;
    if (nuevaCantidad >= 1) el.innerText = nuevaCantidad;
}

window.cambiarCantidadCarrito = function(index, cambio) {
    if (carrito[index].cantidad + cambio >= 1) {
        carrito[index].cantidad += cambio;
        localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito));
        actualizarUI();
        renderizarCarrito();
    }
}

window.confirmarAgregarAlCarrito = function(nombre, precio) {
    let cantidad = parseInt(document.getElementById('swal-cantidad').innerText);
    let selectorOpciones = document.getElementById('swal-opciones');
    let opcionSeleccionada = selectorOpciones ? selectorOpciones.value : null;
    let selectorExtras = document.getElementById('swal-extras');
    let extraSeleccionado = selectorExtras ? selectorExtras.value : null;

    let textoFinal = [];
    if (opcionSeleccionada) textoFinal.push(opcionSeleccionada);
    if (extraSeleccionado) textoFinal.push(extraSeleccionado);
    let stringOpcion = textoFinal.length > 0 ? textoFinal.join(' + ') : null;

    carrito.push({ producto: nombre, precio: precio, cantidad: cantidad, opcion: stringOpcion });
    localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito));
    actualizarUI(); 
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 1500 });
}

window.cambiarPropina = function(porcentaje) { propinaPorcentaje = porcentaje; renderizarCarrito(); }

window.vaciarCarrito = function() {
    Swal.fire({
        title: '¿Vaciar carrito?', text: "Se eliminarán todos los productos de tu pedido.", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#8a8a8a', confirmButtonText: 'Sí, vaciar', cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            carrito = [];
            localStorage.removeItem('casaBarro_carrito');
            cuponAplicado = null;
            localStorage.removeItem('casaBarro_cupon');
            actualizarUI();
            renderizarCarrito();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Carrito vacío', showConfirmButton: false, timer: 1500 });
        }
    });
}

window.removerDescuento = function() { cuponAplicado = null; localStorage.removeItem('casaBarro_cupon'); renderizarCarrito(); }

// 3. PINTAR LA PANTALLA DEL CARRITO
window.validarCuponManual = function() {
    let input = document.getElementById('input-cupon').value.trim().toUpperCase(); 
    if (!input) { Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Escribe un código primero', showConfirmButton: false, timer: 2000 }); return; }

    let porcentaje = 0;
    if (input === 'MAÑANAS15') porcentaje = 10;
    else if (input === 'VIERNES20') porcentaje = 20;
    else if (input === 'SOYCLIENTE15') porcentaje = 15;
    else { Swal.fire({ icon: 'error', title: 'Cupón inválido', text: 'El código ingresado no existe o ha expirado.', confirmButtonColor: '#3c4a45' }); return; }
    
    cuponAplicado = { codigo: input, porcentaje: porcentaje };
    localStorage.setItem('casaBarro_cupon', JSON.stringify(cuponAplicado));
    renderizarCarrito(); 
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 2000 });
}

window.renderizarCarrito = function() {
    const contenedor = document.getElementById('carrito-contenido');
    if (!contenedor) return; 

    if (carrito.length === 0) {
        contenedor.innerHTML = `
            <div class="carrito-vacio">
                <h2 style="color: var(--verde-logo); margin-bottom: 10px;">Tu pedido está vacío</h2>
                <p style="color: #555; margin-bottom: 25px;">¡Anímate a probar nuestras delicias!</p>
                <a href="catalogo.html" class="btn-primary" style="display: inline-block; text-decoration: none;">Ver Menú</a>
            </div>
        `;
        return;
    }

    let htmlItems = '<div class="carrito-grid"><div class="carrito-items"><div style="text-align: right; margin-bottom: 15px;"><button class="btn-eliminar" onclick="vaciarCarrito()">Vaciar carrito</button></div>';
    let subtotal = 0;

    carrito.forEach((item, index) => {
        const totalItem = item.precio * item.cantidad;
        subtotal += totalItem;
        const infoOpcion = item.opcion ? `<p style="font-size:0.85rem; color:#777; margin-bottom: 8px;">Opción: ${item.opcion}</p>` : '';
        htmlItems += `
            <div class="item-carrito" style="align-items: center;">
                <div style="flex-grow: 1;">
                    <h4 style="color:var(--verde-logo); font-size: 1.1rem; margin-bottom: 5px;">${item.producto}</h4>
                    ${infoOpcion}
                    <p style="font-size:1rem; color: #557268; font-weight:bold;">$${item.precio.toFixed(2)}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; margin: 0 20px;">
                    <button onclick="cambiarCantidadCarrito(${index}, -1)" style="background: #eae5db; border:none; border-radius:5px; width:30px; height:30px; cursor:pointer; font-weight:bold; color:#3c4a45; font-size: 1.2rem; display:flex; justify-content:center; align-items:center;">-</button>
                    <span style="font-weight:bold; font-size: 1.1rem; min-width: 20px; text-align: center;">${item.cantidad}</span>
                    <button onclick="cambiarCantidadCarrito(${index}, 1)" style="background: var(--verde-logo); border:none; border-radius:5px; width:30px; height:30px; cursor:pointer; font-weight:bold; color:white; font-size: 1.2rem; display:flex; justify-content:center; align-items:center;">+</button>
                </div>
                <div style="text-align:right; min-width: 90px;">
                    <p style="font-weight:bold; font-size: 1.2rem; color:#3c4a45; margin-bottom:10px;">$${totalItem.toFixed(2)}</p>
                    <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">Quitar</button>
                </div>
            </div>
        `;
    });

    htmlItems += '</div>';

    let montoDescuento = 0;
    let htmlDescuento = '';

    if (cuponAplicado) {
        montoDescuento = subtotal * (cuponAplicado.porcentaje / 100);
        htmlDescuento = `
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; color: #b7410e; font-weight: bold;">
                <span>Descuento (${cuponAplicado.codigo} - ${cuponAplicado.porcentaje}%):</span>
                <span>-$${montoDescuento.toFixed(2)}</span>
            </div>
            <div style="text-align: right; margin-bottom: 15px;">
                <button onclick="removerDescuento()" style="background:none; border:none; color:#777; font-size:0.8rem; text-decoration:underline; cursor:pointer;">Quitar cupón</button>
            </div>
        `;
    } else {
        htmlDescuento = `
            <div style="margin-bottom: 20px;">
                <p style="color: #555; margin-bottom: 8px; font-size: 0.95rem;">¿Tienes un código de descuento?</p>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="input-cupon" placeholder="Ej. VIERNES20" style="flex:1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.95rem; outline: none; font-family: inherit; text-transform: uppercase;">
                    <button onclick="validarCuponManual()" class="btn-primary" style="padding: 8px 15px; border-radius: 8px; font-size: 0.95rem;">Aplicar</button>
                </div>
            </div>
        `;
    }

    let subtotalConDescuento = subtotal - montoDescuento;
    let propinaCalculada = subtotalConDescuento * (propinaPorcentaje / 100);
    let totalFinal = subtotalConDescuento + propinaCalculada;

    localStorage.setItem('casaBarro_totalFinal', totalFinal.toFixed(2));

    htmlItems += `
        <div class="resumen-carrito">
            <h3 style="color:var(--verde-logo); margin-bottom:20px; font-size: 1.3rem;">Resumen de Compra</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; color: #555;">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${htmlDescuento}
            <div style="margin-bottom: 15px;">
                <p style="color: #555; margin-bottom: 8px; font-size: 0.95rem;">¿Deseas agregar propina?</p>
                <div style="display: flex; gap: 8px;">
                    <button onclick="cambiarPropina(0)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 0 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 0 ? 'white' : 'var(--verde-logo)'}; cursor: pointer;">0%</button>
                    <button onclick="cambiarPropina(10)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 10 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 10 ? 'white' : 'var(--verde-logo)'}; cursor: pointer;">10%</button>
                    <button onclick="cambiarPropina(15)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 15 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 15 ? 'white' : 'var(--verde-logo)'}; cursor: pointer;">15%</button>
                    <button onclick="cambiarPropina(20)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 20 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 20 ? 'white' : 'var(--verde-logo)'}; cursor: pointer;">20%</button>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; color: #555;">
                <span>Propina (${propinaPorcentaje}%):</span>
                <span>$${propinaCalculada.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:20px; padding-top: 15px; border-top: 2px dashed #eae5db; font-weight:bold; font-size:1.4rem; color: var(--verde-logo);">
                <span>Total:</span>
                <span>$${totalFinal.toFixed(2)}</span>
            </div>
            <button class="btn-primary" style="width:100%; margin-top: 25px; border-radius: 8px;" onclick="window.location.href='pago.html'">Ir a pagar</button>
        </div>
    </div>`;

    contenedor.innerHTML = htmlItems;
}

window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1); 
    localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito)); 
    actualizarUI(); 
    renderizarCarrito(); 
}

// 4. MODAL DE PRODUCTO FRONT-END
window.abrirDetalleMejorado = function(nombre, descripcion, precioStr, imagenUrl, alineacion = 'center', opcionesStr = '', extrasStr = '') {
    let precioNum = parseFloat(precioStr.replace('$', '').replace(' MXN', ''));
    let opcionesHtml = '';
    
    if (opcionesStr) {
        let opcionesArray = opcionesStr.split(',');
        opcionesHtml += `
            <select id="swal-opciones" class="swal2-select" style="display:flex; width:100%; margin: 10px 0 ${extrasStr ? '10px' : '20px'} 0; font-size: 1rem;">
                ${opcionesArray.map((op, index) => `<option value="${op.trim()}" ${index === 0 ? 'selected' : ''}>${op.trim()}</option>`).join('')}
            </select>
        `;
    }

    if (extrasStr) {
        let extrasArray = extrasStr.split(',');
        opcionesHtml += `
            <select id="swal-extras" class="swal2-select" style="display:flex; width:100%; margin: 0 0 20px 0; font-size: 1rem;">
                ${extrasArray.map((ex, index) => `<option value="${ex.trim()}" ${index === 0 ? 'selected' : ''}>${ex.trim()}</option>`).join('')}
            </select>
        `;
    }

    Swal.fire({
        title: nombre,
        html: `
            <img src="${imagenUrl}" alt="${nombre}" style="width: 100%; height: 250px; object-fit: cover; object-position: ${alineacion}; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <p style="text-align: justify; margin-bottom: 15px; color: #555; line-height: 1.5;">${descripcion}</p>
            <h3 style="color: #3c4a45; font-size: 1.8rem; font-weight: bold; margin-bottom: 10px;">${precioStr}</h3>
            ${opcionesHtml}
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 25px;">
                <button onclick="cambiarCantidad(-1)" style="background-color: #eae5db; border:none; border-radius:50%; width:40px; height:40px; font-size:1.5rem; cursor:pointer; color:#3c4a45; font-weight:bold;">-</button>
                <span id="swal-cantidad" style="font-size:1.4rem; font-weight:bold; min-width: 30px;">1</span>
                <button onclick="cambiarCantidad(1)" style="background-color: var(--verde-logo); border:none; border-radius:50%; width:40px; height:40px; font-size:1.5rem; cursor:pointer; color:white; font-weight:bold;">+</button>
            </div>
            <button onclick="confirmarAgregarAlCarrito('${nombre}', ${precioNum})" class="btn-primary" style="width: 100%; padding: 12px; border-radius: 30px; margin-bottom: 25px;">Agregar al carrito</button>
        `,
        showConfirmButton: false, showCloseButton: true, width: '480px'
    });
}

// 5. ALERTAS Y EVENTOS UI 
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

window.filtrarProductosAdmin = function() {
    let inputBusqueda = document.getElementById('admin-search');
    let selectCategoria = document.getElementById('admin-filter-cat');
    let selectEstado = document.getElementById('admin-filter-status');

    if (!inputBusqueda || !selectCategoria || !selectEstado) return;

    let texto = inputBusqueda.value.toLowerCase();
    let categoria = selectCategoria.value;
    let estado = selectEstado.value;
    let filas = document.querySelectorAll('.admin-row');
    
    filas.forEach(fila => {
        let nombre = fila.getAttribute('data-nombre').toLowerCase();
        let cat = fila.getAttribute('data-categoria');
        let est = fila.getAttribute('data-estado');
        let coincideTexto = nombre.includes(texto);
        let coincideCat = (categoria === 'todos') || (cat === categoria);
        let coincideEst = (estado === 'todos') || (est === estado);
        
        fila.style.display = (coincideTexto && coincideCat && coincideEst) ? '' : 'none';
    });
}

window.abrirFormularioProducto = function(editMode = false) {
    let title = editMode ? 'Editar Producto' : 'Agregar Nuevo Producto';
    let btnText = editMode ? 'Guardar Cambios' : 'Guardar Producto';
    Swal.fire({ title: title, html: `<p>Panel dinámico bloqueado hasta Sprint 2.</p>`, showCancelButton: true, confirmButtonText: btnText, confirmButtonColor: '#3c4a45' }).then((result) => {
        if (result.isConfirmed) Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 1500 });
    });
}

window.eliminarProductoAdmin = function(nombreProducto) {
    Swal.fire({ title: `¿Eliminar ${nombreProducto}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar' }).then((result) => {
        if (result.isConfirmed) Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 1500 });
    });
}

// 8. INICIALIZADOR GLOBAL (DOM LOAD) 
document.addEventListener('DOMContentLoaded', async () => {
    await cargarComponente('navbar-container', 'components/navbar.html');
    await cargarComponente('footer-container', 'components/footer.html');
    
    const adminSidebarContainer = document.getElementById('admin-sidebar-container');
    if (adminSidebarContainer) await cargarComponente('admin-sidebar-container', 'components/admin-sidebar.html');

    const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));
    const spanUsuario = document.getElementById('admin-user-name');
    
    if (spanUsuario) {
        if (!usuarioActual || (usuarioActual.rol !== 'admin' && usuarioActual.rol !== 'vendedor')) {
            window.location.href = 'login.html';
        } else {
            spanUsuario.innerText = `Hola, ${usuarioActual.nombre.split(' ')[0]} ♡`;

            if (usuarioActual.rol === 'vendedor' && window.location.pathname.includes('admin-personal.html')) {
                Swal.fire({
                    icon: 'error', title: 'Acceso Denegado', text: 'Solo los Administradores Maestros pueden gestionar al personal.', confirmButtonColor: '#3c4a45'
                }).then(() => { window.location.href = 'admin.html'; });
            }
        }
    }

    activarAlertas();
    actualizarUI();
    renderizarCarrito();

    const btnCarritoNav = document.getElementById('btn-carrito-nav');
    if(btnCarritoNav) btnCarritoNav.addEventListener('click', () => window.location.href = 'carrito.html');

    if(document.getElementById('tabla-clientes-crm')) cargarClientesCRM();
    if(document.getElementById('tabla-personal')) cargarPersonal();
    if(window.location.pathname.includes('catalogo.html')) cargarProductosBD();
});

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

// 16. MÓDULO CRM
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
                    <tr class="crm-row" data-nombre="${cliente.nombre.toLowerCase()}" style="border-bottom: 1px solid #eae5db;">
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
    if(!input) return;
    let texto = input.value.toLowerCase();
    let filas = document.querySelectorAll('.crm-row');
    filas.forEach(fila => {
        let nombre = fila.getAttribute('data-nombre');
        if (nombre.includes(texto)) fila.style.display = ''; else fila.style.display = 'none';
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
                    <div style="flex:1;">
                        <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Teléfono:</label>
                        <input type="text" id="edit-telefono" class="swal2-input" style="margin:0; width:100%;" value="${cliente.telefono || ''}">
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:0.85rem; font-weight:bold; color:var(--verde-logo);">Empresa:</label>
                        <input type="text" id="edit-empresa" class="swal2-input" style="margin:0; width:100%;" value="${cliente.empresa || ''}">
                    </div>
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
                nombre: document.getElementById('edit-nombre').value,
                correo: document.getElementById('edit-correo').value,
                telefono: document.getElementById('edit-telefono').value,
                empresa: document.getElementById('edit-empresa').value,
                etapa_crm: document.getElementById('edit-etapa').value,
                estado: document.getElementById('edit-estado').value
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch(`http://localhost:3000/api/clientes/${cliente.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.value) });
                if (res.ok) { Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 2000 }); cargarClientesCRM(); }
            } catch (error) { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Sin conexión', showConfirmButton: false, timer: 3000 }); }
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
            return {
                cliente_id: clienteId,
                tipo: tipo,
                descripcion: document.getElementById('desc-contacto-fijo').value
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            await fetch('http://localhost:3000/api/interacciones', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.value)
            });
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Guardado en historial', showConfirmButton: false, timer: 2000 });
        }
    });
}

window.cargarPersonal = async function() {
    try {
        const respuesta = await fetch('http://localhost:3000/api/personal');
        const resultado = await respuesta.json();
        const tabla = document.getElementById('tabla-personal');
        if (!tabla) return;
        
        let htmlFilas = '';
        resultado.data.forEach(emp => {
            let badgeColor = emp.rol === 'admin' ? '#b7410e' : '#557268';
            htmlFilas += `<tr style="border-bottom: 1px solid #eae5db;"><td style="padding: 10px;">${emp.id}</td><td style="padding: 10px;"><strong>${emp.nombre}</strong><br><small>${emp.correo}</small></td><td style="padding: 10px;"><span style="background:${badgeColor}; color:white; padding:3px 8px; border-radius:12px; font-size:0.8rem; text-transform:uppercase;">${emp.rol}</span></td></tr>`;
        });
        tabla.innerHTML = htmlFilas;
    } catch (e) { console.error(e); }
}

window.guardarPersonal = async function(event) {
    event.preventDefault();
    const data = { nombre: document.getElementById('emp-nombre').value, correo: document.getElementById('emp-correo').value, password: document.getElementById('emp-pass').value, rol: document.getElementById('emp-rol').value };
    const res = await fetch('http://localhost:3000/api/personal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { Swal.fire({ toast:true, position:'top-end', icon:'success', title:'Empleado Registrado', showConfirmButton:false, timer:2000 }); document.getElementById('form-alta-personal').reset(); cargarPersonal(); }
}

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
                window.location.href = (resultado.usuario.rol === 'admin' || resultado.usuario.rol === 'vendedor') ? 'admin.html' : 'perfil.html';
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
        password: document.getElementById('conf-pass').value
    };

    try {
        const res = await fetch(`http://localhost:3000/api/usuarios/${userLogueado.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevaData)
        });
        
        if (res.ok) {
            userLogueado.nombre = nuevaData.nombre;
            userLogueado.correo = nuevaData.correo;
            userLogueado.password = nuevaData.password;
            localStorage.setItem('casaBarro_usuario', JSON.stringify(userLogueado));
            
            document.getElementById('admin-user-name').innerText = `Hola, ${nuevaData.nombre.split(' ')[0]} ♡`;
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Datos actualizados', showConfirmButton: false, timer: 2000 });
        }
    } catch(e) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Sin conexión', showConfirmButton: false, timer: 3000 });
    }
}