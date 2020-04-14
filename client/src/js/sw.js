addEventListener('install', () => {
  skipWaiting();
});

addEventListener('activate', () => {
  clients.claim();
});

addEventListener('fetch', (event) => {
  // if (event.request.method !== 'POST' || event.request.url.match(/auphonic/) !== null) return;
});