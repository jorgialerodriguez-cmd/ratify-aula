let esProfesor = false;
let listaAudiosActual = []; 
let indiceAudioActual = -1;
const audioReal = document.getElementById('audio-elemento');

// Configuración por defecto (Se sobrescribe con lo de Firebase)
let configApp = {
    passProfe: "1234", nombreProfe: "Profesor", imgProfe: "https://ui-avatars.com/api/?name=Profe&background=1DB954&color=fff&size=150",
    passPadres: "ratones2026", nombrePadres: "Familia", imgPadres: "https://ui-avatars.com/api/?name=Familia&background=181818&color=1DB954&size=150"
};

// Cargar ajustes desde Firebase al abrir la app
window.addEventListener('load', async () => {
    // Esperamos 1 segundo para que Firebase se inicialice bien
    setTimeout(async () => {
        try {
            const docSnap = await window.getDoc(window.doc(window.db, "configuracion", "general"));
            if (docSnap.exists()) {
                const data = docSnap.data();
                configApp = { ...configApp, ...data };
                
                // Actualizar interfaz visual
                document.getElementById('nombre-profe-ui').innerText = configApp.nombreProfe;
                document.getElementById('img-profe-ui').src = configApp.imgProfe;
                document.getElementById('nombre-padres-ui').innerText = configApp.nombrePadres;
                document.getElementById('img-padres-ui').src = configApp.imgPadres;
                
                document.getElementById('titulo-login-profe').innerText = "Acceso " + configApp.nombreProfe;
                document.getElementById('titulo-login-padres').innerText = "Acceso " + configApp.nombrePadres;
            }
        } catch(e) { console.log("Cargando config por defecto"); }
    }, 1000);
});

// Navegación Básica
function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}
function mostrarLoginProfesor() { document.getElementById('password-profe').value = ''; mostrarPantalla('pantalla-login'); }
function mostrarLoginPadres() { document.getElementById('password-padres').value = ''; mostrarPantalla('pantalla-login-padres'); }
function volverAPerfiles() { mostrarPantalla('pantalla-perfiles'); }

function entrarComoPadre() {
    if(document.getElementById('password-padres').value === configApp.passPadres) { esProfesor = false; iniciarApp(); } 
    else { alert("Contraseña incorrecta."); }
}

function entrarComoProfesor() {
    if(document.getElementById('password-profe').value === configApp.passProfe) { esProfesor = true; iniciarApp(); } 
    else { alert("Contraseña incorrecta"); }
}

function iniciarApp() {
    mostrarPantalla('pantalla-app');
    document.getElementById('btn-subir').style.display = esProfesor ? 'block' : 'none';
    document.getElementById('btn-ajustes').style.display = esProfesor ? 'block' : 'none';
    cambiarSeccion('Ratonera FM');
}

function cerrarSesion() {
    audioReal.pause();
    document.getElementById('reproductor').style.display = 'none';
    cerrarModalAjustes();
    volverAPerfiles();
}

