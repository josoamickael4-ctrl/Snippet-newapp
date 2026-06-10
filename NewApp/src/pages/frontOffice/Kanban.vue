<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// --- États Réactifs ---
const tickets = ref([])
const configs = ref([])
const hardwareList = ref([])

const loading = ref(false)
const loadingHardware = ref(false)

// Modale de détails
const ticketSelectionne = ref(null)
const afficherModaleDetail = ref(false)

// Modale de transition de statut
const ticketEnTransition = ref(null)
const nouveauStatutVise = ref('')
const notesTransition = ref('')
const afficherModaleTransition = ref(false)

// Filtre par priorité
const filtreActif = ref('Tous')

// Modale d'édition
const afficherModaleEdit = ref(false)
const ticketEnEdition = ref(null)
const formEdit = ref({ titre: '', description: '', status: 'New', priority: 'Medium', items: '[]', notes: '' })

// Modale de création de ticket
const afficherModaleCreation = ref(false)
const elementsSelectionnes = ref([])
const elementsSelectionnesEdit = ref([])
const formTicket = ref({
  titre: '',
  description: '',
  priority: 'Medium',
  status: 'New'
})

// --- Chargement des données ---
const fetchConfigs = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/kanban/config')
    configs.value = res.data
  } catch (e) {
    console.error("Impossible de récupérer la config Kanban:", e)
  }
}

const fetchTickets = async () => {
  loading.value = true
  try {
    const res = await axios.get('http://localhost:3000/api/tickets')
    tickets.value = res.data
  } catch (e) {
    console.error("Impossible de récupérer les tickets:", e)
  } finally {
    loading.value = false
  }
}

const fetchHardware = async () => {
  loadingHardware.value = true
  try {
    const res = await axios.get('http://localhost:3000/api/snipe-it/hardware?limit=500')
    hardwareList.value = res.data?.rows || []
  } catch (e) {
    console.error("Impossible de récupérer le matériel:", e)
  } finally {
    loadingHardware.value = false
  }
}

// --- Résolution des configurations des colonnes ---
const colonnesConfig = computed(() => {
  const defaut = {
    'New': { label: 'vaovao', color: '#6366f1' },
    'In Progress': { label: 'efa manao', color: '#eab308' },
    'Closed': { label: 'vita', color: '#22c55e' }
  }

  return ['New', 'In Progress', 'Closed'].map(status => {
    const dbConf = configs.value.find(c => c.status_key === status)
    return {
      key: status,
      originalLabel: status,
      malagasyLabel: dbConf?.malagasy_name || defaut[status].label,
      bg_color: dbConf?.bg_color || defaut[status].color
    }
  })
})

// Dispatcher les tickets par statut (avec filtre priorité)
const ticketsParStatut = computed(() => {
  const groups = { 'New': [], 'In Progress': [], 'Closed': [] }
  tickets.value.forEach(t => {
    // Appliquer le filtre de priorité
    if (filtreActif.value !== 'Tous' && t.priority !== filtreActif.value) return
    const status = t.status || 'New'
    if (groups[status]) {
      groups[status].push(t)
    } else {
      groups['New'].push(t)
    }
  })
  return groups
})

// Nombre total de tickets après filtre
const totalFiltres = computed(() => {
  if (filtreActif.value === 'Tous') return tickets.value.length
  return tickets.value.filter(t => t.priority === filtreActif.value).length
})

// --- Drag and Drop ---
const onDragStart = (event, ticket) => {
  event.dataTransfer.setData('text/plain', ticket.id.toString())
  event.dataTransfer.effectAllowed = 'move'
}

const onDrop = (event, targetStatus) => {
  const ticketIdStr = event.dataTransfer.getData('text/plain')
  if (!ticketIdStr) return

  const ticketId = parseInt(ticketIdStr, 10)
  const ticket = tickets.value.find(t => t.id === ticketId)
  if (!ticket) return

  // Si le statut est identique, pas de changement
  if (ticket.status === targetStatus) return

  // Initialisation de la transition
  ticketEnTransition.value = ticket
  nouveauStatutVise.value = targetStatus
  notesTransition.value = ticket.notes || ''
  afficherModaleTransition.value = true
}

