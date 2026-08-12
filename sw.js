self.addEventListener('install', (e) => {
    console.log('[Service Worker] Instalado');
});
self.addEventListener('fetch', (e) => {
    // Permite que la app funcione aunque haya microcortes de internet
});
