<template>
  <nav>
    <router-link to="/">Tableau de Bord</router-link>
    <router-link to="/import">Importer</router-link>
    <router-link to="/reset">Réinitialiser</router-link>
  </nav>
  <main>
    <router-view></router-view>
  </main>
</template>

<style>
/* Transitions for router views */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
