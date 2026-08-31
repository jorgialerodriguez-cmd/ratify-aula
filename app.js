let rolActual = null;
let episodiosBrutos = []; 
let listaAudiosActual = []; 
let indiceAudioActual = -1;
let ordenReciente = true; 
let modoAleatorio = false;

const audioReal = document.getElementById('audio-elemento');
const barraProgreso = document.getElementById('barra-progreso');
const tiempoActualText = document.getElementById('tiempo-actual');
const tiempoTotalText = document.getElementById('tiempo-total');

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(err => console.log(err)); }

// PANTALLA DE BIENVENIDA RATÓN (2 Segundos)
setTimeout(() => {
    const splash = document.getElementById('pantalla-bienvenida');
    if(splash) {
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; }, 500);
    }
}, 2000);

// NAVEGACIÓN BÁSICA
function mostrarPantalla(id) { document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa')); document.getElementById(id).classList.add('activa'); }
window.mostrarLogin = function(rolDeseado) { 
    document.getElementById('form-login').reset(); 
    document.getElementById('error-login').classList.add('sr-only');
    mostrarPantalla('pantalla-login'); 
}
window.volverAPerfiles = function() { mostrarPantalla('pantalla-perfiles'); }

// SISTEMA DE LOGIN SEGURO FIREBASE AUTH
window.addEventListener('load', () => {
    window.onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            // El usuario ya puso su email y contraseña, vamos a ver qué rol tiene
            const docSnap = await window.getDoc(window.doc(window.db, "usuarios", user.uid));
            if (docSnap.exists()) {
                rolActual = docSnap.data().rol; // 'profesor' o 'familia'
                iniciarApp();
            }
        } else {
            rolActual = null;
            mostrarPantalla('pantalla-perfiles');
        }
    });
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-login').value;
    const pass = document.getElementById('password-login').value;
    const errorMsg = document.getElementById('error-login');
    errorMsg.classList.add('sr-only');
    
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerText = "Cargando..."; btn.disabled = true;

    try {
        await window.signInWithEmailAndPassword(window.auth, email, pass);
        // Si va bien, el onAuthStateChanged de arriba toma el control
    } catch (error) {
        errorMsg.classList.remove('sr-only');
        document.getElementById('anuncios-accesibilidad').innerText = "El acceso no es correcto. Inténtalo de nuevo.";
    } finally {
        btn.innerText = "Entrar"; btn.disabled = false;
    }
});

window.cerrarSesion = async function() { 
    audioReal.pause(); document.getElementById('reproductor').style.display = 'none'; 
    await window.signOut(window.auth);
}

// INICIAR LA APP PRINCIPAL
function iniciarApp() {
    mostrarPantalla('pantalla-app');
    document.getElementById('btn-subir').style.display = (rolActual === 'profesor') ? 'block' : 'none';
    cambiarSeccion('Ratonera FM');
}

// CARGAR SECCIÓN
window.cambiarSeccion = async function(seccion) {
    document.getElementById('titulo-seccion').innerText = seccion;
    document.querySelectorAll('.tab').forEach(tab => { tab.classList.remove('activo'); if(tab.innerText.includes(seccion)) tab.classList.add('activo'); });
    
    document.getElementById('btn-aleatorio-lista').style.display = (seccion === 'Hits') ? 'block' : 'none';
    const contenedor = document.getElementById('lista-reproduccion');
    contenedor.innerHTML = '<p style="text-align:center; color: var(--text-sub); margin-top:20px; grid-column: 1 / -1;">Buscando episodios...</p>'; 

    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "episodios"));
        episodiosBrutos = [];
        querySnapshot.forEach((doc) => { const audio = doc.data(); audio.id = doc.id; if (audio.seccion === seccion) episodiosBrutos.push(audio); });
        renderizarLista();
    } catch (error) { contenedor.innerHTML = '<p style="text-align:center; color: red; grid-column: 1 / -1;">Error conectando a la base de datos.</p>'; }
}

