<template>
  <div class="card">
    <h1>Tableau de Bord NewApp</h1>

    <p>Statut API Snipe-IT :
      <span :class="snipeStatus === 'Connecté' ? 'status-msg' : 'error-msg'">
        {{ snipeStatus }}
      </span>
    </p>

    <!-- Stats générales -->
    <div class="stats-grid" style="margin-top: 2rem;">
      <div class="stat-card">
        <div class="stat-number">{{ snipeAssets }}</div>
        <div class="stat-label"> Assets (Snipe-IT)</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ snipeLicenses }}</div>
        <div class="stat-label"> Licenses (Snipe-IT)</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ tickets.length }}</div>
        <div class="stat-label"> Tickets (SQLite)</div>
      </div>
    </div>

    <!-- Tickets par statut -->
    <div style="margin-top: 2rem;" v-if="tickets.length > 0">
      <h2>Tickets par statut</h2>
      <div class="stats-grid" style="margin-top: 1rem;">
        <div class="stat-card" v-for="(count, statut) in ticketsParStatut" :key="statut">
          <div class="stat-number">{{ count }}</div>
          <div class="stat-label">{{ statut }}</div>
        </div>
      </div>
    </div>

    <!-- Liste tickets -->
    <div style="margin-top: 2rem;">
      <h2>Tickets récents</h2>
      <div v-if="tickets.length === 0" style="opacity: 0.5; margin-top: 0.5rem;">
        Aucun ticket importé pour le moment.
      </div>
      <table v-else style="width:100%; border-collapse:collapse; margin-top:1rem;">
        <thead>
          <tr style="text-align:left; border-bottom:1px solid var(--border);">
            <th style="padding:0.5rem;">#</th>
            <th style="padding:0.5rem;">Titre</th>
            <th style="padding:0.5rem;">Statut</th>
            <th style="padding:0.5rem;">Priorité</th>
            <th style="padding:0.5rem;">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tickets" :key="t.id" style="border-bottom:1px solid var(--border);">
            <td style="padding:0.5rem;">{{ t.num_ticket }}</td>
            <td style="padding:0.5rem;">{{ t.titre }}</td>
            <td style="padding:0.5rem;">
              <span :class="['badge-statut', `statut-${(t.status||'').toLowerCase().replace(' ','-')}`]">
                {{ t.status }}
              </span>
            </td>
            <td style="padding:0.5rem;">{{ t.priority }}</td>
            <td style="padding:0.5rem;">{{ t.date }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const snipeStatus = ref('Chargement...')
const snipeAssets = ref(0)
const snipeLicenses = ref(0)
const tickets = ref([])

const ticketsParStatut = computed(() => {
  const counts = {}
  tickets.value.forEach(t => {
    const s = t.status || 'Inconnu'
    counts[s] = (counts[s] || 0) + 1
  })
  return counts
})

const fetchAll = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/tickets')
    tickets.value = res.data
  } catch (e) { console.error('tickets:', e) }

  try {
    const [assetsRes, licensesRes] = await Promise.all([
      axios.get('http://localhost:3000/api/snipe-it/hardware?limit=1'),
      axios.get('http://localhost:3000/api/snipe-it/licenses?limit=1'),
    ])
    snipeAssets.value = assetsRes.data?.total || 0
    snipeLicenses.value = licensesRes.data?.total || 0
    snipeStatus.value = 'Connecté'
  } catch (e) {
    snipeStatus.value = 'Erreur de connexion'
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}
.stat-card {
  padding: 1.5rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 1rem;
  text-align: center;
}
.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary);
}
.stat-label {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 0.25rem;
}
.badge-statut {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: bold;
}
.statut-new { background: rgba(99,102,241,0.2); color: #a5b4fc; }
.statut-in-progress { background: rgba(234,179,8,0.2); color: #fde047; }
.statut-closed { background: rgba(34,197,94,0.2); color: #86efac; }
</style>