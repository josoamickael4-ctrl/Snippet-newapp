<template>
  <div class="kanban-page">
    <h1>Tableau Kanban</h1>
 
    <div v-if="loading" style="opacity: 0.5; margin-top: 2rem;">
      Chargement des tickets...
    </div>
 
    <div v-else class="kanban-board">
      <div
        v-for="colonne in colonnes"
        :key="colonne.statut"
        class="kanban-colonne"
        :style="{ background: configStatuts[colonne.statut]?.color }"
        @dragover.prevent="survolerColonne(colonne.statut)"
        @drop.prevent="deposerTicket(colonne.statut)"
        :class="{ 'colonne-survol': colonneEnSurvol === colonne.statut }"
      >
        <div class="colonne-header">
          <span class="colonne-titre">
            {{ colonne.label }}
            <span v-if="configStatuts[colonne.statut]?.traduction" class="traduction-label">
              ({{ configStatuts[colonne.statut].traduction }})
            </span>
          </span>
          <span class="colonne-count">{{ ticketsParColonne(colonne.statut).length }}</span>
        </div>
 
        <div class="colonne-tickets">
          <div
            v-for="ticket in ticketsParColonne(colonne.statut)"
            :key="ticket.id"
            class="ticket-card"
            draggable="true"
            @dragstart="commencerGlisser(ticket)"
            @dragend="finGlisser"
            @click="ticketDetail = ticket"
          >
            <div class="ticket-titre">{{ ticket.titre }}</div>
            <div class="ticket-meta">
              <span class="ticket-priorite">{{ ticket.priority }}</span>
              <span class="ticket-date">{{ ticket.date }}</span>
            </div>
          </div>
        </div>
 
        <button
          v-if="colonne.statut === 'New'"
          class="btn-ajouter"
          @click="popupAjoutVisible = true"
        >
          + Ajouter 1 ticket
        </button>
      </div>
    </div>
 
    <!-- Popup création ticket -->
    <div v-if="popupAjoutVisible" class="overlay" @click.self="popupAjoutVisible = false">
      <div class="popup-formulaire">
        <button class="fiche-fermer" @click="popupAjoutVisible = false">✕</button>
        <FormulaireTicket
          @fermer="popupAjoutVisible = false"
          @ticket-cree="quandTicketCree"
        />
      </div>
    </div>
 
    <!-- Fiche détail ticket au clic -->
    <div v-if="ticketDetail" class="overlay" @click.self="ticketDetail = null">
      <div class="popup-formulaire">
        <button class="fiche-fermer" @click="ticketDetail = null">✕</button>
 
        <h2 style="margin-bottom: 1rem;">🎫 Ticket #{{ ticketDetail.num_ticket }}</h2>
 
        <div style="display:flex; gap:0.75rem; margin-bottom:1.5rem; flex-wrap:wrap;">
          <span :class="['badge-statut', `statut-${(ticketDetail.status||'').toLowerCase().replace(' ','-')}`]">
            {{ ticketDetail.status }}
          </span>
          <span :class="['badge-priority', `priority-${(ticketDetail.priority||'').toLowerCase()}`]">
            {{ ticketDetail.priority }}
          </span>
        </div>
 
        <h3 style="margin-bottom: 1.5rem;">{{ ticketDetail.titre }}</h3>
 
        <div class="fiche-grid">
          <div class="fiche-champ">
            <div class="fiche-label">Date</div>
            <div class="fiche-valeur">{{ ticketDetail.date }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label">Heure</div>
            <div class="fiche-valeur">{{ ticketDetail.heure }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label">Statut</div>
            <div class="fiche-valeur">{{ ticketDetail.status }}</div>
          </div>
          <div class="fiche-champ">
            <div class="fiche-label">Priorité</div>
            <div class="fiche-valeur">{{ ticketDetail.priority }}</div>
          </div>
        </div>
 
        <div class="fiche-champ" style="margin-top:1rem;">
          <div class="fiche-label">Description</div>
          <div class="fiche-valeur" style="margin-top:0.5rem; line-height:1.6; opacity:0.85;">
            {{ ticketDetail.description || 'Aucune description.' }}
          </div>
        </div>
 
        <div v-if="ticketDetail.resolution" class="fiche-champ" style="margin-top:1rem; border-color: #22c55e;">
          <div class="fiche-label" style="color:#86efac;">✓ Note de résolution</div>
          <div class="fiche-valeur" style="margin-top:0.5rem; line-height:1.6; color:#86efac;">
            {{ ticketDetail.resolution }}
          </div>
        </div>
 
      <!-- REMPLACER par ceci -->
      <div v-if="itemsParsed.length > 0" class="fiche-champ" style="margin-top:1rem;">
        <div class="fiche-label">Éléments associés</div>
        <div v-for="(el, i) in itemsParsed" :key="i" style="margin-top:0.4rem; font-size:0.85rem;">
          <span style="color:#a5b4fc; font-weight:bold;">
            {{ typeof el === 'object' ? el.asset_tag : el }}
          </span>
          <template v-if="typeof el === 'object'">
            — {{ el.name || el.nom || '' }}
            <span v-if="el.category || el.categorie" style="opacity:0.5;">
              ({{ el.category || el.categorie }})
            </span>
          </template>
        </div>
      </div>
      </div>
    </div>
 
    <!-- Boîte de dialogue déplacement ticket (drag & drop) -->
    <div v-if="dialogueVisible" class="overlay">
      <div class="dialogue-box">
 
        <!-- Titre du dialogue selon destination -->
        <h3 v-if="colonneDestination === 'Closed'" style="margin-bottom:0.5rem;">
          ✅ Fermeture du ticket
        </h3>
        <h3 v-else style="margin-bottom:0.5rem;">
          ✏️ Déplacement vers « {{ labelColonne(colonneDestination) }} »
        </h3>
 
        <p style="font-size: 0.85rem; opacity: 0.6; margin-bottom: 1.25rem;">
          Vous pouvez modifier les informations du ticket avant de confirmer.
        </p>
 
        <!-- Champ Titre -->
        <div class="dialogue-champ">
          <label class="dialogue-label">Titre</label>
          <input
            v-model="editTitre"
            class="dialogue-input"
            placeholder="Titre du ticket"
          />
        </div>
 
        <!-- Champ Description -->
        <div class="dialogue-champ">
          <label class="dialogue-label">Description</label>
          <textarea
            v-model="editDescription"
            class="dialogue-textarea"
            placeholder="Description du ticket..."
            rows="3"
          ></textarea>
        </div>
 
        <!-- Champ Priorité -->
        <div class="dialogue-champ">
          <label class="dialogue-label">Priorité</label>
          <select v-model="editPriorite" class="dialogue-select">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
 
        <!-- montant — uniquement si destination = Closed -->
    <div v-if="colonneDestination === 'Closed'" class="dialogue-champ">
      <label class="dialogue-label">Montant total du ticket (Ar) <span style="color:#ef4444;">*</span></label>
      <input
        v-model.number="montantTicket"
        type="number"
        min="0"
        class="dialogue-input"
        placeholder="Ex: 50000"
      />
      <p style="font-size:0.78rem; opacity:0.5; margin-top:0.4rem;">
        Sera divise entre {{ ticketEnCours?.items ? JSON.parse(ticketEnCours.items).length : 0 }} asset(s)
      </p>
    </div>
 
        <div class="dialogue-actions">
          <button @click="annulerDialogue" class="btn-annuler">Annuler</button>
          <button
            @click="confirmerDeplacement"
            class="btn-confirmer"
:disabled="colonneDestination === 'Closed' && (!montantTicket || montantTicket <= 0)"          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
 
  </div>
</template>
 
<script setup>

import { ref, onMounted, computed } from 'vue' 
import axios from 'axios'
import FormulaireTicket from '../../components/FormulaireTicket.vue'
 
const colonnes = [
  { statut: 'New',         label: 'Nouveau' },
  { statut: 'In Progress', label: 'In Progress' },
  { statut: 'Closed',      label: 'Terminé' },
]
 
const tickets            = ref([])
const loading            = ref(true)
const ticketEnCours      = ref(null)
const colonneEnSurvol    = ref(null)
const dialogueVisible    = ref(false)
const colonneDestination = ref(null)
const montantTicket = ref(0)
const popupAjoutVisible  = ref(false)
const configStatuts      = ref({})
const ticketDetail       = ref(null)
 
// champs éditables dans le dialogue drag & drop
const editTitre       = ref('')
const editDescription = ref('')
const editPriorite    = ref('Medium')
 
const labelColonne = (statut) => colonnes.find(c => c.statut === statut)?.label || statut
 
const chargerTickets = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/tickets')
    console.log('tickets recus:', res.data)        // <-- ajoute ici
    tickets.value = res.data
  } catch (e) {
    console.error('Erreur chargement tickets:', e)
  } finally {
    loading.value = false
  }
}
 
