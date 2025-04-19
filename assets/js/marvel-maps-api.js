// marvel-maps-api.js
// Gère la récupération dynamique de la liste officielle des maps Marvel Rivals via l'API officielle

/**
 * Récupère la liste des maps Marvel Rivals depuis l'API officielle.
 * Renvoie un tableau d'objets { id, name, ... }
 * @returns {Promise<Array>} Tableau des maps
 */
export async function fetchMarvelMaps() {
    try {
        const response = await fetch('https://marvelrivalsapi.com/api/v2/maps/all-maps');
        if (!response.ok) throw new Error('Erreur HTTP ' + response.status);
        const data = await response.json();
        if (!data.maps || !Array.isArray(data.maps)) throw new Error('Format inattendu');
        return data.maps;
    } catch (e) {
        console.error('Erreur récupération maps Marvel Rivals:', e);
        return [];
    }
}
