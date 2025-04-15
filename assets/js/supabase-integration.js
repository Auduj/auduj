/**
 * supabase-integration.js
 * Gère l'interaction entre le frontend Auduj et le backend Supabase.
 * - Initialisation du client Supabase
 * - Authentification (Inscription, Connexion, Déconnexion)
 * - Gestion des données du tableau de bord (Sauvegarde, Lecture)
 *
 * À inclure dans les pages HTML qui nécessitent une interaction avec Supabase
 * (principalement dashboard.html, et potentiellement une page login/signup).
 * Assurez-vous d'inclure aussi le SDK Supabase via CDN avant ce script.
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */

// --- Configuration ---
// REMPLACEZ par vos propres URL et Clé Anon Supabase !
// Disponibles dans les paramètres de votre projet Supabase > API
const SUPABASE_URL = 'https://mbkiwpsbprcqhyafyifl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2l3cHNicHJjcWh5YWZ5aWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDYzNDEsImV4cCI6MjA2MDI4MjM0MX0.d5QxMFrOcF91cz0zhrYuC2mFCzI8Juu54eDNF2GC7qE';

if (!SUPABASE_URL || SUPABASE_URL === 'https://mbkiwpsbprcqhyafyifl.supabase.co' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2l3cHNicHJjcWh5YWZ5aWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDYzNDEsImV4cCI6MjA2MDI4MjM0MX0.d5QxMFrOcF91cz0zhrYuC2mFCzI8Juu54eDNF2GC7qE') {
    console.error("Erreur: Veuillez définir SUPABASE_URL et SUPABASE_ANON_KEY dans supabase-integration.js");
    // Pourrait afficher un message à l'utilisateur ici
    // Peut-être arrêter l'exécution ou désactiver les fonctionnalités ?
} else {
    // Initialisation du client Supabase (peut être déplacé ici ou laissé après)
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase Client Initialized');
}
// Initialisation du client Supabase
const { createClient } = supabase; // Accède à la fonction depuis le SDK global
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase Client Initialized'); // Pour vérifier dans la console

// --- Éléments du DOM (Exemples - Adaptez selon votre HTML) ---
// (Ces éléments devront être présents dans votre HTML, par exemple dans dashboard.html ou une page de connexion dédiée)
const loginForm = document.getElementById('login-form'); // Supposons un formulaire de connexion
const signupForm = document.getElementById('signup-form'); // Supposons un formulaire d'inscription
const logoutButton = document.getElementById('logout-button'); // Un bouton de déconnexion
const gameEntryForm = document.getElementById('game-entry-form'); // Le formulaire de saisie de partie
const entryFeedback = document.getElementById('entry-feedback'); // Zone de feedback pour la saisie
const userGreeting = document.getElementById('user-greeting'); // Pour afficher "Bonjour [username]"
const dashboardContent = document.getElementById('dashboard-content'); // Conteneur principal du dashboard
const authSection = document.getElementById('auth-section'); // Section contenant login/signup

// --- Fonctions d'Authentification ---

/**
 * Gère l'inscription d'un nouvel utilisateur.
 * @param {string} email
 * @param {string} password
 * @param {string} username
 */
async function handleSignUp(email, password, username) {
    try {
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                // Passer des métadonnées pour le trigger handle_new_user
                data: {
                    username: username
                }
            }
        });
        if (error) throw error;
        console.log('Inscription réussie:', data);
        alert('Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte.');
        // Rediriger vers la page de connexion ou afficher un message
        // Peut-être vider le formulaire
        if (signupForm) signupForm.reset();

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error.message);
        alert(`Erreur d'inscription: ${error.message}`);
    }
}

/**
 * Gère la connexion d'un utilisateur existant.
 * @param {string} email
 * @param {string} password
 */
async function handleLogin(email, password) {
    try {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });
        if (error) throw error;
        console.log('Connexion réussie:', data);
        // Pas besoin d'alerte ici, on va rafraîchir l'état de l'interface
        // Le listener onAuthStateChange s'en chargera
        if (loginForm) loginForm.reset();

    } catch (error) {
        console.error('Erreur lors de la connexion:', error.message);
        alert(`Erreur de connexion: ${error.message}`);
    }
}

