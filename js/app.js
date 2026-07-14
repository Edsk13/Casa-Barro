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
    Swal.fire({
        title: '¡Próximamente!',
        text: 'Esta función estará disponible muy pronto.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3c4a45'
    });
}

// Aplicar cupón de descuento
window.aplicarDescuento = function(codigo, porcentaje) {
    cuponAplicado = { codigo: codigo, porcentaje: porcentaje };
    localStorage.setItem('casaBarro_cupon', JSON.stringify(cuponAplicado));
    
    Swal.fire({
        icon: 'success',
        title: '¡Descuento Aplicado!',
        text: `El cupón ${codigo} del ${porcentaje}% se reflejará en tu carrito.`,
        confirmButtonColor: '#3c4a45',
        confirmButtonText: 'Ir a mi pedido',
        showCancelButton: true,
        cancelButtonText: 'Seguir viendo'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'carrito.html';
        }
    });
}

// Modal de Políticas de Compra y Venta
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
        confirmButtonText: 'Aceptar y Cerrar',
        confirmButtonColor: '#3c4a45',
        width: '500px'
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
    if (nuevaCantidad >= 1) {
        el.innerText = nuevaCantidad;
    }
}

window.cambiarCantidadCarrito = function(index, cambio) {
    if (carrito[index].cantidad + cambio >= 1) {
        carrito[index].cantidad += cambio;
        localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito));
        actualizarUI();
        renderizarCarrito();
    }
}

// Agregar al Carrito (Lee opción base y extras si existen)
window.confirmarAgregarAlCarrito = function(nombre, precio) {
    let cantidad = parseInt(document.getElementById('swal-cantidad').innerText);
    
    let selectorOpciones = document.getElementById('swal-opciones');
    let opcionSeleccionada = selectorOpciones ? selectorOpciones.value : null;

    let selectorExtras = document.getElementById('swal-extras');
    let extraSeleccionado = selectorExtras ? selectorExtras.value : null;

    if (selectorOpciones && !opcionSeleccionada) {
        Swal.showValidationMessage('Por favor, selecciona una opción');
        return;
    }
    if (selectorExtras && !extraSeleccionado) {
        Swal.showValidationMessage('Por favor, selecciona un complemento o sabor');
        return;
    }

    let textoFinal = [];
    if (opcionSeleccionada) textoFinal.push(opcionSeleccionada);
    if (extraSeleccionado) textoFinal.push(extraSeleccionado);
    let stringOpcion = textoFinal.length > 0 ? textoFinal.join(' + ') : null;

    carrito.push({
        producto: nombre,
        precio: precio,
        cantidad: cantidad,
        opcion: stringOpcion
    });

    localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito));
    actualizarUI(); 

    Swal.fire({
        icon: 'success',
        title: '¡Agregado!',
        text: `Agregaste ${cantidad}x ${nombre} a tu pedido.`,
        showConfirmButton: false,
        timer: 1500
    });
}

window.cambiarPropina = function(porcentaje) {
    propinaPorcentaje = porcentaje;
    renderizarCarrito();
}

window.vaciarCarrito = function() {
    Swal.fire({
        title: '¿Vaciar carrito?',
        text: "Se eliminarán todos los productos de tu pedido.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#8a8a8a',
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            carrito = [];
            localStorage.removeItem('casaBarro_carrito');
            cuponAplicado = null;
            localStorage.removeItem('casaBarro_cupon');
            
            actualizarUI();
            renderizarCarrito();
            
            Swal.fire({
                toast: true, position: 'top-end', icon: 'success', 
                title: 'Carrito vacío', showConfirmButton: false, timer: 1500
            });
        }
    });
}

window.removerDescuento = function() {
    cuponAplicado = null;
    localStorage.removeItem('casaBarro_cupon');
    renderizarCarrito();
}