// Cargar lista desde Firebase
async function cambiarSeccion(seccion) {
    document.getElementById('titulo-seccion').innerText = seccion;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('activo');
        if(tab.innerText.includes(seccion)) tab.classList.add('activo');
    });

    const contenedor = document.getElementById('lista-reproduccion');
    contenedor.innerHTML = '<p style="text-align:center; color: var(--text-sub); margin-top:20px;">Buscando episodios...</p>'; 

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "episodios"));
        contenedor.innerHTML = ''; 
        listaAudiosActual = [];

        querySnapshot.forEach((doc) => {
            const audio = doc.data();
            audio.id = doc.id; // Guardamos el ID para poder borrarlo luego
            if (audio.seccion === seccion) listaAudiosActual.push(audio);
        });

        if (listaAudiosActual.length === 0) {
            contenedor.innerHTML = '<p style="text-align:center; color: var(--text-sub); margin-top:20px;">Aún no hay episodios subidos aquí.</p>';
            return;
        }

        // Pintar la lista con o sin papelera
        listaAudiosActual.forEach((audio, index) => {
            const item = document.createElement('div');
            item.className = 'item-audio';
            const portadaUrl = audio.url_portada || 'https://via.placeholder.com/150/181818/1DB954?text=Ratify';
            
            // Si es profe, mostramos la papelera
            let botonesHtml = `<i class="fas fa-play" style="color: var(--spotify-green);"></i>`;
            if(esProfesor) {
                botonesHtml = `
                    <i class="fas fa-trash trash-btn" onclick="event.stopPropagation(); borrarEpisodio('${audio.id}', '${audio.url_audio}', '${audio.url_portada}')"></i>
                    <i class="fas fa-play" style="color: var(--spotify-green); margin-left: 10px;"></i>
                `;
            }

            item.innerHTML = `
                <img src="${portadaUrl}" style="width:50px; height:50px; border-radius:5px; margin-right:15px; object-fit:cover;">
                <div style="flex-grow: 1; overflow:hidden;">
                    <h4 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${audio.titulo}</h4>
                    <p>${audio.fecha}</p>
                </div>
                <div style="display:flex; align-items:center;">${botonesHtml}</div>
            `;
            item.onclick = () => reproducirAudio(index);
            contenedor.appendChild(item);
        });

    } catch (error) {
        console.error("Error: ", error);
        contenedor.innerHTML = '<p style="text-align:center; color: red;">Error conectando a Firebase.</p>';
    }
}

// NUEVO: Borrar Episodio
async function borrarEpisodio(id, urlAudio, urlPortada) {
    if(!confirm("¿Seguro que quieres eliminar este episodio de forma permanente?")) return;
    
    try {
        // Borrar el documento de texto
        await window.deleteDoc(window.doc(window.db, "episodios", id));
        
        // Borrar archivos de Storage
        if(urlAudio) {
            try { await window.deleteObject(window.ref(window.storage, urlAudio)); } catch(e){}
        }
        if(urlPortada) {
            try { await window.deleteObject(window.ref(window.storage, urlPortada)); } catch(e){}
        }
        
        alert("Episodio borrado correctamente");
        cambiarSeccion(document.getElementById('titulo-seccion').innerText); // Recargar
    } catch(error) {
        console.error(error);
        alert("Hubo un error al borrar. Comprueba tu conexión.");
    }
}

// Lógica de Reproducción
function reproducirAudio(indice) {
    indiceAudioActual = indice;
    const audio = listaAudiosActual[indice];
    const portadaUrl = audio.url_portada || 'https://via.placeholder.com/150/181818/1DB954?text=Ratify';

    document.getElementById('mini-title').innerText = audio.titulo;
    document.getElementById('mini-date').innerText = audio.fecha;
    document.getElementById('mini-cover').src = portadaUrl;
    document.getElementById('full-title').innerText = audio.titulo;
    document.getElementById('full-date').innerText = audio.fecha;
    document.getElementById('full-cover').src = portadaUrl;
    document.getElementById('reproductor').style.display = 'flex';

    audioReal.src = audio.url_audio;
    audioReal.play();
    actualizarBotonesPlay(true);
}

function togglePlay() {
    if(!audioReal.src) return;
    if (audioReal.paused) { audioReal.play(); actualizarBotonesPlay(true); } 
    else { audioReal.pause(); actualizarBotonesPlay(false); }
}

function actualizarBotonesPlay(reproduciendo) {
    const iconos = document.querySelectorAll('.play-btn');
    iconos.forEach(icono => {
        if (reproduciendo) { icono.classList.remove('fa-play-circle'); icono.classList.add('fa-pause-circle'); } 
        else { icono.classList.remove('fa-pause-circle'); icono.classList.add('fa-play-circle'); }
    });
}

function playSiguiente() { if (indiceAudioActual < listaAudiosActual.length - 1) reproducirAudio(indiceAudioActual + 1); }
function playAnterior() { if (indiceAudioActual > 0) reproducirAudio(indiceAudioActual - 1); }
audioReal.onended = playSiguiente;

