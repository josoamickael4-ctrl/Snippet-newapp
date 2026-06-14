<template>
  <div class="kanban-page">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h1>Tableau Kanban</h1>
      <button 
        @click="modeTraduit = !modeTraduit"
        :class="['btn-traduire', { 'btn-traduire-actif': modeTraduit }]"
      >
        {{ modeTraduit ? ' Affichage traduit' : ' Traduire' }}
      </button>
    </div>
 
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
            <template v-if="modeTraduit && configStatuts[colonne.statut]?.traduction">
              {{ configStatuts[colonne.statut].traduction }}
            </template>
            <template v-else>
              {{ colonne.label }}
              <span v-if="configStatuts[colonne.statut]?.traduction" class="traduction-label">
                ({{ configStatuts[colonne.statut].traduction }})
              </span>
            </template>
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
        <button class="fiche-fermer" @click="popupAjoutVisible = false">Fermer</button>
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
 
        <h2 style="margin-bottom: 1rem;">Ticket #{{ ticketDetail.num_ticket }}</h2>
 
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
 
        <!-- Affichage du montant dans le détail -->
        <div class="fiche-champ" style="margin-top:1rem; border-color: #22c55e;">
          <div class="fiche-label" style="color:#86efac;">Montant total</div>
          <div class="fiche-valeur" style="margin-top:0.5rem; line-height:1.6; color:#86efac; font-size:1.2rem;">
            {{ Number(ticketDetail.montant || 0).toLocaleString('fr-FR') }} Ar
          </div>
        </div>
 
        <div v-if="ticketDetail.resolution" class="fiche-champ" style="margin-top:1rem; border-color: #f97316;">
          <div class="fiche-label" style="color:#fdba74;">Note de résolution</div>
          <div class="fiche-valeur" style="margin-top:0.5rem; line-height:1.6; color:#fdba74;">
            {{ ticketDetail.resolution }}
          </div>
        </div>
 
        <!-- Éléments associés -->
        <div v-if="ticketDetail.items && ticketDetail.items !== '[]' && ticketDetail.items !== 'null'" class="fiche-champ" style="margin-top:1rem;">
          <div class="fiche-label">Éléments associés</div>
          <div class="elements-associes">
            <template v-if="getItemsList(ticketDetail.items).length > 0">
              <div v-for="(el, idx) in getItemsList(ticketDetail.items)" :key="idx" class="element-item">
                <span class="element-tag">{{ getAssetTag(el) }}</span>
                <span class="element-name">{{ getAssetName(el) }}</span>
                <span class="element-category" v-if="getAssetCategory(el)">({{ getAssetCategory(el) }})</span>
              </div>
            </template>
            <div v-else class="aucun-element">Aucun élément associé</div>
          </div>
        </div>
      </div>
    </div>
 
    <!-- Dialogue de réouverture / annulation -->
    <div v-if="dialogueReouvVisible" class="overlay" @click.self="fermerDialogueReouv">
      <div class="dialogue-box">
        <h3 style="margin-bottom:0.5rem;">Remise en cours du ticket</h3>
        <p style="font-size: 0.85rem; opacity: 0.6; margin-bottom: 1.25rem;">
          Ce ticket était terminé avec un montant de <strong>{{ (ticketReouvEnCours?.montant || 0).toLocaleString('fr-FR') }} Ar</strong>
        </p>
 
        <div style="display: flex; gap: 1rem; margin-bottom: 1.25rem;">
          <button 
            @click="modeReouv = 'reouverture'"
            :class="modeReouv === 'reouverture' ? 'btn-confirmer' : 'btn-annuler'"
            style="flex: 1;"
          >
             Réouverture
          </button>
          <button 
            @click="modeReouv = 'annulation'"
            :class="modeReouv === 'annulation' ? 'btn-confirmer' : 'btn-annuler'"
            :style="{flex:1, background: modeReouv === 'annulation' ? '#ef4444' : 'transparent'}"
          >
             Annulation
          </button>
        </div>

        <div v-if="modeReouv === 'reouverture'" class="dialogue-champ">
          <label class="dialogue-label">Montant supplémentaire (Ar)</label>
          <input 
            v-model="prixReouverture" 
            type="number" 
            step="1"
            class="dialogue-input" 
            placeholder="Ex: 50000"
          />
          <p style="font-size:0.7rem; opacity:0.5; margin-top:0.5rem;">
            Montant actuel: {{ (ticketReouvEnCours?.montant || 0).toLocaleString('fr-FR') }} Ar<br>
            Nouveau montant: {{ ((ticketReouvEnCours?.montant || 0) + (Number(prixReouverture) || 0)).toLocaleString('fr-FR') }} Ar
          </p>
        </div>

        <div v-if="modeReouv === 'annulation'" class="dialogue-champ">
          <p style="font-size: 0.9rem; background: rgba(239,68,68,0.15); padding: 0.75rem; border-radius: 0.5rem;">
            Le montant du ticket ({{ (ticketReouvEnCours?.montant || 0).toLocaleString('fr-FR') }} Ar) sera remis à <strong>0 Ar</strong>.
          </p>
        </div>

        <div class="dialogue-actions">
          <button @click="fermerDialogueReouv" class="btn-annuler">Annuler</button>
          <button
            v-if="modeReouv === 'reouverture'"
            @click="confirmerReouverture"
            class="btn-confirmer"
            :disabled="!prixReouverture || Number(prixReouverture) <= 0"
          >
            Confirmer réouverture
          </button>
          <button
            v-if="modeReouv === 'annulation'"
            @click="confirmerAnnulation"
            style="background: #ef4444; border: none; border-radius: 0.5rem; color: white; padding: 0.5rem 1rem; cursor: pointer;"
          >
            Confirmer annulation
          </button>
        </div>
      </div>
    </div>

    <!-- Boîte de dialogue déplacement ticket (drag & drop) vers Closed -->
    <div v-if="dialogueVisible" class="overlay" @click.self="annulerDialogue">
      <div class="dialogue-box">
        <h3 v-if="colonneDestination === 'Closed'" style="margin-bottom:0.5rem;">
          Fermeture du ticket
        </h3>
        <h3 v-else style="margin-bottom:0.5rem;">
          Déplacement vers « {{ labelColonne(colonneDestination) }} »
        </h3>
 
        <p style="font-size: 0.85rem; opacity: 0.6; margin-bottom: 1.25rem;">
          Vous pouvez modifier les informations du ticket avant de confirmer.
        </p>
 
        <div class="dialogue-champ">
          <label class="dialogue-label">Titre</label>
          <input v-model="editTitre" class="dialogue-input" placeholder="Titre du ticket" />
        </div>
 
        <div class="dialogue-champ">
          <label class="dialogue-label">Description</label>
          <textarea v-model="editDescription" class="dialogue-textarea" placeholder="Description du ticket..." rows="3"></textarea>
        </div>
 
        <div class="dialogue-champ">
          <label class="dialogue-label">Priorité</label>
          <select v-model="editPriorite" class="dialogue-select">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
 
        <!-- Montant uniquement si destination = Closed -->
        <div v-if="colonneDestination === 'Closed'" class="dialogue-champ">
          <label class="dialogue-label">💰 Montant (Ar) <span style="color:#ef4444;">*</span></label>
          <input 
            v-model="montant" 
            type="number" 
            step="1"
            class="dialogue-input" 
            placeholder="Ex: 150000"
          />
          <p style="font-size:0.7rem; opacity:0.5; margin-top:0.25rem;">
            Ce montant sera réparti équitablement entre tous les assets du ticket
          </p>
        </div>

        <div class="dialogue-actions">
          <button @click="annulerDialogue" class="btn-annuler">Annuler</button>
          <button
            @click="confirmerDeplacement"
            class="btn-confirmer"
            :disabled="colonneDestination === 'Closed' && (!montant || Number(montant) <= 0)"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
 
  </div>