// 3. PINTAR LA PANTALLA DEL CARRITO
window.validarCuponManual = function() {
    let input = document.getElementById('input-cupon').value.trim().toUpperCase(); // Convierte a mayúsculas automático
    
    if (!input) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Escribe un código primero', showConfirmButton: false, timer: 2000 });
        return;
    }

    let porcentaje = 0;
    
    // Diccionario de cupones válidos
    if (input === 'MAÑANAS15') porcentaje = 10;
    else if (input === 'VIERNES20') porcentaje = 20;
    else if (input === 'SOYCLIENTE15') porcentaje = 15;
    else {
        Swal.fire({
            icon: 'error',
            title: 'Cupón inválido',
            text: 'El código ingresado no existe o ha expirado.',
            confirmButtonColor: '#3c4a45'
        });
        return;
    }
    
    cuponAplicado = { codigo: input, porcentaje: porcentaje };
    localStorage.setItem('casaBarro_cupon', JSON.stringify(cuponAplicado));
    
    renderizarCarrito(); // Re-dibujar el carrito con el descuento
    
    Swal.fire({
        toast: true, position: 'top-end', icon: 'success', 
        title: '¡Cupón aplicado!', showConfirmButton: false, timer: 2000
    });
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

    let htmlItems = '<div class="carrito-grid"><div class="carrito-items">';
    
    // Botón de Vaciar Carrito
    htmlItems += `
        <div style="text-align: right; margin-bottom: 15px;">
            <button class="btn-eliminar" onclick="vaciarCarrito()">
                Vaciar carrito
            </button>
        </div>
    `;

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
                    <button onclick="cambiarCantidadCarrito(${index}, -1)" style="background: #eae5db; border:none; border-radius:5px; width:30px; height:30px; cursor:pointer; font-weight:bold; color:#3c4a45; font-size: 1.2rem; display:flex; justify-content:center; align-items:center; transition: background 0.2s;">-</button>
                    <span style="font-weight:bold; font-size: 1.1rem; min-width: 20px; text-align: center;">${item.cantidad}</span>
                    <button onclick="cambiarCantidadCarrito(${index}, 1)" style="background: var(--verde-logo); border:none; border-radius:5px; width:30px; height:30px; cursor:pointer; font-weight:bold; color:white; font-size: 1.2rem; display:flex; justify-content:center; align-items:center; transition: opacity 0.2s;">+</button>
                </div>

                <div style="text-align:right; min-width: 90px;">
                    <p style="font-weight:bold; font-size: 1.2rem; color:#3c4a45; margin-bottom:10px;">$${totalItem.toFixed(2)}</p>
                    <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">Quitar</button>
                </div>
            </div>
        `;
    });

    htmlItems += '</div>';

    // === CÁLCULOS MATEMÁTICOS ===
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

    // === INTERFAZ DEL TICKET ===
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
            
            <p style="text-align: center; font-size: 0.85rem; color: #777; margin-top: 15px; line-height: 1.4;">
                Al proceder al pago aceptas nuestras <br>
                <a href="#" onclick="mostrarPoliticas(); return false;" style="color: var(--verde-logo); font-weight: bold; text-decoration: underline;">Políticas de Compra y Venta</a>.
            </p>
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

// 4. MODAL DE PRODUCTO FRONT-END (C/ 2 DROPDOWNS)
window.abrirDetalleMejorado = function(nombre, descripcion, precioStr, imagenUrl, alineacion = 'center', opcionesStr = '', extrasStr = '') {
    let precioNum = parseFloat(precioStr.replace('$', '').replace(' MXN', ''));
    let opcionesHtml = '';
    
    if (opcionesStr) {
        let opcionesArray = opcionesStr.split(',');
        opcionesHtml += `
            <select id="swal-opciones" class="swal2-select" style="display:flex; width:100%; margin: 10px 0 ${extrasStr ? '10px' : '20px'} 0; font-size: 1rem;">
                <option value="" disabled selected>Elige tu opción...</option>
                ${opcionesArray.map(op => `<option value="${op.trim()}">${op.trim()}</option>`).join('')}
            </select>
        `;
    }

    if (extrasStr) {
        let extrasArray = extrasStr.split(',');
        opcionesHtml += `
            <select id="swal-extras" class="swal2-select" style="display:flex; width:100%; margin: 0 0 20px 0; font-size: 1rem;">
                <option value="" disabled selected>Elige tu complemento/sabor...</option>
                ${extrasArray.map(ex => `<option value="${ex.trim()}">${ex.trim()}</option>`).join('')}
            </select>
        `;
    }

    let relacionadosHtml = `
        <div style="display:flex; gap:15px; overflow-x:auto; padding: 10px 0; scrollbar-width: thin;">
            <div onclick="Swal.close(); setTimeout(() => abrirDetalleMejorado('Capuchinos y Lattes', 'Nuestras especialidades calientes. Elige tu base y sabor favorito.', '$65.00 MXN', 'LatteCaliente.jpeg', 'bottom', 'Capuchino, Latte', 'Clásico, Caramelo, Crema Irlandesa, Avellana, Vainilla, Matcha, Chai'), 300);" style="min-width:110px; text-align:center; cursor:pointer;">
                <img src="LatteCaliente.jpeg" style="width:100%; height:90px; object-fit:cover; border-radius:10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <p style="font-size:0.85rem; margin-top:8px; color:var(--verde-logo); font-weight:bold;">Café Latte</p>
            </div>
            <div onclick="Swal.close(); setTimeout(() => abrirDetalleMejorado('Croissants', 'A elegir: 3 quesos, jamón de pavo o jamón serrano.', '$90.00 MXN', 'Crossaint.jpeg', 'bottom', '3 Quesos, Jamón de pavo, Jamón serrano'), 300);" style="min-width:110px; text-align:center; cursor:pointer;">
                <img src="Crossaint.jpeg" style="width:100%; height:90px; object-fit:cover; border-radius:10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <p style="font-size:0.85rem; margin-top:8px; color:var(--verde-logo); font-weight:bold;">Croissants</p>
            </div>
        </div>
    `;

    Swal.fire({
        title: nombre,
        html: `
            <img src="${imagenUrl}" alt="${nombre}" style="width: 100%; height: 250px; object-fit: cover; object-position: ${alineacion}; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <p style="text-align: justify; margin-bottom: 15px; color: #555; line-height: 1.5;">${descripcion}</p>
            <h3 style="color: #3c4a45; font-size: 1.8rem; font-weight: bold; margin-bottom: 10px;">${precioStr}</h3>

            ${opcionesHtml}

            <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 25px;">
                <button onclick="cambiarCantidad(-1)" style="background-color: #eae5db; border:none; border-radius:50%; width:40px; height:40px; font-size:1.5rem; cursor:pointer; color:#3c4a45; font-weight:bold; transition: background 0.2s;">-</button>
                <span id="swal-cantidad" style="font-size:1.4rem; font-weight:bold; min-width: 30px;">1</span>
                <button onclick="cambiarCantidad(1)" style="background-color: var(--verde-logo); border:none; border-radius:50%; width:40px; height:40px; font-size:1.5rem; cursor:pointer; color:white; font-weight:bold; transition: transform 0.2s;">+</button>
            </div>

            <button onclick="confirmarAgregarAlCarrito('${nombre}', ${precioNum})" class="btn-primary" style="width: 100%; padding: 12px; border-radius: 30px; margin-bottom: 25px;">Agregar al carrito</button>

            <div style="text-align: left; border-top: 2px solid #fcf9f2; padding-top: 15px;">
                <h4 style="color: #3c4a45; margin-bottom: 10px; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;">Sugerencias</h4>
                ${relacionadosHtml}
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: '480px'
    });
}

