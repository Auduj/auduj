/**
 * supabase-integration.js
 * Gère l'interaction entre le frontend Auduj et le backend Supabase.
 * - Initialisation du client Supabase
 * - Authentification (Inscription, Connexion, Déconnexion) + Redirections
 * - Gestion des données du tableau de bord (Sauvegarde, Lecture)
 */

// --- Configuration ---
const SUPABASE_URL = 'https://mbkiwpsbprcqhyafyifl.supabase.co'; // Gardez vos clés réelles ici
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ia2l3cHNicHJjcWh5YWZ5aWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MDYzNDEsImV4cCI6MjA2MDI4MjM0MX0.d5QxMFrOcF91cz0zhrYuC2mFCzI8Juu54eDNF2GC7qE'; // Gardez vos clés réelles ici

let _supabase; // Variable pour le client Supabase

// Vérification simple que les clés sont définies (CORRIGÉ)
if (!SUPABASE_URL || SUPABASE_URL === 'VOTRE_SUPABASE_URL' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'VOTRE_SUPABASE_ANON_KEY') {
    console.error("Erreur: Veuillez définir SUPABASE_URL et SUPABASE_ANON_KEY dans supabase-integration.js");
    // Vous pouvez ajouter ici un 'return;' ou une autre logique pour arrêter si les clés manquent vraiment.
} else {
    // Initialisation du client Supabase
    // Assurez-vous que cette partie est bien dans le 'else' ou après le bloc 'if' corrigé
    const { createClient } = supabase;
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
    const feedbackDiv = document.getElementById('form-feedback-signup'); // Cible le div de feedback
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
        // Optionnel: rediriger vers une page de succès ou de connexion
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
    const feedbackDiv = document.getElementById('form-feedback-login'); // Cible le div de feedback
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
        // La redirection sera gérée par onAuthStateChange ou le check initial
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
        // Rediriger vers la page d'accueil ou de connexion après déconnexion
        window.location.href = 'index.html';
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

async function saveGameEntry(gameData) {
    const userId = await getUserProfileId();
    const feedbackDiv = document.getElementById('entry-feedback');

    if (!userId) { alert("Erreur: Utilisateur non connecté."); return; }
    if (!_supabase) { alert("Erreur: Client Supabase non initialisé."); return; }

    if (feedbackDiv) { // Reset feedback
        feedbackDiv.classList.add('hidden');
        feedbackDiv.textContent = '';
        feedbackDiv.classList.remove('text-green-500', 'text-red-500', 'border', 'border-green-500', 'border-red-500', 'p-2', 'rounded-md', 'text-sm');
    }

    try {
        const { data, error } = await _supabase
            .from('games')
            .insert([{
                user_id: userId,
                hero_id: parseInt(gameData.hero, 10),
                map_id: parseInt(gameData.map, 10),
                kills: parseInt(gameData.kills, 10),
                deaths: parseInt(gameData.deaths, 10),
                assists: parseInt(gameData.assists, 10),
                objective_score: gameData.objective_score ? parseInt(gameData.objective_score, 10) : 0,
                result: gameData.result,
                notes: gameData.notes
            }]).select();

        if (error) throw error;

        console.log('Partie enregistrée:', data);
        if (feedbackDiv) {
            feedbackDiv.classList.remove('hidden');
            feedbackDiv.classList.add('text-green-500', 'border', 'border-green-500', 'p-2', 'rounded-md', 'text-sm');
            feedbackDiv.textContent = 'Partie enregistrée avec succès !';
        }
        // Vider seulement les champs variables du formulaire
        const form = document.getElementById('game-entry-form');
        if(form) {
            form.kills.value = '';
            form.deaths.value = '';
            form.assists.value = '';
            form.objective_score.value = '';
            form.result.value = '';
            form.notes.value = '';
        }
        fetchAndDisplayUserStats(); // Rafraîchir les stats

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la partie:', error.message);
        if (feedbackDiv) {
            feedbackDiv.classList.remove('hidden');
            feedbackDiv.classList.add('text-red-500', 'border', 'border-red-500', 'p-2', 'rounded-md', 'text-sm');
            feedbackDiv.textContent = `Erreur: ${error.message}`;
        }
    } finally {
        setTimeout(() => { if (feedbackDiv) feedbackDiv.classList.add('hidden'); }, 5000);
    }
}

async function fetchAndDisplayUserStats() {
    const userId = await getUserProfileId();
    if (!userId || !_supabase) return;

    const dashboardContent = document.getElementById('dashboard-content');
    if (!dashboardContent || dashboardContent.classList.contains('hidden')) return; // Ne pas charger si dashboard caché

    try {
        const { data: games, error } = await _supabase
            .from('games')
            .select(`*, heroes ( name ), maps ( name )`)
            .eq('user_id', userId)
            .order('played_at', { ascending: false });

        if (error) throw error;

        // --- Calculs de Stats ---
        const totalGames = games.length;
        let totalKills = 0, totalDeaths = 0, totalAssists = 0, wins = 0;
        const heroCounts = {};

        games.forEach(game => {
            totalKills += game.kills;
            totalDeaths += game.deaths;
            totalAssists += game.assists;
            if (game.result === 'win') wins++;
            if (game.heroes) heroCounts[game.heroes.name] = (heroCounts[game.heroes.name] || 0) + 1;
        });

        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        const kda = totalDeaths > 0 ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) : (totalKills + totalAssists).toFixed(2);

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
            const gamesToShow = games.slice(0, 15); // Show last 15

            if (gamesToShow.length === 0) {
                 historyTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">Aucune partie enregistrée.</td></tr>';
            } else {
                gamesToShow.forEach(game => {
                    const row = `
                        <tr>
                            <td class="px-3 py-2 whitespace-nowrap text-xs text-gray-400">${new Date(game.played_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-light-text">${game.heroes?.name || '?'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.maps?.name || '?'}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-300">${game.kills}/${game.deaths}/${game.assists}</td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm font-semibold ${game.result === 'win' ? 'text-win' : game.result === 'loss' ? 'text-loss' : 'text-gray-300'}">${game.result || '?'}</td>
                            <td class="px-3 py-2 text-xs text-gray-400 max-w-xs truncate" title="${game.notes || ''}">${game.notes || ''}</td>
                        </tr>`;
                    historyTableBody.innerHTML += row;
                });
            }
        }
        // TODO: Mettre à jour les autres onglets (Par Héros, Par Map)

    } catch (error) {
        console.error("Erreur lors de la récupération/affichage des stats:", error.message);
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
    const authSection = document.getElementById('auth-section'); // Section affichée si non connecté sur dashboard

    if (user) {
        // --- Utilisateur Connecté ---
        if (userInfoDiv) userInfoDiv.style.display = 'flex'; // Afficher la section user info
        if (logoutBtn) logoutBtn.style.display = 'inline-block'; // Afficher bouton logout
        if (loginBtnHeader) loginBtnHeader.style.display = 'none'; // Cacher bouton login

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
                if (error && error.code !== 'PGRST116') throw error; // Ignorer '0 rows'
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
        if (authSection) authSection.classList.add('hidden'); // Cacher la section d'invite auth

        // Charger les données spécifiques au dashboard si on est sur cette page
        if (document.getElementById('dashboard-content')) {
             populateDropdowns();
             fetchAndDisplayUserStats();
        }

    } else {
        // --- Utilisateur Déconnecté ---
        if (userInfoDiv) userInfoDiv.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtnHeader) loginBtnHeader.style.display = 'inline-block'; // Afficher bouton login

        if (mobileLogin) mobileLogin.style.display = 'block';
        if (mobileLogout) mobileLogout.style.display = 'none';
        if (mobileGreeting) mobileGreeting.textContent = '';

        // Gérer contenu spécifique dashboard
        if (dashboardContent) dashboardContent.classList.add('hidden');
        if (authSection) authSection.classList.remove('hidden'); // Afficher la section d'invite auth
    }
}