const listeCouleur = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/tickets/kanban-config')
    console.log('config kanban recue:', res.data)  // <-- ajoute ici
    res.data.forEach(row => {
      configStatuts.value[row.statut_key] = {
        color: row.color,
        traduction: row.traduction,
      }
    })
  } catch (e) {
    console.error('Erreur chargement config kanban:', e)
  }
}
 
const quandTicketCree = async () => {
  popupAjoutVisible.value = false
  await chargerTickets()
}
 
const itemsParsed = computed(() => {
  if (!ticketDetail.value?.items) return []
  console.log('items brut du ticket:', ticketDetail.value.items)  // <-- ajoute ici
  try {
    const parsed = typeof ticketDetail.value.items === 'string'
      ? JSON.parse(ticketDetail.value.items)
      : ticketDetail.value.items
    console.log('items apres parse:', parsed)                     // <-- ajoute ici
    return Array.isArray(parsed) ? parsed : []
  } catch {
    console.error('erreur JSON.parse items:', ticketDetail.value.items)
    return []
  }
})

const ticketsParColonne = (statut) => tickets.value.filter(t => t.status === statut)
 
const commencerGlisser = (ticket) => { ticketEnCours.value = ticket }
const survolerColonne  = (statut)  => { colonneEnSurvol.value = statut }
const finGlisser       = ()        => { colonneEnSurvol.value = null }
 
