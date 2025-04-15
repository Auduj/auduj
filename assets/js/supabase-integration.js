/**
 * supabase-integration.js
 * Gère l'interaction entre le frontend Auduj et le backend Supabase.
 * - Initialisation du client Supabase
 * - Authentification (Inscription, Connexion, Déconnexion) + Redirections
 * - Gestion des données du tableau de bord (Sauvegarde, Lecture)
 * - Affichage du graphique de progression avec Chart.js
 * - Calcul et affichage des stats par héros et par map
 */

// --- Configuration ---
const SUPABASE_URL = 'https://mbkiwpsbprcqhyafyifl.supabase.co'; // Vos clés réelles
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2l3cHNicHJjcWh5YWZ5aWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDYzNDEsImV4cCI6MjA2MDI4MjM0MX0.d5QxMFrOcF91cz0zhrYuC2mFCzI8Juu54eDNF2GC7qE'; // Vos clés réelles

let _supabase; // Variable pour le client Supabase
let progressionChartInstance = null; // Pour stocker l'instance du graphique

// --- Initialisation et Vérification des Clés ---
// Vérification simple que les clés sont définies (CORRIGÉ)
if (!SUPABASE_URL || SUPABASE_URL === 'VOTRE_SUPABASE_URL' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'VOTRE_SUPABASE_ANON_KEY') {
    console.error("Erreur: Veuillez définir SUPABASE_URL et SUPABASE_ANON_KEY dans supabase-integration.js");
    // Pourrait afficher un message à l'utilisateur ici ou désactiver les fonctionnalités
} else {
    // Initialisation du client Supabase
    // Assurez-vous que le SDK Supabase est chargé avant ce script via CDN:
    // <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    if (typeof supabase !== 'undefined') {
        const { createClient } = supabase; // Accède à la fonction depuis le SDK global
        _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase Client Initialized');
    } else {
        console.error("Erreur: SDK Supabase non trouvé. Assurez-vous qu'il est inclus dans le HTML.");
    }
}

// --- Éléments du DOM (Commun) ---
// Note: Ces éléments doivent exister dans votre HTML pour que le script fonctionne
const userGreeting = document.getElementById('user-greeting');
const userInfo = document.getElementById('user-info'); // Conteneur pour greeting + logout button
const logoutButton = document.getElementById('logout-button');
const loginButtonHeader = document.getElementById('login-button-header');
// Éléments mobiles
const mobileLoginLink = document.getElementById('mobile-login-link');
const mobileLogoutButton = document.getElementById('mobile-logout-button');
const mobileUserGreeting = document.getElementById('mobile-user-greeting');

// --- Fonctions d'Authentification ---

async function handleSignUp(email, password, username) {
    const feedbackDiv = document.getElementById('form-feedback-signup');
    if(feedbackDiv) feedbackDiv.classList.add('hidden');

    if (!_supabase) {
        console.error("Supabase client non initialisé.");
        if(feedbackDiv) { feedbackDiv.textContent = "Erreur: Client Supabase non initialisé."; feedbackDiv.classList.remove('hidden'); }
        return;
    }

    try {
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { username: username } }
        });
        if (error) throw error;
        console.log('Inscription réussie:', data);
        alert('Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte (si activé).');
        window.location.href = 'login.html'; // Redirige vers la connexion après inscription

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error.message);
         if(feedbackDiv) {
             feedbackDiv.textContent = `Erreur: ${error.message}`;
             feedbackDiv.classList.remove('hidden');
             feedbackDiv.classList.add('text-red-500'); // Assurez-vous que le style d'erreur est appliqué
         } else {
             alert(`Erreur d'inscription: ${error.message}`);
         }
    }
}

async function handleLogin(email, password) {
    const feedbackDiv = document.getElementById('form-feedback-login');
    if(feedbackDiv) feedbackDiv.classList.add('hidden');

     if (!_supabase) {
        console.error("Supabase client non initialisé.");
        if(feedbackDiv) { feedbackDiv.textContent = "Erreur: Client Supabase non initialisé."; feedbackDiv.classList.remove('hidden'); }
        return;
    }

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        console.log('Connexion réussie:', data);
        window.location.href = 'dashboard.html'; // Redirige explicitement vers le dashboard après connexion réussie

    } catch (error) {
        console.error('Erreur lors de la connexion:', error.message);
        if(feedbackDiv) {
             feedbackDiv.textContent = `Erreur: ${error.message}`;
             feedbackDiv.classList.remove('hidden');
             feedbackDiv.classList.add('text-red-500');
         } else {
             alert(`Erreur de connexion: ${error.message}`);
         }
    }
}