// 5. ALERTAS Y EVENTOS UI (Header, Footer, Autenticación)
// Función para mostrar el aviso de cookies interactivo
window.verificarCookies = function() {
    
    if (true) { 
        Swal.fire({
            title: 'Configuración de Cookies y Privacidad',
            html: `
                <div style="text-align: left; font-size: 0.9rem; color: #555; max-height: 400px; overflow-y: auto; padding-right: 10px;">
                    <p style="margin-bottom: 15px;">En <strong>Casa Barro</strong> valoramos tu privacidad. A continuación, puedes configurar qué tipo de cookies y tecnologías de rastreo permites mientras navegas en nuestro sitio:</p>
                    
                    <!-- 1. Esenciales y de Seguridad (Bloqueadas y siempre activas) -->
                    <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 12px; background: #fcf9f2; padding: 12px; border-radius: 8px; border-left: 4px solid var(--verde-logo);">
                        <input type="checkbox" id="cookie-seguridad" checked disabled style="margin-top: 4px; accent-color: var(--verde-logo); transform: scale(1.2);">
                        <div>
                            <label for="cookie-seguridad" style="font-weight: bold; color: var(--verde-logo);">Esenciales y de Seguridad</label>
                            <p style="font-size: 0.85rem; margin-top: 4px; line-height: 1.4;">Son obligatorias. Permiten que el carrito de compras guarde tus productos, mantienen activa tu sesión y activan los protocolos anti-fraude al momento de pagar. <em>(No se pueden desactivar)</em>.</p>
                        </div>
                    </div>

                    <!-- 2. Ubicación y Preferencias -->
                    <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 12px; padding: 5px 12px;">
                        <input type="checkbox" id="cookie-ubicacion" style="margin-top: 4px; accent-color: var(--verde-logo); transform: scale(1.2); cursor: pointer;">
                        <div>
                            <label for="cookie-ubicacion" style="font-weight: bold; color: var(--verde-logo); cursor: pointer;">Funcionalidad y Ubicación</label>
                            <p style="font-size: 0.85rem; margin-top: 4px; line-height: 1.4;">Nos permiten acceder a tu ubicación aproximada (Aguascalientes) para calcular tiempos de entrega, y recordar tus preferencias del sitio (como si prefieres ver los precios con o sin propina incluida).</p>
                        </div>
                    </div>

                    <!-- 3. Analíticas y Rendimiento -->
                    <div style="margin-bottom: 15px; display: flex; align-items: flex-start; gap: 12px; padding: 5px 12px;">
                        <input type="checkbox" id="cookie-analitica" style="margin-top: 4px; accent-color: var(--verde-logo); transform: scale(1.2); cursor: pointer;">
                        <div>
                            <label for="cookie-analitica" style="font-weight: bold; color: var(--verde-logo); cursor: pointer;">Rendimiento y Analíticas</label>
                            <p style="font-size: 0.85rem; margin-top: 4px; line-height: 1.4;">Recopilan datos anónimos sobre cómo usas el sitio (tiempos de carga, qué platillos del menú se visitan más y mapas de calor) para ayudarnos a detectar errores y optimizar la página.</p>
                        </div>
                    </div>

                    <!-- 4. Marketing y Publicidad -->
                    <div style="margin-bottom: 5px; display: flex; align-items: flex-start; gap: 12px; padding: 5px 12px;">
                        <input type="checkbox" id="cookie-marketing" style="margin-top: 4px; accent-color: var(--verde-logo); transform: scale(1.2); cursor: pointer;">
                        <div>
                            <label for="cookie-marketing" style="font-weight: bold; color: var(--verde-logo); cursor: pointer;">Marketing y Publicidad (Terceros)</label>
                            <p style="font-size: 0.85rem; margin-top: 4px; line-height: 1.4;">Comparten información de navegación con plataformas como Facebook e Instagram para poder mostrarte anuncios personalizados y cupones de descuento relevantes basados en tus intereses.</p>
                        </div>
                    </div>
                </div>
            `,
            width: '650px',
            showCancelButton: true,
            confirmButtonText: 'Guardar mis preferencias',
            cancelButtonText: 'Aceptar todas',
            confirmButtonColor: '#3c4a45',
            cancelButtonColor: '#557268',
            allowOutsideClick: false, 
            allowEscapeKey: false,
            
            // Leemos los 3 checkboxes opcionales
            preConfirm: () => {
                const ubicacionActivas = document.getElementById('cookie-ubicacion').checked;
                const analiticasActivas = document.getElementById('cookie-analitica').checked;
                const marketingActivas = document.getElementById('cookie-marketing').checked;
                return { 
                    ubicacion: ubicacionActivas, 
                    analiticas: analiticasActivas, 
                    marketing: marketingActivas 
                };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // El usuario eligió manualmente
                localStorage.setItem('casaBarro_prefs_ubicacion', result.value.ubicacion);
                localStorage.setItem('casaBarro_prefs_analiticas', result.value.analiticas);
                localStorage.setItem('casaBarro_prefs_marketing', result.value.marketing);
                
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Preferencias guardadas', showConfirmButton: false, timer: 2000 });
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                // El usuario le dio al botón de "Aceptar todas"
                localStorage.setItem('casaBarro_prefs_ubicacion', 'true');
                localStorage.setItem('casaBarro_prefs_analiticas', 'true');
                localStorage.setItem('casaBarro_prefs_marketing', 'true');
                
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Todas las cookies aceptadas', showConfirmButton: false, timer: 2000 });
            }
        });
    }
}

