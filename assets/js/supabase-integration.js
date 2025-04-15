/**
 * supabase-integration.js
 * Gère l'interaction entre le frontend Auduj et le backend Supabase.
 * - Initialisation du client Supabase
 * - Authentification (Inscription, Connexion, Déconnexion) + Redirections
 * - Gestion des données du tableau de bord (Sauvegarde, Lecture)
 * - Affichage des graphiques de progression (KDA, Précision)
 * - Calcul et affichage des stats étendues par héros et par map
 */

// --- Configuration ---
// REMPLACEZ par vos propres URL et Clé Anon Supabase !
const SUPABASE_URL = 'https://mbkiwpsbprcqhyafyifl.supabase.co'; // Vos clés réelles
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2l3cHNicHJjcWh5YWZ5aWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDYzNDEsImV4cCI6MjA2MDI4MjM0MX0.d5QxMFrOcF91cz0zhrYuC2mFCzI8Juu54eDNF2GC7qE'; // Vos clés réelles

let _supabase; // Variable pour le client Supabase
let progressionChartInstance = null; // Instance pour le graphique KDA
let accuracyChartInstance = null;    // Instance pour le graphique Précision

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

/**
 * Gère l'inscription d'un nouvel utilisateur.
 * @param {string} email
 * @param {string} password
 * @param {string} username
 */
async function handleSignUp(email, password, username) {
    const feedbackDiv = document.getElementById('form-feedback-signup');
    if(feedbackDiv) feedbackDiv.classList.add('hidden'); // Cacher ancien message

    if (!_supabase) {
        console.error("Supabase client non initialisé.");
        if(feedbackDiv) { feedbackDiv.textContent = "Erreur: Client Supabase non initialisé."; feedbackDiv.classList.remove('hidden'); }
        return;
    }

    try {
        // Appel à Supabase pour l'inscription
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                // Passer le nom d'utilisateur dans les métadonnées pour le trigger SQL
                data: {
                    username: username
                }
            }
        });
        if (error) throw error; // Lève une exception si Supabase renvoie une erreur
        console.log('Inscription réussie:', data);
        alert('Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte (si l\'option est activée dans Supabase).');
        window.location.href = 'login.html'; // Redirige vers la page de connexion après inscription

    } catch (error) {
        // Gérer les erreurs (doublon d'email, mot de passe faible, etc.)
        console.error('Erreur lors de l\'inscription:', error.message);
         if(feedbackDiv) {
             feedbackDiv.textContent = `Erreur: ${error.message}`; // Afficher l'erreur à l'utilisateur
             feedbackDiv.classList.remove('hidden');
             feedbackDiv.classList.add('text-red-500'); // Appliquer style d'erreur
         } else {
             alert(`Erreur d'inscription: ${error.message}`); // Fallback si div non trouvé
         }
    }
}

/**
 * Gère la connexion d'un utilisateur existant.
 * @param {string} email
 * @param {string} password
 */
async function handleLogin(email, password) {
    const feedbackDiv = document.getElementById('form-feedback-login');
    if(feedbackDiv) feedbackDiv.classList.add('hidden');

     if (!_supabase) {
        console.error("Supabase client non initialisé.");
        if(feedbackDiv) { feedbackDiv.textContent = "Erreur: Client Supabase non initialisé."; feedbackDiv.classList.remove('hidden'); }
        return;
    }

    try {
        // Appel à Supabase pour la connexion
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error; // Lève une exception si erreur (ex: mauvais mdp)
        console.log('Connexion réussie:', data);
        window.location.href = 'dashboard.html'; // Redirige vers le tableau de bord

    } catch (error) {
        // Gérer les erreurs (identifiants invalides, etc.)
        console.error('Erreur lors de la connexion:', error.message);
        if(feedbackDiv) {
             feedbackDiv.textContent = `Erreur: ${error.message}`; // Afficher l'erreur
             feedbackDiv.classList.remove('hidden');
             feedbackDiv.classList.add('text-red-500');
         } else {
             alert(`Erreur de connexion: ${error.message}`);
         }
    }
}

/**
 * Gère la déconnexion de l'utilisateur.
 */
async function handleLogout() {
     if (!_supabase) {
        console.error("Supabase client non initialisé.");
        return;
    }
    try {
        // Appel à Supabase pour la déconnexion
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;
        console.log('Déconnexion réussie');
        window.location.href = 'index.html'; // Rediriger vers la page d'accueil
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error.message);
        alert(`Erreur de déconnexion: ${error.message}`);
    }
}