async function handleLogout() {
     if (!_supabase) {
        console.error("Supabase client non initialisé.");
        return;
    }
    try {
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;
        console.log('Déconnexion réussie');
        window.location.href = 'index.html'; // Rediriger vers la page d'accueil après déconnexion
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error.message);
        alert(`Erreur de déconnexion: ${error.message}`);
    }
}

// --- Fonctions de Gestion des Données (Dashboard) ---

async function getUserProfileId() {
    if (!_supabase) return null;
    // Utilise la session actuelle gérée par Supabase JS
    const { data: { user } } = await _supabase.auth.getUser();
    return user?.id ?? null;
}

async function populateDropdowns() {
    const heroSelect = document.getElementById('hero');
    const mapSelect = document.getElementById('map');
    if (!heroSelect || !mapSelect || !_supabase) return;

    try {
        // Utilisation de Promise.all pour exécuter les requêtes en parallèle
        const [{ data: heroes, error: heroesError }, { data: maps, error: mapsError }] = await Promise.all([
            _supabase.from('heroes').select('id, name').order('name'),
            _supabase.from('maps').select('id, name').order('name')
        ]);

        if (heroesError) throw heroesError;
        if (mapsError) throw mapsError;

        // Vider les options existantes (sauf la première "Choisir...")
        heroSelect.length = 1;
        mapSelect.length = 1;

        // Ajouter les nouvelles options
        heroes.forEach(hero => heroSelect.add(new Option(hero.name, hero.id)));
        maps.forEach(map => mapSelect.add(new Option(map.name, map.id)));

    } catch (error) {
        console.error("Erreur lors du chargement des héros/maps:", error.message);
    }
}


/**
 * Enregistre une nouvelle partie dans la base de données.
 * @param {object} gameData Données du formulaire.
 */
async function saveGameEntry(gameData) {
    const userId = await getUserProfileId();
    const feedbackDiv = document.getElementById('entry-feedback');

    if (!userId) { alert("Erreur: Utilisateur non connecté."); return; }
    if (!_supabase) { alert("Erreur: Client Supabase non initialisé."); return; }

    // Reset feedback
    if (feedbackDiv) {
        feedbackDiv.classList.add('hidden');
        feedbackDiv.textContent = '';
        feedbackDiv.classList.remove('text-green-500', 'text-red-500', 'border', 'border-green-500', 'border-red-500', 'p-2', 'rounded-md', 'text-sm');
    }

    try {
        // Préparer les données à insérer, en convertissant en nombres et gérant les valeurs potentiellement vides/invalides
        const dataToInsert = {
            user_id: userId,
            hero_id: parseInt(gameData.hero, 10) || null,
            map_id: parseInt(gameData.map, 10) || null,
            kills: parseInt(gameData.kills, 10) || 0,
            deaths: parseInt(gameData.deaths, 10) || 0,
            assists: parseInt(gameData.assists, 10) || 0,
            damage_dealt: parseInt(gameData.damage_dealt, 10) || 0,       // Champ étendu
            healing_done: parseInt(gameData.healing_done, 10) || 0,       // Champ étendu
            damage_mitigated: parseInt(gameData.damage_mitigated, 10) || 0, // Champ étendu
            objective_score: parseInt(gameData.objective_score, 10) || 0,
            result: gameData.result || null, // Assurer null si vide
            notes: gameData.notes || null    // Assurer null si vide
        };

        console.log("Données à insérer:", dataToInsert); // Pour débogage

        // Vérifications avant insertion
        if (!dataToInsert.hero_id) throw new Error("Veuillez sélectionner un héros.");
        if (!dataToInsert.map_id) throw new Error("Veuillez sélectionner une map.");
        if (!dataToInsert.result) throw new Error("Veuillez sélectionner un résultat (Victoire/Défaite/Égalité).");


        // Insertion dans Supabase
        const { data, error } = await _supabase
            .from('games')
            .insert([dataToInsert]) // Doit être un tableau d'objets
            .select(); // Pour obtenir les données insérées en retour

        if (error) throw error; // Laisse Supabase gérer les erreurs DB (FK, etc.)


        console.log('Partie enregistrée:', data);
        if (feedbackDiv) {
            feedbackDiv.classList.remove('hidden');
            feedbackDiv.classList.add('text-green-500', 'border', 'border-green-500', 'p-2', 'rounded-md', 'text-sm');
            feedbackDiv.textContent = 'Partie enregistrée avec succès !';
        }

        // Vider seulement les champs de stats variables du formulaire
        const form = document.getElementById('game-entry-form');
        if(form) {
            form.kills.value = '';
            form.deaths.value = '';
            form.assists.value = '';
            form.damage_dealt.value = '';
            form.healing_done.value = '';
            form.damage_mitigated.value = '';
            form.objective_score.value = '';
            form.result.value = '';
            form.notes.value = '';
            // Optionnel: garder hero/map sélectionnés
            // form.hero.value = '';
            // form.map.value = '';
        }
        fetchAndDisplayUserStats(); // Rafraîchir les stats affichées

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la partie:', error.message);
        if (feedbackDiv) {
            feedbackDiv.classList.remove('hidden');
            feedbackDiv.classList.add('text-red-500', 'border', 'border-red-500', 'p-2', 'rounded-md', 'text-sm');
            // Afficher un message d'erreur plus convivial si possible
            feedbackDiv.textContent = `Erreur: ${error.message}`;
        }
    } finally {
        // Cacher le message après quelques secondes
        setTimeout(() => { if (feedbackDiv) feedbackDiv.classList.add('hidden'); }, 5000);
    }
}

