<template>
  <nav>
    <router-link to="/backoffice"> Tableau de Bord</router-link>
    <router-link to="/backoffice/import"> Importer</router-link>
    <router-link to="/backoffice/reset"> Réinitialiser</router-link>
    <router-link to="/backoffice/tickets">Tickets</router-link>
    <router-link to="/backoffice/color"> Couleur</router-link>
    <router-link to="/backoffice/cout">Coût</router-link>

    <!-- <router-link to="/backoffice/compteur"> Compteur</router-link> -->
    <span @click="seDeconnecter" style="margin-left: auto; opacity: 0.5; font-size: 0.8rem; cursor: pointer;">
       Déconnexion
    </span>
  </nav>
  <main>
    <router-view></router-view>
  </main>
</template>

<script setup>

import { useRouter } from 'vue-router'
const router = useRouter()

const seDeconnecter = () => {
  sessionStorage.removeItem('backoffice_auth')
  router.push('/backoffice/login')
}
</script>