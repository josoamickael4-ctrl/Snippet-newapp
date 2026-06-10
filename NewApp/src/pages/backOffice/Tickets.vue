<template>
  <div class="tickets-container">

    <!-- ── LISTE des tickets ───────────────────────────────────────── -->
    <div v-if="!ticketSelectionne" class="fade-in">
      <div class="header-section">
        <h1 class="glow-title">🎫 Gestion des Tickets</h1>
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <span class="count-badge">{{ tickets.length }} ticket(s) (SQLite)</span>
          <button @click="exportCSV" class="btn-export" title="Exporter en CSV">
            📥 Export CSV
          </button>
        </div>
      </div>

      <div v-if="tickets.length === 0" class="empty-state card">
        <div class="empty-icon">🎟️</div>
        <p>Aucun ticket n'a été créé ou importé dans SQLite.</p>
      </div>

      <div v-else class="liste-tickets">
        <div
          v-for="t in tickets"
          :key="t.id"
          class="ticket-ligne"
          @click="ouvrirFiche(t)"
        >
          <div class="ticket-num">#{{ t.num_ticket }}</div>
          <div class="ticket-info">
            <div class="ticket-titre">{{ t.titre }}</div>
            <div class="ticket-meta">{{ t.date }} · {{ t.heure }}</div>
          </div>
          <div class="ticket-badges">
            <span :class="['badge-statut', `statut-${(t.status||'').toLowerCase().replace(' ', '-')}`]">
              {{ t.status }}
            </span>
            <span :class="['badge-priority', `priority-${(t.priority||'').toLowerCase()}`]">
              {{ t.priority }}
            </span>
          </div>
          <span class="ticket-fleche">→</span>
        </div>
      </div>
    </div>

    <!-- ── FICHE détail d'un ticket ───────────────────────────────── -->
    <div v-else class="fade-in">
      <button @click="ticketSelectionne = null" class="btn-retour">
        ← Retour à la liste
      </button>

      <div class="fiche card">
        <div class="fiche-header">
          <div class="fiche-title-group">
            <span class="fiche-num-badge">#{{ ticketSelectionne.num_ticket }}</span>
            <h1 class="fiche-title">{{ ticketSelectionne.titre }}</h1>
          </div>
          <div class="fiche-badges">
            <span :class="['badge-statut', `statut-${(ticketSelectionne.status||'').toLowerCase().replace(' ', '-')}`]">
              {{ ticketSelectionne.status }}
            </span>
            <span :class="['badge-priority', `priority-${(ticketSelectionne.priority||'').toLowerCase()}`]">
              {{ ticketSelectionne.priority }}
            </span>
          </div>
        </div>

        <div class="fiche-grid">
          <div class="fiche-champ">
            <div class="fiche-label">📅 Date</div>
            <div class="fiche-valeur">{{ ticketSelectionne.date }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label">🕒 Heure</div>
            <div class="fiche-valeur">{{ ticketSelectionne.heure }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label">🏷️ Statut</div>
            <div class="fiche-valeur">{{ ticketSelectionne.status }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label">⚠️ Priorité</div>
            <div class="fiche-valeur">{{ ticketSelectionne.priority }}</div>
          </div>
        </div>

        <div class="fiche-section">
          <div class="fiche-label">📝 Description</div>
          <div class="fiche-valeur description-text">
            {{ ticketSelectionne.description || 'Aucune description fournie.' }}
          </div>
        </div>

        <!-- Notes de suivi -->
        <div class="fiche-section" v-if="ticketSelectionne.notes">
          <div class="fiche-label">💡 Notes de transition / Suivi</div>
          <div class="fiche-valeur description-text" style="color: #e0e7ff;">{{ ticketSelectionne.notes }}</div>
        </div>

        <!-- Éléments associés formatés -->
        <div class="fiche-section" v-if="ticketSelectionne.items && parseItems(ticketSelectionne.items).length > 0">
          <div class="fiche-label">🔌 Éléments associés ({{ parseItems(ticketSelectionne.items).length }})</div>
          <div class="items-associes-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th>Tag Asset</th>
                  <th>Nom / Modèle</th>
                  <th>Catégorie</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in parseItems(ticketSelectionne.items)" :key="item.id">
                  <td class="item-tag-col">{{ item.asset_tag }}</td>
                  <td class="item-name-col">{{ item.nom }}</td>
                  <td>
                    <span class="item-cat-badge" v-if="item.categorie">{{ item.categorie }}</span>
                    <span v-else class="empty-dash">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Boutons d'action -->
        <div class="fiche-actions">
          <button @click="supprimerTicket(ticketSelectionne)" class="btn-action-danger">🗑️ Supprimer le ticket</button>
          <div style="display:flex; gap:0.75rem;">
            <div class="statut-rapide">
              <span style="font-size:0.82rem; opacity:0.6;">Changer statut :</span>
              <button
                v-for="s in ['New', 'In Progress', 'Closed']" :key="s"
                @click="changerStatut(ticketSelectionne, s)"
                :disabled="ticketSelectionne.status === s"
                :class="['btn-statut', ticketSelectionne.status === s ? 'btn-statut-actif' : '']"
              >{{ s }}</button>
            </div>
          </div>
        </div>

        <!-- Toast -->
        <div v-if="toastMessage" class="toast-inline">{{ toastMessage }}</div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const tickets = ref([])
const ticketSelectionne = ref(null)
const toastMessage = ref('')

const fetchTickets = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/tickets')
    tickets.value = res.data
  } catch (e) {
    console.error('Erreur tickets:', e)
  }
}

const parseItems = (itemsJson) => {
  if (!itemsJson) return []
  try {
    if (typeof itemsJson === 'string') {
      return JSON.parse(itemsJson)
    }
    return itemsJson
  } catch (e) {
    return []
  }
}

const ouvrirFiche = (ticket) => {
  ticketSelectionne.value = ticket
  toastMessage.value = ''
}

const afficherToast = (msg) => {
  toastMessage.value = msg
  setTimeout(() => { toastMessage.value = '' }, 3000)
}

const supprimerTicket = async (ticket) => {
  if (!confirm(`⚠️ Supprimer le ticket ${ticket.num_ticket} « ${ticket.titre} » ? Cette action est irréversible.`)) return
  try {
    await axios.delete(`http://localhost:3000/api/tickets/${ticket.id}`)
    ticketSelectionne.value = null
    await fetchTickets()
  } catch (e) {
    alert('Erreur lors de la suppression: ' + e.message)
  }
}

const changerStatut = async (ticket, nouveauStatut) => {
  if (ticket.status === nouveauStatut) return
  try {
    await axios.patch(`http://localhost:3000/api/tickets/${ticket.id}/status`, {
      status: nouveauStatut,
      notes: ticket.notes || ''
    })
    ticket.status = nouveauStatut
    ticketSelectionne.value = { ...ticket, status: nouveauStatut }
    afficherToast(`✅ Statut mis à jour : ${nouveauStatut}`)
    await fetchTickets()
  } catch (e) {
    alert('Erreur lors du changement de statut: ' + e.message)
  }
}

const exportCSV = () => {
  if (!tickets.value.length) {
    alert('Aucun ticket à exporter.')
    return
  }
  const headers = ['Numéro', 'Titre', 'Statut', 'Priorité', 'Date', 'Heure', 'Description', 'Notes']
  const rows = tickets.value.map(t => [
    t.num_ticket,
    `"${(t.titre || '').replace(/"/g, '""')}"`,
    t.status,
    t.priority,
    t.date,
    t.heure,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ])
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tickets_export_${new Date().toISOString().slice(0,10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(fetchTickets)
</script>

<style scoped>
.tickets-container {
  display: flex;
  flex-direction: column;
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.glow-title {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.count-badge {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  padding: 0.4rem 1rem;
  border-radius: 9999px;
  font-size: 0.88rem;
  font-weight: 600;
  opacity: 0.8;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.liste-tickets {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ticket-ligne {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ticket-ligne:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.1);
}

.ticket-num {
  font-family: monospace;
  font-weight: 700;
  color: #818cf8;
  font-size: 1rem;
  min-width: 80px;
}

.ticket-info {
  flex: 1;
}

.ticket-titre {
  font-weight: 600;
  font-size: 1.05rem;
  color: #ffffff;
  margin-bottom: 0.25rem;
}

.ticket-meta {
  font-size: 0.8rem;
  opacity: 0.5;
}

.ticket-badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.ticket-fleche {
  opacity: 0.3;
  font-size: 1.2rem;
  transition: opacity 0.2s, transform 0.2s;
}

.ticket-ligne:hover .ticket-fleche {
  opacity: 0.8;
  transform: translateX(4px);
}

.btn-retour {
  background: transparent;
  border: 1px solid var(--border);
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 0.75rem;
  cursor: pointer;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s, border-color 0.2s;
}

.btn-retour:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.25);
}

.fiche {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 1.5rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.fiche-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1.25rem;
}

.fiche-title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.fiche-num-badge {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.fiche-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  background: none;
  -webkit-text-fill-color: initial;
  color: #ffffff;
}

.fiche-badges {
  display: flex;
  gap: 0.5rem;
}

.fiche-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.fiche-champ {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.85rem;
  padding: 0.9rem 1.1rem;
}

.fiche-label {
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.4;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.fiche-valeur {
  font-weight: 600;
  font-size: 0.95rem;
  color: #ffffff;
}

.fiche-section {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 0.85rem;
  padding: 1.25rem;
}

.description-text {
  font-weight: 400;
  opacity: 0.85;
  line-height: 1.6;
  white-space: pre-wrap;
}

.items-associes-container {
  overflow-x: auto;
  margin-top: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th, .items-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.items-table th {
  font-size: 0.75rem;
  opacity: 0.5;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.items-table tr:last-child td {
  border-bottom: none;
}

.item-tag-col {
  font-family: monospace;
  font-weight: 700;
  color: #818cf8;
}

.item-name-col {
  font-weight: 500;
  color: #ffffff;
}

.item-cat-badge {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  opacity: 0.85;
}

.empty-dash {
  opacity: 0.3;
}

/* Statuts classes */
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

/* Priorités classes */
.badge-priority {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
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

/* Boutons action dans la fiche */
.fiche-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
  margin-top: 0.5rem;
}

.btn-action-danger {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 0.55rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  transition: all 0.2s;
}
.btn-action-danger:hover { background: rgba(239, 68, 68, 0.22); transform: none; box-shadow: none; }

.statut-rapide {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-statut {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  color: #fff;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-statut:hover { background: rgba(99, 102, 241, 0.12); border-color: #6366f1; transform: none; box-shadow: none; }
.btn-statut-actif {
  background: rgba(99, 102, 241, 0.2);
  border-color: #6366f1;
  color: #a5b4fc;
  cursor: default;
}
.btn-statut:disabled { opacity: 1; }

/* Export CSV */
.btn-export {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  color: #fff;
  padding: 0.4rem 0.9rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-export:hover { background: rgba(255, 255, 255, 0.08); transform: none; box-shadow: none; }

/* Toast inline */
.toast-inline {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #86efac;
  padding: 0.6rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.88rem;
  font-weight: 600;
  margin-top: 1rem;
  text-align: center;
  animation: fadeIn 0.3s ease-out;
}
</style>