import express from 'express';
import axios from 'axios';
import { SNIPE_URL, snipeHeaders } from '../config.js';

const router = express.Router();

/**
 * Récupère ou crée un status label par nom et type.
 */
async function getOrCreateStatusLabel(name, type, statusLabels) {
  // Cherche d'abord par nom exact (insensible casse)
  const existing = statusLabels.find(l => l.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;

  // Crée le label s'il n'existe pas
  try {
    const res = await axios.post(
      `${SNIPE_URL}/api/v1/statuslabels`,
      { name, type },
      { headers: snipeHeaders }
    );
    const newLabel = res.data?.payload;
    if (newLabel?.id) {
      console.log(`      → Label "${name}" (${type}) créé (id: ${newLabel.id})`);
      statusLabels.push(newLabel); // mise à jour locale
      return newLabel.id;
    }
  } catch (e) {
    console.error(`      → Impossible de créer le label "${name}":`, e.message);
  }
  return null;
}

/**
 * Résolution du status_id selon la logique Snipe-IT :
 *
 * CSV "Deployed"        → label "Ready to Deploy" (deployable) + checkout → méta-status "Deployed" auto
 * CSV "Ready To Deploy" → label "Ready to Deploy" (deployable), PAS de checkout
 * CSV "Pending"         → label "Pending" (pending)
 * CSV "Archived"        → label "Archived" (archived)
 * CSV "Undeployable"    → label "Undeployable" (undeployable)
 *
 * IMPORTANT : "Deployed" n'est PAS un vrai label Snipe-IT.
 * C'est un méta-status automatique déclenché uniquement par un checkout.
 * Les deux cas "Deployed" et "Ready To Deploy" utilisent un label deployable,
 * mais seul "Deployed" fait un checkout ensuite.
 */
async function resolveStatusId(statusNom, statusLabels) {
  const nom = (statusNom || '').toLowerCase().trim();

  if (nom === 'deployed') {
    // Label nommé "Deployed" (type deployable) + checkout ensuite → méta-status "Deployed" auto
    return await getOrCreateStatusLabel('Deployed', 'deployable', statusLabels);
  }

  if (nom === 'ready to deploy' || nom === 'ready for deploy') {
    // Label nommé "Ready to Deploy" (type deployable), PAS de checkout
    return await getOrCreateStatusLabel('Ready to Deploy', 'deployable', statusLabels);
  }

  if (nom === 'pending') {
    return await getOrCreateStatusLabel('Pending', 'pending', statusLabels);
  }

  if (nom === 'archived') {
    return await getOrCreateStatusLabel('Archived', 'archived', statusLabels);
  }

  if (nom === 'undeployable') {
    return await getOrCreateStatusLabel('Undeployable', 'undeployable', statusLabels);
  }

  // Correspondance directe par nom exact pour tout autre cas
  const exact = statusLabels.find(l => l.name.toLowerCase() === nom);
  if (exact) return exact.id;

  // Fallback
  if (statusLabels.length > 0) return statusLabels[0].id;
  return null;
}

router.post('/', async (req, res) => {
  const { rows } = req.body;
  const resultats = { success: 0, errors: [] };

  // Charger tous les status labels une seule fois
  let statusLabels = [];
  try {
    const statusRes = await axios.get(`${SNIPE_URL}/api/v1/statuslabels`, { headers: snipeHeaders });
    statusLabels = statusRes.data?.rows || [];
    console.log(` ${statusLabels.length} status labels chargés :`);
    statusLabels.forEach(l => console.log(`   - "${l.name}" (type: ${l.type}, id: ${l.id})`));
  } catch (e) {
    console.error(' Impossible de charger les status labels:', e.message);
  }

  for (const row of rows) {
    console.log(`\n────────────────────────────────────`);
    console.log(`▶ Traitement asset : ${row.asset_tag} — ${row.name}`);

    try {
      // ── Étape 1 : Catégorie ──────────────────────────────────────
      console.log(`  [1/9] Catégorie : "${row.category}"`);
      const catRes = await axios.get(
        `${SNIPE_URL}/api/v1/categories?search=${encodeURIComponent(row.category)}&limit=1`,
        { headers: snipeHeaders }
      );
      let categoryId = catRes.data?.rows?.[0]?.id;
      if (!categoryId) {
        const newCat = await axios.post(
          `${SNIPE_URL}/api/v1/categories`,
          { name: row.category, category_type: 'asset' },
          { headers: snipeHeaders }
        );
        categoryId = newCat.data?.payload?.id;
        console.log(`      → Créée (id: ${categoryId})`);
      } else {
        console.log(`      → Existante (id: ${categoryId})`);
      }

      // ── Étape 2 : Fabricant ──────────────────────────────────────
      console.log(`  [2/9] Fabricant : "${row.manufacturer}"`);
      const mfrRes = await axios.get(
        `${SNIPE_URL}/api/v1/manufacturers?search=${encodeURIComponent(row.manufacturer)}&limit=1`,
        { headers: snipeHeaders }
      );
      let manufacturerId = mfrRes.data?.rows?.[0]?.id;
      if (!manufacturerId) {
        const newMfr = await axios.post(
          `${SNIPE_URL}/api/v1/manufacturers`,
          { name: row.manufacturer },
          { headers: snipeHeaders }
        );
        manufacturerId = newMfr.data?.payload?.id;
        console.log(`      → Créé (id: ${manufacturerId})`);
      } else {
        console.log(`      → Existant (id: ${manufacturerId})`);
      }

      // ── Étape 3 : Modèle ─────────────────────────────────────────
      console.log(`  [3/9] Modèle : "${row.model}"`);
      const mdlRes = await axios.get(
        `${SNIPE_URL}/api/v1/models?search=${encodeURIComponent(row.model)}&limit=1`,
        { headers: snipeHeaders }
      );
      let modelId = mdlRes.data?.rows?.[0]?.id;
      if (!modelId) {
        const newMdl = await axios.post(
          `${SNIPE_URL}/api/v1/models`,
          { name: row.model, category_id: categoryId, manufacturer_id: manufacturerId },
          { headers: snipeHeaders }
        );
        modelId = newMdl.data?.payload?.id;
        console.log(`      → Créé (id: ${modelId})`);
      } else {
        console.log(`      → Existant (id: ${modelId})`);
      }

      // ── Étape 4 : Status ─────────────────────────────────────────
      const statusNom = (row.status || '').toLowerCase().trim();
      console.log(`  [4/9] Status CSV : "${row.status}"`);

      const statusId = await resolveStatusId(row.status, statusLabels);
      const statusLabel = statusLabels.find(l => l.id === statusId);
      console.log(`      → status_id: ${statusId} (label: "${statusLabel?.name}", type: "${statusLabel?.type}")`);

      // ── Étape 5 : Company ────────────────────────────────────────
      console.log(`  [5/9] Company : "${row.company}"`);
      let companyId = null;
      if (row.company) {
        const compRes = await axios.get(
          `${SNIPE_URL}/api/v1/companies?search=${encodeURIComponent(row.company)}&limit=1`,
          { headers: snipeHeaders }
        );
        companyId = compRes.data?.rows?.[0]?.id;
        if (!companyId) {
          const newComp = await axios.post(
            `${SNIPE_URL}/api/v1/companies`,
            { name: row.company },
            { headers: snipeHeaders }
          );
          companyId = newComp.data?.payload?.id;
          console.log(`      → Créée (id: ${companyId})`);
        } else {
          console.log(`      → Existante (id: ${companyId})`);
        }
      }

      // ── Étape 6 : Department ─────────────────────────────────────
      console.log(`  [6/9] Department : "${row.department}"`);
      let departmentId = null;
      if (row.department) {
        const deptRes = await axios.get(
          `${SNIPE_URL}/api/v1/departments?search=${encodeURIComponent(row.department)}&limit=1`,
          { headers: snipeHeaders }
        );
        departmentId = deptRes.data?.rows?.[0]?.id;
        if (!departmentId) {
          const newDept = await axios.post(
            `${SNIPE_URL}/api/v1/departments`,
            { name: row.department, company_id: companyId },
            { headers: snipeHeaders }
          );
          departmentId = newDept.data?.payload?.id;
          console.log(`      → Créé (id: ${departmentId})`);
        } else {
          console.log(`      → Existant (id: ${departmentId})`);
        }
      }

      // ── Étape 7 : Utilisateur ────────────────────────────────────
      console.log(`  [7/9] User : "${row.user}" <${row.email}>`);
      let assignedUserId = null;
      if (row.user && row.email) {
        const userRes = await axios.get(
          `${SNIPE_URL}/api/v1/users?search=${encodeURIComponent(row.email)}&limit=1`,
          { headers: snipeHeaders }
        );
        assignedUserId = userRes.data?.rows?.[0]?.id;
        if (!assignedUserId) {
          const nameParts = row.user.trim().split(' ');
          const newUser = await axios.post(
            `${SNIPE_URL}/api/v1/users`,
            {
              first_name: nameParts[0],
              last_name: nameParts.slice(1).join(' ') || '.',
              username: row.email.split('@')[0],
              email: row.email,
              password: 'ChangeMe123!',
              password_confirmation: 'ChangeMe123!',
              activated: true,
              company_id: companyId,
              department_id: departmentId,
            },
            { headers: snipeHeaders }
          );
          assignedUserId = newUser.data?.payload?.id;
          console.log(`      → Créé (id: ${assignedUserId})`);
        } else {
          console.log(`      → Existant (id: ${assignedUserId})`);
        }
      }

      // ── Étape 8 : Créer l'asset ──────────────────────────────────
      console.log(`  [8/9] Création asset dans Snipe-IT...`);
      const assetRes = await axios.post(
        `${SNIPE_URL}/api/v1/hardware`,
        {
          asset_tag: row.asset_tag,
          serial: row.serial,
          name: row.name,
          model_id: modelId,
          status_id: statusId,
          company_id: companyId,
          purchase_date: row.purchase_date
            ? row.purchase_date.split('/').reverse().join('-')
            : null,
          purchase_cost: row.purchase_cost || null,
        },
        { headers: snipeHeaders }
      );

      if (assetRes.data?.status === 'error') {
        throw new Error(JSON.stringify(assetRes.data?.messages));
      }
      const assetId = assetRes.data?.payload?.id;
      console.log(`      → Asset créé (id: ${assetId})`);

      // ── Étape 9 : Checkout si "Deployed" ────────────────────────
      // "Deployed" CSV = asset deployable assigné à un user.
      // Le checkout déclenche automatiquement le méta-status "Deployed" dans Snipe-IT.
      // "Ready To Deploy" CSV = asset deployable NON assigné → pas de checkout.
      if (statusNom === 'deployed' && assignedUserId && assetId) {
        console.log(`  [9/9] Checkout → user ${assignedUserId} (déclenchement méta-status "Deployed")...`);
        try {
          await axios.post(
            `${SNIPE_URL}/api/v1/hardware/${assetId}/checkout`,
            {
              checkout_to_type: 'user',
              assigned_user: assignedUserId,
            },
            { headers: snipeHeaders }
          );
          console.log(`      → Checkout OK  → Snipe-IT affiche maintenant "Deployed"`);
        } catch (e) {
          console.error(`      → Checkout ÉCHOUÉ : ${e.message}`);
        }
      } else if (statusNom === 'deployed' && !assignedUserId) {
        console.log(`  [9/9] "Deployed" dans le CSV mais aucun user → asset créé sans checkout`);
      } else {
        console.log(`  [9/9] Pas de checkout (statut: "${row.status}")`);
      }

      console.log(`    ${row.asset_tag} importé avec succès`);
      resultats.success++;

    } catch (err) {
      console.error(`    ERREUR sur ${row.asset_tag} :`, err.response?.data?.messages || err.message);
      resultats.errors.push({
        asset_tag: row.asset_tag,
        erreur: err.response?.data?.messages || err.message,
      });
    }
  }

  console.log(`\n════════════════════════════════════`);
  console.log(`RÉSULTAT : ${resultats.success}/${rows.length} assets importés`);
  if (resultats.errors.length > 0) console.log(`ERREURS :`, resultats.errors);
  console.log(`════════════════════════════════════\n`);

  res.json({
    status: resultats.errors.length === 0 ? 'success' : 'partiel',
    message: `${resultats.success}/${rows.length} assets importés dans Snipe-IT`,
    errors: resultats.errors,
  });
});

export default router;