function activarAlertas() {
    const btnLogin = document.getElementById('btn-login');
    if(btnLogin) btnLogin.addEventListener('click', () => window.location.href = 'login.html');

    const btnHistoria = document.getElementById('btn-historia');
    if(btnHistoria) btnHistoria.addEventListener('click', () => {
        Swal.fire({
            title: 'Nuestra Historia ⋆☕︎⋆',
            html: `
                <div style="text-align: justify; line-height: 1.6; font-size: 1.05rem;">
                    <p><strong>Casa Barro</strong> nació del amor por el buen café, la panadería artesanal y los momentos compartidos. Ubicados en el corazón del Barrio La Purísima, restauramos este espacio respetando sus raíces y la calidez del barro para crear un refugio único en Aguascalientes.</p>
                    <br>
                    <p>Hoy somos más que un lugar de Brunch: somos una familia que te ofrece un espacio acogedor donde tú, tus amigos y tu mascota siempre serán bienvenidos.</p>
                </div>
            `,
            confirmButtonText: '¡Me encanta!',
            confirmButtonColor: '#3c4a45'
        });
    });

    const btnContacto = document.getElementById('btn-contacto');
    if(btnContacto) btnContacto.addEventListener('click', () => {
        Swal.fire({
            title: 'Contáctanos',
            html: `
                <div style="text-align: left; background-color: #fcf9f2; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 0.95rem; color: #3c4a45;">
                    <p style="margin-bottom: 5px;"><strong>Dirección:</strong> Constitución 101, Barrio La Purísima</p>
                    <p><strong>Instagram:</strong> @casabarro.ags</p>
                </div>
                <input type="text" id="form-nombre" class="swal2-input" placeholder="Tu nombre o cuenta" style="margin-bottom: 10px;">
                <input type="email" id="form-correo" class="swal2-input" placeholder="Tu correo electrónico" style="margin-bottom: 10px;">
                <textarea id="form-mensaje" class="swal2-textarea" placeholder="¿En qué te podemos ayudar?" style="margin-bottom: 0; resize: none; height: 100px;"></textarea>
            `,
            confirmButtonText: 'Enviar Mensaje',
            confirmButtonColor: '#3c4a45',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const nombre = document.getElementById('form-nombre').value;
                const correo = document.getElementById('form-correo').value;
                const mensaje = document.getElementById('form-mensaje').value;
                if (!nombre || !correo || !mensaje) {
                    Swal.showValidationMessage('Por favor, completa todos los campos.');
                    return false;
                }
                return { nombre: nombre };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: '¡Mensaje Enviado!', text: 'Gracias ' + result.value.nombre + ', hemos recibido tu mensaje.', icon: 'success', confirmButtonColor: '#3c4a45' });
            }
        });
    });

    const formRegistro = document.getElementById('form-registro');
    if(formRegistro) formRegistro.addEventListener('submit', (e) => {
        e.preventDefault();
        Swal.fire({ title: '¡Registro exitoso!', text: 'Tu cuenta ha sido creada correctamente (Simulado).', icon: 'success', confirmButtonColor: '#3c4a45' }).then(() => window.location.href = 'login.html');
    });

    const formLogin = document.getElementById('form-login');
    if(formLogin) formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        Swal.fire({ title: 'Entrando...', text: 'Validando credenciales', icon: 'success', timer: 1000, showConfirmButton: false }).then(() => window.location.href = 'perfil.html');
    });

    const btnRecuperar = document.getElementById('btn-recuperar');
    if(btnRecuperar) btnRecuperar.addEventListener('click', (e) => {
        e.preventDefault();
        Swal.fire({
            title: 'Recuperar contraseña',
            text: 'Ingresa tu correo electrónico para enviarte un enlace de recuperación:',
            input: 'email',
            inputPlaceholder: 'tu@correo.com',
            showCancelButton: true,
            confirmButtonText: 'Enviar enlace',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3c4a45',
            inputValidator: (value) => { if (!value) return '¡Necesitas ingresar un correo válido!'; }
        }).then((result) => {
            if (result.isConfirmed) Swal.fire({ title: '¡Enlace enviado!', text: 'Revisa tu bandeja de entrada para restablecer tu contraseña.', icon: 'success', confirmButtonColor: '#3c4a45' });
        });
    });

    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if(btnCerrarSesion) btnCerrarSesion.addEventListener('click', () => {
        Swal.fire({
            title: '¿Quieres cerrar sesión?',
            text: 'Tendrás que volver a ingresar tus datos la próxima vez.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#557268',
            cancelButtonColor: '#8a8a8a',
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) Swal.fire({ title: 'Sesión cerrada', text: '¡Esperamos verte pronto en Casa Barro!', icon: 'success', timer: 1500, showConfirmButton: false }).then(() => window.location.href = 'index.html');
        });
    });

    const btnIg = document.getElementById('btn-ig');
    if(btnIg) btnIg.addEventListener('click', () => Swal.fire({ title: 'Instagram', text: 'Mensaje enviado con exito.', icon: 'info', confirmButtonColor: '#3c4a45' })); 

    const btnFb = document.getElementById('btn-fb');
    if(btnFb) btnFb.addEventListener('click', () => Swal.fire({ title: '¡Redirigiendo a Facebook!', text: 'Aquí se abriría la página de Facebook de Casa Barro.', icon: 'info', confirmButtonColor: '#3c4a45' }));

    const btnPhone = document.getElementById('btn-phone');
    if(btnPhone) btnPhone.addEventListener('click', () => Swal.fire({ title: '¡Iniciando llamada!', text: 'Llamada realizada con exito.', icon: 'success', confirmButtonColor: '#3c4a45' }));
}

