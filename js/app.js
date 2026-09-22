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

window.confirmarAgregarAlCarrito = function(nombre, precio) {
    let cantidad = parseInt(document.getElementById('swal-cantidad').innerText);
    let opt = document.getElementById('swal-opciones') ? document.getElementById('swal-opciones').value : null;
    let ext = document.getElementById('swal-extras') ? document.getElementById('swal-extras').value : null;
    let stringOpcion = [opt, ext].filter(Boolean).join(' + ') || null;
    carrito.push({ producto: nombre, precio, cantidad, opcion: stringOpcion });
    localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito));
    actualizarUI(); 
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Agregado al carrito', showConfirmButton: false, timer: 1500 });
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

window.abrirDetalleMejorado = function(nombre, descripcion, precioStr, imagenUrl, alineacion = 'center', opcionesStr = '', extrasStr = '') {
    let precioNum = parseFloat(precioStr.replace('$', '').replace(' MXN', ''));
    let opcionesHtml = '';
    if (opcionesStr) opcionesHtml += `<select id="swal-opciones" class="swal2-select" style="display:flex; width:100%; margin: 10px 0 ${extrasStr ? '10px' : '20px'} 0; font-size: 1rem;">${opcionesStr.split(',').map((op, i) => `<option value="${op.trim()}" ${i === 0 ? 'selected' : ''}>${op.trim()}</option>`).join('')}</select>`;
    if (extrasStr) opcionesHtml += `<select id="swal-extras" class="swal2-select" style="display:flex; width:100%; margin: 0 0 20px 0; font-size: 1rem;">${extrasStr.split(',').map((ex, i) => `<option value="${ex.trim()}" ${i === 0 ? 'selected' : ''}>${ex.trim()}</option>`).join('')}</select>`;

    Swal.fire({
        title: nombre, html: `<img src="${imagenUrl}" alt="${nombre}" style="width: 100%; height: 250px; object-fit: cover; object-position: ${alineacion}; border-radius: 12px; margin-bottom: 15px;"><p style="text-align: justify; margin-bottom: 15px; color: #555;">${descripcion}</p><h3 style="color: #3c4a45; font-size: 1.8rem; margin-bottom: 10px;">${precioStr}</h3>${opcionesHtml}<div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 25px;"><button onclick="cambiarCantidad(-1)" style="background-color: #eae5db; border:none; border-radius:50%; width:40px; height:40px; font-size:1.5rem; cursor:pointer; color:#3c4a45;">-</button><span id="swal-cantidad" style="font-size:1.4rem; font-weight:bold; min-width: 30px;">1</span><button onclick="cambiarCantidad(1)" style="background-color: var(--verde-logo); border:none; border-radius:50%; width:40px; height:40px; font-size:1.5rem; cursor:pointer; color:white;">+</button></div><button onclick="confirmarAgregarAlCarrito('${nombre}', ${precioNum})" class="btn-primary" style="width: 100%; padding: 12px; border-radius: 30px; margin-bottom: 25px;">Agregar al carrito</button>`,
        showConfirmButton: false, showCloseButton: true, width: '480px'
    });
}

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

// INICIALIZADOR DE SEGURIDAD Y VISTAS
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar Navbar y Footer (Vista cliente)
    await cargarComponente('navbar-container', 'components/navbar.html');
    await cargarComponente('footer-container', 'components/footer.html');
    
    // 2. Cargar Menú Lateral (Vista Admin)
    const adminSidebarContainer = document.getElementById('admin-sidebar-container');
    if (adminSidebarContainer) {
        await cargarComponente('admin-sidebar-container', 'components/admin-sidebar.html');
        const acordeones = document.querySelectorAll(".nav-accordion");
        
        // 1. Leer la memoria del navegador para ver cuáles estaban abiertos
        let menusAbiertos = JSON.parse(localStorage.getItem('casaBarro_menus_abiertos')) || [];

        acordeones.forEach((btn, index) => {
            // 2. Restaurar visualmente los menús que el usuario dejó abiertos
            if (menusAbiertos.includes(index)) {
                btn.classList.add("active");
                btn.nextElementSibling.style.display = "block";
            }

            // 3. Detectar clics y guardar la decisión
            btn.addEventListener("click", function() {
                this.classList.toggle("active");
                let panel = this.nextElementSibling;
                
                if (panel.style.display === "block") {
                    panel.style.display = "none";
                    // Quitar de la memoria porque se cerró
                    menusAbiertos = menusAbiertos.filter(i => i !== index); 
                } else {
                    panel.style.display = "block";
                    // Guardar en la memoria porque se abrió
                    if (!menusAbiertos.includes(index)) menusAbiertos.push(index); 
                }
                
                // Actualizar el localStorage para la siguiente página
                localStorage.setItem('casaBarro_menus_abiertos', JSON.stringify(menusAbiertos));
            });
        });

        // 3. Validar Seguridad del Usuario
        const usuarioActual = JSON.parse(localStorage.getItem('casaBarro_usuario'));
        const spanUsuario = document.getElementById('admin-user-name');
        
        if (spanUsuario) {
            const rolesInternos = ['admin', 'vendedor', 'logistica'];

            if (!usuarioActual || !rolesInternos.includes(usuarioActual.rol)) {
                window.location.href = 'login.html';
            } else {
                spanUsuario.innerText = `Hola, ${usuarioActual.nombre.split(' ')[0]} ♡`;

                // Solo el Administrador Maestro puede gestionar Personal.
                if (usuarioActual.rol !== 'admin') {
                    const btnPersonal = document.getElementById('link-personal');
                    if (btnPersonal) btnPersonal.style.display = 'none';

                    if (window.location.pathname.includes('admin-personal.html')) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Acceso Denegado',
                            text: 'Solo Administradores Maestros.',
                            confirmButtonColor: '#3c4a45'
                        }).then(() => {
                            window.location.href = 'admin.html';
                        });
                    }
                }
            }
        }
    }

    // 4. Iniciar Funciones Generales
    activarAlertas();
    actualizarUI();
    renderizarCarrito();

    const btnCarritoNav = document.getElementById('btn-carrito-nav');
    if(btnCarritoNav) btnCarritoNav.addEventListener('click', () => window.location.href = 'carrito.html');

    // 5. Cargar Tablas Específicas según la página
    if(document.getElementById('tabla-clientes-crm')) cargarClientesCRM();
    if(document.getElementById('tabla-personal')) cargarPersonal();
    if(document.getElementById('tabla-proveedores')) cargarProveedores();
    if(window.location.pathname.includes('catalogo.html')) cargarProductosBD();
    if(document.getElementById('timeline-actividad')) cargarMiActividad();
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