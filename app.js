let esProfesor = false;
let episodiosBrutos = []; 
let listaAudiosActual = []; 
let indiceAudioActual = -1;
let ordenReciente = true; 
let modoAleatorio = false;

const audioReal = document.getElementById('audio-elemento');
const barraProgreso = document.getElementById('barra-progreso');
const tiempoActualText = document.getElementById('tiempo-actual');
const tiempoTotalText = document.getElementById('tiempo-total');

let configApp = { passProfe: "1234", nombreProfe: "Profesor", imgProfe: "https://ui-avatars.com/api/?name=Profe&background=1DB954&color=fff&size=150", passPadres: "ratones2026", nombrePadres: "Familia", imgPadres: "https://ui-avatars.com/api/?name=Familia&background=181818&color=1DB954&size=150" };

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(err => console.log(err)); }

window.addEventListener('load', () => {
    setTimeout(async () => {
        try {
            const docSnap = await window.getDoc(window.doc(window.db, "configuracion", "general"));
            if (docSnap.exists()) {
                configApp = { ...configApp, ...docSnap.data() };
                document.getElementById('nombre-profe-ui').innerText = configApp.nombreProfe; document.getElementById('img-profe-ui').src = configApp.imgProfe;
                document.getElementById('nombre-padres-ui').innerText = configApp.nombrePadres; document.getElementById('img-padres-ui').src = configApp.imgPadres;
                document.getElementById('titulo-login-profe').innerText = "Acceso " + configApp.nombreProfe; document.getElementById('titulo-login-padres').innerText = "Acceso " + configApp.nombrePadres;
            }
        } catch(e) {}
    }, 1000);
});

function mostrarPantalla(id) { document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa')); document.getElementById(id).classList.add('activa'); }
function mostrarLoginProfesor() { document.getElementById('password-profe').value = ''; mostrarPantalla('pantalla-login'); }
function mostrarLoginPadres() { document.getElementById('password-padres').value = ''; mostrarPantalla('pantalla-login-padres'); }
function volverAPerfiles() { mostrarPantalla('pantalla-perfiles'); }
function entrarComoPadre() { if(document.getElementById('password-padres').value === configApp.passPadres) { esProfesor = false; iniciarApp(); } else { alert("Contraseña incorrecta."); } }
function entrarComoProfesor() { if(document.getElementById('password-profe').value === configApp.passProfe) { esProfesor = true; iniciarApp(); } else { alert("Contraseña incorrecta"); } }

function iniciarApp() {
    mostrarPantalla('pantalla-app');
    document.getElementById('btn-subir').style.display = esProfesor ? 'block' : 'none';
    document.getElementById('btn-ajustes').style.display = esProfesor ? 'block' : 'none';
    cambiarSeccion('Ratonera FM');
}

function cerrarSesion() { audioReal.pause(); document.getElementById('reproductor').style.display = 'none'; cerrarModalAjustes(); volverAPerfiles(); }

async function cambiarSeccion(seccion) {
    document.getElementById('titulo-seccion').innerText = seccion;
    document.querySelectorAll('.tab').forEach(tab => { tab.classList.remove('activo'); if(tab.innerText.includes(seccion)) tab.classList.add('activo'); });
    
    document.getElementById('btn-aleatorio-lista').style.display = (seccion === 'Hits') ? 'block' : 'none';
    const contenedor = document.getElementById('lista-reproduccion');
    contenedor.innerHTML = '<p style="text-align:center; color: var(--text-sub); margin-top:20px;">Buscando episodios...</p>'; 

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "episodios"));
        episodiosBrutos = [];
        querySnapshot.forEach((doc) => { const audio = doc.data(); audio.id = doc.id; if (audio.seccion === seccion) episodiosBrutos.push(audio); });
        renderizarLista();
    } catch (error) { contenedor.innerHTML = '<p style="text-align:center; color: red;">Error conectando a Firebase.</p>'; }
}

