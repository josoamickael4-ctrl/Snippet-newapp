<template>
  <div class="card" style="max-width: 1000px; margin: 0 auto;">
    <h1>Liste des éléments</h1>
    <p style="opacity:0.6; margin-bottom:1.5rem;">
      {{ elementsFiltres.length }} élément(s) trouvé(s) sur {{ elements.length }} au total
    </p>

    <!-- Recherche multi-critère -->
    <div class="filtres">
      <input v-model="recherche.nom" placeholder="Nom ou asset tag..." class="filtre-input" />
      <select v-model="recherche.categorie" class="filtre-input">
        <option value="">Toutes catégories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select v-model="recherche.statut" class="filtre-input">
        <option value="">Tous statuts</option>
        <option v-for="s in statuts" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="recherche.fabricant" class="filtre-input">
        <option value="">Tous fabricants</option>
        <option v-for="f in fabricants" :key="f" :value="f">{{ f }}</option>
      </select>
      <button @click="reinitialiserFiltres" style="background: transparent; border: 1px solid var(--border); color: white; padding: 0.6rem 1rem; border-radius: 0.75rem; cursor: pointer;">
        Réinitialiser
      </button>
    </div>

    <!-- Chargement -->
    <div v-if="loading" style="text-align:center; padding:3rem; opacity:0.5;">
      Chargement des éléments...
    </div>

    <!-- Aucun résultat -->
    <div v-else-if="elementsFiltres.length === 0" style="text-align:center; padding:3rem; opacity:0.5;">
      Aucun élément ne correspond à votre recherche.
    </div>

    <!-- Liste -->
    <div v-else class="elements-grid">
      <div v-for="el in elementsFiltres" :key="el.id" class="element-card">
        <div class="element-header">
          <span class="element-tag">{{ el.asset_tag }}</span>
          <span :class="['badge-statut', `statut-${slugify(el.status?.name)}`]">
            {{ el.status?.name || '—' }}
          </span>
        </div>
        <div class="element-nom">{{ el.name || el.model?.name || '—' }}</div>
        <div class="element-details">
          <div><strong>Modèle :</strong> {{ el.model?.name || '—' }}</div>
          <div><strong>Catégorie :</strong> {{ el.category?.name || '—' }}</div>
          <div><strong>Fabricant :</strong> {{ el.manufacturer?.name || '—' }}</div>
          <div v-if="el.serial"><strong>Série :</strong> {{ el.serial }}</div>
          <div v-if="el.purchase_date?.formatted"><strong>Acheté le :</strong> {{ el.purchase_date.formatted }}</div>
          <div v-if="el.purchase_cost"><strong>Coût :</strong> {{ el.purchase_cost }}</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const elements = ref([])
const loading = ref(true)

const recherche = ref({
  nom: '',
  categorie: '',
  statut: '',
  fabricant: '',
})

const fetchElements = async () => {
  loading.value = true
  try {
    const res = await axios.get('http://localhost:3000/api/snipe-it/hardware?limit=500')
    elements.value = res.data?.rows || []
  } catch (e) {
    console.error('Erreur chargement éléments:', e)
  } finally {
    loading.value = false
  }
}

// Listes déroulantes dynamiques depuis les données
const categories = computed(() => {
  const vals = elements.value.map(e => e.category?.name).filter(Boolean)
  return [...new Set(vals)].sort()
})

const statuts = computed(() => {
  const vals = elements.value.map(e => e.status?.name).filter(Boolean)
  return [...new Set(vals)].sort()
})

const fabricants = computed(() => {
  const vals = elements.value.map(e => e.manufacturer?.name).filter(Boolean)
  return [...new Set(vals)].sort()
})

// Filtrage multi-critère
const elementsFiltres = computed(() => {
  return elements.value.filter(el => {
    const terme = recherche.value.nom.toLowerCase()
    const matchNom = !terme ||
      (el.name || '').toLowerCase().includes(terme) ||
      (el.asset_tag || '').toLowerCase().includes(terme) ||
      (el.model?.name || '').toLowerCase().includes(terme)

    const matchCat = !recherche.value.categorie ||
      el.category?.name === recherche.value.categorie

    const matchStatut = !recherche.value.statut ||
      el.status?.name === recherche.value.statut

    const matchFab = !recherche.value.fabricant ||
      el.manufacturer?.name === recherche.value.fabricant

    return matchNom && matchCat && matchStatut && matchFab
  })
})

const slugify = (str) => (str || '').toLowerCase().replace(/\s+/g, '-')

const reinitialiserFiltres = () => {
  recherche.value = { nom: '', categorie: '', statut: '', fabricant: '' }
}

onMounted(fetchElements)
</script>

<style scoped>
.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.filtre-input {
  padding: 0.6rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--bg);
  color: white;
  font-size: 0.9rem;
  flex: 1;
  min-width: 150px;
}
.elements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
.element-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 1.25rem;
  transition: background 0.2s;
}
.element-card:hover { background: rgba(255,255,255,0.07); }
.element-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.element-tag {
  font-weight: bold;
  color: var(--primary);
  font-size: 0.85rem;
}
.element-nom {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.75rem;
}
.element-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.82rem;
  opacity: 0.8;
}
.badge-statut {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: bold;
}
.statut-ready-to-deploy { background: rgba(34,197,94,0.2); color: #86efac; border: 1px solid #22c55e; }
.statut-pending { background: rgba(234,179,8,0.2); color: #fde047; border: 1px solid #ca8a04; }
.statut-archived { background: rgba(107,114,128,0.2); color: #9ca3af; border: 1px solid #6b7280; }
</style>