// --- Fonction pour le Graphique ---

/**
 * Crée ou met à jour le graphique de progression du KDA.
 * @param {Array} gamesData - Tableau des parties récupérées depuis Supabase.
 */
function renderProgressionChart(gamesData) {
    const canvasElement = document.getElementById('progressionChart');
    if (!canvasElement) {
         console.log("Canvas 'progressionChart' non trouvé sur cette page.");
         return; // Ne rien faire si le canvas n'est pas là
    }
    // Vérifier si Chart.js est chargé
    if (typeof Chart === 'undefined') {
        console.error("Chart.js n'est pas chargé. Assurez-vous d'inclure le script dans le HTML.");
        return;
    }
    const ctx = canvasElement.getContext('2d');
    if (!ctx) {
        console.error("Impossible d'obtenir le contexte 2D du canvas.");
        return;
    }

    // Trier les parties par date (du plus ancien au plus récent) pour le graphique
    const sortedGames = [...gamesData].sort((a, b) => new Date(a.played_at) - new Date(b.played_at));

    // Préparer les données pour Chart.js
    const labels = sortedGames.map((_, index) => `Partie ${index + 1}`);
    const kdaData = sortedGames.map(game => {
        const kills = game.kills || 0;
        const assists = game.assists || 0;
        const deaths = Math.max(1, game.deaths || 1); // Évite division par zéro
        return parseFloat(((kills + assists) / deaths).toFixed(2)); // Assure que c'est un nombre
    });

    // Détruire l'ancien graphique s'il existe
    if (progressionChartInstance) {
        progressionChartInstance.destroy();
        progressionChartInstance = null; // Réinitialiser la variable
    }

    // Couleurs pour le thème sombre
    const gridColor = 'rgba(255, 255, 255, 0.1)';
    const labelColor = '#e2e8f0'; // light-text
    const pointColor = '#e62429'; // marvel-red
    const lineColor = 'rgba(229, 36, 41, 0.7)'; // marvel-red avec transparence

    // Créer le nouveau graphique
    try {
        progressionChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'KDA par Partie',
                    data: kdaData,
                    borderColor: lineColor,
                    backgroundColor: pointColor,
                    pointBackgroundColor: pointColor,
                    pointBorderColor: pointColor,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: pointColor,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: labelColor } },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff', bodyColor: '#fff',
                        borderColor: gridColor, borderWidth: 1
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { color: labelColor }, grid: { color: gridColor } },
                    x: { ticks: { color: labelColor }, grid: { color: gridColor } }
                }
            }
        });
    } catch (chartError) {
        console.error("Erreur lors de la création du graphique:", chartError);
    }
}

// --- Fonctions pour les Tableaux d'Analyse Détaillée ---

/**
 * Calcule et affiche les statistiques agrégées par héros.
 * @param {Array} gamesData - Tableau des parties récupérées depuis Supabase.
 */