// --- Fonctions de Gestion des Données (Dashboard) ---

/**
 * Récupère l'ID de l'utilisateur Supabase actuellement connecté.
 * @returns {Promise<string|null>} L'UUID de l'utilisateur ou null.
 */
async function getUserProfileId() {
    if (!_supabase) return null;
    // Utilise la méthode recommandée pour obtenir l'utilisateur actuel
    const { data: { user } } = await _supabase.auth.getUser();
    return user?.id ?? null; // Renvoie l'ID ou null si personne n'est connecté
}

/**
 * Remplit les menus déroulants des héros et des maps depuis la base de données.
 */
async function populateDropdowns() {
    const heroSelect = document.getElementById('hero');
    const mapSelect = document.getElementById('map');
    // Ne rien faire si les éléments n'existent pas ou si Supabase n'est pas prêt
    if (!heroSelect || !mapSelect || !_supabase) return;

    try {
        // Récupérer les héros et les maps en parallèle pour plus d'efficacité
        const [{ data: heroes, error: heroesError }, { data: maps, error: mapsError }] = await Promise.all([
            _supabase.from('heroes').select('id, name').order('name'), // Tri par nom
            _supabase.from('maps').select('id, name').order('name')   // Tri par nom
        ]);

        // Gérer les erreurs potentielles de requête
        if (heroesError) throw heroesError;
        if (mapsError) throw mapsError;

        // Vider les options existantes (sauf la première "Choisir..." ou "Chargement...")
        heroSelect.length = 1;
        mapSelect.length = 1;
        // Mettre à jour le texte par défaut si nécessaire
        heroSelect.options[0].text = "Choisir Héros...";
        mapSelect.options[0].text = "Choisir Map...";


        // Ajouter les nouvelles options récupérées
        heroes.forEach(hero => heroSelect.add(new Option(hero.name, hero.id)));
        maps.forEach(map => mapSelect.add(new Option(map.name, map.id)));

    } catch (error) {
        console.error("Erreur lors du chargement des héros/maps:", error.message);
        // Afficher une erreur dans les selects ?
        heroSelect.options[0].text = "Erreur chargement";
        mapSelect.options[0].text = "Erreur chargement";
    }
}


/**
 * Enregistre une nouvelle partie dans la base de données Supabase.
 * @param {object} gameData - Données brutes du formulaire.
 */
