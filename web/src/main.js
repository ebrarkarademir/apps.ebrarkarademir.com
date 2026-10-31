import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { lockZoom } from './zoomLock'

// No page of the site zooms on a phone (see zoomLock.js)
lockZoom()

createApp(App).mount('#app')