/**
 * Gère la déconnexion de l'utilisateur.
 */
async function handleLogout() {
    try {
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;
        console.log('Déconnexion réussie');
        // L'interface sera mise à jour par onAuthStateChange
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error.message);
        alert(`Erreur de déconnexion: ${error.message}`);
    }
}

// --- Fonctions de Gestion des Données (Dashboard) ---

/**
 * Récupère l'ID du profil de l'utilisateur connecté.
 * @returns {Promise<string|null>} L'UUID du profil ou null.
 */
async function getUserProfileId() {
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    if (sessionError || !session) {
        console.error('Erreur session ou session non trouvée:', sessionError);
        return null;
    }
    return session.user.id; // L'ID dans 'profiles' est le même que l'ID dans 'auth.users'
}

/**
 * Remplit les menus déroulants des héros et des maps.
 */
async function populateDropdowns() {
    const heroSelect = document.getElementById('hero');
    const mapSelect = document.getElementById('map');

    if (!heroSelect || !mapSelect) return;

    try {
        // Récupérer les héros
        const { data: heroes, error: heroesError } = await _supabase
            .from('heroes')
            .select('id, name')
            .order('name');
        if (heroesError) throw heroesError;

        // Récupérer les maps
        const { data: maps, error: mapsError } = await _supabase
            .from('maps')
            .select('id, name')
            .order('name');
        if (mapsError) throw mapsError;

        // Vider les options existantes (sauf la première "Choisir...")
        heroSelect.length = 1;
        mapSelect.length = 1;

        // Ajouter les nouvelles options
        heroes.forEach(hero => {
            const option = new Option(hero.name, hero.id);
            heroSelect.add(option);
        });

        maps.forEach(map => {
            const option = new Option(map.name, map.id);
            mapSelect.add(option);
        });

    } catch (error) {
        console.error("Erreur lors du chargement des héros/maps:", error.message);
        // Informer l'utilisateur ?
    }
}


/**
 * Enregistre une nouvelle partie dans la base de données.
 * @param {object} gameData Données du formulaire.
 */
