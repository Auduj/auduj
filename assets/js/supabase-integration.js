/**
 * supabase-integration.js
 * Gère l'interaction entre le frontend Auduj et le backend Supabase.
 * - Initialisation, Authentification, Redirections
 * - Gestion des données du tableau de bord (Sauvegarde, Lecture)
 * - Affichage du graphique de progression
 * - Calcul et affichage des stats par héros et par map
 */

// --- Configuration ---
const SUPABASE_URL = 'https://mbkiwpsbprcqhyafyifl.supabase.co'; // Vos clés réelles
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2l3cHNicHJjcWh5YWZ5aWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDYzNDEsImV4cCI6MjA2MDI4MjM0MX0.d5QxMFrOcF91cz0zhrYuC2mFCzI8Juu54eDNF2GC7qE'; // Vos clés réelles

let _supabase;
let progressionChartInstance = null;

// --- Initialisation et Vérification des Clés ---
if (!SUPABASE_URL || SUPABASE_URL === 'VOTRE_SUPABASE_URL' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'VOTRE_SUPABASE_ANON_KEY') {
    console.error("Erreur: Veuillez définir SUPABASE_URL et SUPABASE_ANON_KEY dans supabase-integration.js");
} else {
    if (typeof supabase !== 'undefined') {
        const { createClient } = supabase;
        _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase Client Initialized');
    } else {
        console.error("Erreur: SDK Supabase non trouvé.");
    }
}

// --- Éléments du DOM (Commun - inchangés) ---
// ... userGreeting, userInfo, etc. ...

// --- Fonctions d'Authentification (inchangées) ---
// handleSignUp, handleLogin, handleLogout...

// --- Fonctions de Gestion des Données (Dashboard) ---

async function getUserProfileId() { /* ... inchangé ... */ }
async function populateDropdowns() { /* ... inchangé ... */ }
async function saveGameEntry(gameData) { /* ... inchangé ... */ }
function renderProgressionChart(gamesData) { /* ... inchangé ... */ }

// --- NOUVELLES FONCTIONS pour les Tableaux d'Analyse ---

/**
 * Calcule et affiche les statistiques agrégées par héros.
 * @param {Array} gamesData - Tableau des parties récupérées depuis Supabase.
 */
