<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">🔐 Backoffice</h1>
      <p class="login-subtitle">Entrez le code d'accès pour continuer</p>

      <div v-if="erreur" class="login-error">{{ erreur }}</div>

      <div class="login-field">
        <input
          v-model="code"
          type="text"
          placeholder="Code d'accès"
          class="login-input"
          @keyup.enter="seConnecter"
        />
      </div>

      <button class="login-btn" @click="seConnecter">Se connecter</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const code = ref('DSP4-2026') // code par défaut affiché dans le champ
const erreur = ref('')

// Le code unique demandé par le sujet (pas de login, juste un code)
const CODE_SECRET = 'DSP4-2026'

const seConnecter = () => {
  if (code.value === CODE_SECRET) {
    // On sauvegarde dans sessionStorage pour protéger les pages
    sessionStorage.setItem('backoffice_auth', 'true')
    router.push('/backoffice')
  } else {
    erreur.value = '❌ Code incorrect, réessayez.'
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-title {
  font-size: 26px;
  margin-bottom: 8px;
  color: #333;
}

.login-subtitle {
  color: #888;
  margin-bottom: 24px;
  font-size: 14px;
}

.login-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 16px;
  font-size: 14px;
}

.login-field {
  margin-bottom: 16px;
}

.login-input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 15px;
  box-sizing: border-box;
  text-align: center;
  letter-spacing: 2px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}

.login-btn:hover {
  background-color: #0056b3;
}
</style>