// 6. LÓGICA DEL PANEL DE ADMINISTRADOR (PRODUCTOS)
window.mostrarSimulacion = function(titulo, mensaje) {
    Swal.fire({ title: titulo, text: mensaje, icon: 'info', confirmButtonText: 'Entendido', confirmButtonColor: '#3c4a45' });
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
        
        if (coincideTexto && coincideCat && coincideEst) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
}

window.abrirFormularioProducto = function(editMode = false) {
    let title = editMode ? 'Editar Producto' : 'Agregar Nuevo Producto';
    let btnText = editMode ? 'Guardar Cambios' : 'Guardar Producto';

    Swal.fire({
        title: title,
        html: `
            <form id="admin-prod-form" style="display:flex; flex-direction:column; gap:12px; text-align:left; margin-top: 15px;">
                <div>
                    <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Nombre del producto:</label>
                    <input class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Ej. Torta de Cochinita" ${editMode ? 'value="Producto Seleccionado"' : ''}>
                </div>
                <div style="display:flex; gap:15px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Categoría:</label>
                        <select class="swal2-select" style="margin:5px 0 0 0; width:100%;">
                            <option value="alimentos" ${editMode ? 'selected' : ''}>Alimentos</option>
                            <option value="calientes">Bebidas Calientes</option>
                            <option value="frias">Bebidas Frías</option>
                            <option value="postres">Postres</option>
                        </select>
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Precio (MXN):</label>
                        <input type="number" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Ej. 120" ${editMode ? 'value="125"' : ''}>
                    </div>
                </div>
                <div>
                    <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Descripción:</label>
                    <textarea class="swal2-textarea" style="margin:5px 0 0 0; width:100%; height:80px; resize:none;">${editMode ? 'Descripción del producto actual...' : ''}</textarea>
                </div>
                <div>
                    <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Imagen (URL / Archivo):</label>
                    <input type="text" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Enlace o nombre de la imagen" ${editMode ? 'value="imagen.jpeg"' : ''}>
                </div>
                <div style="display:flex; gap:15px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Existencia:</label>
                        <input type="number" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Cant." ${editMode ? 'value="45"' : ''}>
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Estado:</label>
                        <select class="swal2-select" style="margin:5px 0 0 0; width:100%;">
                            <option value="disponible" ${editMode ? 'selected' : ''}>Disponible (Activo)</option>
                            <option value="agotado">Agotado (Inactivo)</option>
                        </select>
                    </div>
                </div>
            </form>
        `,
        showCancelButton: true,
        confirmButtonText: btnText,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3c4a45',
        cancelButtonColor: '#8a8a8a',
        width: '550px'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'Los datos del producto han sido guardados correctamente (Simulado).', confirmButtonColor: '#3c4a45' });
    });
}

