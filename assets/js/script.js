/**
 * script.js
 * Gère les fonctionnalités JavaScript de base du site Auduj.
 * - Menu mobile toggle
 */

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = mobileMenuButton ? mobileMenuButton.querySelector('i') : null; // Cible l'icône à l'intérieur

    if (mobileMenuButton && mobileMenu && menuIcon) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            // Change l'icône burger en croix et vice-versa
            if (mobileMenu.classList.contains('hidden')) {
                menuIcon.classList.remove('fa-times'); // Icône croix
                menuIcon.classList.add('fa-bars');    // Icône burger
            } else {
                menuIcon.classList.remove('fa-bars');
                menuIcon.classList.add('fa-times');
            }
        });
    } else {
        console.warn("Éléments du menu mobile non trouvés dans le DOM.");
    }

    // Vous pouvez ajouter ici d'autres scripts globaux si nécessaire.
    // Par exemple, gestion des animations au scroll, etc.

    // Note : Les scripts spécifiques à une page (formulaire contact, dashboard)
    // sont inclus directement dans les fichiers HTML respectifs pour plus de clarté
    // ou pourraient être chargés conditionnellement.
});
