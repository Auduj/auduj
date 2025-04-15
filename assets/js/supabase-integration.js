/**
 * supabase-integration.js
 * Gère l'interaction entre le frontend Auduj et le backend Supabase.
 * - Initialisation du client Supabase
 * - Authentification (Inscription, Connexion, Déconnexion) + Redirections
 * - Gestion des données du tableau de bord (Sauvegarde, Lecture)
 * - Affichage des graphiques de progression (KDA, Précision) + FILTRE HEROS PERSISTANT
 * - Calcul et affichage des stats étendues par héros et par map
 * - Affichage détails partie depuis historique (MODALE)
 */

// --- Configuration ---
// REMPLACEZ par vos propres URL et Clé Anon Supabase !
const SUPABASE_URL = 'https://mbkiwpsbprcqhyafyifl.supabase.co'; // Vos clés réelles
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2l3cHNicHJjcWh5YWZ5aWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDYzNDEsImV4cCI6MjA2MDI4MjM0MX0.d5QxMFrOcF91cz0zhrYuC2mFCzI8Juu54eDNF2GC7qE'; // Vos clés réelles

let _supabase; // Variable pour le client Supabase
let progressionChartInstance = null; // Instance pour le graphique KDA
let accuracyChartInstance = null;    // Instance pour le graphique Précision
let allUserGames = []; // Stocker toutes les parties récupérées pour filtrage/détails
let selectedChartHeroId = 'all'; // ID du héros sélectionné pour filtrer les graphiques ('all' par défaut)

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

// --- Éléments du DOM (Commun + Nouveaux) ---
// Note: Ces éléments doivent exister dans votre HTML pour que le script fonctionne
const userGreeting = document.getElementById('user-greeting');
const userInfo = document.getElementById('user-info'); // Conteneur pour greeting + logout button
const logoutButton = document.getElementById('logout-button');
const loginButtonHeader = document.getElementById('login-button-header');
// Éléments mobiles
const mobileLoginLink = document.getElementById('mobile-login-link');
const mobileLogoutButton = document.getElementById('mobile-logout-button');
const mobileUserGreeting = document.getElementById('mobile-user-greeting');
// Éléments spécifiques au dashboard
const chartHeroFilter = document.getElementById('chartHeroFilter');
const gameDetailModal = document.getElementById('gameDetailModal');
const closeModalButton = document.getElementById('closeModalButton');
const historyTableBody = document.querySelector('#history-table tbody');

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
        // Optionnel: Effacer la préférence de filtre lors de la déconnexion ?
        // localStorage.removeItem('auduj_chartHeroFilter');
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
 * Remplit les menus déroulants (Héros/Map du formulaire ET filtre des graphiques).
 */
