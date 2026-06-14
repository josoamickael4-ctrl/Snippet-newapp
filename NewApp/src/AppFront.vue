<template>
  <nav>
    <router-link to="/"> Éléments</router-link>
    <router-link to="/creer-ticket"> Créer un ticket</router-link>
    <router-link to="/kanban"> Kanban</router-link>
   
    <span @click="allerAdmin" style="margin-left: auto; opacity: 0.5; font-size: 0.8rem; cursor: pointer;">
      Admin →
    </span>
  </nav>
  <main>
    <router-view></router-view>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const allerAdmin = () => {
  // On déconnecte d'abord pour forcer le mot de passe
  sessionStorage.removeItem('backoffice_auth')
  router.push('/backoffice/login')
}
</script>