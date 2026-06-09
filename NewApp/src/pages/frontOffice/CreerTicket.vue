<template>
  <div class="card" style="max-width: 700px; margin: 0 auto;">
    <h1>🎫 Créer un ticket</h1>
    <p style="opacity:0.6; margin-bottom:1.5rem;">
      Signalez un incident, une demande ou un problème lié au matériel.
    </p>

    <!-- Message résultat -->
    <div v-if="message" :class="['msg', messageOk ? 'msg-ok' : 'msg-err']" style="margin-bottom:1.5rem;">
      {{ message }}
    </div>

    <div class="form-group">
      <label>Titre *</label>
      <input v-model="form.titre" placeholder="Ex: Écran cassé, Clavier défaillant..." class="form-input" />
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
      <textarea v-model="form.description" placeholder="Décrivez le problème en détail..." class="form-input" rows="4"></textarea>
    </div>

    <!-- Sélection des éléments associés -->
    <div class="form-group">
      <label>🔗 Éléments associés (optionnel)</label>
      <p style="font-size:0.8rem; opacity:0.5; margin-bottom:0.5rem;">
        Sélectionnez un ou plusieurs éléments concernés par ce ticket
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
          <input
            type="checkbox"
            :value="el.id"
            v-model="elementsSelectionnes"
            style="display:none"
          />
          <span class="el-tag">{{ el.asset_tag }}</span>
          <span class="el-nom">{{ el.name || el.model?.name }}</span>
          <span class="el-cat">{{ el.category?.name }}</span>
        </label>
      </div>

      <div v-if="elementsSelectionnes.length > 0" style="margin-top:0.75rem; font-size:0.85rem; color:#a5b4fc;">
         {{ elementsSelectionnes.length }} élément(s) sélectionné(s)
      </div>
    </div>

    <button
      @click="soumettreTicket"
      :disabled="loading || !form.titre"
      style="width:100%; padding:0.9rem; background:var(--primary); border:none; border-radius:0.75rem; color:white; font-weight:bold; font-size:1rem; cursor:pointer; margin-top:0.5rem;"
    >
      {{ loading ? ' Création...' : ' Créer le ticket' }}
    </button>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const elements = ref([])
const elementsSelectionnes = ref([])
const loadingElements = ref(true)
const loading = ref(false)
const message = ref('')
const messageOk = ref(true)

const form = ref({
  titre: '',
  description: '',
  status: 'New',
  priority: 'Medium',
})

const fetchElements = async () => {
  loadingElements.value = true
  try {
    const res = await axios.get('http://localhost:3000/api/snipe-it/hardware?limit=500')
    elements.value = res.data?.rows || []
  } catch (e) {
    console.error('Erreur éléments:', e)
  } finally {
    loadingElements.value = false
  }
}

const soumettreTicket = async () => {
  if (!form.value.titre.trim()) {
    message.value = '❌ Le titre est obligatoire.'
    messageOk.value = false
    return
  }

  loading.value = true
  message.value = ''

  // On récupère les infos des éléments sélectionnés pour les stocker
  const elementsInfo = elements.value
    .filter(el => elementsSelectionnes.value.includes(el.id))
    .map(el => ({
      id: el.id,
      asset_tag: el.asset_tag,
      nom: el.name || el.model?.name,
      categorie: el.category?.name,
    }))

  try {
    const maintenant = new Date()
    const date = maintenant.toLocaleDateString('fr-FR')
    const heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    await axios.post('http://localhost:3000/api/tickets', {
      num_ticket: Date.now(), // ID unique basé sur timestamp
      date,
      heure,
      titre: form.value.titre,
      description: form.value.description,
      status: form.value.status,
      priority: form.value.priority,
      items: JSON.stringify(elementsInfo),
    })

    message.value = ' Ticket créé avec succès !'
    messageOk.value = true

    // Reset du formulaire
    form.value = { titre: '', description: '', status: 'New', priority: 'Medium' }
    elementsSelectionnes.value = []

  } catch (err) {
    message.value = ` Erreur : ${err.message}`
    messageOk.value = false
  } finally {
    loading.value = false
  }
}

onMounted(fetchElements)
</script>

<style scoped>
.form-group { margin-bottom: 1.25rem; }
.form-group label { display: block; font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.4rem; }
.form-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.04);
  color: white;
  font-size: 0.9rem;
  box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: var(--primary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
textarea.form-input { resize: vertical; }

.elements-liste {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.5rem;
}
.element-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid transparent;
}
.element-checkbox:hover { background: rgba(255,255,255,0.05); }
.element-checkbox.selected {
  background: rgba(99,102,241,0.15);
  border-color: #6366f1;
}
.el-tag { font-weight: bold; color: var(--primary); min-width: 70px; font-size: 0.82rem; }
.el-nom { flex: 1; font-size: 0.88rem; }
.el-cat { font-size: 0.75rem; opacity: 0.5; }

.msg { padding: 0.75rem 1rem; border-radius: 0.75rem; font-weight: bold; font-size: 0.9rem; }
.msg-ok { background: rgba(34,197,94,0.15); color: #86efac; border: 1px solid rgba(34,197,94,0.3); }
.msg-err { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
</style>