async function saveGameEntry(gameData) {
    const userId = await getUserProfileId();
    if (!userId) {
        alert("Erreur: Utilisateur non connecté.");
        return;
    }

    if (entryFeedback) { // Reset feedback
        entryFeedback.classList.add('hidden');
        entryFeedback.textContent = '';
        entryFeedback.classList.remove('text-green-500', 'text-red-500', 'border', 'border-green-500', 'border-red-500', 'p-2', 'rounded-md', 'text-sm');
    }

    try {
        const { data, error } = await _supabase
            .from('games')
            .insert([
                {
                    user_id: userId,
                    hero_id: parseInt(gameData.hero, 10), // Assurez-vous que les IDs sont des nombres
                    map_id: parseInt(gameData.map, 10),
                    kills: parseInt(gameData.kills, 10),
                    deaths: parseInt(gameData.deaths, 10),
                    assists: parseInt(gameData.assists, 10),
                    objective_score: gameData.objective_score ? parseInt(gameData.objective_score, 10) : 0,
                    result: gameData.result,
                    notes: gameData.notes
                    // played_at est défini par défaut dans la DB
                }
            ])
            .select(); // Pour obtenir les données insérées en retour (optionnel)

        if (error) throw error;

        console.log('Partie enregistrée:', data);
        if (entryFeedback) {
            entryFeedback.classList.remove('hidden');
            entryFeedback.classList.add('text-green-500', 'border', 'border-green-500', 'p-2', 'rounded-md', 'text-sm');
            entryFeedback.textContent = 'Partie enregistrée avec succès !';
        }
        if (gameEntryForm) {
             // Vider seulement les champs variables
             document.getElementById('kills').value = '';
             document.getElementById('deaths').value = '';
             document.getElementById('assists').value = '';
             document.getElementById('objective_score').value = '';
             document.getElementById('result').value = '';
             document.getElementById('notes').value = '';
        }
        // Rafraîchir les statistiques affichées
        fetchAndDisplayUserStats();

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la partie:', error.message);
         if (entryFeedback) {
            entryFeedback.classList.remove('hidden');
            entryFeedback.classList.add('text-red-500', 'border', 'border-red-500', 'p-2', 'rounded-md', 'text-sm');
            entryFeedback.textContent = `Erreur: ${error.message}`;
        }
    } finally {
        // Cacher le message après quelques secondes
        setTimeout(() => {
            if (entryFeedback) entryFeedback.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Récupère et affiche les statistiques de l'utilisateur connecté.
 */
async function fetchAndDisplayUserStats() {
    const userId = await getUserProfileId();
    if (!userId) return; // Pas connecté

    try {
        const { data: games, error } = await _supabase
            .from('games')
            .select(`
                *,
                heroes ( name ),
                maps ( name )
            `) // Inclure noms héros/maps
            .eq('user_id', userId)
            .order('played_at', { ascending: false }); // Trier par date récente

        if (error) throw error;

        console.log('Parties récupérées:', games);

        // --- Calculs de Stats (Exemples simples) ---
        const totalGames = games.length;
        let totalKills = 0;
        let totalDeaths = 0;
        let totalAssists = 0;
        let wins = 0;
        const heroCounts = {};
        const mapCounts = {};

        games.forEach(game => {
            totalKills += game.kills;
            totalDeaths += game.deaths;
            totalAssists += game.assists;
            if (game.result === 'win') wins++;

            // Compter héros
            if (game.heroes) { // Vérifier si la jointure a fonctionné
                 heroCounts[game.heroes.name] = (heroCounts[game.heroes.name] || 0) + 1;
            }
             // Compter maps
             if (game.maps) {
                 mapCounts[game.maps.name] = (mapCounts[game.maps.name] || 0) + 1;
             }
        });

        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        // Calcul KDA simple (éviter division par zéro)
        const kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toFixed(2);

        // Trouver le héros le plus joué
        let mostPlayedHero = 'N/A';
        let maxHeroCount = 0;
        for (const hero in heroCounts) {
            if (heroCounts[hero] > maxHeroCount) {
                maxHeroCount = heroCounts[hero];
                mostPlayedHero = hero;
            }
        }

        // --- Affichage des Stats (Mettre à jour les éléments du DOM) ---
        // (Assurez-vous que les éléments existent dans dashboard.html avec des IDs uniques)
        const kdaElement = document.getElementById('stat-kda');
        const winRateElement = document.getElementById('stat-winrate');
        const totalGamesElement = document.getElementById('stat-total-games');
        const mainHeroElement = document.getElementById('stat-main-hero'); // Pourrait être un div contenant nom + icône

        if (kdaElement) kdaElement.textContent = kda;
        if (winRateElement) {
             winRateElement.textContent = `${winRate}%`;
             // Ajouter classe couleur ?
             winRateElement.className = 'stat-value'; // Reset
             if(winRate >= 50) winRateElement.classList.add('text-win');
             else if (totalGames > 0) winRateElement.classList.add('text-loss');
        }
        if (totalGamesElement) totalGamesElement.textContent = totalGames;
        if (mainHeroElement) mainHeroElement.textContent = mostPlayedHero; // Simplifié, pourrait afficher une icône

        // --- Affichage de l'historique ---
        const historyTableBody = document.querySelector('#history-table tbody'); // Assurez-vous d'avoir un id="history-table" sur votre table
        if (historyTableBody) {
            historyTableBody.innerHTML = ''; // Vider l'ancien contenu
            const gamesToShow = games.slice(0, 10); // Afficher les 10 dernières

            if (gamesToShow.length === 0) {
                 historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">Aucune partie enregistrée pour le moment.</td></tr>';
            } else {
                gamesToShow.forEach(game => {
                    const row = `
                        <tr>
                            <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-400">${new Date(game.played_at).toLocaleString('fr-FR', { short: 'short' })}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-light-text">${game.heroes?.name || 'N/A'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.maps?.name || 'N/A'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.kills}/${game.deaths}/${game.assists}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm font-semibold ${game.result === 'win' ? 'text-win' : game.result === 'loss' ? 'text-loss' : 'text-gray-300'}">${game.result || 'N/A'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-400 max-w-xs truncate" title="${game.notes || ''}">${game.notes || ''}</td>
                        </tr>
                    `;
                    historyTableBody.innerHTML += row;
                });
            }
        }

        // TODO: Mettre à jour les autres onglets (Par Héros, Par Map) de manière similaire

    } catch (error) {
        console.error("Erreur lors de la récupération/affichage des stats:", error.message);
        // Afficher une erreur à l'utilisateur ?
    }
}


// --- Gestion de l'État d'Authentification ---

/**
 * Met à jour l'interface utilisateur en fonction de l'état de connexion.
 * @param {object|null} user L'objet utilisateur Supabase ou null.
 */
async function updateUserUI(user) {
    if (user) {
        console.log("Utilisateur connecté:", user.email);
        // Afficher le dashboard, masquer l'authentification
        if (authSection) authSection.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block'; // Ou la classe appropriée
        if (logoutButton) logoutButton.style.display = 'inline-block'; // Ou 'block'

        // Afficher le nom d'utilisateur (depuis la table profiles)
        try {
            const { data: profile, error } = await _supabase
                .from('profiles')
                .select('username')
                .eq('id', user.id)
                .single(); // On s'attend à un seul profil

            if (error && error.code !== 'PGRST116') { // PGRST116 = 0 rows, normal si profil pas encore créé
                 throw error;
            }

            if (userGreeting && profile) {
                userGreeting.textContent = `Bonjour, ${profile.username || user.email}!`; // Fallback sur email
            } else if (userGreeting) {
                 userGreeting.textContent = `Bonjour, ${user.email}!`;
            }
        } catch (profileError) {
             console.error("Erreur récupération profil:", profileError.message);
             if (userGreeting) userGreeting.textContent = `Bonjour, ${user.email}!`; // Fallback
        }


        // Charger les données du dashboard
        populateDropdowns(); // Charger héros/maps dans les menus
        fetchAndDisplayUserStats();

    } else {
        console.log("Utilisateur déconnecté.");
        // Afficher l'authentification, masquer le dashboard
        if (authSection) authSection.style.display = 'block';
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (userGreeting) userGreeting.textContent = '';
        if (logoutButton) logoutButton.style.display = 'none';
    }
}

// --- Écouteurs d'Événements ---

document.addEventListener('DOMContentLoaded', () => {
    // Écouteur pour le changement d'état d'authentification
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth State Change Event:', event, session);
        const user = session?.user ?? null;
        updateUserUI(user);
    });

    // Vérifier l'état initial au chargement (au cas où l'utilisateur est déjà connecté)
     _supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('Initial session:', session);
        updateUserUI(session?.user ?? null);
    }).catch(error => {
        console.error("Erreur lors de la récupération de la session initiale:", error);
        updateUserUI(null); // Assumer déconnecté en cas d'erreur
    });


    // Attacher les gestionnaires aux formulaires (si les formulaires existent)
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = signupForm.email.value;
            const password = signupForm.password.value;
            const username = signupForm.username.value; // Assurez-vous d'avoir un champ username
            if (!username || username.length < 3) {
                 alert("Le nom d'utilisateur doit faire au moins 3 caractères.");
                 return;
            }
            handleSignUp(email, password, username);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            handleLogin(email, password);
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    if (gameEntryForm) {
        gameEntryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Récupérer les données du formulaire
            const formData = new FormData(gameEntryForm);
            const gameData = Object.fromEntries(formData.entries());
            console.log("Données saisies:", gameData);
            saveGameEntry(gameData);
        });
    }

     // --- Initialisation spécifique au Dashboard (si on est sur cette page) ---
     // On pourrait vérifier l'URL ou la présence d'un élément spécifique
     if (document.getElementById('dashboard-content')) {
         // Le listener onAuthStateChange s'occupera de charger les données si l'utilisateur est connecté.
         console.log("Page Dashboard détectée.");
     }

}); // Fin DOMContentLoaded