function renderHeroStatsTable(gamesData) {
    const heroStats = {}; // { heroName: { played: 0, wins: 0, kills: 0, deaths: 0, assists: 0 }, ... }

    // 1. Agréger les données par héros
    gamesData.forEach(game => {
        const heroName = game.heroes?.name;
        if (!heroName) return; // Ignorer si pas de nom de héros

        if (!heroStats[heroName]) {
            heroStats[heroName] = { played: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
        }

        heroStats[heroName].played++;
        if (game.result === 'win') {
            heroStats[heroName].wins++;
        }
        heroStats[heroName].kills += game.kills || 0;
        heroStats[heroName].deaths += game.deaths || 0;
        heroStats[heroName].assists += game.assists || 0;
    });

    // 2. Préparer les données pour l'affichage (calculer WR et KDA)
    const displayData = Object.entries(heroStats).map(([name, stats]) => {
        const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        const deathsForKda = Math.max(1, stats.deaths); // Évite division par zéro
        const kda = ((stats.kills + stats.assists) / deathsForKda).toFixed(2);
        return { name, played: stats.played, winRate, kda };
    });

    // Optionnel: Trier les données (par ex: par nombre de parties jouées)
    displayData.sort((a, b) => b.played - a.played);

    // 3. Afficher dans le tableau HTML
    const tableBody = document.querySelector('[data-tab-content="par-heros"] tbody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Vider le contenu précédent

    if (displayData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-4">Aucune donnée par héros disponible.</td></tr>';
    } else {
        displayData.forEach(hero => {
            const row = `
                <tr>
                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-light-text">${hero.name}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">${hero.played}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm ${hero.winRate >= 50 ? 'text-win' : 'text-loss'}">${hero.winRate}%</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">${hero.kda}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }
}

/**
 * Calcule et affiche les statistiques agrégées par map.
 * @param {Array} gamesData - Tableau des parties récupérées depuis Supabase.
 */
function renderMapStatsTable(gamesData) {
    const mapStats = {}; // { mapName: { played: 0, wins: 0 }, ... }

    // 1. Agréger les données par map
    gamesData.forEach(game => {
        const mapName = game.maps?.name;
        if (!mapName) return; // Ignorer si pas de nom de map

        if (!mapStats[mapName]) {
            mapStats[mapName] = { played: 0, wins: 0 };
        }

        mapStats[mapName].played++;
        if (game.result === 'win') {
            mapStats[mapName].wins++;
        }
    });

    // 2. Préparer les données pour l'affichage (calculer WR)
    const displayData = Object.entries(mapStats).map(([name, stats]) => {
        const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        return { name, played: stats.played, winRate };
    });

    // Optionnel: Trier les données
    displayData.sort((a, b) => b.played - a.played);

    // 3. Afficher dans le tableau HTML
    const tableBody = document.querySelector('[data-tab-content="par-map"] tbody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Vider le contenu précédent

    if (displayData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 py-4">Aucune donnée par map disponible.</td></tr>';
    } else {
        displayData.forEach(map => {
            const row = `
                <tr>
                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-light-text">${map.name}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300">${map.played}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm ${map.winRate >= 50 ? 'text-win' : 'text-loss'}">${map.winRate}%</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }
}


/**
 * Récupère et affiche les statistiques globales, l'historique, le graphique ET les analyses détaillées.
 */
async function fetchAndDisplayUserStats() { // <<--- FONCTION MISE À JOUR
    const userId = await getUserProfileId();
    if (!userId || !_supabase) return;

    const dashboardContent = document.getElementById('dashboard-content');
    if (!dashboardContent || dashboardContent.classList.contains('hidden')) {
         console.log("Dashboard non visible, stats non chargées.");
         return;
    }

    try {
        // Récupérer TOUTES les parties de l'utilisateur
        const { data: games, error } = await _supabase
            .from('games')
            .select(`*, heroes ( name ), maps ( name )`) // Jointures importantes ici
            .eq('user_id', userId)
            .order('played_at', { ascending: false }); // Trié récent d'abord pour l'historique

        if (error) throw error;
        console.log('Parties récupérées pour toutes les stats:', games);

        // --- Calculs et Affichage Stats Globales (inchangé) ---
        const totalGames = games.length;
        // ... (autres calculs KDA global, WR global, Héros principal) ...
        let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
        const heroCounts = {};
        games.forEach(game => { /* ... remplissage ... */ });
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        const kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toFixed(2);
        let mostPlayedHero = 'N/A'; /* ... etc ... */
        // ... (mise à jour des éléments #stat-kda, #stat-winrate, etc.) ...
         const kdaElement = document.getElementById('stat-kda'); /* ... etc ... */
         if (kdaElement) kdaElement.textContent = kda; /* ... etc ... */


        // --- Affichage Historique (inchangé) ---
        const historyTableBody = document.querySelector('#history-table tbody');
        if (historyTableBody) {
            // ... (logique pour remplir l'historique avec les 15 dernières parties) ...
             historyTableBody.innerHTML = ''; const gamesToShow = games.slice(0, 15); /* ... etc ... */
        }

        // --- Génération du Graphique (inchangé) ---
        if (games.length > 0) {
            renderProgressionChart(games);
        } else {
             // ... (logique pour effacer le graphique si pas de données) ...
             if (progressionChartInstance) { progressionChartInstance.destroy(); progressionChartInstance = null; }
        }

        // --- NOUVEAU : Calcul et Affichage Stats Détaillées ---
        if (games.length > 0) {
            renderHeroStatsTable(games); // Appelle la fonction pour le tableau par héros
            renderMapStatsTable(games);  // Appelle la fonction pour le tableau par map
        } else {
            // Optionnel: Vider les tableaux si aucune partie n'est enregistrée
             const heroTableBody = document.querySelector('[data-tab-content="par-heros"] tbody');
             const mapTableBody = document.querySelector('[data-tab-content="par-map"] tbody');
             if(heroTableBody) heroTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-4">Aucune donnée disponible.</td></tr>';
             if(mapTableBody) mapTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 py-4">Aucune donnée disponible.</td></tr>';
        }

    } catch (error) {
        console.error("Erreur lors de la récupération/affichage complet des stats:", error.message);
        // Afficher une erreur plus globale à l'utilisateur ?
    }
}


// --- Gestion de l'État d'Authentification et UI (inchangée) ---
async function updateUserUI(user) { /* ... inchangé ... */ }

// --- Initialisation et Écouteurs (inchangés) ---
async function checkAuthStateAndRedirect() { /* ... inchangé ... */ }
document.addEventListener('DOMContentLoaded', () => { /* ... inchangé ... */ });