window.eliminarProductoAdmin = function(nombreProducto) {
    Swal.fire({
        title: `¿Eliminar ${nombreProducto}?`,
        text: "Esta acción no se puede deshacer y el producto desaparecerá del menú público.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#8a8a8a',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El producto ha sido borrado exitosamente.', confirmButtonColor: '#3c4a45' });
    });
}

window.verDetalleAdmin = function(nombre, descripcion, precio, imagenUrl) {
    Swal.fire({
        title: nombre,
        html: `
            <img src="${imagenUrl}" alt="${nombre}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <p style="text-align: justify; margin-bottom: 15px; color: #555; line-height: 1.5;">${descripcion}</p>
            <h3 style="color: var(--verde-logo); font-size: 1.6rem; font-weight: bold; margin-bottom: 10px;">${precio}</h3>
            <hr style="margin: 15px 0; border: 0; border-top: 1px dashed #ccc;">
            <p style="font-size: 0.85rem; color: #777;"><em>👀 Vista previa de cómo lo ven los clientes.</em></p>
        `,
        confirmButtonText: 'Cerrar vista previa',
        confirmButtonColor: '#3c4a45',
        width: '450px'
    });
}

window.cambiarEstadoRapido = function(btn) {
    let fila = btn.closest('tr');
    let badge = fila.querySelector('.badge-status');
    let estadoActual = fila.getAttribute('data-estado');

    if(estadoActual === 'disponible') {
        fila.setAttribute('data-estado', 'agotado');
        badge.className = 'badge-status agotado';
        badge.innerText = 'Agotado';
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Marcado como Agotado', showConfirmButton: false, timer: 2000 });
    } else {
        fila.setAttribute('data-estado', 'disponible');
        badge.className = 'badge-status disponible';
        badge.innerText = 'Disponible';
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Marcado como Disponible', showConfirmButton: false, timer: 2000 });
    }
    filtrarProductosAdmin();
}

