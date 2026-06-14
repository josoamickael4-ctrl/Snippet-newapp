<template>
  <div class="card" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="margin-bottom: 1.5rem;">Coût des tickets</h2>

    <div v-if="loading" style="text-align:center; padding:3rem; opacity:0.5;">
      <div class="spinner"></div>
      Chargement des données...
    </div>

    <div v-else>

      <!-- Tableau résumé par catégorie -->
      <div class="section">
        <h3>Total par catégorie</h3>
        <table class="cout-table">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Coût (Ar)</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ligne in resume" :key="ligne.categorie">
              <td>{{ ligne.categorie }}</td>
              <td>{{ formatNumber(ligne.total) }} Ar</td>
              <td>{{ pourcentage(ligne.total) }}%</td>
            </tr>
            <tr v-if="resume.length === 0">
              <td colspan="3" style="text-align:center; opacity:0.5;">Aucune donnée</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Général</strong></td>
              <td><strong>{{ formatNumber(totalGeneral) }} Ar</strong></td>
              <td><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tableau des tickets avec montant -->
      <div class="section">
        <h3>Tickets avec montant</h3>
        <table class="cout-table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Titre</th>
              <th>Status</th>
              <th>Montant (Ar)</th>
              <th>Nb assets</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ticket in ticketsAvecMontant" :key="ticket.id">
              <td>#{{ ticket.num_ticket }}</td>
              <td>{{ truncate(ticket.titre, 40) }}</td>
              <td>
                <span :class="['badge-statut', `statut-${(ticket.status||'').toLowerCase().replace(' ','-')}`]">
                  {{ ticket.status }}
                </span>
              </td>
              <td>{{ formatNumber(ticket.montant) }} Ar</td>
              <td>{{ getItemsList(ticket.items).length }}</td>
            </tr>
            <tr v-if="ticketsAvecMontant.length === 0">
              <td colspan="5" style="text-align:center; opacity:0.5;">Aucun ticket avec montant</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tableau détail par asset -->
      <div class="section">
        <h3>Détail par asset</h3>
        <table class="cout-table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Asset Tag</th>
              <th>Catégorie</th>
              <th>Coût (Ar)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ligne, i) in details" :key="i">
              <td>#{{ ligne.numTicket }}</td>
              <td><code>{{ ligne.tag }}</code></td>
              <td>{{ ligne.categorie }}</td>
              <td>{{ formatNumber(ligne.cout) }} Ar</td>
            </tr>
            <tr v-if="details.length === 0">
              <td colspan="4" style="text-align:center; opacity:0.5;">Aucune donnée</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tableau des réouvertures -->
      <div class="section">
        <h3>Historique des réouvertures</h3>
        <p style="font-size:0.8rem; opacity:0.6; margin-bottom:1rem;">
          Tickets qui ont été réouverts (montant final > montant initial)
        </p>
        <table class="cout-table">
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Titre</th>
              <th>Montant initial (Ar)</th>
              <th>Réouvertures</th>
              <th>Montant final (Ar)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reouvertures" :key="item.id">
              <td>#{{ item.num_ticket }}</td>
              <td>{{ truncate(item.titre, 35) }}</td>
              <td>{{ formatNumber(item.montantInitial) }} Ar</td>
              <td>
                <span class="reouverture-count">{{ item.nbReouvertures }}</span>
                </td>
              <td><strong>{{ formatNumber(item.montantFinal) }} Ar</strong></td>
             </tr>
            <tr v-if="reouvertures.length === 0">
              <td colspan="5" style="text-align:center; opacity:0.5;">Aucune réouverture enregistrée</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import '../../styles/cout.css'

const loading = ref(true)
const tickets = ref([])
const resume = ref([])
const details = ref([])
const reouvertures = ref([])

// Cache des catégories
const categorieCache = ref(new Map())

// Fonction pour formater les nombres
const formatNumber = (value) => {
  const num = Number(value) || 0
  return num.toLocaleString('fr-FR')
}

// Fonction pour tronquer le texte
const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

// Récupère la catégorie d'un asset
const getCategorieByTag = async (tag) => {
  if (categorieCache.value.has(tag)) {
    return categorieCache.value.get(tag)
  }

  try {
    const res = await axios.get(`http://localhost:3000/api/snipe-it/hardware`, {
      params: { search: tag, limit: 100 }
    })
    
    const rows = res.data?.rows || []
    const found = rows.find(a => a.asset_tag === tag)
    
    let categorie = 'Sans catégorie'
    if (found && found.category?.name) {
      categorie = found.category.name
    } else if (rows.length > 0 && rows[0].category?.name) {
      categorie = rows[0].category.name
    }
    
    categorieCache.value.set(tag, categorie)
    return categorie
    
  } catch (error) {
    console.error(`Erreur pour ${tag}:`, error)
    return 'Sans catégorie'
  }
}

// Extrait les tags des items
const getItemsList = (items) => {
  if (!items || items === '[]' || items === 'null') return []
  try {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items
    if (!Array.isArray(parsed)) return []
    return parsed.map(el => typeof el === 'string' ? el : (el.asset_tag || el.tag || null)).filter(Boolean)
  } catch {
    return []
  }
}

// Tickets avec montant > 0
const ticketsAvecMontant = computed(() => {
  return tickets.value.filter(t => t.montant && Number(t.montant) > 0)
})

// Pourcentage du total par catégorie
const totalGeneral = computed(() => {
  return resume.value.reduce((sum, item) => sum + item.total, 0)
})

const pourcentage = (value) => {
  if (totalGeneral.value === 0) return 0
  return ((value / totalGeneral.value) * 100).toFixed(1)
}

const chargerDonnees = async () => {
  loading.value = true
  categorieCache.value.clear()
  
  try {
    // Récupérer tous les tickets
    const res = await axios.get('http://localhost:3000/api/tickets')
    tickets.value = res.data

    const resumeMap = new Map()
    const lignesDetail = []
    const reouverturesMap = new Map()

    for (const ticket of tickets.value) {
      const montant = Number(ticket.montant) || 0
      if (montant <= 0) continue

      const tags = getItemsList(ticket.items)
      if (tags.length === 0) continue

      const coutParAsset = montant / tags.length

      // Pour chaque tag, récupérer la catégorie
      for (const tag of tags) {
        const categorie = await getCategorieByTag(tag)
        const currentTotal = resumeMap.get(categorie) || 0
        resumeMap.set(categorie, currentTotal + coutParAsset)

        lignesDetail.push({
          numTicket: ticket.num_ticket || ticket.id,
          tag,
          categorie,
          cout: coutParAsset,
        })
      }

      // Détecter les réouvertures
      if (ticket.resolution && (ticket.resolution.includes('réouvert') || ticket.resolution.includes('reouvert'))) {
        reouverturesMap.set(ticket.id, {
          id: ticket.id,
          num_ticket: ticket.num_ticket,
          titre: ticket.titre,
          montantInitial: montant,
          montantFinal: montant,
          nbReouvertures: 1
        })
      }
    }

    // Convertir les Maps en tableaux triés
    resume.value = Array.from(resumeMap.entries())
      .map(([categorie, total]) => ({ categorie, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)

    details.value = lignesDetail.map(d => ({ ...d, cout: Math.round(d.cout) }))
    reouvertures.value = Array.from(reouverturesMap.values())

  } catch (e) {
    console.error('Erreur chargement coûts:', e)
  } finally {
    loading.value = false
  }
}

onMounted(chargerDonnees)
</script>

<style scoped>

</style>