function renderizarLista() {
    const contenedor = document.getElementById('lista-reproduccion');
    contenedor.innerHTML = '';
    
    if (episodiosBrutos.length === 0) {
        contenedor.innerHTML = '<div style="text-align:center; color: var(--text-sub); margin-top:40px; grid-column: 1 / -1;"><i class="fas fa-box-open" style="font-size:40px; margin-bottom:15px;"></i><p>Aún no hay episodios subidos aquí.</p></div>';
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
    btnOrden.innerHTML = ordenReciente ? '<i class="fas fa-sort-amount-down" aria-hidden="true"></i> Más recientes' : '<i class="fas fa-sort-amount-up" aria-hidden="true"></i> Más antiguos';

    let misLikes = JSON.parse(localStorage.getItem('ratify_likes') || "{}");

    listaAudiosActual.forEach((audio, index) => {
        const item = document.createElement('button');
        item.className = 'item-audio';
        item.setAttribute('aria-label', `Reproducir ${audio.titulo}`);
        
        const portadaUrl = audio.url_portada || 'https://via.placeholder.com/150/181818/1DB954?text=Ratify';
        const esNuevo = audio.timestamp && (Date.now() - audio.timestamp) < (7 * 24 * 60 * 60 * 1000);
        const badgeHtml = esNuevo ? `<span class="badge-nuevo">NUEVO</span>` : '';
        const tieneLike = misLikes[audio.id];
        const iconHeart = tieneLike ? 'fas' : 'far'; const colorHeart = tieneLike ? '#ff4d4d' : 'var(--text-sub)'; const numLikes = audio.likes || 0;

        let controlesHtml = `<i class="fas fa-play" style="color: var(--spotify-green); font-size: 20px;" aria-hidden="true"></i>`;
        
        // Solo el profesor ve la papelera
        if(rolActual === 'profesor') { 
            controlesHtml = `<button class="trash-btn" onclick="borrarEpisodio('${audio.id}', '${audio.url_audio}', '${audio.url_portada}', event)" aria-label="Borrar episodio"><i class="fas fa-trash" aria-hidden="true"></i></button>` + controlesHtml; 
        }

        item.innerHTML = `
            <img src="${portadaUrl}" loading="lazy" alt="" style="width:50px; height:50px; border-radius:5px; margin-right:15px; object-fit:cover;" aria-hidden="true">
            <div style="flex-grow: 1; overflow:hidden; padding-right:10px; text-align: left;">
                <h4 style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:5px; display:flex; align-items:center;">${audio.titulo} ${badgeHtml}</h4>
                <p>${audio.fecha}</p>
            </div>
            <div style="display:flex; align-items:center; gap: 15px;">
                <button class="btn-like" style="display:flex; flex-direction:column; align-items:center; min-width:25px;" onclick="darLike('${audio.id}', event)" aria-label="Me gusta">
                    <i class="${iconHeart} fa-heart" style="color: ${colorHeart}; font-size: 18px;" aria-hidden="true"></i>
                    <span style="font-size:10px; color:var(--text-sub); margin-top:3px;">${numLikes}</span>
                </button>
                ${controlesHtml}
            </div>
        `;
        item.onclick = (e) => { if(e.target.closest('.btn-like') || e.target.closest('.trash-btn')) return; reproducirAudio(index); };
        contenedor.appendChild(item);
    });
}

// FUNCIONES SECUNDARIAS REPRODUCTOR
window.toggleOrden = function() { ordenReciente = !ordenReciente; renderizarLista(); }
window.toggleAleatorio = function() {
    modoAleatorio = !modoAleatorio;
    const btnLista = document.getElementById('btn-aleatorio-lista');
    const btnPlayer = document.getElementById('btn-aleatorio-player');
    if(modoAleatorio) {
        if(btnLista) { btnLista.classList.add('activo'); btnLista.setAttribute('aria-pressed', 'true'); }
        if(btnPlayer) { btnPlayer.style.color = "var(--spotify-green)"; btnPlayer.setAttribute('aria-pressed', 'true'); }
    } else {
        if(btnLista) { btnLista.classList.remove('activo'); btnLista.setAttribute('aria-pressed', 'false'); }
        if(btnPlayer) { btnPlayer.style.color = "var(--text-sub)"; btnPlayer.setAttribute('aria-pressed', 'false'); }
    }
}

// CORAZONES
function lanzarLluviaDeCorazones() {
    const numCorazones = 20; 
    for(let i = 0; i < numCorazones; i++) {
        const corazon = document.createElement('i');
        corazon.className = 'fas fa-heart corazon-animado';
        corazon.style.left = Math.random() * 95 + 'vw';
        corazon.style.fontSize = (Math.random() * 20 + 15) + 'px';
        corazon.style.animationDelay = (Math.random() * 0.5) + 's';
        corazon.style.animationDuration = (Math.random() * 1 + 1.5) + 's';
        document.body.appendChild(corazon);
        setTimeout(() => { corazon.remove(); }, 2500);
    }
}

window.darLike = async function(id, event) {
    event.stopPropagation(); const cajaLike = event.currentTarget; const icono = cajaLike.querySelector('i'); const contador = cajaLike.querySelector('span');
    let misLikes = JSON.parse(localStorage.getItem('ratify_likes') || "{}"); let delta = 1;
    
    if(misLikes[id]) { 
        delete misLikes[id]; delta = -1; icono.className = "far fa-heart"; icono.style.color = "var(--text-sub)"; 
    } else { 
        misLikes[id] = true; delta = 1; icono.className = "fas fa-heart"; icono.style.color = "#ff4d4d"; 
        lanzarLluviaDeCorazones();
    }
    localStorage.setItem('ratify_likes', JSON.stringify(misLikes));
    contador.innerText = (parseInt(contador.innerText) || 0) + delta;
    try { await window.updateDoc(window.doc(window.db, "episodios", id), { likes: window.increment(delta) }); } catch(e) {}
}

window.borrarEpisodio = async function(id, urlAudio, urlPortada, event) {
    event.stopPropagation();
    if(!confirm("¿Seguro que quieres eliminar este episodio permanentemente?")) return;
    try { 
        await window.deleteDoc(window.doc(window.db, "episodios", id));
        if(urlAudio) { try { await window.deleteObject(window.ref(window.storage, urlAudio)); } catch(e){} }
        if(urlPortada) { try { await window.deleteObject(window.ref(window.storage, urlPortada)); } catch(e){} }
        document.getElementById('anuncios-accesibilidad').innerText = "Episodio borrado.";
        cambiarSeccion(document.getElementById('titulo-seccion').innerText);
    } catch(error) { alert("Error al borrar."); }
}

// REPRODUCTOR
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

window.togglePlay = function() { if(!audioReal.src) return; if (audioReal.paused) { audioReal.play(); actualizarBotonesPlay(true); } else { audioReal.pause(); actualizarBotonesPlay(false); } }
function actualizarBotonesPlay(reproduciendo) {
    document.querySelectorAll('.play-btn i').forEach(icono => {
        if (reproduciendo) { icono.classList.remove('fa-play-circle'); icono.classList.add('fa-pause-circle'); } 
        else { icono.classList.remove('fa-pause-circle'); icono.classList.add('fa-play-circle'); }
    });
}

window.playSiguiente = function() { 
    if (modoAleatorio && listaAudiosActual.length > 1) {
        let nuevoIndice; do { nuevoIndice = Math.floor(Math.random() * listaAudiosActual.length); } while (nuevoIndice === indiceAudioActual); reproducirAudio(nuevoIndice);
    } else if (indiceAudioActual < listaAudiosActual.length - 1) { reproducirAudio(indiceAudioActual + 1); } 
}
window.playAnterior = function() { if (indiceAudioActual > 0) reproducirAudio(indiceAudioActual - 1); }
audioReal.onended = playSiguiente;

window.abrirReproductorCompleto = function() { document.getElementById('reproductor-completo').classList.add('activa'); }
window.cerrarReproductorCompleto = function() { document.getElementById('reproductor-completo').classList.remove('activa'); }
window.abrirModalSubida = function() { document.getElementById('modal-subida').style.display = 'flex'; }
window.cerrarModalSubida = function() { document.getElementById('modal-subida').style.display = 'none'; }

// FORMULARIO DE SUBIDA SEGURO
document.getElementById('form-subida').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('upload-titulo').value.trim(); 
    const seccion = document.getElementById('upload-seccion').value;
    const archivoAudio = document.getElementById('upload-audio').files[0]; 
    const archivoPortada = document.getElementById('upload-portada').files[0];
    const errorMsg = document.getElementById('error-subida');
    
    errorMsg.classList.add('sr-only');

    if(!titulo || !archivoAudio) return;
    
    // Validación de peso (Máximo 50MB Audio, 5MB Imagen)
    if (archivoAudio.size > 50 * 1024 * 1024) { errorMsg.innerText = "El audio es demasiado grande (máx 50MB)."; errorMsg.classList.remove('sr-only'); return; }
    if (archivoPortada && archivoPortada.size > 5 * 1024 * 1024) { errorMsg.innerText = "La portada es demasiado grande (máx 5MB)."; errorMsg.classList.remove('sr-only'); return; }
    
    const btn = document.getElementById('btn-ejecutar-subida'); btn.innerText = "Subiendo... paciencia"; btn.disabled = true;
    
    try {
        const audioRef = window.ref(window.storage, 'audios/' + Date.now() + '_' + archivoAudio.name);
        // Usamos uploadBytesResumable para mejor estabilidad en archivos grandes
        const uploadTask = window.uploadBytesResumable(audioRef, archivoAudio);
        
        uploadTask.on('state_changed', 
            (snapshot) => {}, 
            (error) => { throw error; }, 
            async () => {
                const urlAudio = await window.getDownloadURL(uploadTask.snapshot.ref);
                let urlPortada = "";
                
                if(archivoPortada) {
                    const portadaRef = window.ref(window.storage, 'portadas/' + Date.now() + '_' + archivoPortada.name);
                    await window.uploadBytesResumable(portadaRef, archivoPortada); 
                    urlPortada = await window.getDownloadURL(portadaRef);
                }
                
                const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                await window.addDoc(window.collection(window.db, "episodios"), { titulo: titulo, seccion: seccion, url_audio: urlAudio, url_portada: urlPortada, fecha: fechaHoy, timestamp: Date.now(), likes: 0 });
                
                document.getElementById('anuncios-accesibilidad').innerText = "¡Episodio subido con éxito!";
                document.getElementById('form-subida').reset(); 
                cerrarModalSubida(); cambiarSeccion(seccion);
                btn.innerText = "Subir Episodio"; btn.disabled = false;
            }
        );
    } catch (e) { 
        errorMsg.innerText = "Error de red al subir."; errorMsg.classList.remove('sr-only');
        btn.innerText = "Subir Episodio"; btn.disabled = false;
    }
});