// 7. LÓGICA DE MÓDULOS ADMIN
window.verDetallePedidoAdmin = function(numeroPedido) {
    Swal.fire({
        title: `Detalle del Pedido ${numeroPedido}`,
        html: `
            <div style="text-align: left; color: #555; font-size: 0.95rem;">
                <p><strong>Cliente:</strong> Sofía Ramírez (sofia@ejemplo.com)</p>
                <p><strong>Fecha:</strong> Hoy, 10:45 AM</p>
                <p><strong>Método de pago:</strong> Tarjeta (Pagado)</p>
                <hr style="margin: 15px 0;">
                <ul style="list-style: none; padding: 0; margin-bottom: 15px;">
                    <li style="margin-bottom: 8px;">2x Chilaquiles (Verdes, con Pollo) - $220.00</li>
                    <li style="margin-bottom: 8px;">1x Capuchino (Vainilla) - $65.00</li>
                </ul>
                <p style="text-align: right; font-size: 1.2rem; font-weight: bold; color: var(--verde-logo);">Total: $285.00</p>
            </div>
        `,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#3c4a45'
    });
}

window.cambiarEstadoPedidoAdmin = function(btn) {
    let fila = btn.closest('tr');
    let badge = fila.querySelector('.badge-status');
    
    if (badge.classList.contains('pendiente')) {
        badge.className = 'badge-status preparacion';
        badge.innerText = 'En Preparación';
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pedido enviado a cocina', showConfirmButton: false, timer: 2000 });
    } else if (badge.classList.contains('preparacion')) {
        badge.className = 'badge-status entregado';
        badge.innerText = 'Entregado';
        btn.style.display = 'none'; 
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pedido marcado como entregado', showConfirmButton: false, timer: 2000 });
    }
}

window.abrirFormularioPromocion = function(editMode = false) {
    let title = editMode ? 'Editar Promoción' : 'Nueva Promoción';
    Swal.fire({
        title: title,
        html: `
            <form style="display:flex; flex-direction:column; gap:12px; text-align:left; margin-top: 15px;">
                <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Nombre de Promoción:</label>
                <input class="swal2-input" style="margin:0; width:100%;" placeholder="Ej. 10% Descuento" ${editMode ? 'value="Viernes de Enchiladas"' : ''}>
                <div style="display:flex; gap:15px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Descuento:</label>
                        <input class="swal2-input" style="margin:0; width:100%;" placeholder="Ej. 15%" ${editMode ? 'value="20%"' : ''}>
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Estado:</label>
                        <select class="swal2-select" style="margin:0; width:100%;">
                            <option value="activa">Activa</option>
                            <option value="inactiva">Inactiva</option>
                        </select>
                    </div>
                </div>
            </form>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3c4a45'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire('Guardado', 'La promoción se ha guardado correctamente.', 'success');
    });
}

window.abrirFormularioCliente = function(editMode = false) {
    let title = editMode ? 'Editar Cliente' : 'Registrar Nuevo Cliente';
    let btnText = editMode ? 'Guardar Cambios' : 'Guardar Cliente';

    Swal.fire({
        title: title,
        html: `
            <form style="display:flex; flex-direction:column; gap:12px; text-align:left; margin-top: 15px;">
                <div>
                    <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Nombre Completo:</label>
                    <input type="text" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="Ej. María Fernanda" ${editMode ? 'value="Eduardo G."' : ''}>
                </div>
                <div>
                    <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Correo Electrónico:</label>
                    <input type="email" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="ejemplo@correo.com" ${editMode ? 'value="eduardo@ejemplo.com"' : ''}>
                </div>
                <div style="display:flex; gap:15px;">
                    <div style="flex:1;">
                        <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Teléfono (Opcional):</label>
                        <input type="tel" class="swal2-input" style="margin:5px 0 0 0; width:100%;" placeholder="10 dígitos">
                    </div>
                    <div style="flex:1;">
                        <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Fecha Nacimiento:</label>
                        <input type="date" class="swal2-input" style="margin:5px 0 0 0; width:100%;" ${editMode ? 'value="2005-06-10"' : ''}>
                    </div>
                </div>
                <div>
                    <label style="font-weight:bold; color:var(--verde-logo); font-size:0.9rem;">Notas adicionales:</label>
                    <textarea class="swal2-textarea" style="margin:5px 0 0 0; width:100%; height:60px; resize:none;" placeholder="Alergias, preferencias, etc."></textarea>
                </div>
            </form>
        `,
        showCancelButton: true,
        confirmButtonText: btnText,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3c4a45',
        cancelButtonColor: '#8a8a8a',
        width: '550px'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'La información del cliente se ha guardado correctamente.', confirmButtonColor: '#3c4a45' });
    });
}

window.verHistorialCliente = function() {
    Swal.fire({
        title: 'Historial de Compras',
        text: 'Aquí se desplegará la lista de pedidos pasados de este cliente, sus productos favoritos y su total gastado.',
        icon: 'info',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#3c4a45'
    });
}

window.eliminarAccionAdmin = function(itemType) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: `Se eliminará permanentemente ${itemType}.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
        if (result.isConfirmed) Swal.fire('Eliminado', 'El registro ha sido borrado.', 'success');
    });
}