const validerTransition = async () => {
  if (!ticketEnTransition.value) return

  try {
    await axios.patch(`http://localhost:3000/api/tickets/${ticketEnTransition.value.id}/status`, {
      status: nouveauStatutVise.value,
      notes: notesTransition.value
    })
    await fetchTickets()
  } catch (e) {
    alert("Erreur lors de la mise à jour du statut: " + e.message)
  } finally {
    fermerModaleTransition()
  }
}

const fermerModaleTransition = () => {
  ticketEnTransition.value = null
  nouveauStatutVise.value = ''
  notesTransition.value = ''
  afficherModaleTransition.value = false
}

// --- Édition d'un ticket ---
const ouvrirEdition = (ticket) => {
  ticketEnEdition.value = ticket
  formEdit.value = {
    titre: ticket.titre || '',
    description: ticket.description || '',
    status: ticket.status || 'New',
    priority: ticket.priority || 'Medium',
    items: ticket.items || '[]',
    notes: ticket.notes || ''
  }
  // Pré-sélectionner les éléments déjà associés
  try {
    const items = typeof ticket.items === 'string' ? JSON.parse(ticket.items) : (ticket.items || [])
    elementsSelectionnesEdit.value = items.map(i => i.id).filter(Boolean)
  } catch { elementsSelectionnesEdit.value = [] }
  afficherModaleEdit.value = true
}

const sauvegarderEdition = async () => {
  if (!ticketEnEdition.value || !formEdit.value.titre.trim()) return
  // Récupérer les infos des éléments sélectionnés pour l'édition
  const selectedInfo = hardwareList.value
    .filter(h => elementsSelectionnesEdit.value.includes(h.id))
    .map(h => ({ id: h.id, asset_tag: h.asset_tag, nom: h.name || h.model?.name, categorie: h.category?.name }))
  try {
    await axios.put(`http://localhost:3000/api/tickets/${ticketEnEdition.value.id}`, {
      titre: formEdit.value.titre,
      description: formEdit.value.description,
      status: formEdit.value.status,
      priority: formEdit.value.priority,
      items: JSON.stringify(selectedInfo),
      notes: formEdit.value.notes
    })
    afficherModaleEdit.value = false
    afficherModaleDetail.value = false
    await fetchTickets()
    toastMessage.value = '✅ Ticket modifié avec succès'
    setTimeout(() => { toastMessage.value = '' }, 3000)
  } catch (e) {
    alert('Erreur lors de la modification: ' + e.message)
  }
}

const supprimerTicket = async (ticket) => {
  if (!confirm(`⚠️ Supprimer le ticket ${ticket.num_ticket} "${ticket.titre}" ? Cette action est irréversible.`)) return
  try {
    await axios.delete(`http://localhost:3000/api/tickets/${ticket.id}`)
    afficherModaleDetail.value = false
    await fetchTickets()
    toastMessage.value = '🗑️ Ticket supprimé'
    setTimeout(() => { toastMessage.value = '' }, 3000)
  } catch (e) {
    alert('Erreur lors de la suppression: ' + e.message)
  }
}

// --- Toast notification ---
const toastMessage = ref('')

// --- Détails du Ticket ---
const ouvrirFicheDetail = (ticket) => {
  ticketSelectionne.value = ticket
  afficherModaleDetail.value = true
}

const parseItems = (itemsJson) => {
  if (!itemsJson) return []
  try {
    const parsed = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson
    if (!Array.isArray(parsed)) return []
    return parsed.map(item => {
      if (typeof item === 'string') {
        return { asset_tag: item, nom: 'Importé via CSV', categorie: 'Asset' }
      }
      return item
    })
  } catch (e) {
    return []
  }
}

