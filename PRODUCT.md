# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Utilisateur primaire : **le correcteur 42 en soutenance**. Il ouvre le projet
qu'il n'a jamais vu, dispose de quelques minutes, et parcourt la grille
d'évaluation point par point : lancer le serveur, ouvrir deux onglets sur deux
URLs de room, vérifier que la séquence de pièces est identique, que les
pénalités arrivent, que le spectrum bouge, que le host contrôle le départ, que
la couverture de tests passe le seuil. Son succès = pouvoir cocher chaque
exigence sans avoir à demander « et ça, où est-ce que je le vois ? ».

Utilisateur secondaire, réel mais non prioritaire : le joueur en cluster qui
rejoint une partie improvisée via une URL partagée.

## Product Purpose

Red Tetris est un Tetris multijoueur en réseau (projet 42, sujet v5.2,
`subject.pdf` à la racine). Chaque joueur a son propre terrain 10×20 et reçoit
la même séquence de pièces que ses adversaires ; effacer _n_ lignes envoie _n−1_
lignes de pénalité indestructibles aux autres. Le dernier joueur en vie gagne.
Le mode solo est supporté.

Le produit existe pour être **évalué puis joué** : il doit être conforme au
sujet, fonctionnel de bout en bout, et suffisamment agréable pour qu'une partie
de démonstration donne envie d'en relancer une.

## Positioning

Ce qu'un projet Red Tetris voisin ne peut pas reprendre tel quel :

- **Le client simule, le serveur arbitre.** Toute la physique du jeu (collision,
  rotation, lock, clear) tourne côté navigateur en fonctions pures ; le serveur
  distribue une séquence de 500 pièces commune, relaie et tranche (pénalités,
  score, victoire, host). Cette répartition est le cœur de l'architecture, pas
  un détail d'implémentation.
- **L'adversaire est visible pour de vrai.** Le sujet n'exige que le spectrum
  (hauteur par colonne). Ici s'y ajoute un mini-board temps réel de chaque
  adversaire, throttlé à 200 ms côté serveur et diffusé hors Redux pour ne rien
  coûter au framerate.
- **Feeling de Tetris moderne**, pas de Tetris scolaire : DAS, lock delay avec
  resets, hold, preview.

## Operating Context

- Session = URL. `http://<host>:<port>/<room>/<playerName>` fait tout : pas de
  compte, pas de formulaire, pas d'écran de connexion. Le premier arrivé dans
  une room est host ; il lance la partie. Une fois lancée, les arrivants
  deviennent spectateurs jusqu'au round suivant.
- Démonstration typique : deux onglets côte à côte sur le même écran, ou deux
  postes du cluster. La comparaison visuelle entre les deux fenêtres fait partie
  de l'évaluation (mêmes pièces, pénalités qui arrivent).
- Cycle développeur : `npm ci` → `npm run dev` (nodemon + webpack watch) ;
  `npm run build` avant commit car `public/bundle.js` est versionné et servi en
  statique ; `npm test` doit rester au-dessus des seuils de couverture.
- Aucune persistance : tout l'état (parties, scores, leaderboard) vit en mémoire
  dans le processus serveur et disparaît au redémarrage. C'est explicitement
  autorisé par le sujet.

## Capabilities and Constraints

Acquis, à préserver :

- Terrain 10×20, 7 tétrominos originaux, rotation avec wall kicks, spectrum
  adversaire, pénalités _n−1_ indestructibles, host transférable, parties
  concurrentes multiples, solo et multijoueur.
- Contrôles clavier exclusivement : ←/→ déplacer, ↑ rotation, ↓ soft drop,
  Espace hard drop, C hold.
- **Score et leaderboard global** : barème Tetris classique (100/300/500/800),
  meilleur score par nom, top 10, en mémoire.
- **Hold + aperçu de la pièce suivante.**
- **DAS (167 ms puis 33 ms) et lock delay (500 ms, 15 resets max).**
- **Vue live des adversaires** : spectrum + mini-board temps réel.

Contraintes techniques imposées par le sujet, non négociables :

- Code client sans `this`, composants fonctionnels, logique de plateau en
  fonctions pures ; code serveur orienté objet (classes `Player`, `Piece`,
  `Game`).
- Interdits : `<table>`, canvas, SVG, jQuery ou toute manipulation DOM directe.
  Layout en grid/flexbox uniquement.
- SPA : `index.html` + `bundle.js`, aucun autre échange HTML ; communication
  temps réel via socket.io.
- Couverture de tests ≥ 70 % statements/functions/lines et ≥ 50 % branches,
  appliquée par `coverageThreshold` dans `package.json`.

Non implémenté — ne pas laisser croire le contraire : modes de jeu alternatifs
(pièces invisibles, gravité accrue), persistance des scores, comptes
utilisateurs, support tactile ou manette.

## Brand Commitments

- Le nom **RED TETRIS** est figé (imposé par le sujet).
- L'interface est rédigée en anglais ; les commentaires du code sont en
  français. Conserver cette séparation.
- La direction visuelle actuelle (dégradé pastel violet→rose, glassmorphisme,
  blocs « 3D plastique », Nunito + Orbitron) est **incumbent mais non
  contractuelle** : le propriétaire du projet l'a explicitement déclarée
  remplaçable.

## Evidence on Hand

- `subject.pdf` (v5.2) à la racine : source de vérité pour toute exigence
  d'évaluation.
- Suite de tests dans `test/` (server, client, shared, intégration socket.io) —
  le chiffre de couverture réel doit être relu depuis `npm test`, jamais cité de
  mémoire.
- Aucun témoignage, aucun utilisateur réel, aucun benchmark, aucun classement
  historique : le leaderboard est vide à chaque démarrage. Ne rien fabriquer
  pour remplir un écran.

## Product Principles

1. **La conformité doit se voir.** Une exigence du sujet qui fonctionne mais
   qu'un correcteur ne peut pas constater en quelques secondes est à moitié
   livrée.
2. **L'URL est la seule porte d'entrée.** Rien ne doit s'interposer entre le
   lien partagé et la partie.
3. **Le client simule, le serveur arbitre.** Toute évolution respecte cette
   frontière ; déplacer la simulation côté serveur casserait le modèle.
4. **Aucun bonus au prix du mandatory.** Les extras ne sont évalués que si la
   partie obligatoire est complète et fonctionnelle.
5. **Rien d'inventé.** Pas de score de démonstration, pas de faux adversaire,
   pas de persistance simulée : les états vides sont montrés tels quels.
