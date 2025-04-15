/**
 * supabase-integration.js
 * Gère l'interaction entre le frontend Auduj et le backend Supabase.
 * - Initialisation du client Supabase
 * - Authentification (Inscription, Connexion, Déconnexion) + Redirections
 * - Gestion des données du tableau de bord (Sauvegarde, Lecture)
 */

// --- Configuration ---
const SUPABASE_URL = 'https://mbkiwpsbprcqhyafyifl.supabase.co'; // Vos clés réelles
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2l3cHNicHJjcWh5YWZ5aWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDYzNDEsImV4cCI6MjA2MDI4MjM0MX0.d5QxMFrOcF91cz0zhrYuC2mFCzI8Juu54eDNF2GC7qE'; // Vos clés réelles

let _supabase; // Variable pour le client Supabase

// --- Initialisation et Vérification des Clés ---
// Vérification simple que les clés sont définies (CORRIGÉ)
if (!SUPABASE_URL || SUPABASE_URL === 'VOTRE_SUPABASE_URL' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'VOTRE_SUPABASE_ANON_KEY') {
    console.error("Erreur: Veuillez définir SUPABASE_URL et SUPABASE_ANON_KEY dans supabase-integration.js");
    // Pourrait afficher un message à l'utilisateur ici ou désactiver les fonctionnalités
} else {
    // Initialisation du client Supabase
    const { createClient } = supabase; // Accède à la fonction depuis le SDK global
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase Client Initialized');
}

// --- Éléments du DOM (Commun) ---
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
        window.location.href = 'login.html';

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error.message);
         if(feedbackDiv) {
             feedbackDiv.textContent = `Erreur: ${error.message}`;
             feedbackDiv.classList.remove('hidden');
             feedbackDiv.classList.add('text-red-500');
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
        window.location.href = 'dashboard.html';

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
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error.message);
        alert(`Erreur de déconnexion: ${error.message}`);
    }
}

// --- Fonctions de Gestion des Données (Dashboard) ---

async function getUserProfileId() {
    if (!_supabase) return null;
    const { data: { user } } = await _supabase.auth.getUser();
    return user?.id ?? null;
}

