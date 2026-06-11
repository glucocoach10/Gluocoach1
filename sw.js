importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDfwVmBY7Td5C7LwCUY6YvI_OVcp2Q5vYk",
  authDomain: "glucocoach-29151.firebaseapp.com",
  projectId: "glucocoach-29151",
  storageBucket: "glucocoach-29151.firebasestorage.app",
  messagingSenderId: "989677277216",
  appId: "1:989677277216:web:7da58464b4c31d47b22c45"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png'
  });
});

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
