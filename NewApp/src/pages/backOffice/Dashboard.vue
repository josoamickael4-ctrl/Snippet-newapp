<template>
  <div class="dashboard-wrapper">
    <div class="header-section">
      <h1 class="glow-title">📊 Tableau de Bord NewApp</h1>
      <div class="connection-status">
        <span class="status-label">Statut API Snipe-IT :</span>
        <span :class="['status-badge', snipeStatus === 'Connecté' ? 'connected' : 'error']">
          <span class="pulse-dot" v-if="snipeStatus === 'Connecté'"></span>
          {{ snipeStatus }}
        </span>
      </div>
    </div>

    <!-- Stats générales -->
    <div class="stats-grid">
      <div class="stat-card assets-card">
        <div class="stat-icon">💻</div>
        <div class="stat-content">
          <div class="stat-number">{{ snipeAssets }}</div>
          <div class="stat-label">Éléments (Snipe-IT)</div>
        </div>
      </div>
      <div class="stat-card licenses-card">
        <div class="stat-icon">🔑</div>
        <div class="stat-content">
          <div class="stat-number">{{ snipeLicenses }}</div>
          <div class="stat-label">Licences (Snipe-IT)</div>
        </div>
      </div>
      <div class="stat-card tickets-card">
        <div class="stat-icon">🎫</div>
        <div class="stat-content">
          <div class="stat-number">{{ tickets.length }}</div>
          <div class="stat-label">Tickets (SQLite)</div>
        </div>
      </div>
    </div>

    <div class="details-section">
      <!-- Détails par type d'éléments -->
      <div class="details-block" v-if="hardwareList.length > 0">
        <h2>📂 Éléments par type (Catégorie)</h2>
        <div class="type-grid">
          <div class="type-card" v-for="(count, type) in assetsParType" :key="type">
            <span class="type-name">{{ type }}</span>
            <span class="type-count">{{ count }}</span>
          </div>
        </div>
      </div>

      <!-- Tickets par statut -->
      <div class="details-block" v-if="tickets.length > 0">
        <h2>🏷️ Tickets par statut</h2>
        <div class="status-summary-grid">
          <div class="status-summary-card" v-for="(count, status) in ticketsParStatut" :key="status" :class="`card-${status.toLowerCase().replace(' ', '-')}`">
            <span class="status-title">{{ status }}</span>
            <span class="status-count">{{ count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Liste tickets récents -->
    <div class="tickets-table-card card">
      <h2>🎫 Tickets récents</h2>
      <div v-if="tickets.length === 0" class="empty-state">
        Aucun ticket dans la base pour le moment.
      </div>
      <div class="table-container" v-else>
        <table class="modern-table">
          <thead>
            <tr>
              <th>ID Ticket</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tickets.slice(0, 10)" :key="t.id">
              <td class="num-col">#{{ t.num_ticket }}</td>
              <td class="title-col">{{ t.titre }}</td>
              <td>
                <span :class="['badge-statut', `statut-${(t.status||'').toLowerCase().replace(' ','-')}`]">
                  {{ t.status }}
                </span>
              </td>
              <td>
                <span :class="['badge-priority', `priority-${(t.priority||'').toLowerCase()}`]">
                  {{ t.priority }}
                </span>
              </td>
              <td class="date-col">{{ t.date }} {{ t.heure }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
const hardwareList = ref([])

// Calcul des éléments par catégorie (type)
const assetsParType = computed(() => {
  const counts = {}
  hardwareList.value.forEach(item => {
    const type = item.category?.name || 'Autre'
    counts[type] = (counts[type] || 0) + 1
  })
  return counts
})

// Calcul des tickets par statut
const ticketsParStatut = computed(() => {
  const counts = {}
  tickets.value.forEach(t => {
    const s = t.status || 'New'
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
      axios.get('http://localhost:3000/api/snipe-it/hardware?limit=500'),
      axios.get('http://localhost:3000/api/snipe-it/licenses?limit=1'),
    ])
    hardwareList.value = assetsRes.data?.rows || []
    snipeAssets.value = assetsRes.data?.total || hardwareList.value.length
    snipeLicenses.value = licensesRes.data?.total || 0
    snipeStatus.value = 'Connecté'
  } catch (e) {
    snipeStatus.value = 'Erreur de connexion'
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.dashboard-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.glow-title {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  font-size: 0.9rem;
  opacity: 0.7;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.8rem;
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.status-badge.connected {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-badge.error {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #4ade80;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.15);
}

.stat-icon {
  font-size: 2.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0.75rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
}

.stat-label {
  font-size: 0.88rem;
  opacity: 0.6;
  margin-top: 0.35rem;
}

.details-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 800px) {
  .details-section {
    grid-template-columns: 1fr;
  }
}

.details-block {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
}

.details-block h2 {
  margin: 0 0 1.25rem 0;
  font-size: 1.25rem;
  color: #ffffff;
  background: none;
  -webkit-text-fill-color: initial;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

.type-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.85rem;
  transition: all 0.2s;
}

.type-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(99, 102, 241, 0.2);
}

.type-name {
  font-size: 0.88rem;
  font-weight: 500;
  opacity: 0.85;
}

.type-count {
  font-weight: 700;
  color: #818cf8;
}

.status-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.75rem;
}

.status-summary-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.85rem;
  text-align: center;
}

.status-title {
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-count {
  font-size: 1.5rem;
  font-weight: 800;
}

.status-summary-card.card-new {
  border-left: 3px solid #6366f1;
  color: #a5b4fc;
}

.status-summary-card.card-in-progress {
  border-left: 3px solid #eab308;
  color: #fde047;
}

.status-summary-card.card-closed {
  border-left: 3px solid #22c55e;
  color: #86efac;
}

.tickets-table-card {
  margin-top: 1rem;
}

.tickets-table-card h2 {
  margin: 0 0 1.25rem 0;
  font-size: 1.25rem;
  background: none;
  -webkit-text-fill-color: initial;
  color: #ffffff;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  opacity: 0.5;
  font-size: 0.95rem;
}

.table-container {
  overflow-x: auto;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
}

.modern-table th, .modern-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.modern-table th {
  font-weight: 600;
  font-size: 0.85rem;
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modern-table tbody tr {
  transition: background 0.15s;
}

.modern-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.num-col {
  font-family: monospace;
  font-weight: 700;
  color: #818cf8;
}

.title-col {
  font-weight: 600;
}

.date-col {
  font-size: 0.85rem;
  opacity: 0.6;
}

/* Badges color setup */
.badge-statut {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.statut-new {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.statut-in-progress {
  background: rgba(234, 179, 8, 0.15);
  color: #fde047;
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.statut-closed {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-priority {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-high {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.priority-medium {
  background: rgba(249, 115, 22, 0.15);
  color: #fdba74;
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.priority-low {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.2);
}
</style>