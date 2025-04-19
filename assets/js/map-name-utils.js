// map-name-utils.js
// Fournit une fonction utilitaire pour faire correspondre un ID de map à son nom officiel Marvel Rivals

// Ce module doit être alimenté par la liste dynamique des maps (API)
let MAP_ID_TO_NAME = {};

/**
 * Met à jour le mapping interne des ID de map vers leur nom.
 * @param {Array} mapsArray - Tableau [{id, name, ...}]
 */
export function setMapIdToNameMapping(mapsArray) {
    MAP_ID_TO_NAME = {};
    if (Array.isArray(mapsArray)) {
        for (const map of mapsArray) {
            MAP_ID_TO_NAME[map.id] = map.name;
        }
    }
}

/**
 * Retourne le nom officiel d'une map à partir de son ID, ou l'ID si inconnu.
 * @param {string|number} id
 * @returns {string}
 */
export function getMapNameById(id) {
    return MAP_ID_TO_NAME[id] || id || '--';
}
