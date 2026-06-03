import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import DataReset from './views/DataReset.vue'
import FileImport from './views/FileImport.vue'

import './style.css'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: Dashboard },
        { path: '/reset', component: DataReset },
        { path: '/import', component: FileImport }
    ]
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