function renderizarLista() {
    const contenedor = document.getElementById('lista-reproduccion');
    contenedor.innerHTML = '';
    
    if (episodiosBrutos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color: var(--text-sub); margin-top:20px;">Aún no hay episodios subidos aquí.</p>';
        return;
    }

    const idSonando = listaAudiosActual[indiceAudioActual]?.id;

    listaAudiosActual = [...episodiosBrutos];
    listaAudiosActual.sort((a, b) => {
        const timeA = a.timestamp || 0; const timeB = b.timestamp || 0;
        return ordenReciente ? (timeB - timeA) : (timeA - timeB);
    });

    if (idSonando) { indiceAudioActual = listaAudiosActual.findIndex(a => a.id === idSonando); }

    const btnOrden = document.getElementById('btn-ordenar');
    btnOrden.innerHTML = ordenReciente ? '<i class="fas fa-sort-amount-down"></i> Más recientes' : '<i class="fas fa-sort-amount-up"></i> Más antiguos';

    let misLikes = JSON.parse(localStorage.getItem('ratify_likes') || "{}");

    listaAudiosActual.forEach((audio, index) => {
        const item = document.createElement('div');
        item.className = 'item-audio';
        const portadaUrl = audio.url_portada || 'https://via.placeholder.com/150/181818/1DB954?text=Ratify';
        const esNuevo = audio.timestamp && (Date.now() - audio.timestamp) < (7 * 24 * 60 * 60 * 1000);
        const badgeHtml = esNuevo ? `<span class="badge-nuevo">NUEVO</span>` : '';
        const tieneLike = misLikes[audio.id];
        const iconHeart = tieneLike ? 'fas' : 'far'; const colorHeart = tieneLike ? '#ff4d4d' : 'var(--text-sub)'; const numLikes = audio.likes || 0;

        let controlesHtml = `<i class="fas fa-play" style="color: var(--spotify-green); font-size: 20px;"></i>`;
        if(esProfesor) { controlesHtml = `<i class="fas fa-trash trash-btn" onclick="event.stopPropagation(); borrarEpisodio('${audio.id}', '${audio.url_audio}', '${audio.url_portada}')"></i>` + controlesHtml; }

        item.innerHTML = `
            <img src="${portadaUrl}" loading="lazy" alt="Portada" style="width:50px; height:50px; border-radius:5px; margin-right:15px; object-fit:cover;">
            <div style="flex-grow: 1; overflow:hidden; padding-right:10px;">
                <h4 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:5px; display:flex; align-items:center;">${audio.titulo} ${badgeHtml}</h4>
                <p>${audio.fecha}</p>
            </div>
            <div style="display:flex; align-items:center; gap: 15px;">
                <div class="btn-like" style="display:flex; flex-direction:column; align-items:center; min-width:25px;" onclick="darLike('${audio.id}', event)">
                    <i class="${iconHeart} fa-heart" style="color: ${colorHeart}; font-size: 18px;"></i>
                    <span style="font-size:10px; color:var(--text-sub); margin-top:3px;">${numLikes}</span>
                </div>
                ${controlesHtml}
            </div>
        `;
        item.onclick = (e) => { if(e.target.closest('.btn-like') || e.target.closest('.trash-btn')) return; reproducirAudio(index); };
        contenedor.appendChild(item);
    });
}

function toggleOrden() { ordenReciente = !ordenReciente; renderizarLista(); }

function toggleAleatorio() {
    modoAleatorio = !modoAleatorio;
    const btnLista = document.getElementById('btn-aleatorio-lista');
    const btnPlayer = document.getElementById('btn-aleatorio-player');
    
    if(modoAleatorio) {
        if(btnLista) btnLista.classList.add('activo');
        if(btnPlayer) { btnPlayer.style.color = "var(--spotify-green)"; btnPlayer.style.textShadow = "0 0 10px rgba(29, 185, 84, 0.5)"; }
    } else {
        if(btnLista) btnLista.classList.remove('activo');
        if(btnPlayer) { btnPlayer.style.color = "var(--text-sub)"; btnPlayer.style.textShadow = "none"; }
    }
}