const deposerTicket = (nouveauStatut) => {
  colonneEnSurvol.value = null
  if (!ticketEnCours.value || ticketEnCours.value.status === nouveauStatut) return

  console.log('ticket glisse:', ticketEnCours.value)       // <-- ajoute ici
  console.log('destination:', nouveauStatut)               // <-- ajoute ici

  colonneDestination.value = nouveauStatut
  editTitre.value       = ticketEnCours.value.titre       || ''
  editDescription.value = ticketEnCours.value.description || ''
  editPriorite.value    = ticketEnCours.value.priority    || 'Medium'
  montantTicket.value = 0
  dialogueVisible.value = true
}
 
const changerStatut = async (ticket, nouveauStatut, payload = {}) => {
  try {
    const res = await axios.patch(`http://localhost:3000/api/tickets/${ticket.id}`, {
      status: nouveauStatut,
      ...payload,
    })
    console.log('reponse serveur PATCH:', res.data)        // <-- ajoute ici
    const index = tickets.value.findIndex(t => t.id === ticket.id)
    if (index !== -1) {
      tickets.value[index] = {
        ...tickets.value[index],
        status: nouveauStatut,
        ...payload,
      }
    }
  } catch (e) {
    console.error('Erreur changement statut:', e)
  }
}
 
const annulerDialogue = () => {
  dialogueVisible.value    = false
  colonneDestination.value = null
  montantTicket.value      = 0
  ticketEnCours.value      = null
}
 