async function populateDropdowns() {
    const heroSelect = document.getElementById('hero');
    const mapSelect = document.getElementById('map');
    if (!heroSelect || !mapSelect || !_supabase) return;

    try {
        const [{ data: heroes, error: heroesError }, { data: maps, error: mapsError }] = await Promise.all([
            _supabase.from('heroes').select('id, name').order('name'),
            _supabase.from('maps').select('id, name').order('name')
        ]);

        if (heroesError) throw heroesError;
        if (mapsError) throw mapsError;

        heroSelect.length = 1; // Garde "Choisir..."
        mapSelect.length = 1;

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
async function saveGameEntry(gameData) { // <<--- FONCTION MISE À JOUR
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
            damage_dealt: parseInt(gameData.damage_dealt, 10) || 0,       // Nouveau champ
            healing_done: parseInt(gameData.healing_done, 10) || 0,       // Nouveau champ
            damage_mitigated: parseInt(gameData.damage_mitigated, 10) || 0, // Nouveau champ
            objective_score: parseInt(gameData.objective_score, 10) || 0,
            result: gameData.result || null, // Assurer null si vide
            notes: gameData.notes || null    // Assurer null si vide
        };

        console.log("Données à insérer:", dataToInsert); // Pour débogage

        // Insertion dans Supabase
        const { data, error } = await _supabase
            .from('games')
            .insert([dataToInsert]) // Doit être un tableau d'objets
            .select(); // Pour obtenir les données insérées en retour

        if (error) {
             // Vérifier si l'erreur est due à une contrainte de clé étrangère (héros/map non sélectionné)
             if (error.message.includes('violates foreign key constraint')) {
                 if (!dataToInsert.hero_id) throw new Error("Veuillez sélectionner un héros.");
                 if (!dataToInsert.map_id) throw new Error("Veuillez sélectionner une map.");
             }
             // Vérifier si l'erreur est due à une contrainte NOT NULL (result non sélectionné)
              if (error.message.includes('violates not-null constraint') && error.message.includes('result')) {
                 throw new Error("Veuillez sélectionner un résultat (Victoire/Défaite/Égalité).");
             }
            throw error; // Relancer l'erreur si ce n'est pas géré spécifiquement
        }


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
            form.damage_dealt.value = ''; // Vider nouveau champ
            form.healing_done.value = ''; // Vider nouveau champ
            form.damage_mitigated.value = ''; // Vider nouveau champ
            form.objective_score.value = '';
            form.result.value = ''; // Réinitialiser le select du résultat
            form.notes.value = '';
            // Optionnel: réinitialiser hero/map ? Ou les garder pour saisie rapide ?
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


async function fetchAndDisplayUserStats() {
    const userId = await getUserProfileId();
    if (!userId || !_supabase) return;

    const dashboardContent = document.getElementById('dashboard-content');
    // Ne pas exécuter si le dashboard n'est pas visible (ex: sur page login)
    // Vérifier si l'élément existe *et* s'il n'est pas caché
    if (!dashboardContent || dashboardContent.classList.contains('hidden')) {
         console.log("Dashboard non visible, stats non chargées.");
         return;
    }

    try {
        const { data: games, error } = await _supabase
            .from('games')
            .select(`*, heroes ( name ), maps ( name )`) // Inclure noms héros/maps
            .eq('user_id', userId)
            .order('played_at', { ascending: false }); // Trier par date récente

        if (error) throw error;

        console.log('Parties récupérées pour stats:', games);

        // --- Calculs de Stats ---
        const totalGames = games.length;
        let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
        const heroCounts = {};

        games.forEach(game => {
            totalKills += game.kills || 0; // Assurer 0 si null
            totalDeaths += game.deaths || 0;
            totalAssists += game.assists || 0;
            if (game.result === 'win') wins++;
            if (game.heroes?.name) heroCounts[game.heroes.name] = (heroCounts[game.heroes.name] || 0) + 1;
        });

        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        const kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toFixed(2); // KDA "simple"

        let mostPlayedHero = 'N/A';
        let maxHeroCount = 0;
        for (const hero in heroCounts) {
            if (heroCounts[hero] > maxHeroCount) { maxHeroCount = heroCounts[hero]; mostPlayedHero = hero; }
        }

        // --- Affichage Stats Globales ---
        const kdaElement = document.getElementById('stat-kda');
        const winRateElement = document.getElementById('stat-winrate');
        const totalGamesElement = document.getElementById('stat-total-games');
        const mainHeroElement = document.getElementById('stat-main-hero');

        if (kdaElement) kdaElement.textContent = kda;
        if (winRateElement) {
             winRateElement.textContent = `${winRate}%`;
             winRateElement.className = 'stat-value'; // Reset classes
             if(totalGames > 0) winRateElement.classList.add(winRate >= 50 ? 'text-win' : 'text-loss');
        }
        if (totalGamesElement) totalGamesElement.textContent = totalGames;
        if (mainHeroElement) mainHeroElement.textContent = mostPlayedHero;

        // --- Affichage Historique ---
        const historyTableBody = document.querySelector('#history-table tbody');
        if (historyTableBody) {
            historyTableBody.innerHTML = ''; // Clear
            const gamesToShow = games.slice(0, 15); // Afficher les 15 dernières

            if (gamesToShow.length === 0) {
                 historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">Aucune partie enregistrée.</td></tr>';
            } else {
                gamesToShow.forEach(game => {
                    const row = `
                        <tr>
                            <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-400">${new Date(game.played_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-light-text">${game.heroes?.name || '?'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.maps?.name || '?'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.kills || 0}/${game.deaths || 0}/${game.assists || 0}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm font-semibold ${game.result === 'win' ? 'text-win' : game.result === 'loss' ? 'text-loss' : 'text-gray-300'}">${game.result || '?'}</td>
                            <td class="px-3 py-2 text-xs text-gray-400 max-w-xs truncate" title="${game.notes || ''}">${game.notes || ''}</td>
                        </tr>`;
                    historyTableBody.innerHTML += row;
                });
            }
        }
        // TODO: Mettre à jour les autres onglets (Par Héros, Par Map) avec les nouvelles données si nécessaire

    } catch (error) {
        console.error("Erreur lors de la récupération/affichage des stats:", error.message);
        // Afficher une erreur à l'utilisateur ?
    }
}


// --- Gestion de l'État d'Authentification et UI ---

/**
 * Met à jour l'interface utilisateur globale en fonction de l'état de connexion.
 * @param {object|null} user L'objet utilisateur Supabase ou null.
 */
async function updateUserUI(user) {
    console.log("Updating UI for user:", user ? user.email : 'null');

    // Éléments Desktop Header
    const userInfoDiv = document.getElementById('user-info');
    const userGreetingSpan = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-button');
    const loginBtnHeader = document.getElementById('login-button-header');

    // Éléments Mobile Header
    const mobileLogin = document.getElementById('mobile-login-link');
    const mobileLogout = document.getElementById('mobile-logout-button');
    const mobileGreeting = document.getElementById('mobile-user-greeting');

    // Contenu principal (pour dashboard)
    const dashboardContent = document.getElementById('dashboard-content');
    // Section d'invite Auth (sur dashboard.html, maintenant gérée par redirection)
    // const authSection = document.getElementById('auth-section');

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
                const { data: profile, error } = await _supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .single();
                if (error && error.code !== 'PGRST116') throw error;
                if (profile && profile.username) {
                    displayName = profile.username;
                }
            } catch (profileError) {
                console.error("Erreur récupération profil:", profileError.message);
            }
        }
        if (userGreetingSpan) userGreetingSpan.textContent = `Salut, ${displayName}!`;
        if (mobileGreeting) mobileGreeting.textContent = displayName;

        // Gérer contenu spécifique dashboard
        if (dashboardContent) dashboardContent.classList.remove('hidden');
        // if (authSection) authSection.classList.add('hidden'); // Plus nécessaire avec redirection

        // Charger les données spécifiques au dashboard si on est sur cette page
         if (document.getElementById('dashboard-content')) {
             populateDropdowns();
             fetchAndDisplayUserStats();
        }

    } else {
        // --- Utilisateur Déconnecté ---
        if (userInfoDiv) userInfoDiv.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtnHeader) loginBtnHeader.style.display = 'inline-block';

        if (mobileLogin) mobileLogin.style.display = 'block';
        if (mobileLogout) mobileLogout.style.display = 'none';
        if (mobileGreeting) mobileGreeting.textContent = '';

        // Gérer contenu spécifique dashboard (normalement géré par redirection)
        if (dashboardContent) dashboardContent.classList.add('hidden');
        // if (authSection) authSection.classList.remove('hidden'); // Plus nécessaire
    }
}

