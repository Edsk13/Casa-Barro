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

// 2. SISTEMA DE CARRITO PERSISTENTE Y DETALLES
let carrito = JSON.parse(localStorage.getItem('casaBarro_carrito')) || [];

// Variable para guardar el porcentaje de propina actual (por defecto 0%)
let propinaPorcentaje = 0;

window.mostrarProximamente = function() {
    Swal.fire({
        title: '¡Próximamente!',
        text: 'Esta función estará disponible muy pronto.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3c4a45'
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
                <p style="margin-bottom:15px;">Es responsabilidad del cliente notificar cualquier alergia o intolerancia en las notas del pedido. Casa Barro no se hace responsable por omisiones de esta información.</p>
                
                <h4 style="color:var(--verde-logo); margin-bottom:5px;">4. Reembolsos o Reposiciones</h4>
                <p style="margin-bottom:15px;">Si tu pedido llegó incompleto, incorrecto o en mal estado, cuentas con 30 minutos a partir de la entrega para reportarlo a nuestros canales de atención y solicitar una reposición o crédito a favor.</p>
            </div>
        `,
        confirmButtonText: 'Aceptar y Cerrar',
        confirmButtonColor: '#3c4a45',
        width: '500px'
    });
}

// Actualizar el número del carrito en la barra de navegación
window.actualizarUI = function() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0);
        cartCountElement.innerText = totalItems;
    }
}

// Lógica para aumentar o disminuir cantidad dentro del Modal (Catálogo)
window.cambiarCantidad = function(cambio) {
    let el = document.getElementById('swal-cantidad');
    let cantidadActual = parseInt(el.innerText);
    let nuevaCantidad = cantidadActual + cambio;
    if (nuevaCantidad >= 1) {
        el.innerText = nuevaCantidad;
    }
}

// Aumentar o disminuir cantidad desde la vista del carrito
window.cambiarCantidadCarrito = function(index, cambio) {
    if (carrito[index].cantidad + cambio >= 1) {
        carrito[index].cantidad += cambio;
        localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito));
        actualizarUI();
        renderizarCarrito();
    }
}

// Función que captura los datos del modal
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

// Función para actualizar la propina y re-dibujar el carrito
window.cambiarPropina = function(porcentaje) {
    propinaPorcentaje = porcentaje;
    renderizarCarrito();
}

// 3. PINTAR LA PANTALLA DEL CARRITO
window.renderizarCarrito = function() {
    const contenedor = document.getElementById('carrito-contenido');
    if (!contenedor) return; // Si no estamos en carrito.html, detenemos la función

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

    // CÁLCULOS DE PROPINA
    let propinaCalculada = subtotal * (propinaPorcentaje / 100);
    let totalFinal = subtotal + propinaCalculada;

    // Guardamos el total final en memoria para que la página de pago lo pueda leer
    localStorage.setItem('casaBarro_totalFinal', totalFinal.toFixed(2));

    // INTERFAZ DEL TICKET
    htmlItems += `
        <div class="resumen-carrito">
            <h3 style="color:var(--verde-logo); margin-bottom:20px; font-size: 1.3rem;">Resumen de Compra</h3>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; color: #555;">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>

            <!-- Botones para elegir la propina -->
            <div style="margin-bottom: 15px;">
                <p style="color: #555; margin-bottom: 8px; font-size: 0.95rem;">¿Deseas agregar propina?</p>
                <div style="display: flex; gap: 8px;">
                    <button onclick="cambiarPropina(0)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 0 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 0 ? 'white' : 'var(--verde-logo)'}; cursor: pointer; transition: all 0.2s;">0%</button>
                    <button onclick="cambiarPropina(10)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 10 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 10 ? 'white' : 'var(--verde-logo)'}; cursor: pointer; transition: all 0.2s;">10%</button>
                    <button onclick="cambiarPropina(15)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 15 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 15 ? 'white' : 'var(--verde-logo)'}; cursor: pointer; transition: all 0.2s;">15%</button>
                    <button onclick="cambiarPropina(20)" style="flex:1; padding: 8px 0; border-radius: 8px; font-weight: bold; border: 1px solid var(--verde-logo); background: ${propinaPorcentaje === 20 ? 'var(--verde-logo)' : 'transparent'}; color: ${propinaPorcentaje === 20 ? 'white' : 'var(--verde-logo)'}; cursor: pointer; transition: all 0.2s;">20%</button>
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

// Eliminar un producto específico del carrito
window.eliminarDelCarrito = function(index) {
    carrito.splice(index, 1); 
    localStorage.setItem('casaBarro_carrito', JSON.stringify(carrito)); 
    actualizarUI(); 
    renderizarCarrito(); 
}

// 4. MODAL DE PRODUCTO
window.abrirDetalleMejorado = function(nombre, descripcion, precioStr, imagenUrl, alineacion = 'center', opcionesStr = '', extrasStr = '') {
    let precioNum = parseFloat(precioStr.replace('$', '').replace(' MXN', ''));
    let opcionesHtml = '';
    
    // Construir el primer dropdown (Opción Base)
    if (opcionesStr) {
        let opcionesArray = opcionesStr.split(',');
        opcionesHtml += `
            <select id="swal-opciones" class="swal2-select" style="display:flex; width:100%; margin: 10px 0 ${extrasStr ? '10px' : '20px'} 0; font-size: 1rem;">
                <option value="" disabled selected>Elige tu opción...</option>
                ${opcionesArray.map(op => `<option value="${op.trim()}">${op.trim()}</option>`).join('')}
            </select>
        `;
    }

    // Construir el segundo dropdown (Complemento / Sabor)
    if (extrasStr) {
        let extrasArray = extrasStr.split(',');
        opcionesHtml += `
            <select id="swal-extras" class="swal2-select" style="display:flex; width:100%; margin: 0 0 20px 0; font-size: 1rem;">
                <option value="" disabled selected>Elige tu complemento/sabor...</option>
                ${extrasArray.map(ex => `<option value="${ex.trim()}">${ex.trim()}</option>`).join('')}
            </select>
        `;
    }

    // Actualizamos las sugerencias del modal con los nuevos parámetros
    let relacionadosHtml = `
        <div style="display:flex; gap:15px; overflow-x:auto; padding: 10px 0; scrollbar-width: thin;">
            <div onclick="Swal.close(); setTimeout(() => abrirDetalleMejorado('Capuchinos y Lattes', 'Nuestras especialidades calientes.', '$65.00 MXN', 'LatteCaliente.jpeg', 'bottom', 'Capuchino, Latte', 'Clásico, Caramelo, Crema Irlandesa, Vainilla'), 300);" style="min-width:110px; text-align:center; cursor:pointer;">
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

// 5. ALERTAS Y EVENTOS UI (Header, Footer, Formularios)
function activarAlertas() {
    const btnLogin = document.getElementById('btn-login');
    if(btnLogin) btnLogin.addEventListener('click', () => {
        window.location.href = 'login.html';
    });

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
                Swal.fire({
                    title: '¡Mensaje Enviado!',
                    text: 'Gracias ' + result.value.nombre + ', hemos recibido tu mensaje.',
                    icon: 'success',
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: '#3c4a45'
                });
            }
        });
    });

    const formRegistro = document.getElementById('form-registro');
    if(formRegistro) {
        formRegistro.addEventListener('submit', (e) => {
            e.preventDefault();
            Swal.fire({
                title: '¡Registro exitoso!',
                text: 'Tu cuenta ha sido creada correctamente (Simulado).',
                icon: 'success',
                confirmButtonText: 'Ir a Iniciar Sesión',
                confirmButtonColor: '#3c4a45'
            }).then(() => {
                window.location.href = 'login.html';
            });
        });
    }

    const formLogin = document.getElementById('form-login');
    if(formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            Swal.fire({
                title: 'Entrando...',
                text: 'Validando credenciales',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'perfil.html';
            });
        });
    }

    const btnRecuperar = document.getElementById('btn-recuperar');
    if(btnRecuperar) {
        btnRecuperar.addEventListener('click', (e) => {
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
                inputValidator: (value) => {
                    if (!value) {
                        return '¡Necesitas ingresar un correo válido!';
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        title: '¡Enlace enviado!',
                        text: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
                        icon: 'success',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#3c4a45'
                    });
                }
            });
        });
    }

    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if(btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', () => {
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
                if (result.isConfirmed) {
                    Swal.fire({
                        title: 'Sesión cerrada',
                        text: '¡Esperamos verte pronto en Casa Barro!',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = 'index.html'; 
                    });
                }
            });
        });
    }

    const btnIg = document.getElementById('btn-ig');
    if(btnIg) btnIg.addEventListener('click', () => {
        Swal.fire({ title: 'Instagram', text: 'Mensaje enviado con exito.', icon: 'info', confirmButtonText: 'Entendido', confirmButtonColor: '#3c4a45' }); 
    });

    const btnFb = document.getElementById('btn-fb');
    if(btnFb) btnFb.addEventListener('click', () => {
        Swal.fire({ title: '¡Redirigiendo a Facebook!', text: 'Aquí se abriría la página de Facebook de Casa Barro.', icon: 'info', confirmButtonText: 'Entendido', confirmButtonColor: '#3c4a45' });
    });

    const btnPhone = document.getElementById('btn-phone');
    if(btnPhone) btnPhone.addEventListener('click', () => {
        Swal.fire({ title: '¡Iniciando llamada!', text: 'Llamada realizada con exito.', icon: 'success', confirmButtonText: 'Perfecto', confirmButtonColor: '#3c4a45' });
    });
}

// 6. INICIALIZADOR AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar Navbar y Footer dinámicamente
    await cargarComponente('navbar-container', 'components/navbar.html');
    await cargarComponente('footer-container', 'components/footer.html');
    
    // 2. Activar funcionalidades
    activarAlertas();
    actualizarUI();
    renderizarCarrito();

    // 3. Redirección del botón de carrito en el navbar
    const btnCarritoNav = document.getElementById('btn-carrito-nav');
    if(btnCarritoNav) {
        btnCarritoNav.addEventListener('click', () => {
            window.location.href = 'carrito.html'; 
        });
    }

    // 4. Lógica de Filtros y Búsqueda (Se ejecuta solo si están en la vista del catálogo)
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