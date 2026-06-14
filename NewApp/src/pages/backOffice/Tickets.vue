
<template>
  <div class="card" style="max-width: 900px; margin: 0 auto;">

    <!-- ── LISTE des tickets ───────────────────────────────────────── -->
    <div v-if="!ticketSelectionne">
      <h1>🎫 Tickets</h1>
      <p style="opacity:0.6; margin-bottom:1.5rem;">{{ tickets.length }} ticket(s) dans la base SQLite</p>

      <div v-if="tickets.length === 0" style="opacity:0.5; text-align:center; padding:3rem;">
        Aucun ticket importé pour le moment.
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
          <span :class="['badge-statut', `statut-${(t.status||'').toLowerCase().replace(' ', '-')}`]">
            {{ t.status }}
          </span>
          <span :class="['badge-priority', `priority-${(t.priority||'').toLowerCase()}`]">
            {{ t.priority }}
          </span>
          <span class="ticket-fleche">→</span>
        </div>
      </div>
    </div>

    <!-- ── FICHE détail d'un ticket ───────────────────────────────── -->
    <div v-else>
      <button @click="ticketSelectionne = null" class="btn-retour">
        ← Retour à la liste
      </button>

      <div class="fiche">
        <div class="fiche-header">
          <h1>🎫 Ticket #{{ ticketSelectionne.num_ticket }}</h1>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <span :class="['badge-statut', `statut-${(ticketSelectionne.status||'').toLowerCase().replace(' ', '-')}`]">
              {{ ticketSelectionne.status }}
            </span>
            <span :class="['badge-priority', `priority-${(ticketSelectionne.priority||'').toLowerCase()}`]">
              {{ ticketSelectionne.priority }}
            </span>
          </div>
        </div>

        <h2 style="margin: 1.5rem 0 0.5rem;">{{ ticketSelectionne.titre }}</h2>

        <div class="fiche-grid">
          <div class="fiche-champ">
            <div class="fiche-label"> Date</div>
            <div class="fiche-valeur">{{ ticketSelectionne.date }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label"> Heure</div>
            <div class="fiche-valeur">{{ ticketSelectionne.heure }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label"> Statut</div>
            <div class="fiche-valeur">{{ ticketSelectionne.status }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label"> Priorité</div>
            <div class="fiche-valeur">{{ ticketSelectionne.priority }}</div>
          </div>
        </div>

        <div class="fiche-champ" style="margin-top:1rem;">
          <div class="fiche-label"> Description</div>
          <div class="fiche-valeur" style="margin-top:0.5rem; line-height:1.6; opacity:0.85;">
            {{ ticketSelectionne.description || 'Aucune description.' }}
          </div>
        </div>

        <div class="fiche-champ" style="margin-top:1rem; border-color: #22c55e;" v-if="ticketSelectionne.resolution">
  <div class="fiche-label" style="color:#86efac;">✓ Note de résolution</div>
  <div class="fiche-valeur" style="margin-top:0.5rem; line-height:1.6; color:#86efac;">
    {{ ticketSelectionne.resolution }}
  </div>
</div>

        <div class="fiche-champ" style="margin-top:1rem;" v-if="ticketSelectionne.items && ticketSelectionne.items !== '[]'">
          <div class="fiche-label"> Éléments associés</div>
          <div class="fiche-valeur">{{ ticketSelectionne.items }}</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const tickets = ref([])
const ticketSelectionne = ref(null)

const fetchTickets = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/tickets')
    tickets.value = res.data
  } catch (e) {
    console.error('Erreur tickets:', e)
  }
}

const ouvrirFiche = (ticket) => {
  ticketSelectionne.value = ticket
}

onMounted(fetchTickets)
</script>

<style scoped>
.liste-tickets {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.ticket-ligne {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}
.ticket-ligne:hover {
  background: rgba(255,255,255,0.08);
}
.ticket-num {
  font-weight: bold;
  color: var(--primary);
  min-width: 40px;
  font-size: 0.9rem;
}
.ticket-info { flex: 1; }
.ticket-titre { font-weight: 600; }
.ticket-meta { font-size: 0.8rem; opacity: 0.5; margin-top: 0.2rem; }
.ticket-fleche { opacity: 0.4; }

.btn-retour {
  background: transparent;
  border: 1px solid var(--border);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  cursor: pointer;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}
.btn-retour:hover { background: rgba(255,255,255,0.05); }

.fiche {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 2rem;
}
.fiche-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}
.fiche-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1.5rem;
}
.fiche-champ {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
}
.fiche-label {
  font-size: 0.75rem;
  opacity: 0.5;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.fiche-valeur { font-weight: 600; }

/* Statuts */
.badge-statut {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: bold;
}
.statut-new { background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid #6366f1; }
.statut-in-progress { background: rgba(234,179,8,0.2); color: #fde047; border: 1px solid #ca8a04; }
.statut-closed { background: rgba(34,197,94,0.2); color: #86efac; border: 1px solid #22c55e; }

/* Priorités */
.badge-priority {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: bold;
}
.priority-high { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid #ef4444; }
.priority-medium { background: rgba(249,115,22,0.2); color: #fdba74; border: 1px solid #f97316; }
.priority-low { background: rgba(34,197,94,0.2); color: #86efac; border: 1px solid #22c55e; }
</style>