// Función para inyectar componentes HTML
async function cargarComponente(id, ruta) {
    try {
        const respuesta = await fetch(ruta);
        const html = await respuesta.text();
        document.getElementById(id).innerHTML = html;
    } catch (error) {
        console.error("Error al cargar " + ruta, error);
    }
}

// Función para activar todas las alertas
function activarAlertas() {
    // --- Lógica del Header ---
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

// Lógica del Registro
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

    // Lógica del Login
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

    //Lógica de Recuperar Contraseña
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

    //Lógica del Perfil
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
                        window.location.href = 'index.html'; // Te regresa al inicio
                    });
                }
            });
        });
    }
    // Lógica del Footer
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

// Inyectamos el HTML primero y luego activamos los botones
document.addEventListener('DOMContentLoaded', async () => {
    await cargarComponente('navbar-container', 'components/navbar.html');
    await cargarComponente('footer-container', 'components/footer.html');
    activarAlertas();
});

// Función "Ver detalle"
function verDetalle(nombre, descripcion, precio, imagenUrl, alineacion = 'center') {
    let imagenHtml = '';
    if (imagenUrl) {
        imagenHtml = `<img src="${imagenUrl}" alt="${nombre}" style="width: 100%; height: 250px; object-fit: cover; object-position: ${alineacion}; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;
    }

    Swal.fire({
        title: nombre,
        html: `
            ${imagenHtml}
            <p style="text-align: justify; margin-bottom: 15px; color: #555; line-height: 1.5; margin-top: 5px;">${descripcion}</p>
            <h3 style="color: #3c4a45; font-size: 1.8rem; font-weight: bold;">${precio}</h3>
        `,
        confirmButtonText: 'Cerrar detalles',
        confirmButtonColor: '#8a8a8a',
        width: '450px'
    });
}
function agregarAlCarrito(nombre, opcionesString) {
    if (opcionesString && typeof opcionesString === 'string' && opcionesString.trim() !== '') {
        
        let opcionesArray = opcionesString.split(',');
        let opcionesObj = {};
        opcionesArray.forEach(opcion => {
            let opLimpia = opcion.trim();
            if (opLimpia !== '') {
                opcionesObj[opLimpia] = opLimpia;
            }
        });

        Swal.fire({
            title: `Agregar ${nombre}`,
            text: 'Elige tu opción favorita:',
            input: 'select',
            inputOptions: opcionesObj,
            inputPlaceholder: 'Selecciona una opción...',
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3c4a45',
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value) {
                        resolve();
                    } else {
                        resolve('¡Necesitas elegir un sabor/opción para continuar!');
                    }
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                mostrarProximamente();
            }
        });
    } else {
        mostrarProximamente();
    }
}

// Mensaje genérico de Próximamente
function mostrarProximamente() {
    Swal.fire({
        title: '¡Próximamente!',
        text: 'La función para agregar al carrito y realizar pedidos estará disponible muy pronto.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#3c4a45'
    });
}

// LÓGICA DE FILTROS Y BÚSQUEDA (CATÁLOGO)
document.addEventListener('DOMContentLoaded', () => {
    const buscador = document.getElementById('buscador-productos');
    const filtroCategoria = document.getElementById('filtro-categoria');

    if (buscador && filtroCategoria) {
        function filtrarCatálogo() {
            const textoBusqueda = buscador.value.toLowerCase();
            const categoriaSeleccionada = filtroCategoria.value;
            
            // Obtenemos todas las secciones de categorías
            const secciones = document.querySelectorAll('.seccion-categoria');
            
            secciones.forEach(seccion => {
                const categoriaSeccion = seccion.getAttribute('data-categoria');
                const productos = seccion.querySelectorAll('.tarjeta-producto');
                let productosVisibles = 0;

                // Revisamos producto por producto
                productos.forEach(producto => {
                    const nombre = producto.getAttribute('data-nombre');
                    
                    // Comprobamos si coincide con el texto y la categoría
                    const coincideTexto = nombre.includes(textoBusqueda);
                    const coincideCategoria = (categoriaSeleccionada === 'todos') || (categoriaSeccion === categoriaSeleccionada);

                    if (coincideTexto && coincideCategoria) {
                        producto.style.display = 'block'; // Lo mostramos
                        productosVisibles++;
                    } else {
                        producto.style.display = 'none'; // Lo ocultamos
                    }
                });

                // Si una sección (ej. Bebidas Frías) se queda sin productos al buscar, ocultamos el título también
                if (productosVisibles > 0) {
                    seccion.style.display = 'block';
                } else {
                    seccion.style.display = 'none';
                }
            });
        }

        // Ejecutar el filtro cada que el usuario escribe o cambia la opción
        buscador.addEventListener('input', filtrarCatálogo);
        filtroCategoria.addEventListener('change', filtrarCatálogo);
    }
});