async function saveGameEntry(gameData) {
    const userId = await getUserProfileId();
    const feedbackDiv = document.getElementById('entry-feedback');

    // Vérifications initiales
    if (!userId) { alert("Erreur: Utilisateur non connecté."); return; }
    if (!_supabase) { alert("Erreur: Client Supabase non initialisé."); return; }

    // Réinitialiser le message de feedback
    if (feedbackDiv) {
        feedbackDiv.classList.add('hidden');
        feedbackDiv.textContent = '';
        feedbackDiv.classList.remove('text-green-500', 'text-red-500', 'border', 'border-green-500', 'border-red-500', 'p-2', 'rounded-md', 'text-sm');
    }

    try {
        // Préparer l'objet à insérer avec la structure de stats finale
        const dataToInsert = {
            user_id: userId,
            hero_id: parseInt(gameData.hero, 10) || null,
            map_id: parseInt(gameData.map, 10) || null,
            // Stats principales
            kills: parseInt(gameData.kills, 10) || 0,
            deaths: parseInt(gameData.deaths, 10) || 0,
            assists: parseInt(gameData.assists, 10) || 0,
            // Stats spécifiques ajoutées
            solo_kills: parseInt(gameData.solo_kills, 10) || 0,
            head_kills: parseInt(gameData.head_kills, 10) || 0,
            last_kills: parseInt(gameData.last_kills, 10) || 0,
            accuracy: parseFloat(gameData.accuracy) || 0.00,
            damage_dealt: parseInt(gameData.damage_dealt, 10) || 0, // Ré-ajouté
            // Autres stats conservées
            damage_blocked: parseInt(gameData.damage_blocked, 10) || 0,
            healing_done: parseInt(gameData.healing_done, 10) || 0,
            // Champs standard
            result: gameData.result || null,
            notes: gameData.notes || null
            // objective_score est supprimé de l'objet
        };

        console.log("Données à insérer (final):", dataToInsert);

        // Vérifications de base avant l'envoi
        if (!dataToInsert.hero_id) throw new Error("Veuillez sélectionner un héros.");
        if (!dataToInsert.map_id) throw new Error("Veuillez sélectionner une map.");
        if (!dataToInsert.result) throw new Error("Veuillez sélectionner un résultat.");
        if (dataToInsert.accuracy < 0 || dataToInsert.accuracy > 100) {
            throw new Error("La précision doit être entre 0 et 100.");
        }

        // Envoyer les données à Supabase
        const { data, error } = await _supabase
            .from('games')
            .insert([dataToInsert]) // L'API insert attend un tableau d'objets
            .select(); // Optionnel: récupérer la ligne insérée

        if (error) throw error; // Lève une exception en cas d'erreur Supabase

        // Succès de l'insertion
        console.log('Partie enregistrée:', data);
        if (feedbackDiv) {
             feedbackDiv.classList.remove('hidden');
             feedbackDiv.classList.add('text-green-500', 'border', 'border-green-500', 'p-2', 'rounded-md', 'text-sm');
             feedbackDiv.textContent = 'Partie enregistrée avec succès !';
        }

        // Vider les champs de formulaire
        const form = document.getElementById('game-entry-form');
        if(form) {
            form.kills.value = '';
            form.deaths.value = '';
            form.assists.value = '';
            form.solo_kills.value = '';
            form.head_kills.value = '';
            form.last_kills.value = '';
            form.accuracy.value = '';
            form.damage_dealt.value = '';
            form.damage_blocked.value = '';
            form.healing_done.value = '';
            form.result.value = '';
            form.notes.value = '';
        }
        // Mettre à jour immédiatement les statistiques affichées
        fetchAndDisplayUserStats();

    } catch (error) {
        // Gérer les erreurs (validation, Supabase, etc.)
        console.error('Erreur lors de l\'enregistrement de la partie:', error.message);
        if (feedbackDiv) {
            feedbackDiv.classList.remove('hidden');
            feedbackDiv.classList.add('text-red-500', 'border', 'border-red-500', 'p-2', 'rounded-md', 'text-sm');
            feedbackDiv.textContent = `Erreur: ${error.message}`;
         }
    } finally {
        // Cacher le message de feedback après un délai
        setTimeout(() => { if (feedbackDiv) feedbackDiv.classList.add('hidden'); }, 5000);
    }
}

// --- Fonction pour le Graphique ---

/**
 * Crée ou met à jour le graphique de progression du KDA avec Chart.js.
 * @param {Array} gamesData - Tableau des parties (trié du plus ancien au plus récent).
 */
function renderProgressionChart(gamesData) {
    const canvasElement = document.getElementById('progressionChart');
    if (!canvasElement) { console.log("Canvas 'progressionChart' non trouvé."); return; }
    if (typeof Chart === 'undefined') { console.error("Chart.js non chargé."); return; }
    const ctx = canvasElement.getContext('2d');
    if (!ctx) { console.error("Impossible d'obtenir le contexte 2D du canvas KDA."); return; }

    const labels = gamesData.map((_, index) => `Partie ${index + 1}`);
    const kdaData = gamesData.map(game => {
        const kills = game.kills || 0; const assists = game.assists || 0;
        const deaths = Math.max(1, game.deaths || 1);
        return parseFloat(((kills + assists) / deaths).toFixed(2));
    });

    if (progressionChartInstance) { progressionChartInstance.destroy(); progressionChartInstance = null; }

    const gridColor = 'rgba(255, 255, 255, 0.1)'; const labelColor = '#e2e8f0';
    const pointColor = '#e62429'; const lineColor = 'rgba(229, 36, 41, 0.7)';

    try {
        progressionChartInstance = new Chart(ctx, {
            type: 'line', data: { labels: labels, datasets: [{ label: 'KDA par Partie', data: kdaData, borderColor: lineColor, backgroundColor: pointColor, pointBackgroundColor: pointColor, pointBorderColor: pointColor, pointHoverBackgroundColor: '#fff', pointHoverBorderColor: pointColor, tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: labelColor } }, tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: gridColor, borderWidth: 1 } }, scales: { y: { beginAtZero: true, ticks: { color: labelColor }, grid: { color: gridColor } }, x: { ticks: { color: labelColor }, grid: { color: gridColor } } } }
        });
    } catch (chartError) { console.error("Erreur création graphique KDA:", chartError); }
}

