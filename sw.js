/**
 * sw.js - Service Worker simplificado
 * Necessário para o PWA ser instalado no iPhone.
 */

const CACHE_NAME = 'samsung-remote-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './samsung_controller.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});