function renderHeroStatsTable(gamesData) {
    const heroStats = {}; // { heroName: { played: 0, wins: 0, kills: 0, deaths: 0, assists: 0 }, ... }
    const tableBody = document.querySelector('[data-tab-content="par-heros"] tbody');
    if (!tableBody) return; // Ne rien faire si le tableau n'est pas là

    // 1. Agréger les données par héros
    gamesData.forEach(game => {
        const heroName = game.heroes?.name;
        if (!heroName) return;

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

    // 2. Préparer les données pour l'affichage
    const displayData = Object.entries(heroStats).map(([name, stats]) => {
        const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        const deathsForKda = Math.max(1, stats.deaths);
        const kda = ((stats.kills + stats.assists) / deathsForKda).toFixed(2);
        return { name, played: stats.played, winRate, kda };
    });

    displayData.sort((a, b) => b.played - a.played); // Trier par parties jouées

    // 3. Afficher dans le tableau HTML
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
    const tableBody = document.querySelector('[data-tab-content="par-map"] tbody');
     if (!tableBody) return; // Ne rien faire si le tableau n'est pas là

    // 1. Agréger les données par map
    gamesData.forEach(game => {
        const mapName = game.maps?.name;
        if (!mapName) return;

        if (!mapStats[mapName]) {
            mapStats[mapName] = { played: 0, wins: 0 };
        }

        mapStats[mapName].played++;
        if (game.result === 'win') {
            mapStats[mapName].wins++;
        }
    });

    // 2. Préparer les données pour l'affichage
    const displayData = Object.entries(mapStats).map(([name, stats]) => {
        const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        return { name, played: stats.played, winRate };
    });

    displayData.sort((a, b) => b.played - a.played); // Trier par parties jouées

    // 3. Afficher dans le tableau HTML
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
 * Récupère et affiche TOUTES les statistiques (globales, historique, graphique, détaillées).
 */
async function fetchAndDisplayUserStats() {
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
            .select(`*, heroes ( name ), maps ( name )`) // Jointures importantes
            .eq('user_id', userId)
            .order('played_at', { ascending: false }); // Trié récent d'abord pour l'historique

        if (error) throw error;
        console.log('Parties récupérées pour toutes les stats:', games);

        // --- Calculs et Affichage Stats Globales ---
        const totalGames = games.length;
        let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
        const heroCounts = {};
        games.forEach(game => {
            totalKills += game.kills || 0;
            totalDeaths += game.deaths || 0;
            totalAssists += game.assists || 0;
            if (game.result === 'win') wins++;
            if (game.heroes?.name) heroCounts[game.heroes.name] = (heroCounts[game.heroes.name] || 0) + 1;
        });
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        const kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toFixed(2);
        let mostPlayedHero = 'N/A';
        let maxHeroCount = 0;
        for (const hero in heroCounts) { if (heroCounts[hero] > maxHeroCount) { maxHeroCount = heroCounts[hero]; mostPlayedHero = hero; } }

        const kdaElement = document.getElementById('stat-kda');
        const winRateElement = document.getElementById('stat-winrate');
        const totalGamesElement = document.getElementById('stat-total-games');
        const mainHeroElement = document.getElementById('stat-main-hero');
        if (kdaElement) kdaElement.textContent = kda;
        if (winRateElement) { winRateElement.textContent = `${winRate}%`; winRateElement.className = 'stat-value'; if(totalGames > 0) winRateElement.classList.add(winRate >= 50 ? 'text-win' : 'text-loss'); }
        if (totalGamesElement) totalGamesElement.textContent = totalGames;
        if (mainHeroElement) mainHeroElement.textContent = mostPlayedHero;


        // --- Affichage Historique ---
        const historyTableBody = document.querySelector('#history-table tbody');
        if (historyTableBody) {
            historyTableBody.innerHTML = '';
            const gamesToShow = games.slice(0, 15);
            if (gamesToShow.length === 0) { historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">Aucune partie enregistrée.</td></tr>'; }
            else { gamesToShow.forEach(game => { /* ... génération des lignes ... */
                 const row = `<tr>...</tr>`; historyTableBody.innerHTML += row; });
            }
        }

        // --- Génération du Graphique ---
        if (games.length > 0) { renderProgressionChart(games); }
        else { /* ... effacer graphique ... */ }

        // --- Calcul et Affichage Stats Détaillées ---
        if (games.length > 0) {
            renderHeroStatsTable(games);
            renderMapStatsTable(games);
        } else {
            // Vider les tableaux si aucune partie
             const heroTableBody = document.querySelector('[data-tab-content="par-heros"] tbody');
             const mapTableBody = document.querySelector('[data-tab-content="par-map"] tbody');
             if(heroTableBody) heroTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-4">Aucune donnée disponible.</td></tr>';
             if(mapTableBody) mapTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 py-4">Aucune donnée disponible.</td></tr>';
        }

    } catch (error) {
        console.error("Erreur lors de la récupération/affichage complet des stats:", error.message);
    }
}


// --- Gestion de l'État d'Authentification et UI ---
async function updateUserUI(user) { /* ... inchangé ... */ }

// --- Initialisation et Écouteurs ---
async function checkAuthStateAndRedirect() { /* ... inchangé ... */ }
document.addEventListener('DOMContentLoaded', () => { /* ... inchangé ... */ });

