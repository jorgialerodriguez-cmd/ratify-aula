let esProfesor = false;

// Datos de prueba con los nombres de la clase
const baseDeDatos = {
    'Ratonera FM': [
        { titulo: "Programa matinal con ADRIANA y ANA", fecha: "10 Ago 2026", duracion: "4:30" },
        { titulo: "Las noticias de GUILLERMO y ERIK", fecha: "08 Ago 2026", duracion: "5:15" },
        { titulo: "El tiempo por ALEXANDER y DARIEL", fecha: "05 Ago 2026", duracion: "2:50" }
    ],
    'DJ Rufi': [
        { titulo: "Mix de recreo por ELENA y VALERIA", fecha: "09 Ago 2026", duracion: "12:00" },
        { titulo: "Sesión relax de LUNA y BELA", fecha: "07 Ago 2026", duracion: "15:30" },
        { titulo: "Música de psicomotricidad con LUCAS y LUCÍA", fecha: "02 Ago 2026", duracion: "20:00" }
    ],
    'Episodios Especiales': [
        { titulo: "Especial Halloween con HÉCTOR y MARCO", fecha: "31 Oct 2025", duracion: "10:00" },
        { titulo: "Cuento inventado por HUGO y AINARI", fecha: "15 May 2026", duracion: "8:45" },
        { titulo: "Entrevista a la directora por VICTORIA y QUIANYU", fecha: "20 Jun 2026", duracion: "14:20" }
    ]
};

function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    document.getElementById(id).classList.add('activa');
}

function mostrarLoginProfesor() {
    mostrarPantalla('pantalla-login');
}

function mostrarLoginPadres() {
    mostrarPantalla('pantalla-login-padres');
}

function volverAPerfiles() {
    mostrarPantalla('pantalla-perfiles');
}

// Login para familias
function entrarComoPadre() {
    const pass = document.getElementById('password-padres').value;
    if(pass === "ratones2026") { 
        esProfesor = false;
        iniciarApp();
    } else {
        alert("Contraseña incorrecta. Revisa la clave facilitada.");
    }
}

// Login para profesor
function entrarComoProfesor() {
    const pass = document.getElementById('password-profe').value;
    if(pass === "1234") { 
        esProfesor = true;
        iniciarApp();
    } else {
        alert("Contraseña incorrecta");
    }
}

function iniciarApp() {
    mostrarPantalla('pantalla-app');
    
    // Muestra el botón de subir solo al profe
    const btnSubir = document.getElementById('btn-subir');
    btnSubir.style.display = esProfesor ? 'block' : 'none';
    
    cambiarSeccion('Ratonera FM');
}

function cambiarSeccion(seccion) {
    document.getElementById('titulo-seccion').innerText = seccion;
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('activo');
        if(tab.innerText.includes(seccion)) tab.classList.add('activo');
    });

    const contenedorLista = document.getElementById('lista-reproduccion');
    contenedorLista.innerHTML = ''; 

    const audios = baseDeDatos[seccion];
    
    audios.forEach(audio => {
        const item = document.createElement('div');
        item.className = 'item-audio';
        item.innerHTML = `
            <div style="flex-grow: 1;">
                <h4>${audio.titulo}</h4>
                <p>${audio.fecha} • ${audio.duracion}</p>
            </div>
            <i class="fas fa-ellipsis-v" style="color: var(--text-sub);"></i>
        `;
        
        item.onclick = () => reproducir(audio.titulo);
        contenedorLista.appendChild(item);
    });
}

function reproducir(titulo) {
    document.getElementById('track-title').innerText = titulo;
    const btnPlay = document.getElementById('btn-play');
    btnPlay.classList.remove('fa-play-circle');
    btnPlay.classList.add('fa-pause-circle');
    btnPlay.style.color = 'var(--spotify-green)';
}