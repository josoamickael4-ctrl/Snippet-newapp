
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
import '../../styles/tickets.css'  

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

</style>