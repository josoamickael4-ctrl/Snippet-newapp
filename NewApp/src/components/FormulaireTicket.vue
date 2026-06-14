<template>
  <div>
    <h2 style="margin-bottom: 1rem;">Créer un ticket</h2>

    <!-- Message résultat -->
    <div v-if="message" :class="['msg', messageOk ? 'msg-ok' : 'msg-err']" style="margin-bottom:1.25rem;">
      {{ message }}
    </div>

    <div class="form-group">
      <label>Titre *</label>
      <input
        v-model="form.titre"
        placeholder="Ex: Écran cassé, Clavier défaillant..."
        class="form-input"
      />
    </div>

    <div class="form-grid">
      <div class="form-group">
        <label>Statut</label>
        <select v-model="form.status" class="form-input">
          <option value="New">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Closed">Closed</option>
        </select>
      </div>
      <div class="form-group">
        <label>Priorité</label>
        <select v-model="form.priority" class="form-input">
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label>Description</label>
      <textarea
        v-model="form.description"
        placeholder="Décrivez le problème en détail..."
        class="form-input"
        rows="3"
      ></textarea>
    </div>

    <!-- Éléments associés -->
    <div class="form-group">
      <label>Éléments associés (optionnel)</label>
      <p style="font-size:0.8rem; opacity:0.5; margin-bottom:0.5rem;">
        Sélectionnez un ou plusieurs éléments concernés
      </p>

      <div v-if="loadingElements" style="opacity:0.5; font-size:0.85rem;">
        Chargement des éléments...
      </div>

      <div v-else class="elements-liste">
        <label
          v-for="el in elements"
          :key="el.id"
          class="element-checkbox"
          :class="{ selected: elementsSelectionnes.includes(el.id) }"
        >
          <input type="checkbox" :value="el.id" v-model="elementsSelectionnes" style="display:none" />
          <span class="el-tag">{{ el.asset_tag }}</span>
          <span class="el-nom">{{ el.name || el.model?.name }}</span>
          <span class="el-cat">{{ el.category?.name }}</span>
        </label>
      </div>

      <div v-if="elementsSelectionnes.length > 0" style="margin-top:0.5rem; font-size:0.85rem; color:#a5b4fc;">
        {{ elementsSelectionnes.length }} élément(s) sélectionné(s)
      </div>
    </div>

    <!-- Boutons -->
    <div style="display:flex; gap:0.75rem; justify-content:flex-end; margin-top:1rem;">
      <!-- Ce bouton envoie l'événement "fermer" au parent (Kanban.vue) -->
      <button @click="$emit('fermer')" class="btn-annuler">
        Annuler
      </button>
      <button
        @click="soumettreTicket"
        :disabled="loading || !form.titre.trim()"
        class="btn-confirmer"
      >
        {{ loading ? 'Création...' : 'Créer le ticket' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// ── Événements envoyés au composant parent (Kanban.vue) ───────────────────────
// 'fermer'        → demande au parent de fermer le popup
// 'ticket-cree'   → prévient le parent qu'un nouveau ticket existe
//                   pour qu'il recharge la liste sans quitter le Kanban
const emit = defineEmits(['fermer', 'ticket-cree'])

// ── État du formulaire ────────────────────────────────────────────────────────
const form = ref({
  titre: '',
  description: '',
  status: 'New',
  priority: 'Medium',
})

// ── État des éléments Snipe-IT ────────────────────────────────────────────────
const elements            = ref([])
const elementsSelectionnes = ref([])
const loadingElements     = ref(true)

// ── État de la soumission ─────────────────────────────────────────────────────
const loading    = ref(false)
const message    = ref('')
const messageOk  = ref(true)

// ── Charger les éléments depuis Snipe-IT ──────────────────────────────────────
const fetchElements = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/snipe-it/hardware?limit=500')
    elements.value = res.data?.rows || []
  } catch (e) {
    console.error('Erreur éléments:', e)
  } finally {
    loadingElements.value = false
  }
}

// ── Soumettre le formulaire ───────────────────────────────────────────────────
const soumettreTicket = async () => {
  if (!form.value.titre.trim()) {
    message.value = 'Le titre est obligatoire.'
    messageOk.value = false
    return
  }

  loading.value = true
  message.value = ''

  // On prépare les infos des éléments sélectionnés
  const elementsInfo = elements.value
    .filter(el => elementsSelectionnes.value.includes(el.id))
    .map(el => ({
      id: el.id,
      asset_tag: el.asset_tag,
      name: el.name || el.model?.name,
      category: el.category?.name,
    }))

  try {
    const maintenant = new Date()
    await axios.post('http://localhost:3000/api/tickets', {
      num_ticket: Date.now(),
      date: maintenant.toLocaleDateString('fr-FR'),
      heure: maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      titre: form.value.titre,
      description: form.value.description,
      status: form.value.status,
      priority: form.value.priority,
      items: JSON.stringify(elementsInfo),
    })

    // On prévient Kanban.vue que le ticket est créé
    // Kanban.vue va recharger les tickets et fermer le popup
    emit('ticket-cree')

  } catch (err) {
    message.value = `Erreur : ${err.message}`
    messageOk.value = false
    loading.value = false
  }
}

onMounted(fetchElements)
</script>

<style scoped>
.form-group { margin-bottom: 1.1rem; }
.form-group label { display: block; font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.35rem; }

.form-input {
  width: 100%;
  padding: 0.65rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.04);
  color: inherit;
  font-size: 0.9rem;
  font-family: inherit;
  box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: #6366f1; }
textarea.form-input { resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.elements-liste {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.5rem;
}
.element-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  border: 1px solid transparent;
}
.element-checkbox:hover { background: rgba(255,255,255,0.05); }
.element-checkbox.selected { background: rgba(99,102,241,0.15); border-color: #6366f1; }
.el-tag { font-weight: bold; color: #a5b4fc; min-width: 70px; font-size: 0.82rem; }
.el-nom { flex: 1; font-size: 0.88rem; }
.el-cat { font-size: 0.75rem; opacity: 0.5; }

.btn-annuler {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: inherit;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-confirmer {
  background: #6366f1;
  border: none;
  border-radius: 0.5rem;
  color: white;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.9rem;
}
.btn-confirmer:disabled { opacity: 0.4; cursor: not-allowed; }

.msg { padding: 0.7rem 1rem; border-radius: 0.75rem; font-size: 0.9rem; }
.msg-ok { background: rgba(34,197,94,0.15); color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
.msg-err { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
</style>