// --- Initialisation et Écouteurs ---

/**
 * Vérifie l'état de connexion au chargement et applique les redirections si nécessaire.
 */
async function checkAuthStateAndRedirect() {
    if (!_supabase) {
        console.log("Supabase client not ready for auth check.");
        return;
    }

    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) {
        console.error("Erreur getSession:", error);
        return;
    }

    const user = session?.user ?? null;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // Default to index

    console.log(`Checking auth state on page: ${currentPage}, user: ${user ? user.email : 'null'}`);

    const protectedPages = ['dashboard.html'];
    const publicOnlyPages = ['login.html', 'signup.html'];

    if (!user && protectedPages.includes(currentPage)) {
        console.log("User not logged in, redirecting to login...");
        window.location.replace('login.html');
    } else if (user && publicOnlyPages.includes(currentPage)) {
        console.log("User already logged in, redirecting to dashboard...");
        window.location.replace('dashboard.html');
    } else {
        // Si pas de redirection, mettre à jour l'UI pour l'état actuel
        updateUserUI(user);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    if (!_supabase) {
        console.error("DOM Loaded, but Supabase client failed to initialize. Aborting setup.");
        return;
    }

    // 1. Vérifier l'état initial et rediriger si nécessaire
    checkAuthStateAndRedirect();

    // 2. Écouter les changements d'état futurs
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth State Change Event:', event, session);
        // Mettre à jour l'UI après un changement d'état (login/logout dans un autre onglet, etc.)
        // La redirection initiale gère le chargement de page.
        updateUserUI(session?.user ?? null);
    });

    // 3. Attacher les gestionnaires aux formulaires et boutons (Identique à avant)

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