/**
 * NOUVEAU: Crée ou met à jour le graphique de progression de la Précision.
 * @param {Array} gamesData - Tableau des parties (trié du plus ancien au plus récent).
 */
function renderAccuracyChart(gamesData) {
    const canvasElement = document.getElementById('accuracyChart'); // Nouvel ID
    if (!canvasElement) { console.log("Canvas 'accuracyChart' non trouvé."); return; }
    if (typeof Chart === 'undefined') { console.error("Chart.js non chargé."); return; }
    const ctx = canvasElement.getContext('2d');
    if (!ctx) { console.error("Impossible d'obtenir le contexte 2D du canvas Précision."); return; }

    const labels = gamesData.map((_, index) => `Partie ${index + 1}`);
    // Récupérer les données de précision, s'assurer que c'est un nombre
    const accuracyData = gamesData.map(game => parseFloat(game.accuracy) || 0);

    if (accuracyChartInstance) { accuracyChartInstance.destroy(); accuracyChartInstance = null; }

    const gridColor = 'rgba(255, 255, 255, 0.1)'; const labelColor = '#e2e8f0';
    const pointColor = '#007bff'; // marvel-blue
    const lineColor = 'rgba(0, 123, 255, 0.7)'; // marvel-blue avec transparence

    try {
        accuracyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Précision (%) par Partie',
                    data: accuracyData,
                    borderColor: lineColor, backgroundColor: pointColor,
                    pointBackgroundColor: pointColor, pointBorderColor: pointColor,
                    pointHoverBackgroundColor: '#fff', pointHoverBorderColor: pointColor,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, labels: { color: labelColor } }, tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: gridColor, borderWidth: 1, callbacks: { label: function(context) { return `${context.dataset.label}: ${context.parsed.y}%`; } } } }, // Ajout % au tooltip
                scales: { y: { beginAtZero: true, max: 100, ticks: { color: labelColor, callback: function(value) { return value + '%'; } }, grid: { color: gridColor } }, x: { ticks: { color: labelColor }, grid: { color: gridColor } } } // Axe Y de 0 à 100%
            }
        });
    } catch (chartError) { console.error("Erreur création graphique Précision:", chartError); }
}


// --- Fonctions pour les Tableaux d'Analyse Détaillée ---

/**
 * Calcule et affiche les statistiques agrégées par héros, incluant dégâts/soins moyens.
 * @param {Array} gamesData - Tableau complet des parties de l'utilisateur.
 */
function renderHeroStatsTable(gamesData) {
    const heroStats = {};
    const tableBody = document.querySelector('[data-tab-content="par-heros"] tbody');
    if (!tableBody) return;

    // 1. Agréger les données
    gamesData.forEach(game => {
        const heroName = game.heroes?.name;
        if (!heroName) return;
        if (!heroStats[heroName]) {
            heroStats[heroName] = { played: 0, wins: 0, kills: 0, deaths: 0, assists: 0, totalDamage: 0, totalHealing: 0 };
        }
        heroStats[heroName].played++;
        if (game.result === 'win') heroStats[heroName].wins++;
        heroStats[heroName].kills += game.kills || 0;
        heroStats[heroName].deaths += game.deaths || 0;
        heroStats[heroName].assists += game.assists || 0;
        heroStats[heroName].totalDamage += game.damage_dealt || 0; // Agréger dégâts
        heroStats[heroName].totalHealing += game.healing_done || 0; // Agréger soins
    });

    // 2. Préparer pour affichage
    const displayData = Object.entries(heroStats).map(([name, stats]) => {
        const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        const deathsForKda = Math.max(1, stats.deaths);
        const kda = ((stats.kills + stats.assists) / deathsForKda).toFixed(2);
        const avgDamage = stats.played > 0 ? Math.round(stats.totalDamage / stats.played) : 0;
        const avgHealing = stats.played > 0 ? Math.round(stats.totalHealing / stats.played) : 0;
        return { name, played: stats.played, winRate, kda, avgDamage, avgHealing }; // Ajouter moyennes
    });
    displayData.sort((a, b) => b.played - a.played); // Trier

    // 3. Afficher
    tableBody.innerHTML = '';
    if (displayData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">Aucune donnée par héros disponible.</td></tr>'; // Colspan à 6
    } else {
        displayData.forEach(hero => {
            const winRateClass = hero.winRate >= 50 ? 'text-win' : 'text-loss';
            // Ajouter les nouvelles cellules pour Dégâts et Soins Moyens
            const row = `
                <tr>
                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-light-text">${hero.name}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-center">${hero.played}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm ${winRateClass} text-center">${hero.winRate}%</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-center">${hero.kda}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-right">${hero.avgDamage.toLocaleString('fr-FR')}</td> <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-right">${hero.avgHealing.toLocaleString('fr-FR')}</td> </tr>
            `;
            tableBody.innerHTML += row;
        });
    }
}

