import { createRouter, createWebHistory } from 'vue-router'

import AppBack from '../AppBack.vue'
import AppFront from '../AppFront.vue'
import Login from '../pages/backOffice/Login.vue'
import Dashboard from '../pages/backOffice/Dashboard.vue'
import DataReset from '../pages/backOffice/DataReset.vue'
import FileImport from '../pages/backOffice/FileImport.vue'
import Tickets from '../pages/backOffice/Tickets.vue'
import KanbanSettings from '../pages/backOffice/KanbanSettings.vue'
//import Compteur from '../pages/backOffice/Compteur.vue'

import ListeElements from '../pages/frontOffice/ListeElements.vue'
import CreerTicket from '../pages/frontOffice/CreerTicket.vue'
import Kanban from '../pages/frontOffice/Kanban.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── FRONTOFFICE public ──────────────────────────────────────────
    {
      path: '/',
      component: AppFront,
      children: [
        { path: '', component: ListeElements },
        { path: 'creer-ticket', component: CreerTicket },
        { path: 'kanban', component: Kanban },
      ]
    },

    // ── LOGIN seul sans navbar ──────────────────────────────────────
    {
      path: '/backoffice/login',
      component: Login,
    },

    // ── BACKOFFICE protégé avec navbar ──────────────────────────────
    {
      path: '/backoffice',
      component: AppBack,
      children: [
        { path: '', component: Dashboard },
        { path: 'reset', component: DataReset },
        { path: 'import', component: FileImport },
        { path: 'tickets', component: Tickets },
        { path: 'kanban-settings', component: KanbanSettings },
        //{ path: 'compteur', component: Compteur },
      ]
    },
  ]
})

router.beforeEach((to) => {
  const estConnecte = sessionStorage.getItem('backoffice_auth') === 'true'
  const estBackoffice = to.path.startsWith('/backoffice') && to.path !== '/backoffice/login'
  if (estBackoffice && !estConnecte) {
    return '/backoffice/login'
  }
})


export default router