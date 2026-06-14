<template>
  <div class="card">
    <h1>Personnalisation Kanban</h1>
    <p style="opacity:0.6; margin-bottom:1.5rem;">
      Configurez la couleur de fond et le nom malgache de chaque colonne.
    </p>

    <div class="liste">
          <div v-for="statut in statuts" :key="statut.key" class="ligne">
            <span class="statut-nom">{{ statut.label }}</span>

            <div class="champ-groupe">
              <label>Couleur</label>
              <input type="color" v-model="statut.couleur" class="color-picker" />
            </div>

            <div class="champ-groupe">
              <label>Nom malgache</label>
              <input
                type="text"
                v-model="statut.traduction"
                placeholder="ex: vaovao"
                class="input-text"
              />
            </div>

            <button @click="sauvegarder(statut)" class="btn-confirmer">
              Confirmer
            </button>

            <span v-if="statut.sauvegarde" class="feedback-ok">✓ Sauvegardé</span>
          </div>
        </div>

        <div class="bloc-tout">
          <button @click="sauvegarderTout" class="btn-tout">
             Enregistrer toutes les modifications
          </button>
          <span v-if="toutSauvegarde" class="feedback-ok">✓ Tout a été sauvegardé</span>
        </div>

    
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'

const statuts = ref([
  { key: 'New',         label: 'Nouveau',     couleur: '#1e1e2e', traduction: '', sauvegarde: false },
  { key: 'In Progress', label: 'In Progress', couleur: '#1e2e1e', traduction: '', sauvegarde: false },
  { key: 'Closed',      label: 'Terminé',     couleur: '#2e1e1e', traduction: '', sauvegarde: false },
])

// CORRECTION : charge les valeurs existantes au démarrage
onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/tickets/kanban-config')
    res.data.forEach(row => {
      const statut = statuts.value.find(s => s.key === row.statut_key)
      if (statut) {
        statut.couleur = row.color
        statut.traduction = row.traduction
      }
    })
  } catch (e) {
    console.error('Erreur chargement couleurs:', e)
  }
})

const sauvegarder = async (statut) => {
  try {
    // CORRECTION : envoie statut_key (string) et non id (NaN)
    await axios.post('http://localhost:3000/api/tickets/kanban-config', {
      statut_key: statut.key,
      color: statut.couleur,
      traduction: statut.traduction,
    })
    statut.sauvegarde = true
    setTimeout(() => { statut.sauvegarde = false }, 2000)
  } catch (e) {
    console.error('Erreur sauvegarde:', e)
    alert(`Erreur : ${e.message}`)
  }
}

const toutSauvegarde = ref(false)

const sauvegarderTout = async () => {
  try {
    for (const statut of statuts.value) {
      await axios.post('http://localhost:3000/api/tickets/kanban-config', {
        statut_key: statut.key,
        color: statut.couleur,
        traduction: statut.traduction,
      })
      statut.sauvegarde = true
    }
    toutSauvegarde.value = true
    setTimeout(() => {
      toutSauvegarde.value = false
      statuts.value.forEach(s => s.sauvegarde = false)
    }, 2000)
  } catch (e) {
    console.error('Erreur sauvegarde globale:', e)
    alert(`Erreur : ${e.message}`)
  }
}

</script>

<style scoped>
.liste {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ligne {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 1rem;
  flex-wrap: wrap;
}
.statut-nom {
  font-weight: bold;
  font-size: 1rem;
  min-width: 110px;
}
.champ-groupe {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.champ-groupe label {
  font-size: 0.75rem;
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.color-picker {
  width: 60px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  cursor: pointer;
  padding: 2px;
  background: transparent;
}
.input-text {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.05);
  color: white;
  font-size: 0.9rem;
  width: 140px;
}
.input-text:focus {
  outline: none;
  border-color: var(--primary);
}
.btn-confirmer {
  background: var(--primary, #6366f1);
  border: none;
  border-radius: 0.5rem;
  color: white;
  padding: 0.5rem 1.25rem;
  cursor: pointer;
  font-weight: bold;
  margin-top: auto;
}
.btn-confirmer:hover { opacity: 0.85; }
.feedback-ok {
  color: #86efac;
  font-size: 0.85rem;
  font-weight: bold;
}

.bloc-tout {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-tout {
  background: #22c55e;
  border: none;
  border-radius: 0.5rem;
  color: white;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.95rem;
}

.btn-tout:hover { opacity: 0.85; }
</style>