/**
 * Calcule et affiche les statistiques agrégées par map.
 * @param {Array} gamesData - Tableau complet des parties de l'utilisateur.
 */
function renderMapStatsTable(gamesData) {
    const mapStats = {};
    const tableBody = document.querySelector('[data-tab-content="par-map"] tbody');
     if (!tableBody) return;

    // 1. Agréger
    gamesData.forEach(game => {
        const mapName = game.maps?.name;
        if (!mapName) return;
        if (!mapStats[mapName]) mapStats[mapName] = { played: 0, wins: 0 };
        mapStats[mapName].played++;
        if (game.result === 'win') mapStats[mapName].wins++;
    });

    // 2. Préparer
    const displayData = Object.entries(mapStats).map(([name, stats]) => {
        const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        return { name, played: stats.played, winRate };
    });
    displayData.sort((a, b) => b.played - a.played);

    // 3. Afficher
    tableBody.innerHTML = '';
    if (displayData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 py-4">Aucune donnée par map disponible.</td></tr>';
    } else {
        displayData.forEach(map => {
             const winRateClass = map.winRate >= 50 ? 'text-win' : 'text-loss';
            const row = `
                <tr>
                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-light-text">${map.name}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-center">${map.played}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm ${winRateClass} text-center">${map.winRate}%</td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }
}


/**
 * Fonction principale pour récupérer et afficher toutes les données du dashboard.
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
        // Récupérer TOUTES les parties de l'utilisateur, triées par date pour l'historique
        const { data: games, error } = await _supabase
            .from('games')
            .select(`*, heroes ( name ), maps ( name )`) // Jointures essentielles
            .eq('user_id', userId)
            .order('played_at', { ascending: false });

        if (error) throw error;
        console.log('Parties récupérées pour toutes les stats:', games);

        // --- Calculs et Affichage Stats Globales ---
        const totalGames = games.length;
        let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
        const heroCounts = {};
        games.forEach(game => {
            totalKills += game.kills || 0; totalDeaths += game.deaths || 0; totalAssists += game.assists || 0;
            if (game.result === 'win') wins++;
            if (game.heroes?.name) heroCounts[game.heroes.name] = (heroCounts[game.heroes.name] || 0) + 1;
        });
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        const kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toFixed(2);
        let mostPlayedHero = 'N/A'; let maxHeroCount = 0;
        for (const hero in heroCounts) { if (heroCounts[hero] > maxHeroCount) { maxHeroCount = heroCounts[hero]; mostPlayedHero = hero; } }

        const kdaElement = document.getElementById('stat-kda');
        const winRateElement = document.getElementById('stat-winrate');
        const totalGamesElement = document.getElementById('stat-total-games');
        const mainHeroElement = document.getElementById('stat-main-hero');
        if (kdaElement) kdaElement.textContent = kda;
        if (winRateElement) { winRateElement.textContent = `${winRate}%`; winRateElement.className = 'stat-value'; if(totalGames > 0) winRateElement.classList.add(winRate >= 50 ? 'text-win' : 'text-loss'); }
        if (totalGamesElement) totalGamesElement.textContent = totalGames;
        if (mainHeroElement) mainHeroElement.textContent = mostPlayedHero;


        // --- Affichage Historique (15 dernières parties) ---
        const historyTableBody = document.querySelector('#history-table tbody');
        if (historyTableBody) {
            historyTableBody.innerHTML = '';
            const gamesToShow = games.slice(0, 15); // Déjà trié DESC par la requête
            if (gamesToShow.length === 0) {
                 historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">Aucune partie enregistrée.</td></tr>';
            } else {
                gamesToShow.forEach(game => {
                    const winLossClass = game.result === 'win' ? 'text-win' : game.result === 'loss' ? 'text-loss' : 'text-gray-300';
                    const row = `
                        <tr>
                            <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-400">${new Date(game.played_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-light-text">${game.heroes?.name || '?'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.maps?.name || '?'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.kills || 0}/${game.deaths || 0}/${game.assists || 0}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm font-semibold ${winLossClass}">${game.result || '?'}</td>
                            <td class="px-3 py-2 text-xs text-gray-400 max-w-xs truncate" title="${game.notes || ''}">${game.notes || ''}</td>
                        </tr>`;
                    historyTableBody.innerHTML += row;
                });
            }
        }

        // --- Génération des Graphiques ---
        if (games.length > 0) {
            // Trier ASC pour les graphiques
            const sortedGamesAsc = [...games].sort((a, b) => new Date(a.played_at) - new Date(b.played_at));
            renderProgressionChart(sortedGamesAsc); // KDA
            renderAccuracyChart(sortedGamesAsc);  // Précision
        } else {
             // Effacer les graphiques si pas de données
             if (progressionChartInstance) { progressionChartInstance.destroy(); progressionChartInstance = null; }
             if (accuracyChartInstance) { accuracyChartInstance.destroy(); accuracyChartInstance = null; }
             // Optionnel: Effacer le contenu des canvas
             const kdaCanvas = document.getElementById('progressionChart')?.getContext('2d');
             const accCanvas = document.getElementById('accuracyChart')?.getContext('2d');
             if(kdaCanvas) kdaCanvas.clearRect(0,0, kdaCanvas.canvas.width, kdaCanvas.canvas.height);
             if(accCanvas) accCanvas.clearRect(0,0, accCanvas.canvas.width, accCanvas.canvas.height);
        }

        // --- Calcul et Affichage Stats Détaillées ---
        if (games.length > 0) {
            renderHeroStatsTable(games); // Appelle la version mise à jour
            renderMapStatsTable(games);  // Appelle la version inchangée
        } else {
            // Vider les tableaux si aucune partie
             const heroTableBody = document.querySelector('[data-tab-content="par-heros"] tbody');
             const mapTableBody = document.querySelector('[data-tab-content="par-map"] tbody');
             if(heroTableBody) heroTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">Aucune donnée disponible.</td></tr>'; // Colspan 6
             if(mapTableBody) mapTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 py-4">Aucune donnée disponible.</td></tr>';
        }

    } catch (error) {
        console.error("Erreur lors de la récupération/affichage complet des stats:", error.message);
        // Afficher une erreur plus globale à l'utilisateur ?
    }
}


// --- Gestion de l'État d'Authentification et UI ---
/**
 * Met à jour l'interface utilisateur globale en fonction de l'état de connexion.
 * @param {object|null} user L'objet utilisateur Supabase ou null.
 */
async function updateUserUI(user) {
    console.log("Updating UI for user:", user ? user.email : 'null');
    const userInfoDiv = document.getElementById('user-info');
    const userGreetingSpan = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-button');
    const loginBtnHeader = document.getElementById('login-button-header');
    const mobileLogin = document.getElementById('mobile-login-link');
    const mobileLogout = document.getElementById('mobile-logout-button');
    const mobileGreeting = document.getElementById('mobile-user-greeting');
    const dashboardContent = document.getElementById('dashboard-content');

    if (user) {
        // --- Utilisateur Connecté ---
        if (userInfoDiv) userInfoDiv.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (loginBtnHeader) loginBtnHeader.style.display = 'none';
        if (mobileLogin) mobileLogin.style.display = 'none';
        if (mobileLogout) mobileLogout.style.display = 'block';

        // Afficher le nom d'utilisateur
        let displayName = user.email; // Fallback
        if (_supabase) {
            try {
                const { data: profile, error } = await _supabase.from('profiles').select('username').eq('id', user.id).single();
                if (error && error.code !== 'PGRST116') throw error; // Ignorer '0 rows'
                if (profile && profile.username) displayName = profile.username;
            } catch (profileError) { console.error("Erreur récupération profil:", profileError.message); }
        }
        if (userGreetingSpan) userGreetingSpan.textContent = `Salut, ${displayName}!`;
        if (mobileGreeting) mobileGreeting.textContent = displayName;

        // Afficher le contenu du dashboard
        if (dashboardContent) dashboardContent.classList.remove('hidden');

        // Charger les données spécifiques au dashboard (dropdowns, stats, graph, tables)
         if (document.getElementById('dashboard-content')) { // Vérifier si on est sur la bonne page
             populateDropdowns();
             fetchAndDisplayUserStats(); // Charge TOUTES les données
        }

    } else {
        // --- Utilisateur Déconnecté ---
        if (userInfoDiv) userInfoDiv.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtnHeader) loginBtnHeader.style.display = 'inline-block';
        if (mobileLogin) mobileLogin.style.display = 'block';
        if (mobileLogout) mobileLogout.style.display = 'none';
        if (mobileGreeting) mobileGreeting.textContent = '';

        // Cacher le contenu du dashboard
        if (dashboardContent) dashboardContent.classList.add('hidden');

         // Effacer les graphiques lors de la déconnexion ou si dashboard caché
         if (progressionChartInstance) {
            progressionChartInstance.destroy();
            progressionChartInstance = null;
         }
         if (accuracyChartInstance) {
            accuracyChartInstance.destroy();
            accuracyChartInstance = null;
         }
         // Optionnel: Effacer le contenu des canvas
         const kdaCanvas = document.getElementById('progressionChart')?.getContext('2d');
         const accCanvas = document.getElementById('accuracyChart')?.getContext('2d');
         if(kdaCanvas) kdaCanvas.clearRect(0,0, kdaCanvas.canvas.width, kdaCanvas.canvas.height);
         if(accCanvas) accCanvas.clearRect(0,0, accCanvas.canvas.width, accCanvas.canvas.height);
    }
}

// --- Initialisation et Écouteurs ---

/**
 * Vérifie l'état de connexion au chargement et applique les redirections si nécessaire.
 */
async function checkAuthStateAndRedirect() {
    if (!_supabase) { console.log("Supabase client not ready for auth check."); return; }

    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) { console.error("Erreur getSession:", error); return; } // Ne pas rediriger en cas d'erreur

    const user = session?.user ?? null;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // Default to index

    console.log(`Checking auth state on page: ${currentPage}, user: ${user ? user.email : 'null'}`);

    const protectedPages = ['dashboard.html'];
    const publicOnlyPages = ['login.html', 'signup.html'];

    // Redirection si nécessaire
    if (!user && protectedPages.includes(currentPage)) {
        console.log("User not logged in, redirecting to login...");
        window.location.replace('login.html'); // Utiliser replace pour éviter l'historique
    } else if (user && publicOnlyPages.includes(currentPage)) {
        console.log("User already logged in, redirecting to dashboard...");
        window.location.replace('dashboard.html');
    } else {
        // Si pas de redirection, mettre à jour l'UI pour l'état actuel
        // Cela va aussi déclencher le fetch des données si on est sur le dashboard et connecté
        updateUserUI(user);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    if (!_supabase) {
        console.error("DOM Loaded, but Supabase client failed to initialize. Aborting setup.");
        // Afficher une erreur globale à l'utilisateur ?
        return;
    }

    // 1. Vérifier l'état initial et rediriger si nécessaire
    checkAuthStateAndRedirect();

    // 2. Écouter les changements d'état futurs (ex: login/logout dans un autre onglet)
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth State Change Event:', event, session);
        // Mettre à jour l'UI pour refléter le nouvel état
        // La redirection initiale gère le chargement de page.
        updateUserUI(session?.user ?? null);
    });

    // 3. Attacher les gestionnaires d'événements aux formulaires et boutons

    // Formulaire Inscription (signup.html)
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = signupForm.email.value;
            const password = signupForm.password.value;
            const username = signupForm.username.value;
            if (!username || username.length < 3) {
                 const feedbackDiv = document.getElementById('form-feedback-signup');
                 if(feedbackDiv) { feedbackDiv.textContent = "Le nom d'utilisateur doit faire au moins 3 caractères."; feedbackDiv.classList.remove('hidden'); feedbackDiv.classList.add('text-red-500');}
                 else { alert("Le nom d'utilisateur doit faire au moins 3 caractères."); }
                 return;
            }
            handleSignUp(email, password, username);
        });
    }

    // Formulaire Connexion (login.html)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            handleLogin(email, password);
        });
    }

    // Bouton Déconnexion (principal + mobile)
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    }
    if (mobileLogoutButton) {
         mobileLogoutButton.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    }


    // Formulaire Saisie Partie (dashboard.html)
    const gameEntryForm = document.getElementById('game-entry-form');
    if (gameEntryForm) {
        gameEntryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(gameEntryForm);
            const gameData = Object.fromEntries(formData.entries());
            saveGameEntry(gameData); // Appelle la fonction mise à jour
        });
    }

}); // Fin DOMContentLoaded