const confirmerDeplacement = async () => {
  const payload = {
    titre:       editTitre.value,
    description: editDescription.value,
    priority:    editPriorite.value,
    ...(colonneDestination.value === 'Closed' ? {
      montant: montantTicket.value,
      items:   ticketEnCours.value.items
    } : {}),
  }
  console.log('payload envoye au serveur:', payload)
  await changerStatut(ticketEnCours.value, colonneDestination.value, payload)
  dialogueVisible.value    = false
  montantTicket.value      = 0
  colonneDestination.value = null
  ticketEnCours.value      = null
}
 
onMounted(() => {
  chargerTickets()
  listeCouleur()
})
</script>
 
<style scoped>
.kanban-page { padding: 1.5rem; }
 
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
}
 
.kanban-colonne {
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1rem;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.2s;
}
 
.colonne-survol {
  border-color: #6366f1;
  background: rgba(99,102,241,0.06) !important;
}
 
.colonne-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
 
.colonne-titre { font-weight: 600; font-size: 1rem; }
 
.colonne-count {
  background: rgba(99,102,241,0.2);
  color: #a5b4fc;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 999px;
}
 
.colonne-tickets {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
 
.ticket-card {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: grab;
  color: #fff;
  transition: opacity 0.2s, border-color 0.2s, background 0.2s;
}
 
.ticket-card:active { opacity: 0.5; cursor: grabbing; }
.ticket-card:hover {
  border-color: #fff;
  background: rgba(0, 0, 0, 0.5);
}
 
.ticket-titre { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.4rem; color: #fff; }
 
.ticket-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.75);
}
 
.btn-ajouter {
  background: rgba(0, 0, 0, 0.25);
  border: 1px dashed rgba(255,255,255,0.4);
  border-radius: 0.75rem;
  color: #fff;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: auto;
}
 
.btn-ajouter:hover {
  background: rgba(0, 0, 0, 0.4);
  border-color: #fff;
  color: #fff;
}
 
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
 
.popup-formulaire {
  background: #1e1e2e;
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 2rem;
  width: 580px;
  max-width: 90%;
  max-height: 88vh;
  overflow-y: auto;
  position: relative;
}
 
.fiche-fermer {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  color: inherit;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
 
.dialogue-box {
  background: #1e1e2e;
  border: 1px solid #6366f1;
  border-radius: 1rem;
  padding: 2rem;
  width: 460px;
  max-width: 90%;
  max-height: 88vh;
  overflow-y: auto;
}
 
.dialogue-champ {
  margin-bottom: 1rem;
}
 
.dialogue-label {
  display: block;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.55;
  margin-bottom: 0.35rem;
}
 
.dialogue-input,
.dialogue-select {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  color: inherit;
  font-family: inherit;
  font-size: 0.9rem;
  padding: 0.6rem 0.75rem;
  box-sizing: border-box;
}
 
.dialogue-textarea {
  width: 100%;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  color: inherit;
  font-family: inherit;
  font-size: 0.9rem;
  padding: 0.6rem 0.75rem;
  resize: vertical;
  box-sizing: border-box;
}
 
.dialogue-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
}
 
.btn-annuler {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: inherit;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
 
.btn-confirmer {
  background: #6366f1;
  border: none;
  border-radius: 0.5rem;
  color: white;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
 
.btn-confirmer:disabled { opacity: 0.4; cursor: not-allowed; }
 
.badge-statut {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: bold;
}
.statut-new { background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid #6366f1; }
.statut-in-progress { background: rgba(234,179,8,0.2); color: #fde047; border: 1px solid #ca8a04; }
.statut-closed { background: rgba(34,197,94,0.2); color: #86efac; border: 1px solid #22c55e; }
 
.badge-priority {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: bold;
}
.priority-high { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid #ef4444; }
.priority-medium { background: rgba(249,115,22,0.2); color: #fdba74; border: 1px solid #f97316; }
.priority-low { background: rgba(34,197,94,0.2); color: #86efac; border: 1px solid #22c55e; }
 
.fiche-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 0.5rem;
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
 
.traduction-label {
  font-size: 0.8rem;
  opacity: 0.55;
  font-weight: 400;
  margin-left: 0.3rem;
}
</style>
 