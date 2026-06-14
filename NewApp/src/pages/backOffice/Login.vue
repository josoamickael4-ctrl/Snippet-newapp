<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-icon"></div>
      <h1 class="login-title">Backoffice</h1>
      <p class="login-subtitle">Entrez le code d'accès pour continuer</p>

      <div v-if="erreur" class="login-error">{{ erreur }}</div>

      <div class="login-field">
        <input
          v-model="code"
          type="password"
          placeholder="Code d'accès"
          class="login-input"
          @keyup.enter="seConnecter"
        />
      </div>

      <button class="login-btn" @click="seConnecter">
        <span class="btn-text">Se connecter</span>
        <span class="btn-icon">→</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import '../../styles/login.css'

const router = useRouter()
const code = ref('DSP4-2026')  // ← mot de passe par défaut pré-rempli
const erreur = ref('')

const CODE_SECRET = 'DSP4-2026'

const seConnecter = () => {
  if (code.value === CODE_SECRET) {
    sessionStorage.setItem('backoffice_auth', 'true')
    router.push('/backoffice')
  } else {
    erreur.value = 'Code incorrect, réessayez.'
    code.value = 'DSP4-2026'  // ← remet le code par défaut après erreur
  }
}
</script>

<style scoped>
/* Styles dans login.css */
</style>