async function populateDropdowns() {
    const heroSelectForm = document.getElementById('hero');
    const mapSelectForm = document.getElementById('map');
    const heroSelectFilter = document.getElementById('chartHeroFilter'); // Nouveau filtre

    if (!_supabase) return;
    // Vérifier si les éléments existent (évite erreur si pas sur dashboard)
    if (!heroSelectForm || !mapSelectForm || !heroSelectFilter) return;


    try {
        // Récupérer les héros et les maps en parallèle pour plus d'efficacité
        const [{ data: heroes, error: heroesError }, { data: maps, error: mapsError }] = await Promise.all([
            _supabase.from('heroes').select('id, name').order('name'), // Tri par nom
            _supabase.from('maps').select('id, name').order('name')   // Tri par nom
        ]);

        // Gérer les erreurs potentielles de requête
        if (heroesError) throw heroesError;
        if (mapsError) throw mapsError;

        // Sauvegarder la valeur actuelle du filtre avant de vider
        const currentFilterValue = heroSelectFilter.value;

        // Remplir formulaire
        heroSelectForm.length = 1; mapSelectForm.length = 1;
        heroSelectForm.options[0].text = "Choisir Héros..."; mapSelectForm.options[0].text = "Choisir Map...";
        heroes.forEach(hero => heroSelectForm.add(new Option(hero.name, hero.id)));
        maps.forEach(map => mapSelectForm.add(new Option(map.name, map.id)));

        // Remplir filtre graphique
        heroSelectFilter.length = 1; // Garde "Tous les héros"
        heroSelectFilter.options[0].value = "all"; // Assurer que la valeur est 'all'
        heroSelectFilter.options[0].text = "Tous les héros"; // Texte explicite
        heroes.forEach(hero => heroSelectFilter.add(new Option(hero.name, hero.id)));

        // Essayer de restaurer la valeur précédente du filtre (utile si appelé plusieurs fois)
        heroSelectFilter.value = currentFilterValue;
         // Si la valeur restaurée n'existe plus (par ex après suppression d'un héros), remettre à 'all'
         if (heroSelectFilter.value !== currentFilterValue) {
             heroSelectFilter.value = 'all';
         }


    } catch (error) {
        console.error("Erreur lors du chargement des héros/maps:", error.message);
        // Afficher une erreur dans les selects ?
        heroSelectForm.options[0].text = "Erreur"; mapSelectForm.options[0].text = "Erreur";
        if(heroSelectFilter) heroSelectFilter.options[0].text = "Erreur";
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
 * @param {Array} gamesData - Tableau des parties filtrées (ou toutes), trié ASC.
 */
function renderProgressionChart(gamesData) {
    const canvasElement = document.getElementById('progressionChart');
    if (!canvasElement) { console.log("Canvas 'progressionChart' non trouvé."); return; }
    if (typeof Chart === 'undefined') { console.error("Chart.js non chargé."); return; }
    const ctx = canvasElement.getContext('2d');
    if (!ctx) { console.error("Ctx KDA non trouvé."); return; }

    const labels = gamesData.map((_, index) => `Partie ${index + 1}`);
    const kdaData = gamesData.map(game => {
        const kills = game.kills || 0; const assists = game.assists || 0;
        const deaths = Math.max(1, game.deaths || 1); // Evite division par zero
        return parseFloat(((kills + assists) / deaths).toFixed(2));
    });

    if (progressionChartInstance) { progressionChartInstance.destroy(); progressionChartInstance = null; }

    const gridColor = 'rgba(255, 255, 255, 0.1)'; const labelColor = '#e2e8f0';
    const pointColor = '#e62429'; const lineColor = 'rgba(229, 36, 41, 0.7)';

    try {
        progressionChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'KDA par Partie', data: kdaData,
                    borderColor: lineColor, backgroundColor: pointColor,
                    pointBackgroundColor: pointColor, pointBorderColor: pointColor,
                    pointHoverBackgroundColor: '#fff', pointHoverBorderColor: pointColor,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, labels: { color: labelColor } },
                    tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: gridColor, borderWidth: 1 }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { color: labelColor }, grid: { color: gridColor } },
                    x: { ticks: { color: labelColor }, grid: { color: gridColor } }
                }
            }
        });
    } catch (chartError) { console.error("Erreur création graphique KDA:", chartError); }
}

/**
 * Crée ou met à jour le graphique de progression de la Précision.
 * @param {Array} gamesData - Tableau des parties filtrées (ou toutes), trié ASC.
 */
function renderAccuracyChart(gamesData) {
    const canvasElement = document.getElementById('accuracyChart');
    if (!canvasElement) { console.log("Canvas 'accuracyChart' non trouvé."); return; }
    if (typeof Chart === 'undefined') { console.error("Chart.js non chargé."); return; }
    const ctx = canvasElement.getContext('2d');
    if (!ctx) { console.error("Ctx Précision non trouvé."); return; }

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
                plugins: {
                    legend: { display: true, labels: { color: labelColor } },
                    tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: gridColor, borderWidth: 1, callbacks: { label: function(context) { return `${context.dataset.label}: ${context.parsed.y}%`; } } } }, // Ajout % au tooltip
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { color: labelColor, callback: function(value) { return value + '%'; } }, grid: { color: gridColor } }, // Axe Y de 0 à 100%
                    x: { ticks: { color: labelColor }, grid: { color: gridColor } }
                }
            }
        });
    } catch (chartError) { console.error("Erreur création graphique Précision:", chartError); }
}

/**
 * Met à jour les graphiques en fonction du filtre héros sélectionné (variable globale).
 */