</template>
 
<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import FormulaireTicket from '../../components/FormulaireTicket.vue'
import '../../styles/kanban.css'  // ✅ Fonctionne 



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
const montant            = ref('')
const popupAjoutVisible  = ref(false)
const configStatuts      = ref({})
const ticketDetail       = ref(null)
const dialogueReouvVisible = ref(false)
const ticketReouvEnCours = ref(null)
const prixReouverture    = ref('')
const modeReouv          = ref('')
const modeTraduit        = ref(false)
 
// champs éditables dans le dialogue drag & drop
const editTitre       = ref('')
const editDescription = ref('')
const editPriorite    = ref('Medium')
 
const labelColonne = (statut) => colonnes.find(c => c.statut === statut)?.label || statut
 
const chargerTickets = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/tickets')
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
 
const ticketsParColonne = (statut) => tickets.value.filter(t => t.status === statut)
 
const commencerGlisser = (ticket) => { ticketEnCours.value = ticket }
const survolerColonne  = (statut)  => { colonneEnSurvol.value = statut }
const finGlisser       = ()        => { colonneEnSurvol.value = null }
 
const deposerTicket = (nouveauStatut) => {
  colonneEnSurvol.value = null
  if (!ticketEnCours.value || ticketEnCours.value.status === nouveauStatut) return

  // Cas spécial: ticket Closed -> In Progress (réouverture)
  if (ticketEnCours.value.status === 'Closed' && nouveauStatut === 'In Progress') {
    ticketReouvEnCours.value = ticketEnCours.value
    dialogueReouvVisible.value = true
    modeReouv.value = ''
    prixReouverture.value = ''
    ticketEnCours.value = null
    return
  }
 
  // Pour tous les autres déplacements
  colonneDestination.value = nouveauStatut
  editTitre.value       = ticketEnCours.value.titre       || ''
  editDescription.value = ticketEnCours.value.description || ''
  editPriorite.value    = ticketEnCours.value.priority    || 'Medium'
  montant.value         = ''
  dialogueVisible.value = true
}
 