/* ---- MAGIA: FUNCIÓN PARA LANZAR LOS CORAZONES ---- */
function lanzarLluviaDeCorazones() {
    const numCorazones = 20; // Cantidad de corazones que saldrán
    for(let i = 0; i < numCorazones; i++) {
        const corazon = document.createElement('i');
        corazon.className = 'fas fa-heart corazon-animado';
        
        // Posición horizontal aleatoria
        corazon.style.left = Math.random() * 95 + 'vw';
        // Tamaño aleatorio para que se vea más dinámico
        corazon.style.fontSize = (Math.random() * 20 + 15) + 'px';
        // Un poco de retraso para que no salgan todos idénticos
        corazon.style.animationDelay = (Math.random() * 0.5) + 's';
        corazon.style.animationDuration = (Math.random() * 1 + 1.5) + 's';
        
        document.body.appendChild(corazon);
        
        // Borramos el elemento después de la animación para no colapsar la app
        setTimeout(() => { corazon.remove(); }, 2500);
    }
}

async function darLike(id, event) {
    event.stopPropagation(); const cajaLike = event.currentTarget; const icono = cajaLike.querySelector('i'); const contador = cajaLike.querySelector('span');
    let misLikes = JSON.parse(localStorage.getItem('ratify_likes') || "{}"); let delta = 1;
    
    if(misLikes[id]) { 
        delete misLikes[id]; delta = -1; icono.className = "far fa-heart"; icono.style.color = "var(--text-sub)"; 
    } else { 
        misLikes[id] = true; delta = 1; icono.className = "fas fa-heart"; icono.style.color = "#ff4d4d"; 
        
        // Llamamos a la animación solo si el usuario le da Like (no al quitarlo)
        lanzarLluviaDeCorazones();
    }
    
    localStorage.setItem('ratify_likes', JSON.stringify(misLikes));
    contador.innerText = (parseInt(contador.innerText) || 0) + delta;
    try { await window.updateDoc(window.doc(window.db, "episodios", id), { likes: window.increment(delta) }); } catch(e) {}
}

async function borrarEpisodio(id, urlAudio, urlPortada) {
    if(!confirm("¿Seguro que quieres eliminar este episodio permanentemente?")) return;
    try { await window.deleteDoc(window.doc(window.db, "episodios", id));
        if(urlAudio) { try { await window.deleteObject(window.ref(window.storage, urlAudio)); } catch(e){} }
        if(urlPortada) { try { await window.deleteObject(window.ref(window.storage, urlPortada)); } catch(e){} }
        alert("Episodio borrado."); cambiarSeccion(document.getElementById('titulo-seccion').innerText);
    } catch(error) { alert("Error al borrar."); }
}

function formatearTiempo(segundos) { if (isNaN(segundos)) return "0:00"; const min = Math.floor(segundos / 60); const seg = Math.floor(segundos % 60); return `${min}:${seg < 10 ? '0' : ''}${seg}`; }
audioReal.addEventListener('loadedmetadata', () => { barraProgreso.max = audioReal.duration; tiempoTotalText.innerText = formatearTiempo(audioReal.duration); });
audioReal.addEventListener('timeupdate', () => { barraProgreso.value = audioReal.currentTime; tiempoActualText.innerText = formatearTiempo(audioReal.currentTime); });
barraProgreso.addEventListener('input', () => { audioReal.currentTime = barraProgreso.value; });

function reproducirAudio(indice) {
    indiceAudioActual = indice; const audio = listaAudiosActual[indice];
    const portadaUrl = audio.url_portada || 'https://via.placeholder.com/150/181818/1DB954?text=Ratify';
    document.getElementById('mini-title').innerText = audio.titulo; document.getElementById('mini-date').innerText = audio.fecha; document.getElementById('mini-cover').src = portadaUrl;
    document.getElementById('full-title').innerText = audio.titulo; document.getElementById('full-date').innerText = audio.fecha; document.getElementById('full-cover').src = portadaUrl;
    
    document.getElementById('reproductor').style.display = 'flex';
    barraProgreso.value = 0; tiempoActualText.innerText = "0:00"; tiempoTotalText.innerText = "0:00";
    audioReal.src = audio.url_audio; audioReal.play(); actualizarBotonesPlay(true);
}

function togglePlay() { if(!audioReal.src) return; if (audioReal.paused) { audioReal.play(); actualizarBotonesPlay(true); } else { audioReal.pause(); actualizarBotonesPlay(false); } }
function actualizarBotonesPlay(reproduciendo) {
    document.querySelectorAll('.play-btn').forEach(icono => {
        if (reproduciendo) { icono.classList.remove('fa-play-circle'); icono.classList.add('fa-pause-circle'); } 
        else { icono.classList.remove('fa-pause-circle'); icono.classList.add('fa-play-circle'); }
    });
}

