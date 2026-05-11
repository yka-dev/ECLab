# ECLab

ECLab est une plateforme éducative interactive permettant de **concevoir, simuler et analyser des circuits électriques** directement depuis une interface web moderne.

Le projet vise à rendre l’apprentissage de l’électricité plus concret grâce à des **simulations en temps réel**, des **graphiques interactifs**, ainsi qu’un système de **sauvegarde de projets en ligne**.

---

## Aperçu du projet

### Démonstration vidéo

[![Voir la démonstration](https://img.youtube.com/vi/Vxvkl_3_1IU/maxresdefault.jpg)](https://www.youtube.com/watch?v=Vxvkl_3_1IU)

### Captures d’écran

<p align="center">
  <img width="576" height="304" alt="Picture1" src="https://github.com/user-attachments/assets/96917610-d820-40e3-a061-061cf586ce10" />
</p>

<p align="center">
  <img width="576" height="304" alt="Picture2" src="https://github.com/user-attachments/assets/72390816-5204-4db4-b534-18920011ff0d" />
</p>

<p align="center">
  <img width="576" height="261" alt="Picture3" src="https://github.com/user-attachments/assets/32a299db-5db6-4b96-bf37-a3fbec40fc38" />
</p>

<p align="center">
  <img width="576" height="230" alt="Picture4" src="https://github.com/user-attachments/assets/f42580f8-be62-46de-83a7-aac98a031996" />
</p>

<p align="center">
  <img width="576" height="304" alt="Picture5" src="https://github.com/user-attachments/assets/02930936-d452-4db5-8445-aefaa7c7e640" />

</p>


---

## Pourquoi ECLab ?

L’apprentissage de l’électricité peut être difficile, notamment parce que plusieurs concepts sont abstraits et complexes à visualiser. Comprendre le comportement du courant, de la tension ou l’effet d’un composant dans un circuit demande souvent beaucoup d’expérimentation.

ECLab a été conçu pour répondre à ce problème en offrant un environnement où les étudiants peuvent :

- Construire des circuits électriques visuellement
- Simuler leur comportement en temps réel
- Observer les résultats via des graphiques interactifs
- Sauvegarder leurs projets pour les réutiliser plus tard
- Expérimenter librement sans matériel physique

L’objectif est de rapprocher **la théorie de la pratique** afin de rendre l’apprentissage plus interactif, intuitif et accessible.

---

## Fonctionnalités

### Simulation de circuits électriques
Création et simulation de circuits avec différentes composantes électroniques utilisées dans des circuits réels.

### Interface de dessin interactive
Un espace de travail permettant de construire des circuits directement à l’écran grâce à une approche visuelle intuitive.

### Analyse mathématique des circuits
Utilisation de **Modified Nodal Analysis (MNA)** et de systèmes matriciels afin de résoudre les circuits de façon précise.

### Graphiques interactifs
Visualisation des résultats électriques comme :

- La tension
- Le courant
- L’évolution des valeurs dans le temps

### Sauvegarde en ligne
Les utilisateurs peuvent enregistrer leurs circuits et reprendre leur travail plus tard.

### Gestion des comptes utilisateurs
Authentification et gestion des projets personnels.

---

## Comment fonctionne l’interface ?

L’interface principale de ECLab est divisée en plusieurs sections :

### Barre de composants
Située à gauche, elle permet d’ajouter les composantes électroniques disponibles au circuit.

### Zone de dessin
Située au centre, elle sert à construire et modifier le schéma électrique de manière interactive.

### Graphiques de simulation
Affichés à droite ou en bas de l’interface, ils permettent d’observer les résultats de simulation en temps réel.

### Contrôles principaux
Les options comme le lancement de simulation, les projets sauvegardés et les paramètres sont accessibles depuis la barre supérieure.

Cette organisation permet de **concevoir, tester et analyser un circuit dans un seul environnement intégré**.

---

## Cas d’utilisation

### Élèves
Les étudiants peuvent :

- Construire leurs propres circuits
- Comprendre le comportement des résistances et sources de tension
- Observer les résultats de simulation
- Se pratiquer avant un examen

**Exemple :**  
Un élève construit un circuit simple avec une résistance et une source de tension afin de mieux comprendre le comportement du courant et de la tension.

### Enseignants
Les enseignants peuvent :

- Démontrer des concepts en classe
- Créer rapidement des exemples interactifs
- Modifier des circuits en temps réel
- Montrer immédiatement les impacts d’un changement

**Exemple :**  
Un enseignant ajoute une résistance pendant une démonstration et les élèves peuvent observer instantanément l’impact sur les résultats affichés.

---

## Innovation

ECLab se distingue par une combinaison de fonctionnalités pédagogiques et techniques :

- **Simulation interactive en temps réel**
- **Sauvegarde cloud des circuits**
- **Graphiques dynamiques pour visualiser les données électriques**
- **Apprentissage expérimental sans matériel physique**

Cette approche permet aux utilisateurs de comparer différentes configurations de circuits, d’analyser les résultats plus facilement et d’apprendre de manière autonome.

---

## Technologies utilisées

### Backend
- **Golang** — Gestion du serveur, logique applicative et API
- **PostgreSQL** — Base de données pour les utilisateurs et sauvegardes

### Frontend
- **TypeScript** — Développement de la logique client
- **React** — Interface graphique interactive

### Outils
- **Git & GitHub** — Gestion de versions et collaboration
- **Visual Studio Code** — Environnement de développement

---

## Justification technologique

Les technologies ont été sélectionnées selon trois critères :

### Performance
Golang permet de créer un backend rapide et efficace pour gérer les utilisateurs, sauvegardes et communications.

### Flexibilité
TypeScript et React permettent de créer une interface interactive moderne tout en facilitant le développement de simulations complexes.

### Collaboration
Git et GitHub simplifient le travail d’équipe, le suivi des changements et la gestion du code source.

---

## Défis techniques

Le développement de ECLab a présenté plusieurs défis importants.

### Résolution mathématique des circuits
L’un des principaux défis était d’assurer la précision des calculs liés au système **MNA (Modified Nodal Analysis)** afin que les simulations produisent des résultats cohérents.

### Apprentissage de nouvelles technologies
L’équipe a dû apprendre **TypeScript**, **React** et approfondir **Golang**, ce qui a ralenti certaines étapes du développement.

### Gestion des connexions électriques
La détection correcte des connexions entre les composantes dans le sandbox était complexe et nécessitait d’éviter les erreurs de circuit.

### Performance
Il fallait maintenir une expérience fluide même avec plusieurs composants affichés simultanément.

---

## Modélisation UML

<p align="center">
  <img width="1885" height="690" alt="Screenshot 2026-05-10 160041" src="https://github.com/user-attachments/assets/e43825e2-8028-41ec-8264-db771ecd9b8e" />
</p>
<p align="center">
  <img width="647" height="872" alt="Screenshot 2026-05-10 160055" src="https://github.com/user-attachments/assets/849471a0-4dfc-43e3-a8c7-c6ef0e9b2d41" />
</p>


---

## Architecture du projet

Le projet combine plusieurs domaines :

- **Physique** → Simulation des phénomènes électriques
- **Mathématiques** → Résolution matricielle des circuits
- **Développement logiciel** → Interface web, backend et sauvegardes
- **Base de données** → Gestion des comptes et projets utilisateurs

Cette combinaison rend ECLab à la fois technique, pédagogique et interactif.

---

## Équipe et répartition des tâches

### Yassine Akhouayri
- Gestion du serveur et de la base de données
- Gestion des comptes utilisateurs
- Gestion des sauvegardes en ligne

### Thomas Hoffmann
- Création du site internet
- Résolution d’équations
- Interface graphique (page d’accueil)

### Zakaria Soufli
- Interface graphique (dessin du schéma)
- Interaction avec les composants électroniques
- Graphiques de tension et potentiel

### Shehab Eddin Albikbachi
- Système matriciel et implémentation du NetList
- Gestion des composantes électroniques
- Graphiques électriques

---

## Perspectives d’amélioration

Avec davantage de temps, plusieurs améliorations pourraient être ajoutées :

### Plus de composantes électroniques
Permettre la création de circuits plus avancés et réalistes.

### Simulations plus interactives
Ajouter davantage d’éléments visuels comme :

- Moteurs
- Animations
- Composants réagissant en temps réel

### Visualisations avancées
Ajouter plus de types de graphiques et d’outils d’analyse.

### Bibliothèque de circuits exemples
Créer davantage de circuits prédéfinis afin d’aider les utilisateurs à apprendre plus rapidement.

---

## Conclusion

ECLab est une solution éducative conçue pour rendre l’apprentissage de l’électricité plus interactif, concret et accessible.

Grâce à une combinaison de **simulation en temps réel**, **analyse graphique**, **modélisation mathématique** et **sauvegarde en ligne**, l’application permet autant aux étudiants qu’aux enseignants de mieux comprendre les phénomènes électriques.

En réunissant **Golang**, **TypeScript**, **React** et **PostgreSQL**, le projet combine des concepts avancés de programmation, de mathématiques et de physique dans une plateforme unique orientée vers l’apprentissage.