const changerStatut = async (ticket, nouveauStatut, payload = {}) => {
  try {
    await axios.patch(`http://localhost:3000/api/tickets/${ticket.id}`, {
      status: nouveauStatut,
      ...payload,
    })
    await chargerTickets()
  } catch (e) {
    console.error('Erreur changement statut:', e)
  }
}
 
const confirmerReouverture = async () => {
  const ticket = ticketReouvEnCours.value
  const montantActuel = Number(ticket.montant) || 0
  const montantSupp = Number(prixReouverture.value) || 0
  const nouveauMontant = montantActuel + montantSupp
  
  await changerStatut(ticket, 'In Progress', {
    montant: String(nouveauMontant)
  })
  
  dialogueReouvVisible.value = false
  ticketReouvEnCours.value = null
  prixReouverture.value = ''
  modeReouv.value = ''
}

const confirmerAnnulation = async () => {
  const ticket = ticketReouvEnCours.value
  await changerStatut(ticket, 'In Progress', {
    montant: '0'
  })
  
  dialogueReouvVisible.value = false
  ticketReouvEnCours.value = null
  prixReouverture.value = ''
  modeReouv.value = ''
}

const fermerDialogueReouv = () => {
  dialogueReouvVisible.value = false
  ticketReouvEnCours.value = null
  prixReouverture.value = ''
  modeReouv.value = ''
}

const annulerDialogue = () => {
  dialogueVisible.value    = false
  colonneDestination.value = null
  montant.value            = ''
  ticketEnCours.value      = null
}
 
const confirmerDeplacement = async () => {
  const payload = {
    titre:       editTitre.value,
    description: editDescription.value,
    priority:    editPriorite.value,
  }
  
  if (colonneDestination.value === 'Closed') {
    payload.montant = montant.value
  }
  
  await changerStatut(ticketEnCours.value, colonneDestination.value, payload)
  dialogueVisible.value    = false
  montant.value            = ''
  colonneDestination.value = null
  ticketEnCours.value      = null
}

// Fonctions pour parser les éléments associés
const getItemsList = (items) => {
  if (!items || items === '[]' || items === 'null') return []
  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

const getAssetTag = (el) => {
  if (typeof el === 'string') return el
  return el.asset_tag || el.tag || el.id || '?'
}

const getAssetName = (el) => {
  if (typeof el === 'string') return ''
  return el.name || el.nom || ''
}

const getAssetCategory = (el) => {
  if (typeof el === 'string') return ''
  return el.category || el.categorie || ''
}

onMounted(() => {
  chargerTickets()
  listeCouleur()
})
</script>
 
<style scoped>

</style>