function abrirReproductorCompleto() { document.getElementById('reproductor-completo').classList.add('activa'); }
function cerrarReproductorCompleto() { document.getElementById('reproductor-completo').classList.remove('activa'); }

// Subida
function abrirModalSubida() { document.getElementById('modal-subida').style.display = 'flex'; }
function cerrarModalSubida() { document.getElementById('modal-subida').style.display = 'none'; }

async function ejecutarSubida() {
    const titulo = document.getElementById('upload-titulo').value;
    const seccion = document.getElementById('upload-seccion').value;
    const archivoAudio = document.getElementById('upload-audio').files[0];
    const archivoPortada = document.getElementById('upload-portada').files[0];

    if(!titulo || !archivoAudio) { alert("El título y el audio son obligatorios."); return; }
    const btn = document.getElementById('btn-ejecutar-subida');
    btn.innerText = "Subiendo... paciencia"; btn.disabled = true;

    try {
        const audioRef = window.ref(window.storage, 'audios/' + Date.now() + '_' + archivoAudio.name);
        await window.uploadBytes(audioRef, archivoAudio);
        const urlAudio = await window.getDownloadURL(audioRef);
        
        let urlPortada = "";
        if(archivoPortada) {
            const portadaRef = window.ref(window.storage, 'portadas/' + Date.now() + '_' + archivoPortada.name);
            await window.uploadBytes(portadaRef, archivoPortada);
            urlPortada = await window.getDownloadURL(portadaRef);
        }

        const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        await window.addDoc(window.collection(window.db, "episodios"), {
            titulo: titulo, seccion: seccion, url_audio: urlAudio, url_portada: urlPortada, fecha: fechaHoy
        });

        alert("¡Episodio subido!");
        document.getElementById('upload-titulo').value = '';
        cerrarModalSubida();
        cambiarSeccion(seccion);
    } catch (e) { alert("Error al subir"); } finally { btn.innerText = "Subir a Firebase"; btn.disabled = false; }
}

// NUEVO: Ajustes
function abrirModalAjustes() { 
    // Rellenar formulario con la config actual
    document.getElementById('ajuste-nombre-profe').value = configApp.nombreProfe;
    document.getElementById('ajuste-img-profe').value = configApp.imgProfe;
    document.getElementById('ajuste-pass-profe').value = configApp.passProfe;
    document.getElementById('ajuste-nombre-padres').value = configApp.nombrePadres;
    document.getElementById('ajuste-img-padres').value = configApp.imgPadres;
    document.getElementById('ajuste-pass-padres').value = configApp.passPadres;
    document.getElementById('modal-ajustes').style.display = 'flex'; 
}

function cerrarModalAjustes() { document.getElementById('modal-ajustes').style.display = 'none'; }

async function guardarConfiguracion() {
    const btn = document.getElementById('btn-guardar-ajustes');
    btn.innerText = "Guardando..."; btn.disabled = true;

    const nuevaConfig = {
        nombreProfe: document.getElementById('ajuste-nombre-profe').value,
        imgProfe: document.getElementById('ajuste-img-profe').value,
        passProfe: document.getElementById('ajuste-pass-profe').value,
        nombrePadres: document.getElementById('ajuste-nombre-padres').value,
        imgPadres: document.getElementById('ajuste-img-padres').value,
        passPadres: document.getElementById('ajuste-pass-padres').value
    };

    try {
        await window.setDoc(window.doc(window.db, "configuracion", "general"), nuevaConfig);
        alert("Ajustes guardados correctamente. Recarga la página para ver los cambios.");
        cerrarModalAjustes();
        window.location.reload(); // Recargamos para aplicar todo
    } catch(e) {
        console.error(e);
        alert("Error al guardar ajustes");
    } finally {
        btn.innerText = "Guardar Cambios"; btn.disabled = false;
    }
}