// 8. INICIALIZADOR AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', async () => {
    
    // Cargar Navbar y Footer (Tienda pública)
    await cargarComponente('navbar-container', 'components/navbar.html');
    await cargarComponente('footer-container', 'components/footer.html');
    
    // Cargar Sidebar (Panel Admin)
    const adminSidebarContainer = document.getElementById('admin-sidebar-container');
    if (adminSidebarContainer) {
        await cargarComponente('admin-sidebar-container', 'components/admin-sidebar.html');
        
        const currentPath = window.location.pathname.split('/').pop();
        const adminLinks = document.querySelectorAll('#admin-nav-links a');
        
        adminLinks.forEach(link => {
            if (link.getAttribute('data-page') === currentPath) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Funciones globales
    //verificarCookies();
    activarAlertas();
    actualizarUI();
    renderizarCarrito();

    // Redirección carrito
    const btnCarritoNav = document.getElementById('btn-carrito-nav');
    if(btnCarritoNav) {
        btnCarritoNav.addEventListener('click', () => {
            window.location.href = 'carrito.html'; 
        });
    }

    // Filtros del catálogo público
    const buscador = document.getElementById('buscador-productos');
    const filtroCategoria = document.getElementById('filtro-categoria');

    if (buscador && filtroCategoria) {
        function filtrarCatalogo() {
            const textoBusqueda = buscador.value.toLowerCase();
            const categoriaSeleccionada = filtroCategoria.value;
            
            const secciones = document.querySelectorAll('.seccion-categoria');
            
            secciones.forEach(seccion => {
                const categoriaSeccion = seccion.getAttribute('data-categoria');
                const productos = seccion.querySelectorAll('.tarjeta-producto');
                let productosVisibles = 0;

                productos.forEach(producto => {
                    const nombre = producto.getAttribute('data-nombre');
                    const coincideTexto = nombre.includes(textoBusqueda);
                    const coincideCategoria = (categoriaSeleccionada === 'todos') || (categoriaSeccion === categoriaSeleccionada);

                    if (coincideTexto && coincideCategoria) {
                        producto.style.display = 'block'; 
                        productosVisibles++;
                    } else {
                        producto.style.display = 'none'; 
                    }
                });

                if (productosVisibles > 0) {
                    seccion.style.display = 'block';
                } else {
                    seccion.style.display = 'none';
                }
            });
        }

        buscador.addEventListener('input', filtrarCatalogo);
        filtroCategoria.addEventListener('change', filtrarCatalogo);
    }
});

// 9. LÓGICA DE COMUNIDAD 
window.publicarComentario = function(event) {
    event.preventDefault(); // Evita que la página se recargue al enviar el form

    const inputNombre = document.getElementById('comentario-nombre');
    const inputTexto = document.getElementById('comentario-texto');
    const listaComentarios = document.getElementById('lista-comentarios');

    if (!inputNombre || !inputTexto || !listaComentarios) return;

    const nombre = inputNombre.value.trim();
    const texto = inputTexto.value.trim();

    if (nombre === '' || texto === '') {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Llena todos los campos', showConfirmButton: false, timer: 2000 });
        return;
    }

    // Obtener la inicial del nombre para el círculo del avatar
    const inicial = nombre.charAt(0).toUpperCase();

    // Crear el nuevo recuadro de comentario
    const nuevoComentario = document.createElement('div');
    nuevoComentario.className = 'comentario-item';
    
    // Lo ocultamos inicialmente para hacer el efecto visual de entrada
    nuevoComentario.style.opacity = '0';
    nuevoComentario.style.transform = 'translateY(-10px)';
    nuevoComentario.style.transition = 'all 0.4s ease';

    // Insertamos el HTML dentro de la tarjeta
    nuevoComentario.innerHTML = `
        <div class="comentario-avatar" style="background-color: #557268;">${inicial}</div>
        <div class="comentario-contenido">
            <strong>${nombre}</strong> <span class="comentario-fecha">Hace un momento</span>
            <p>${texto}</p>
        </div>
    `;

    // Lo agregamos en la parte más alta de la lista (el más reciente primero)
    listaComentarios.insertBefore(nuevoComentario, listaComentarios.firstChild);

    // Limpiamos los campos para el siguiente comentario
    inputNombre.value = '';
    inputTexto.value = '';

    // Ejecutamos la animación visual
    setTimeout(() => {
        nuevoComentario.style.opacity = '1';
        nuevoComentario.style.transform = 'translateY(0)';
    }, 50);

    // Mostramos la alerta de éxito en la esquina
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '¡Comentario publicado!',
        showConfirmButton: false,
        timer: 2000
    });
}