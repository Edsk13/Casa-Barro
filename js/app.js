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
        Swal.fire({
            title: '¡Bienvenido a Casa Barro!',
            text: 'Has iniciado sesión correctamente.',
            icon: 'success',
            confirmButtonText: 'Entrar',
            confirmButtonColor: '#3c4a45' 
        });
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

    // --- Lógica del Footer ---
    const btnIg = document.getElementById('btn-ig');
    if(btnIg) btnIg.addEventListener('click', () => {
        Swal.fire({
            title: 'Instagram',
            text: 'Mensaje enviado con exito.',
            icon: 'info',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#3c4a45'
        }); 
    });

    const btnFb = document.getElementById('btn-fb');
    if(btnFb) btnFb.addEventListener('click', () => {
        Swal.fire({
            title: '¡Redirigiendo a Facebook!',
            text: 'Aquí se abriría la página de Facebook de Casa Barro (Simulación).',
            icon: 'info',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#3c4a45'
        });
    });

    const btnPhone = document.getElementById('btn-phone');
    if(btnPhone) btnPhone.addEventListener('click', () => {
        Swal.fire({
            title: '¡Iniciando llamada!',
            text: 'Llamada realizada con exito.',
            icon: 'success',
            confirmButtonText: 'Perfecto',
            confirmButtonColor: '#3c4a45'
        });
    });
}

// Inyectamos el HTML primero y luego activamos los botones
document.addEventListener('DOMContentLoaded', async () => {
    await cargarComponente('navbar-container', 'components/navbar.html');
    await cargarComponente('footer-container', 'components/footer.html');
    activarAlertas();
});

// Función para simular "Ver detalle"
function verDetalle(nombre, descripcion, precio, imagenUrl) {
    Swal.fire({
        title: nombre,
        html: `
            <img src="${imagenUrl}" style="width: 100%; height: 250px; object-fit: cover; border-radius: 10px; margin-bottom: 15px;" alt="${nombre}">
            <p style="text-align: justify; margin-bottom: 15px; color: #555; line-height: 1.5;">${descripcion}</p>
            <h3 style="color: #3c4a45; font-size: 1.8rem; font-weight: bold;">${precio}</h3>
        `,
        showCloseButton: true,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#3c4a45',
        width: '500px'
    });
}
function agregarAlCarrito(nombre, opciones = null) {
    // Si el producto tiene opciones (sabores, ingredientes, etc.)
    if (opciones && opciones.length > 0) {
        // Convertimos el arreglo de opciones en un objeto para SweetAlert
        let opcionesObj = {};
        opciones.forEach(op => opcionesObj[op] = op);

        Swal.fire({
            title: `Agregar ${nombre}`,
            text: 'Elige tu opción favorita:',
            input: 'select',
            inputOptions: opcionesObj,
            inputPlaceholder: 'Selecciona una opción',
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3c4a45',
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value) {
                        resolve();
                    } else {
                        resolve('Por favor selecciona una opción para continuar');
                    }
                });
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Aquí en el futuro se guardaría en el carrito
                mostrarProximamente();
            }
        });
    } else {
        // Si no tiene opciones, muestra el mensaje directo
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