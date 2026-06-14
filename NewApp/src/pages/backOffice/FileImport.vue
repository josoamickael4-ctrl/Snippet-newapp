<template>
  <div class="card" style="max-width: 850px; margin: 0 auto;">
    <h1>Importation de données</h1>

    <div class="deux-blocs">

      <!-- ══ BLOC 1 : Snipe-IT ══════════════════════════════════════════════ -->
      <div class="bloc">
        <div class="bloc-header bleu">
          <span> Assets → Snipe-IT</span>
          <span class="bloc-sous-titre">Feuille 1 — hardware.csv</span>
        </div>

        <!-- Zone dépôt Snipe-IT -->
        <div v-if="!previewAssets" class="drop-zone" @dragover.prevent @drop.prevent="e => lireFichier(e.dataTransfer.files[0], 'assets')" @click="inputAssets.click()">
          <p style="font-size:1.5rem;"></p>
          <p style="font-weight:bold; font-size:0.95rem;">Cliquez ou glissez le CSV assets</p>
          <p style="font-size:0.8rem; opacity:0.5;">Colonnes : asset_tag, model, category...</p>
          <input ref="inputAssets" type="file" accept=".csv" style="display:none" @change="e => lireFichier(e.target.files[0], 'assets')" />
        </div>

        <!-- Aperçu assets -->
        <div v-else>
          <div class="apercu-header">
            <span> {{ nomFichierAssets }} — <strong>{{ previewAssets.length }} lignes</strong></span>
            <button @click="annuler('assets')" class="btn-annuler">✕</button>
          </div>
          <div class="table-scroll">
            <table>
              <thead><tr><th v-for="col in colonnesAssets" :key="col">{{ col }}</th></tr></thead>
              <tbody>
                <tr v-for="(row, i) in previewAssets.slice(0, 5)" :key="i">
                  <td v-for="col in colonnesAssets" :key="col">{{ row[col] || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p style="text-align:center; opacity:0.4; font-size:0.8rem; padding:0.5rem;">
              Aperçu des 5 premières lignes sur {{ previewAssets.length }}
            </p>
          </div>
          <button @click="importerAssets" :disabled="loadingAssets" class="btn-importer btn-bleu">
            {{ loadingAssets ? ' Import en cours...' : ` Importer ${previewAssets.length} assets dans Snipe-IT` }}
          </button>
        </div>

        <!-- Message assets -->
        <div v-if="msgAssets" :class="['msg', msgAssetsOk ? 'msg-ok' : 'msg-err']">
          {{ msgAssets }}
          <div v-for="e in erreursAssets" :key="e.asset_tag" style="font-size:0.8rem; margin-top:0.25rem;">
            ⚠️ {{ e.asset_tag }} : {{ typeof e.erreur === 'object' ? JSON.stringify(e.erreur) : e.erreur }}
          </div>
        </div>
      </div>

      <!-- ══ BLOC 2 : SQLite Tickets ════════════════════════════════════════ -->
      <div class="bloc">
        <div class="bloc-header vert">
          <span> Tickets → SQLite</span>
          <span class="bloc-sous-titre">Feuille 2 — tickets.csv</span>
        </div>

        <!-- Zone dépôt tickets -->
        <div v-if="!previewTickets" class="drop-zone" @dragover.prevent @drop.prevent="e => lireFichier(e.dataTransfer.files[0], 'tickets')" @click="inputTickets.click()">
          <p style="font-size:1.5rem;"></p>
          <p style="font-weight:bold; font-size:0.95rem;">Cliquez ou glissez le CSV tickets</p>
          <p style="font-size:0.8rem; opacity:0.5;">Colonnes : Num_Ticket, Titre, Status...</p>
          <input ref="inputTickets" type="file" accept=".csv" style="display:none" @change="e => lireFichier(e.target.files[0], 'tickets')" />
        </div>

        <!-- Aperçu tickets -->
        <div v-else>
          <div class="apercu-header">
            <span> {{ nomFichierTickets }} — <strong>{{ previewTickets.length }} lignes</strong></span>
            <button @click="annuler('tickets')" class="btn-annuler">✕</button>
          </div>
          <div class="table-scroll">
            <table>
              <thead><tr><th v-for="col in colonnesTickets" :key="col">{{ col }}</th></tr></thead>
              <tbody>
                <tr v-for="(row, i) in previewTickets.slice(0, 5)" :key="i">
                  <td v-for="col in colonnesTickets" :key="col">{{ row[col] || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p style="text-align:center; opacity:0.4; font-size:0.8rem; padding:0.5rem;">
              Aperçu des 5 premières lignes sur {{ previewTickets.length }}
            </p>
          </div>
          <button @click="importerTickets" :disabled="loadingTickets" class="btn-importer btn-vert">
            {{ loadingTickets ? ' Import en cours...' : ` Importer ${previewTickets.length} tickets dans SQLite` }}
          </button>
        </div>

        <!-- Message tickets -->
        <div v-if="msgTickets" :class="['msg', msgTicketsOk ? 'msg-ok' : 'msg-err']">
          {{ msgTickets }}
          <div v-for="e in erreursTickets" :key="e.num" style="font-size:0.8rem; margin-top:0.25rem;">
             Ticket {{ e.num }} : {{ e.erreur }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import Papa from 'papaparse'
import '../../styles/import.css'

// ── Refs Assets ───────────────────────────────────────────────────────────────
const inputAssets = ref(null)
const nomFichierAssets = ref('')
const previewAssets = ref(null)
const loadingAssets = ref(false)
const msgAssets = ref('')
const msgAssetsOk = ref(true)
const erreursAssets = ref([])

// ── Refs Tickets ──────────────────────────────────────────────────────────────
const inputTickets = ref(null)
const nomFichierTickets = ref('')
const previewTickets = ref(null)
const loadingTickets = ref(false)
const msgTickets = ref('')
const msgTicketsOk = ref(true)
const erreursTickets = ref([])

// ── Colonnes dynamiques ───────────────────────────────────────────────────────
const colonnesAssets = computed(() =>
  previewAssets.value?.length ? Object.keys(previewAssets.value[0]) : []
)
const colonnesTickets = computed(() =>
  previewTickets.value?.length ? Object.keys(previewTickets.value[0]) : []
)

// ── Lecture CSV ───────────────────────────────────────────────────────────────
const lireFichier = (file, cible) => {
  if (!file || !file.name.endsWith('.csv')) {
    if (cible === 'assets') { msgAssets.value = ' Fichier .csv requis'; msgAssetsOk.value = false }
    else { msgTickets.value = ' Fichier .csv requis'; msgTicketsOk.value = false }
    return
  }
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (cible === 'assets') {
        nomFichierAssets.value = file.name
        previewAssets.value = results.data
        msgAssets.value = ''
      } else {
        nomFichierTickets.value = file.name
        previewTickets.value = results.data
        msgTickets.value = ''
      }
    }
  })
}

// ── Import Assets → Snipe-IT ──────────────────────────────────────────────────
const importerAssets = async () => {
  if (!confirm(`Importer ${previewAssets.value.length} assets dans Snipe-IT ?`)) return
  loadingAssets.value = true
  msgAssets.value = ''
  erreursAssets.value = []
  try {
    const res = await axios.post('http://localhost:3000/api/import/assets', { rows: previewAssets.value })
    msgAssets.value = res.data.message
    msgAssetsOk.value = res.data.status === 'success'
    erreursAssets.value = res.data.errors || []
    if (res.data.status === 'success') { previewAssets.value = null; nomFichierAssets.value = '' }
  } catch (err) {
    msgAssets.value = ` Erreur : ${err.message}`
    msgAssetsOk.value = false
  } finally { loadingAssets.value = false }
}

// ── Import Tickets → SQLite ───────────────────────────────────────────────────
const importerTickets = async () => {
  if (!confirm(`Importer ${previewTickets.value.length} tickets dans SQLite ?`)) return
  loadingTickets.value = true
  msgTickets.value = ''
  erreursTickets.value = []
  try {
    const res = await axios.post('http://localhost:3000/api/import/tickets', { rows: previewTickets.value }) //
    msgTickets.value = res.data.message
    msgTicketsOk.value = res.data.status === 'success'
    erreursTickets.value = res.data.errors || []
    if (res.data.status === 'success') { previewTickets.value = null; nomFichierTickets.value = '' }
  } catch (err) {
    msgTickets.value = ` Erreur : ${err.message}`
    msgTicketsOk.value = false
  } finally { loadingTickets.value = false }
}

// ── Annuler ───────────────────────────────────────────────────────────────────
const annuler = (cible) => {
  if (cible === 'assets') { previewAssets.value = null; nomFichierAssets.value = ''; msgAssets.value = '' }
  else { previewTickets.value = null; nomFichierTickets.value = ''; msgTickets.value = '' }
}
</script>

<style scoped>

</style>