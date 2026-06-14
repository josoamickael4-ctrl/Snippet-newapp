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
import '../../styles/couleur.css'

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

</style>