function updateCharts() {
    console.log("Updating charts for hero ID:", selectedChartHeroId);
    if (!allUserGames || allUserGames.length === 0) {
        // Effacer les graphiques si pas de données globales
        if (progressionChartInstance) { progressionChartInstance.destroy(); progressionChartInstance = null; }
        if (accuracyChartInstance) { accuracyChartInstance.destroy(); accuracyChartInstance = null; }
         const kdaCanvas = document.getElementById('progressionChart')?.getContext('2d');
         const accCanvas = document.getElementById('accuracyChart')?.getContext('2d');
         if(kdaCanvas) kdaCanvas.clearRect(0,0, kdaCanvas.canvas.width, kdaCanvas.canvas.height);
         if(accCanvas) accCanvas.clearRect(0,0, accCanvas.canvas.width, accCanvas.canvas.height);
        return;
    }

    // Filtrer les jeux
    const filteredGames = selectedChartHeroId === 'all'
        ? allUserGames // Utiliser toutes les parties si 'all' est sélectionné
        : allUserGames.filter(game => game.hero_id == selectedChartHeroId); // Filtrer par ID (comparaison souple)

    // Trier les jeux filtrés ASC pour les graphiques
    const sortedFilteredGamesAsc = [...filteredGames].sort((a, b) => new Date(a.played_at) - new Date(b.played_at));

    // Rendre les graphiques
    renderProgressionChart(sortedFilteredGamesAsc);
    renderAccuracyChart(sortedFilteredGamesAsc);
}


// --- Fonctions pour les Tableaux d'Analyse Détaillée ---

/**
 * Calcule et affiche les statistiques agrégées par héros, incluant toutes les moyennes demandées.
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
            // Initialiser avec toutes les stats nécessaires aux moyennes
            heroStats[heroName] = { played: 0, wins: 0, kills: 0, deaths: 0, assists: 0, totalDamage: 0, totalHealing: 0, totalBlocked: 0, totalAccuracy: 0.0 };
        }
        heroStats[heroName].played++;
        if (game.result === 'win') heroStats[heroName].wins++;
        heroStats[heroName].kills += game.kills || 0;
        heroStats[heroName].deaths += game.deaths || 0;
        heroStats[heroName].assists += game.assists || 0;
        heroStats[heroName].totalDamage += game.damage_dealt || 0;
        heroStats[heroName].totalHealing += game.healing_done || 0;
        heroStats[heroName].totalBlocked += game.damage_blocked || 0; // Agréger dégâts bloqués
        heroStats[heroName].totalAccuracy += parseFloat(game.accuracy) || 0.0; // Agréger précision (convertir en nombre)
    });

    // 2. Préparer pour affichage
    const displayData = Object.entries(heroStats).map(([name, stats]) => {
        const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        const deathsForKda = Math.max(1, stats.deaths);
        const kda = ((stats.kills + stats.assists) / deathsForKda).toFixed(2);
        const avgDamage = stats.played > 0 ? Math.round(stats.totalDamage / stats.played) : 0;
        const avgHealing = stats.played > 0 ? Math.round(stats.totalHealing / stats.played) : 0;
        // Calculer les nouvelles moyennes
        const avgBlocked = stats.played > 0 ? Math.round(stats.totalBlocked / stats.played) : 0;
        const avgAccuracy = stats.played > 0 ? parseFloat((stats.totalAccuracy / stats.played).toFixed(1)) : 0.0; // 1 décimale pour précision

        return { name, played: stats.played, winRate, kda, avgDamage, avgHealing, avgBlocked, avgAccuracy }; // Ajouter nouvelles moyennes
    });
    displayData.sort((a, b) => b.played - a.played); // Trier

    // 3. Afficher
    tableBody.innerHTML = '';
    if (displayData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-4">Aucune donnée par héros disponible.</td></tr>'; // Colspan à 8
    } else {
        displayData.forEach(hero => {
            const winRateClass = hero.winRate >= 50 ? 'text-win' : 'text-loss';
            // Ajouter les nouvelles cellules
            const row = `
                <tr>
                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-light-text">${hero.name}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-center">${hero.played}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm ${winRateClass} text-center">${hero.winRate}%</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-center">${hero.kda}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-right">${hero.avgDamage.toLocaleString('fr-FR')}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-right">${hero.avgHealing.toLocaleString('fr-FR')}</td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-right">${hero.avgBlocked.toLocaleString('fr-FR')}</td> <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-300 text-right">${hero.avgAccuracy.toLocaleString('fr-FR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%</td> </tr>
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

// --- Fonction pour afficher les détails d'une partie ---
/**
 * Affiche les détails d'une partie spécifique dans la fenêtre modale.
 * @param {object} game - L'objet complet de la partie à afficher.
 */