// --- Initialisation et Écouteurs ---

/**
 * Vérifie l'état de connexion au chargement et applique les redirections si nécessaire.
 */
async function checkAuthStateAndRedirect() {
    if (!_supabase) {
        console.log("Supabase client not ready for auth check.");
        // Peut-être afficher un état d'erreur/chargement ?
        return;
    }

    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) {
        console.error("Erreur getSession:", error);
        return; // Ne pas rediriger en cas d'erreur de session
    }

    const user = session?.user ?? null;
    const currentPage = window.location.pathname.split('/').pop(); // Nom du fichier actuel

    console.log(`Checking auth state on page: ${currentPage}, user: ${user ? user.email : 'null'}`);

    // Pages nécessitant d'être connecté
    const protectedPages = ['dashboard.html'];
    // Pages nécessitant d'être déconnecté
    const publicOnlyPages = ['login.html', 'signup.html'];

    if (!user && protectedPages.includes(currentPage)) {
        console.log("User not logged in, redirecting to login...");
        window.location.replace('login.html'); // Utiliser replace pour éviter l'historique
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
        // Afficher une erreur globale à l'utilisateur ?
        return;
    }

    // 1. Vérifier l'état initial et rediriger si nécessaire
    checkAuthStateAndRedirect();

    // 2. Écouter les changements d'état futurs (ex: après login/logout manuel)
    _supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth State Change Event:', event, session);
        // Mettre à jour l'UI, mais la redirection initiale devrait déjà avoir eu lieu.
        // On pourrait re-vérifier la redirection ici si nécessaire, mais attention aux boucles.
        updateUserUI(session?.user ?? null);
    });

    // 3. Attacher les gestionnaires aux formulaires et boutons

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
            saveGameEntry(gameData);
        });
    }

}); // Fin DOMContentLoaded

