let esProfesor = false;
let listaAudiosActual = []; // Guardará los audios de la pestaña actual para poder pasar al Siguiente/Anterior
let indiceAudioActual = -1;

const audioReal = document.getElementById('audio-elemento');

// Navegación Básica
function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}
function mostrarLoginProfesor() { mostrarPantalla('pantalla-login'); }
function mostrarLoginPadres() { mostrarPantalla('pantalla-login-padres'); }
function volverAPerfiles() { mostrarPantalla('pantalla-perfiles'); }

function entrarComoPadre() {
    const pass = document.getElementById('password-padres').value;
    if(pass === "ratones2026") { esProfesor = false; iniciarApp(); } 
    else { alert("Contraseña incorrecta."); }
}

function entrarComoProfesor() {
    const pass = document.getElementById('password-profe').value;
    if(pass === "1234") { esProfesor = true; iniciarApp(); } 
    else { alert("Contraseña incorrecta"); }
}

function iniciarApp() {
    mostrarPantalla('pantalla-app');
    document.getElementById('btn-subir').style.display = esProfesor ? 'block' : 'none';
    cambiarSeccion('Ratonera FM');
}

// Cargar desde Firebase
async function cambiarSeccion(seccion) {
    document.getElementById('titulo-seccion').innerText = seccion;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('activo');
        if(tab.innerText.includes(seccion)) tab.classList.add('activo');
    });

    const contenedor = document.getElementById('lista-reproduccion');
    contenedor.innerHTML = '<p style="text-align:center; color: var(--text-sub);">Buscando archivos...</p>'; 

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "episodios"));
        contenedor.innerHTML = ''; 
        listaAudiosActual = [];

        querySnapshot.forEach((doc) => {
            const audio = doc.data();
            if (audio.seccion === seccion) {
                listaAudiosActual.push(audio);
            }
        });

        if (listaAudiosActual.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; color: var(--text-sub);">Aún no hay episodios subidos aquí.</p>';
            return;
        }

        // Pintar la lista
        listaAudiosActual.forEach((audio, index) => {
            const item = document.createElement('div');
            item.className = 'item-audio';
            const portadaUrl = audio.url_portada || 'https://via.placeholder.com/150/181818/1DB954?text=Ratify';
            
            item.innerHTML = `
                <img src="${portadaUrl}" style="width:50px; height:50px; border-radius:5px; margin-right:15px; object-fit:cover;">
                <div style="flex-grow: 1; overflow:hidden;">
                    <h4 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${audio.titulo}</h4>
                    <p>${audio.fecha}</p>
                </div>
            `;
            item.onclick = () => reproducirAudio(index);
            contenedor.appendChild(item);
        });

    } catch (error) {
        console.error("Error: ", error);
        contenedor.innerHTML = '<p style="text-align:center; color: red;">Error conectando a Firebase.</p>';
    }
}

// Lógica de Reproducción
function reproducirAudio(indice) {
    indiceAudioActual = indice;
    const audio = listaAudiosActual[indice];
    const portadaUrl = audio.url_portada || 'https://via.placeholder.com/150/181818/1DB954?text=Ratify';

    // Actualizar Textos e Imágenes
    document.getElementById('mini-title').innerText = audio.titulo;
    document.getElementById('mini-date').innerText = audio.fecha;
    document.getElementById('mini-cover').src = portadaUrl;

    document.getElementById('full-title').innerText = audio.titulo;
    document.getElementById('full-date').innerText = audio.fecha;
    document.getElementById('full-cover').src = portadaUrl;

    // Mostrar el mini reproductor
    document.getElementById('reproductor').style.display = 'flex';

    // Cargar y reproducir
    audioReal.src = audio.url_audio;
    audioReal.play();
    actualizarBotonesPlay(true);
}

function togglePlay() {
    if(!audioReal.src) return;
    if (audioReal.paused) {
        audioReal.play();
        actualizarBotonesPlay(true);
    } else {
        audioReal.pause();
        actualizarBotonesPlay(false);
    }
}

function actualizarBotonesPlay(reproduciendo) {
    const iconos = document.querySelectorAll('.play-btn');
    iconos.forEach(icono => {
        if (reproduciendo) {
            icono.classList.remove('fa-play-circle');
            icono.classList.add('fa-pause-circle');
        } else {
            icono.classList.remove('fa-pause-circle');
            icono.classList.add('fa-play-circle');
        }
    });
}

function playSiguiente() {
    if (indiceAudioActual < listaAudiosActual.length - 1) {
        reproducirAudio(indiceAudioActual + 1);
    }
}

function playAnterior() {
    if (indiceAudioActual > 0) {
        reproducirAudio(indiceAudioActual - 1);
    }
}

// Cuando la canción acaba, pasa a la siguiente
audioReal.onended = playSiguiente;

// Pantalla Completa
function abrirReproductorCompleto() {
    document.getElementById('reproductor-completo').classList.add('activa');
}
function cerrarReproductorCompleto() {
    document.getElementById('reproductor-completo').classList.remove('activa');
}

// Modal de Subida y Firebase Storage
function abrirModalSubida() { document.getElementById('modal-subida').style.display = 'flex'; }
function cerrarModalSubida() { document.getElementById('modal-subida').style.display = 'none'; }

async function ejecutarSubida() {
    const titulo = document.getElementById('upload-titulo').value;
    const seccion = document.getElementById('upload-seccion').value;
    const archivoAudio = document.getElementById('upload-audio').files[0];
    const archivoPortada = document.getElementById('upload-portada').files[0];

    if(!titulo || !archivoAudio || !archivoPortada) {
        alert("Por favor, rellena el título y selecciona el audio y la portada.");
        return;
    }

    const btn = document.getElementById('btn-ejecutar-subida');
    btn.innerText = "Subiendo... paciencia";
    btn.disabled = true;

    try {
        // 1. Subir Audio
        const audioRef = window.ref(window.storage, 'audios/' + Date.now() + '_' + archivoAudio.name);
        await window.uploadBytes(audioRef, archivoAudio);
        const urlAudio = await window.getDownloadURL(audioRef);

        // 2. Subir Portada
        const portadaRef = window.ref(window.storage, 'portadas/' + Date.now() + '_' + archivoPortada.name);
        await window.uploadBytes(portadaRef, archivoPortada);
        const urlPortada = await window.getDownloadURL(portadaRef);

        // 3. Guardar en Base de Datos
        const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        
        await window.addDoc(window.collection(window.db, "episodios"), {
            titulo: titulo,
            seccion: seccion,
            url_audio: urlAudio,
            url_portada: urlPortada,
            fecha: fechaHoy
        });

        alert("¡Episodio subido con éxito!");
        document.getElementById('upload-titulo').value = '';
        cerrarModalSubida();
        cambiarSeccion(seccion); // Recargar la lista actual

    } catch (e) {
        console.error(e);
        alert("Hubo un error. Comprueba tu conexión y las reglas de Firebase.");
    } finally {
        btn.innerText = "Subir a Firebase";
        btn.disabled = false;
    }
}
