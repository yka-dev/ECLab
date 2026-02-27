# ECLab

## L’équipe et la répartition des taches

### Yassine Akhouayri 
- Gestion du serveur et de la base de données 
- Gestion des comptes utilisateurs  
- Gestion des sauvegardes en ligne 

### Thomas Hoffmann 
- Création du site internet  
- Résolution d’équation 
- Interface graphique (Page d'accueil) 

### Zakaria Soufli 
- Interface graphique (Dessin du schéma)  
- Interaction entre l’utilisateur et les composants électroniques 
- Dessin de graphique de voltage et potentielle 

### Shehab Eddin Albikbachi 
- Système de matrices et implémentation du NetList 
- Gestion des composantes électroniques 

## L’idée

L’apprentissage liée à des concepts comme l’électricité est souvent complexe pour les étudiants. Ce sont des concepts assez abstraits et dure à visualiser ce qui rend la compréhension de ses phénomènes beaucoup plus difficile. L’application a donc pour objectif de simuler ces phénomènes complexes afin de faciliter la compréhension auprès des étudiants. 

## L’utilité

Notre application sert à modéliser des circuits électriques avec différents objets composants électrique que l’on retrouve dans la plupart des circuits concret. Cette application pourra aider ceux dans le secteur de l’éducation afin de bien modéliser leurs circuits pour que ceux-ci puissent bien comprendre et étudier les différents aspects de l’électricité. Les élèves pourront aussi bénéficier de notre application pour se pratiquer à construire des circuits pour leurs apprentissage individuel ou des examens 

## Outils et environnements

Notre projet utilise plusieurs langages adaptés aux différentes parties de l’application. Golang est utilisé pour le développement du serveur afin de gérer les données et les utilisateurs, les sauvegardes et la communication entre les utilisateurs et l’application. Typescript sera utilisé pour le développement du client, de la simulation et de l’interface graphique à l’aide de React. De plus, on prévoit utiliser PostgreSQL pour la base de données ce qui nous permettra de sauvegarder les données nécessaires en ligne. Git est utilisé comme outil de gestion de versions afin de permettre à l’équipe de travailler en collaboration sur le même projet. Il permet de suivre les modifications du code, de revenir à des versions précédentes en cas d’erreur et de fusionner le travail de plusieurs membres efficacement. L’utilisation de plateformes comme GitHub facilite également le partage du code et la coordination du projet. Finalement, pour l’édition du code, nous prévoyons utiliser Visual studio code.

## Cas d'utilisation

### Acteurs 

Élèves : utilisent l’application pour construire des circuits, simuler des phénomènes électriques, et s’entraîner pour leurs examens. 

Enseignants : utilisent l’application pour démontrer des concepts en classe, créer des exemples de circuits et analyser des résultats avec les élèves. 

### Scénarios d’utilisation 

Un élève crée un circuit électrique dans l’application afin de comprendre le fonctionnement des résistances et des sources de tension. Il lance la simulation, observe les résultats à l’aide des graphiques, puis sauvegarde son projet pour le réviser plus tard. 

Un enseignant utilise l’application en classe pour montrer en temps réel l’effet d’un changement de composant (exemple : ajouter une résistance). Les élèves peuvent visualiser immédiatement l’impact sur le courant et la tension grâce aux graphiques. 

## Modélisation UML
<img width="1127" height="1366" alt="UML format" src="https://github.com/user-attachments/assets/6df0617a-fc17-47df-8ffc-36954d78509e" />


## Vues
<img width="797" height="486" alt="Vue 1" src="https://github.com/user-attachments/assets/7f678693-6e03-4f25-801f-5c06d7f07d6f" />
<img width="677" height="289" alt="Vue 2" src="https://github.com/user-attachments/assets/076d58a8-7572-491c-9253-459332d8720e" />
Description du Vue de l'interface
L’image montre l’interface principale de ECLab.

À gauche : une barre contenant les composants électroniques disponibles.

Au centre : la zone de dessin du circuit, où l’utilisateur peut construire son schéma (exemple : résistance et LED).

En bas à droite : un graphique affichant les résultats de la simulation (tension, courant, etc.).

En haut : les options principales comme le lancement de la simulation, les projets et les paramètres.

Cette interface permet de concevoir, simuler et analyser des circuits électriques de manière simple et interactive.