// --- Création de Ticket ---
const ouvrirCreationTicket = () => {
  formTicket.value = {
    titre: '',
    description: '',
    priority: 'Medium',
    status: 'New'
  }
  elementsSelectionnes.value = []
  afficherModaleCreation.value = true
}

const soumettreCreationTicket = async () => {
  if (!formTicket.value.titre.trim()) return

  // Récupérer les détails des matériels sélectionnés
  const selectedHardwareInfo = hardwareList.value
    .filter(h => elementsSelectionnes.value.includes(h.id))
    .map(h => ({
      id: h.id,
      asset_tag: h.asset_tag,
      nom: h.name || h.model?.name,
      categorie: h.category?.name
    }))

  try {
    const maintenant = new Date()
    const date = maintenant.toLocaleDateString('fr-FR')
    const heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    await axios.post('http://localhost:3000/api/tickets', {
      num_ticket: Date.now(),
      date,
      heure,
      titre: formTicket.value.titre,
      description: formTicket.value.description,
      status: formTicket.value.status,
      priority: formTicket.value.priority,
      items: JSON.stringify(selectedHardwareInfo),
      notes: ''
    })

    afficherModaleCreation.value = false
    await fetchTickets()
  } catch (e) {
    alert("Erreur lors de la création du ticket: " + e.message)
  }
}

// --- Cycle de vie ---
onMounted(() => {
  fetchConfigs()
  fetchTickets()
  fetchHardware()
})
</script>