function playSiguiente() { 
    if (modoAleatorio && listaAudiosActual.length > 1) {
        let nuevoIndice;
        do { nuevoIndice = Math.floor(Math.random() * listaAudiosActual.length); } while (nuevoIndice === indiceAudioActual);
        reproducirAudio(nuevoIndice);
    } else if (indiceAudioActual < listaAudiosActual.length - 1) {
        reproducirAudio(indiceAudioActual + 1);
    } 
}
function playAnterior() { if (indiceAudioActual > 0) reproducirAudio(indiceAudioActual - 1); }
audioReal.onended = playSiguiente;

function abrirReproductorCompleto() { document.getElementById('reproductor-completo').classList.add('activa'); }
function cerrarReproductorCompleto() { document.getElementById('reproductor-completo').classList.remove('activa'); }
function abrirModalSubida() { document.getElementById('modal-subida').style.display = 'flex'; }
function cerrarModalSubida() { document.getElementById('modal-subida').style.display = 'none'; }

async function ejecutarSubida() {
    const titulo = document.getElementById('upload-titulo').value; const seccion = document.getElementById('upload-seccion').value;
    const archivoAudio = document.getElementById('upload-audio').files[0]; const archivoPortada = document.getElementById('upload-portada').files[0];
    if(!titulo || !archivoAudio) { alert("El título y el audio son obligatorios."); return; }
    
    const btn = document.getElementById('btn-ejecutar-subida'); btn.innerText = "Subiendo... paciencia"; btn.disabled = true;
    try {
        const audioRef = window.ref(window.storage, 'audios/' + Date.now() + '_' + archivoAudio.name);
        await window.uploadBytes(audioRef, archivoAudio); const urlAudio = await window.getDownloadURL(audioRef);
        
        let urlPortada = "";
        if(archivoPortada) {
            const portadaRef = window.ref(window.storage, 'portadas/' + Date.now() + '_' + archivoPortada.name);
            await window.uploadBytes(portadaRef, archivoPortada); urlPortada = await window.getDownloadURL(portadaRef);
        }
        const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        await window.addDoc(window.collection(window.db, "episodios"), { titulo: titulo, seccion: seccion, url_audio: urlAudio, url_portada: urlPortada, fecha: fechaHoy, timestamp: Date.now(), likes: 0 });
        alert("¡Episodio subido!"); document.getElementById('upload-titulo').value = ''; cerrarModalSubida(); cambiarSeccion(seccion);
    } catch (e) { alert("Error al subir"); } finally { btn.innerText = "Subir a Firebase"; btn.disabled = false; }
}

function abrirModalAjustes() { 
    document.getElementById('ajuste-nombre-profe').value = configApp.nombreProfe; document.getElementById('ajuste-img-profe').value = configApp.imgProfe; document.getElementById('ajuste-pass-profe').value = configApp.passProfe;
    document.getElementById('ajuste-nombre-padres').value = configApp.nombrePadres; document.getElementById('ajuste-img-padres').value = configApp.imgPadres; document.getElementById('ajuste-pass-padres').value = configApp.passPadres;
    document.getElementById('modal-ajustes').style.display = 'flex'; 
}
function cerrarModalAjustes() { document.getElementById('modal-ajustes').style.display = 'none'; }
async function guardarConfiguracion() {
    const btn = document.getElementById('btn-guardar-ajustes'); btn.innerText = "Guardando..."; btn.disabled = true;
    const nuevaConfig = { nombreProfe: document.getElementById('ajuste-nombre-profe').value, imgProfe: document.getElementById('ajuste-img-profe').value, passProfe: document.getElementById('ajuste-pass-profe').value, nombrePadres: document.getElementById('ajuste-nombre-padres').value, imgPadres: document.getElementById('ajuste-img-padres').value, passPadres: document.getElementById('ajuste-pass-padres').value };
    try { await window.setDoc(window.doc(window.db, "configuracion", "general"), nuevaConfig); alert("Ajustes guardados."); cerrarModalAjustes(); window.location.reload(); } catch(e) { alert("Error al guardar"); } finally { btn.innerText = "Guardar Cambios"; btn.disabled = false; }
}