function showGameDetails(game) {
    if (!game || !gameDetailModal) return;

    const formatStat = (value, decimals = 0, suffix = '') => {
        const num = Number(value);
        // Vérifie si la valeur est un nombre valide avant de formater
        return !isNaN(num) && value !== null ? num.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix : '--';
    };

    // Remplir les champs de la modale
    document.getElementById('modal-date').textContent = game.played_at ? new Date(game.played_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short'}) : '--';
    document.getElementById('modal-hero').textContent = game.heroes?.name || 'N/A';
    document.getElementById('modal-map').textContent = game.maps?.name || 'N/A';
    document.getElementById('modal-result').textContent = game.result || '--';
    document.getElementById('modal-kda').textContent = `${formatStat(game.kills)} / ${formatStat(game.deaths)} / ${formatStat(game.assists)}`;
    document.getElementById('modal-kills').textContent = formatStat(game.kills);
    document.getElementById('modal-deaths').textContent = formatStat(game.deaths);
    document.getElementById('modal-assists').textContent = formatStat(game.assists);
    document.getElementById('modal-solo_kills').textContent = formatStat(game.solo_kills);
    document.getElementById('modal-head_kills').textContent = formatStat(game.head_kills);
    document.getElementById('modal-last_kills').textContent = formatStat(game.last_kills);
    document.getElementById('modal-damage_dealt').textContent = formatStat(game.damage_dealt);
    document.getElementById('modal-healing_done').textContent = formatStat(game.healing_done);
    document.getElementById('modal-damage_blocked').textContent = formatStat(game.damage_blocked);
    document.getElementById('modal-accuracy').textContent = formatStat(game.accuracy, 1); // 1 décimale
    document.getElementById('modal-notes').textContent = game.notes || '(Aucune note)';

    // Appliquer couleur au résultat
    const resultSpan = document.getElementById('modal-result');
    resultSpan.className = ''; // Reset
    if (game.result === 'win') resultSpan.classList.add('text-win', 'font-semibold');
    else if (game.result === 'loss') resultSpan.classList.add('text-loss', 'font-semibold');

    // Afficher la modale (en utilisant la classe 'active')
    gameDetailModal.classList.remove('opacity-0', 'pointer-events-none');
    gameDetailModal.classList.add('active'); // Déclenche l'affichage et la transition
}


/**
 * Fonction principale pour récupérer et afficher toutes les données du dashboard.
 */
async function fetchAndDisplayUserStats() {
    const userId = await getUserProfileId();
    if (!userId || !_supabase) return;
    const dashboardContent = document.getElementById('dashboard-content');
    if (!dashboardContent || dashboardContent.classList.contains('hidden')) { return; }

    try {
        // Récupérer TOUTES les parties de l'utilisateur, triées par date pour l'historique
        const { data: games, error } = await _supabase
            .from('games')
            .select(`*, heroes ( id, name ), maps ( id, name )`) // Jointures essentielles
            .eq('user_id', userId)
            .order('played_at', { ascending: false });

        if (error) throw error;
        console.log('Parties récupérées:', games);
        allUserGames = games; // Stocker globalement

        // --- Calculs et Affichage Stats Globales ---
        const totalGames = allUserGames.length;
        let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
        const heroCounts = {};
        allUserGames.forEach(game => {
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


        // --- Affichage Historique (Ajout data-game-id) ---
        if (historyTableBody) {
            historyTableBody.innerHTML = '';
            const gamesToShow = allUserGames.slice(0, 15); // Utiliser allUserGames
            if (gamesToShow.length === 0) { historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">Aucune partie enregistrée.</td></tr>'; }
            else { gamesToShow.forEach(game => {
                const winLossClass = game.result === 'win' ? 'text-win' : game.result === 'loss' ? 'text-loss' : 'text-gray-300';
                // Ajout de data-game-id="${game.id}" à la ligne <tr>
                const row = `
                    <tr data-game-id="${game.id}">
                        <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-400">${new Date(game.played_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-light-text">${game.heroes?.name || '?'}</td>
                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.maps?.name || '?'}</td>
                        <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.kills || 0}/${game.deaths || 0}/${game.assists || 0}</td>
                        <td class="px-3 py-2 whitespace-nowrap text-sm font-semibold ${winLossClass}">${game.result || '?'}</td>
                        <td class="px-3 py-2 text-xs text-gray-400 max-w-xs truncate" title="${game.notes || ''}">${game.notes || ''}</td>
                    </tr>`;
                historyTableBody.innerHTML += row; });
            }
        }

        // --- Génération des Graphiques (via updateCharts qui utilise le filtre) ---
        updateCharts(); // Appelle la fonction qui gère le filtrage et le rendu

        // --- Calcul et Affichage Stats Détaillées ---
        if (allUserGames.length > 0) {
            renderHeroStatsTable(allUserGames); // Appelle la version mise à jour
            renderMapStatsTable(allUserGames);
        } else {
            // Vider les tableaux si aucune partie
             const heroTableBody = document.querySelector('[data-tab-content="par-heros"] tbody');
             const mapTableBody = document.querySelector('[data-tab-content="par-map"] tbody');
             if(heroTableBody) heroTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-4">Aucune donnée disponible.</td></tr>'; // Colspan 8
             if(mapTableBody) mapTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-gray-500 py-4">Aucune donnée disponible.</td></tr>';
        }

    } catch (error) {
        console.error("Erreur fetch/display stats:", error.message);
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

        let displayName = user.email;
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
             // populateDropdowns est appelé dans DOMContentLoaded maintenant
             // fetchAndDisplayUserStats sera appelé par checkAuthStateAndRedirect ou onAuthStateChange
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

         // Effacer les graphiques et vider données globales
         if (progressionChartInstance) { progressionChartInstance.destroy(); progressionChartInstance = null; }
         if (accuracyChartInstance) { accuracyChartInstance.destroy(); accuracyChartInstance = null; }
         allUserGames = []; // Vider les données stockées
         // Optionnel: Effacer le contenu des canvas
         const kdaCanvas = document.getElementById('progressionChart')?.getContext('2d');
         const accCanvas = document.getElementById('accuracyChart')?.getContext('2d');
         if(kdaCanvas) kdaCanvas.clearRect(0,0, kdaCanvas.canvas.width, kdaCanvas.canvas.height);
         if(accCanvas) accCanvas.clearRect(0,0, accCanvas.canvas.width, accCanvas.canvas.height);
    }
}

// --- Initialisation et Écouteurs ---

/**
 * NOUVEAU: Charge la préférence de filtre depuis localStorage.
 */
function loadFilterPreference() {
    const savedHeroId = localStorage.getItem('auduj_chartHeroFilter');
    if (savedHeroId) {
        selectedChartHeroId = savedHeroId; // Mettre à jour la variable globale
        if (chartHeroFilter) {
            // Essayer de définir la valeur du dropdown.
            // Important: Cela doit être appelé APRÈS que populateDropdowns a rempli les options.
            chartHeroFilter.value = selectedChartHeroId;
             // Vérifier si la valeur a bien été appliquée (au cas où l'ID sauvegardé n'existe plus)
             if (chartHeroFilter.value !== selectedChartHeroId) {
                 console.warn(`Hero ID ${selectedChartHeroId} non trouvé dans le filtre, retour à 'Tous'.`);
                 selectedChartHeroId = 'all';
                 chartHeroFilter.value = 'all';
             } else {
                console.log(`Filtre héros chargé depuis localStorage: ${selectedChartHeroId}`);
             }
        }
    } else {
        // Assurer la valeur par défaut si rien n'est sauvegardé
        selectedChartHeroId = 'all';
        if (chartHeroFilter) {
            chartHeroFilter.value = 'all';
        }
    }
}

/**
 * Vérifie l'état de connexion au chargement et applique les redirections si nécessaire.
 */
async function checkAuthStateAndRedirect() {
    if (!_supabase) { console.log("Supabase client not ready."); return; }
    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) { console.error("Erreur getSession:", error); return; } // Ne pas rediriger en cas d'erreur
    const user = session?.user ?? null;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // Default to index
    console.log(`Checking auth state on page: ${currentPage}, user: ${user ? user.email : 'null'}`);
    const protectedPages = ['dashboard.html'];
    const publicOnlyPages = ['login.html', 'signup.html'];
    if (!user && protectedPages.includes(currentPage)) { window.location.replace('login.html'); }
    else if (user && publicOnlyPages.includes(currentPage)) { window.location.replace('dashboard.html'); }
    else {
        // Si pas de redirection, mettre à jour l'UI pour l'état actuel
        // L'appel à fetchAndDisplayUserStats est maintenant DANS updateUserUI
        updateUserUI(user);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    if (!_supabase) { console.error("DOM Loaded, Supabase non initialisé."); return; }

    // 1. Charger la préférence de filtre AVANT de vérifier l'état d'auth
    //    MAIS s'assurer que les dropdowns sont peuplés d'abord si on est sur le dashboard.
    if (document.getElementById('dashboard-content')) {
        // Peupler les dropdowns d'abord, puis charger la préférence, puis vérifier l'auth
        populateDropdowns().then(() => {
             loadFilterPreference(); // Charger la préférence après que les options existent
             checkAuthStateAndRedirect(); // Vérifier l'auth et mettre à jour l'UI/charger les données
        });
    } else {
        // Si on n'est pas sur le dashboard, pas besoin de populate/load filter
         checkAuthStateAndRedirect();
    }


    // 2. Écouter les changements d'état futurs
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth State Change Event:', event, session);
        // Mettre à jour l'UI pour refléter le nouvel état
        updateUserUI(session?.user ?? null);
    });

    // 3. Attacher les gestionnaires d'événements

    // Formulaires Auth
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
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            handleLogin(email, password);
        });
    }

    // Boutons Logout
    if (logoutButton) { logoutButton.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); }); }
    if (mobileLogoutButton) { mobileLogoutButton.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); }); }

    // Formulaire Saisie Partie
    const gameEntryForm = document.getElementById('game-entry-form');
    if (gameEntryForm) {
        gameEntryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(gameEntryForm);
            const gameData = Object.fromEntries(formData.entries());
            saveGameEntry(gameData); // Appelle la fonction mise à jour
        });
    }

    // Filtre des graphiques (Sauvegarde dans localStorage)
    if (chartHeroFilter) {
        chartHeroFilter.addEventListener('change', (e) => {
            selectedChartHeroId = e.target.value;
            // SAUVEGARDER dans localStorage
            try {
                localStorage.setItem('auduj_chartHeroFilter', selectedChartHeroId);
                console.log(`Filtre héros sauvegardé: ${selectedChartHeroId}`);
            } catch (storageError) {
                console.error("Erreur sauvegarde localStorage:", storageError);
            }
            updateCharts(); // Redessine les graphiques
        });
    }

    // Clics sur l'historique (Event Delegation)
    if (historyTableBody) {
        historyTableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-game-id]'); // Cherche la ligne parente avec l'attribut
            if (row) {
                const gameId = parseInt(row.dataset.gameId, 10);
                // Trouve les données complètes de la partie dans notre tableau global
                const gameDetails = allUserGames.find(g => g.id === gameId);
                if (gameDetails) {
                    showGameDetails(gameDetails); // Affiche la modale
                } else {
                    console.error("Données de la partie non trouvées pour l'ID:", gameId);
                }
            }
        });
    }

    // Fermeture de la modale
    if (closeModalButton && gameDetailModal) {
        // Clic sur le bouton X
        closeModalButton.addEventListener('click', () => {
            gameDetailModal.classList.add('opacity-0', 'pointer-events-none'); // Cache avec transition
            gameDetailModal.classList.remove('active');
        });
        // Clic en dehors du contenu de la modale
        gameDetailModal.addEventListener('click', (e) => {
            if (e.target === gameDetailModal) { // Si le clic est sur le fond semi-transparent
                 gameDetailModal.classList.add('opacity-0', 'pointer-events-none');
                 gameDetailModal.classList.remove('active');
            }
        });
    }

}); // Fin DOMContentLoaded