<template>
  <div class="kanban-page">
    <div class="kanban-header">
      <div>
        <h1 class="glow-title">📋 Tableau Kanban</h1>
        <p class="subtitle">Visualisez et organisez le traitement des tickets en temps réel.</p>
      </div>
      <button @click="ouvrirCreationTicket" class="btn-ajouter-ticket">
        ➕ Ajouter 1 ticket
      </button>
    </div>

    <!-- --- BARRE DE FILTRE PAR PRIORITÉ --- -->
    <div class="filter-bar">
      <span class="filter-label">Filtrer par priorité :</span>
      <div class="filter-buttons">
        <button
          v-for="p in ['Tous', 'High', 'Medium', 'Low']"
          :key="p"
          @click="filtreActif = p"
          :class="['filter-btn', `filter-${p.toLowerCase()}`, { active: filtreActif === p }]"
        >{{ p }}
          <span class="filter-count" v-if="p === 'Tous'">{{ tickets.length }}</span>
          <span class="filter-count" v-else>{{ tickets.filter(t => t.priority === p).length }}</span>
        </button>
      </div>
    </div>

    <!-- --- ZONE DU TABLEAU KANBAN --- -->
    <div class="kanban-board" v-if="!loading">
      <div
        v-for="col in colonnesConfig"
        :key="col.key"
        class="kanban-column"
        :style="{ backgroundColor: col.bg_color + '18', borderColor: col.bg_color + '33' }"
        @dragover.prevent
        @drop="onDrop($event, col.key)"
      >
        <!-- Titre colonne -->
        <div class="column-header" :style="{ borderLeftColor: col.bg_color }">
          <div class="column-title-group">
            <span class="column-malagasy">{{ col.malagasyLabel }}</span>
            <span class="column-english">{{ col.originalLabel }}</span>
          </div>
          <span class="column-count-badge" :style="{ background: col.bg_color + '25', color: col.bg_color }">
            {{ ticketsParStatut[col.key]?.length || 0 }}
          </span>
        </div>

        <!-- Liste des cartes de ticket -->
        <div class="tickets-container">
          <div
            v-for="ticket in ticketsParStatut[col.key]"
            :key="ticket.id"
            class="ticket-card"
            draggable="true"
            @dragstart="onDragStart($event, ticket)"
            @click="ouvrirFicheDetail(ticket)"
          >
            <div class="ticket-card-header">
              <span class="ticket-num">#{{ ticket.num_ticket }}</span>
              <span :class="['priority-dot', `dot-${(ticket.priority || '').toLowerCase()}`]" :title="'Priorité: ' + ticket.priority"></span>
            </div>
            <h3 class="ticket-title">{{ ticket.titre }}</h3>
            <p class="ticket-desc-excerpt">{{ ticket.description || 'Pas de description...' }}</p>
            
            <div class="ticket-card-footer">
              <div class="ticket-time">📅 {{ ticket.date }} · {{ ticket.heure }}</div>
              <div class="ticket-items-count" v-if="parseItems(ticket.items).length > 0">
                🔗 {{ parseItems(ticket.items).length }} élem.
              </div>
            </div>
          </div>

          <!-- Si colonne vide -->
          <div v-if="!ticketsParStatut[col.key]?.length" class="empty-column-msg">
            Glisser un ticket ici
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loader-container">
      <div class="loader"></div>
      <p>Chargement des tickets...</p>
    </div>

    <!-- ================= MODALE : DÉTAILS D'UN TICKET ================= -->
    <div class="modal-overlay" v-if="afficherModaleDetail" @click.self="afficherModaleDetail = false">
      <div class="modal-content card fade-in">
        <div class="modal-header">
          <div class="title-group">
            <span class="num-badge">#{{ ticketSelectionne.num_ticket }}</span>
            <h2>{{ ticketSelectionne.titre }}</h2>
          </div>
          <button class="close-btn" @click="afficherModaleDetail = false">×</button>
        </div>

        <div class="modal-body">
          <div class="info-grid">
            <div class="info-box">
              <span class="info-label">Statut</span>
              <span :class="['badge-statut', `statut-${(ticketSelectionne.status || '').toLowerCase().replace(' ', '-')}`]">
                {{ ticketSelectionne.status }}
              </span>
            </div>
            <div class="info-box">
              <span class="info-label">Priorité</span>
              <span :class="['badge-priority', `priority-${(ticketSelectionne.priority || '').toLowerCase()}`]">
                {{ ticketSelectionne.priority }}
              </span>
            </div>
            <div class="info-box">
              <span class="info-label">Créé le</span>
              <span class="info-valeur">{{ ticketSelectionne.date }} à {{ ticketSelectionne.heure }}</span>
            </div>
          </div>

          <div class="info-section">
            <span class="info-label">📝 Description</span>
            <div class="info-text">{{ ticketSelectionne.description || 'Aucune description fournie.' }}</div>
          </div>

          <!-- Notes de transition -->
          <div class="info-section" v-if="ticketSelectionne.notes">
            <span class="info-label">💡 Notes de transition / Suivi</span>
            <div class="info-text notes-text">{{ ticketSelectionne.notes }}</div>
          </div>

          <!-- Matériels associés -->
          <div class="info-section" v-if="parseItems(ticketSelectionne.items).length > 0">
            <span class="info-label">🔌 Matériels associés ({{ parseItems(ticketSelectionne.items).length }})</span>
            <div class="items-table-wrapper">
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
                    <td class="item-tag">{{ item.asset_tag }}</td>
                    <td>{{ item.nom }}</td>
                    <td><span class="item-cat">{{ item.categorie || '—' }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="supprimerTicket(ticketSelectionne)" class="btn-danger">🗑️ Supprimer</button>
          <div style="display:flex; gap:0.5rem;">
            <button @click="afficherModaleDetail = false" class="btn-secondary">Fermer</button>
            <button @click="ouvrirEdition(ticketSelectionne)" class="btn-primary">✏️ Modifier</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= MODALE : TRANSITION DE STATUT ================= -->
    <div class="modal-overlay" v-if="afficherModaleTransition" @click.self="fermerModaleTransition">
      <div class="modal-content card transition-modal fade-in">
        <div class="modal-header">
          <h2>🔄 Transition de Statut</h2>
          <button class="close-btn" @click="fermerModaleTransition">×</button>
        </div>

        <div class="modal-body">
          <p class="transition-helper-text">
            Vous déplacez le ticket <strong>#{{ ticketEnTransition?.num_ticket }}</strong> vers le statut : 
            <span class="target-status-highlight">{{ nouveauStatutVise }}</span>.
          </p>

          <div class="form-group">
            <label>Saisir des informations supplémentaires (Ex: technicien, notes, diagnostic) :</label>
            <textarea
              v-model="notesTransition"
              placeholder="Indiquez les détails de cette action..."
              rows="4"
              class="form-input"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="fermerModaleTransition" class="btn-secondary">Annuler</button>
          <button @click="validerTransition" class="btn-primary">Confirmer</button>
        </div>
      </div>
    </div>

    <!-- ================= MODALE : CRÉATION RAPIDE DE TICKET ================= -->
    <div class="modal-overlay" v-if="afficherModaleCreation" @click.self="afficherModaleCreation = false">
      <div class="modal-content card creation-modal fade-in">
        <div class="modal-header">
          <h2>🎫 Ajouter 1 ticket</h2>
          <button class="close-btn" @click="afficherModaleCreation = false">×</button>
        </div>

        <div class="modal-body scrollable">
          <div class="form-group">
            <label>Titre du ticket *</label>
            <input
              v-model="formTicket.titre"
              type="text"
              placeholder="Ex: Problème d'impression, Batterie gonflée..."
              class="form-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Statut initial</label>
              <select v-model="formTicket.status" class="form-input">
                <option value="New">New (vaovao)</option>
                <option value="In Progress">In Progress (efa manao)</option>
                <option value="Closed">Closed (vita)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priorité</label>
              <select v-model="formTicket.priority" class="form-input">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Description du problème</label>
            <textarea
              v-model="formTicket.description"
              placeholder="Expliquez en détail le dysfonctionnement..."
              rows="4"
              class="form-input"
            ></textarea>
          </div>

          <div class="form-group">
            <label>🔌 Associer du matériel (optionnel)</label>
            <div v-if="loadingHardware" class="loading-sub">Chargement du matériel...</div>
            <div class="hardware-selection-list" v-else>
              <label
                v-for="h in hardwareList"
                :key="h.id"
                class="hardware-item-row"
                :class="{ active: elementsSelectionnes.includes(h.id) }"
              >
                <input
                  type="checkbox"
                  :value="h.id"
                  v-model="elementsSelectionnes"
                  style="display:none"
                />
                <span class="h-tag">{{ h.asset_tag }}</span>
                <span class="h-name">{{ h.name || h.model?.name }}</span>
                <span class="h-cat">{{ h.category?.name || 'Asset' }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="afficherModaleCreation = false" class="btn-secondary">Annuler</button>
          <button
            @click="soumettreCreationTicket"
            :disabled="!formTicket.titre.trim()"
            class="btn-primary"
          >
            Créer
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MODALE : ÉDITION D'UN TICKET ================= -->
    <div class="modal-overlay" v-if="afficherModaleEdit" @click.self="afficherModaleEdit = false">
      <div class="modal-content card creation-modal fade-in">
        <div class="modal-header">
          <h2>✏️ Modifier le ticket</h2>
          <button class="close-btn" @click="afficherModaleEdit = false">×</button>
        </div>

        <div class="modal-body scrollable">
          <div class="form-group">
            <label>Titre *</label>
            <input v-model="formEdit.titre" type="text" placeholder="Titre du ticket" class="form-input" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Statut</label>
              <select v-model="formEdit.status" class="form-input">
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priorité</label>
              <select v-model="formEdit.priority" class="form-input">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea v-model="formEdit.description" placeholder="Décrivez le problème..." rows="3" class="form-input"></textarea>
          </div>

          <div class="form-group">
            <label>Notes / Suivi</label>
            <textarea v-model="formEdit.notes" placeholder="Notes internes, technicien en charge..." rows="2" class="form-input"></textarea>
          </div>

          <div class="form-group">
            <label>🔌 Matériels associés</label>
            <div v-if="loadingHardware" class="loading-sub">Chargement...</div>
            <div class="hardware-selection-list" v-else>
              <label
                v-for="h in hardwareList"
                :key="h.id"
                class="hardware-item-row"
                :class="{ active: elementsSelectionnesEdit.includes(h.id) }"
              >
                <input type="checkbox" :value="h.id" v-model="elementsSelectionnesEdit" style="display:none" />
                <span class="h-tag">{{ h.asset_tag }}</span>
                <span class="h-name">{{ h.name || h.model?.name }}</span>
                <span class="h-cat">{{ h.category?.name || 'Asset' }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="afficherModaleEdit = false" class="btn-secondary">Annuler</button>
          <button @click="sauvegarderEdition" :disabled="!formEdit.titre.trim()" class="btn-primary">✅ Sauvegarder</button>
        </div>
      </div>
    </div>

    <!-- ================= TOAST NOTIFICATION ================= -->
    <div v-if="toastMessage" class="toast-notification">
      {{ toastMessage }}
    </div>

  </div>
</template>

<style scoped>
.kanban-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.glow-title {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Barre de filtre */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.85rem 1.25rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border);
  border-radius: 1rem;
}

.filter-label {
  font-size: 0.82rem;
  opacity: 0.6;
  font-weight: 600;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: #fff;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s;
}

.filter-btn:hover { background: rgba(255,255,255,0.06); transform: none; box-shadow: none; }
.filter-btn.active { border-color: #6366f1; background: rgba(99,102,241,0.15); }
.filter-high.active { border-color: #ef4444; background: rgba(239,68,68,0.15); color: #fca5a5; }
.filter-medium.active { border-color: #f97316; background: rgba(249,115,22,0.15); color: #fdba74; }
.filter-low.active { border-color: #22c55e; background: rgba(34,197,94,0.15); color: #86efac; }

.filter-count {
  background: rgba(255,255,255,0.08);
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  font-size: 0.72rem;
}

/* Bouton danger */
.btn-danger {
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3);
  color: #fca5a5;
  padding: 0.6rem 1.1rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.btn-danger:hover { background: rgba(239,68,68,0.25); transform: none; box-shadow: none; }

/* Toast notification */
.toast-notification {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30,30,50,0.95);
  border: 1px solid rgba(99,102,241,0.4);
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 0.85rem;
  font-size: 0.92rem;
  font-weight: 600;
  z-index: 9999;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.subtitle {
  opacity: 0.6;
  margin: 0.25rem 0 0 0;
  font-size: 0.95rem;
}

.btn-ajouter-ticket {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border: none;
  font-size: 0.95rem;
}

/* --- LE TABLEAU KANBAN --- */
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 900px) {
  .kanban-board {
    grid-template-columns: 1fr;
  }
}

.kanban-column {
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  padding: 1.25rem;
  backdrop-filter: blur(10px);
  min-height: 500px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.3s ease;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid #fff;
  padding-left: 0.75rem;
  margin-bottom: 0.5rem;
}

.column-title-group {
  display: flex;
  flex-direction: column;
}

.column-malagasy {
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
  text-transform: capitalize;
}

.column-english {
  font-size: 0.75rem;
  opacity: 0.5;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.column-count-badge {
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.tickets-container {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1;
}

/* --- CARTE TICKET --- */
.ticket-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 0.85rem;
  padding: 1rem;
  cursor: grab;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ticket-card:active {
  cursor: grabbing;
}

.ticket-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.ticket-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-num {
  font-family: monospace;
  font-size: 0.78rem;
  color: #818cf8;
  font-weight: 700;
}

.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.dot-high { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
.dot-medium { background: #f97316; box-shadow: 0 0 8px #f97316; }
.dot-low { background: #22c55e; box-shadow: 0 0 8px #22c55e; }

.ticket-title {
  font-size: 0.95rem;
  margin: 0;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
}

.ticket-desc-excerpt {
  font-size: 0.82rem;
  opacity: 0.5;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ticket-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 0.5rem;
}

.ticket-time {
  font-size: 0.72rem;
  opacity: 0.4;
}

.ticket-items-count {
  font-size: 0.72rem;
  background: rgba(129, 140, 248, 0.1);
  color: #818cf8;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.empty-column-msg {
  border: 1px dashed rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  padding: 2rem;
  border-radius: 0.85rem;
  font-size: 0.85rem;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
}

/* --- MODALES --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 90%;
  max-width: 650px;
  background: var(--bg);
  padding: 2rem;
  border-radius: 1.5rem;
  position: relative;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.transition-modal {
  max-width: 500px;
}

.creation-modal {
  max-width: 600px;
}

.modal-body.scrollable {
  overflow-y: auto;
  padding-right: 0.5rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 1rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  background: none;
  -webkit-text-fill-color: initial;
  color: #fff;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.num-badge {
  font-family: monospace;
  font-weight: 700;
  font-size: 1rem;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 2rem;
  color: #fff;
  opacity: 0.5;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  opacity: 0.8;
  transform: none;
  box-shadow: none;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.info-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.68rem;
  font-weight: 700;
  opacity: 0.4;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-valeur {
  font-weight: 600;
  font-size: 0.88rem;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.info-text {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  padding: 1rem;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.notes-text {
  border-color: rgba(99, 102, 241, 0.2);
  background: rgba(99, 102, 241, 0.02);
  color: #e0e7ff;
}

/* Transition text highlight */
.transition-helper-text {
  font-size: 0.95rem;
  opacity: 0.85;
  margin: 0;
}

.target-status-highlight {
  font-weight: 800;
  color: var(--primary);
  text-decoration: underline;
}

/* Modale création rapide */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.form-group label {
  font-size: 0.85rem;
  opacity: 0.7;
}

.form-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: white;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.hardware-selection-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.5rem;
}

.hardware-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid transparent;
}

.hardware-item-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.hardware-item-row.active {
  background: rgba(99, 102, 241, 0.12);
  border-color: #6366f1;
}

.h-tag {
  font-weight: bold;
  color: var(--primary);
  font-size: 0.8rem;
  min-width: 80px;
}

.h-name {
  flex: 1;
  font-size: 0.85rem;
}

.h-cat {
  font-size: 0.72rem;
  opacity: 0.5;
}

.loading-sub {
  font-size: 0.82rem;
  opacity: 0.5;
}

/* Boutons */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: none;
  box-shadow: none;
}

.btn-primary {
  padding: 0.6rem 1.2rem;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

/* Tables dans modales */
.items-table-wrapper {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th, .items-table td {
  padding: 0.6rem 0.85rem;
  text-align: left;
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.items-table th {
  opacity: 0.5;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.7rem;
}

.item-tag {
  font-family: monospace;
  font-weight: 700;
  color: #818cf8;
}

.item-cat {
  background: rgba(255, 255, 255, 0.04);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

/* Statuts et Priorités */
.badge-statut {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.statut-new { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); }
.statut-in-progress { background: rgba(234, 179, 8, 0.15); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.3); }
.statut-closed { background: rgba(34, 197, 94, 0.15); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.3); }

.badge-priority {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
}

.priority-high { background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.2); }
.priority-medium { background: rgba(249, 115, 22, 0.15); color: #fdba74; border: 1px solid rgba(249, 115, 22, 0.2); }
.priority-low { background: rgba(34, 197, 94, 0.15); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.2); }

.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5rem;
  gap: 1rem;
}

.loader {
  border: 4px solid rgba(255, 255, 255, 0.05);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fade-in {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
