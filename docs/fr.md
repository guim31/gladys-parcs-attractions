# Parcs d'attractions

Les **temps d'attente en direct et les horaires des parcs d'attractions**, attraction par
attraction : Disneyland Paris, Parc Astérix, Futuroscope, Europa-Park, Efteling, PortAventura… et
tous les parcs couverts par ThemeParks.wiki (environ 200 dans le monde). **Sans compte ni clé.**

**Données : [ThemeParks.wiki](https://www.themeparks.wiki).** Intégration non officielle, sans
lien avec ThemeParks.wiki ni avec aucun parc ou exploitant : les noms des parcs et des attractions
sont des marques de leurs propriétaires, cités pour identification. Développée sans visite des
parcs : les données ont été vérifiées en direct le 30/10/2026. Vos retours sont les bienvenus.

## Ce que vous obtenez

- Un **appareil par parc** ajouté : parc ouvert, horaires du jour (à l'heure du parc), attente
  moyenne et nombre d'attractions en panne.
- Un **appareil par attraction** ajoutée : temps d'attente affiché (minutes), en service ou non,
  état (en service, en panne, fermée, en réhabilitation).
- Un **widget** « Temps d'attente » : vos attractions triées par attente, en vert, orange ou rouge,
  avec les horaires de leur parc.
- Quatre **déclencheurs de scène** : l'attente passe sous un seuil, une attraction tombe en panne,
  une attraction est remise en service, le parc ouvre.
- Une **action de scène** : les attentes de vos attractions en une phrase prête à envoyer.

## Prérequis

- Gladys Assistant **5.3.0** ou plus récent.
- Un accès Internet depuis Gladys : les données viennent de l'API de ThemeParks.wiki.
- Ni compte, ni clé d'API.

## Installation

1. Dans Gladys, ouvrez **Intégrations → Installer depuis GitHub**.
2. Saisissez `https://github.com/guim31/gladys-parcs-attractions` et validez.
3. Ouvrez la configuration de l'intégration une fois qu'elle a démarré.

## Configuration

### Réglages

- **Parcs** : les parcs européens couverts par ThemeParks.wiki, français en tête. Choisissez-en un
  ou plusieurs.
- **Autres parcs** : tout autre parc de ThemeParks.wiki (Amérique, Asie…), par son nom ou son
  identifiant ThemeParks.wiki, séparés par des virgules : `Magic Kingdom Park, Tokyo DisneySea`. Le
  nom d'un complexe (`Walt Disney World® Resort`) apporte tous ses parcs. Accents et majuscules
  n'importent pas.
- **Rafraîchissement** : toutes les 5, 10 ou 15 minutes (5 par défaut, le minimum permis par le
  service).
- **Langue des noms et messages** : français par défaut. Les noms des fonctionnalités sont figés à
  l'ajout d'un appareil ; les textes d'état, le widget et l'action de scène suivent ce réglage.

### Ajouter parcs et attractions

Enregistrez la configuration : quelques secondes plus tard, l'onglet **Découverte** liste chaque
parc choisi, puis toutes ses attractions (« Disneyland Park · Big Thunder Mountain »). Ajoutez à
Gladys ce qui vous intéresse : le parc pour ses horaires, les attractions qui comptent pour leurs
attentes. Un parc dont un appareil est ajouté reste lu même si vous le décochez.

### Vérifier

L'action **État** de la configuration liste les parcs lus, le nombre d'attractions trouvées,
l'heure de la dernière lecture, la dernière erreur et les parcs saisis par leur nom qui n'ont pas
été trouvés.

## Appareils

**Parc** (« Parc Asterix ») :

| Fonctionnalité       | Type            | Valeur                                                    |
| -------------------- | --------------- | --------------------------------------------------------- |
| Parc ouvert          | entrée, binaire | 1 pendant les horaires d'ouverture publiés du jour        |
| Horaires du jour     | texte           | `09:00–18:00`, « fermé aujourd'hui », à l'heure du parc   |
| Attente moyenne      | durée, minutes  | moyenne des attentes affichées des attractions en service |
| Attractions en panne | compteur        | attractions annoncées en panne par le parc                |

**Attraction** (« Parc Asterix · Thunder 2 Zeus ») :

| Fonctionnalité  | Type            | Valeur                                                |
| --------------- | --------------- | ----------------------------------------------------- |
| Temps d'attente | durée, minutes  | attente affichée en file normale ; **0 hors service** |
| En service      | entrée, binaire | 1 en service, 0 en panne, fermée ou en réhabilitation |
| État            | texte           | en service, en panne, fermée, en réhabilitation       |

Les attractions sans file (aires de jeux, parcours à pied) ne publient pas d'attente. Les soirées à
billet séparé et les heures matinales réservées aux hôtels ne comptent pas comme ouverture du parc.

## Widget de tableau de bord

**Temps d'attente** : une ligne par attraction (10 au plus), sous le nom que vous lui avez donné
dans Gladys :

- l'attente, en **vert** jusqu'à 15 minutes, **orange** jusqu'à 45, **rouge** au-delà ;
- « en panne », « fermée »… en gris quand l'attraction n'est pas en service, « données périmées »
  quand le service ne répond plus depuis 45 minutes.

Réglages : les attractions affichées (toutes par défaut), l'ordre (attente la plus courte ou la
plus longue d'abord), la ligne des **horaires du parc** au-dessus (« Parc Asterix : ouvert jusqu'à
18:00 ») et le bouton de crédit **ThemeParks.wiki** en dessous, tous deux masquables.

## Déclencheurs de scène

| Déclencheur                  | Quand                                                          | Champs             |
| ---------------------------- | -------------------------------------------------------------- | ------------------ |
| Attente sous un seuil        | l'attente d'une attraction en service descend au seuil ou sous | attractions, seuil |
| Attraction en panne          | une attraction en service tombe en panne                       | attractions        |
| Attraction remise en service | une attraction en panne est de nouveau en service              | attractions        |
| Le parc ouvre                | un parc atteint son heure d'ouverture                          | parcs              |

Seuils : 5, 10, 15, 20, 30, 45 ou 60 minutes. Une attente n'est comparée qu'entre deux lectures en
service : la première attente du matin ne déclenche rien. Un champ attraction ou parc vide vaut
pour n'importe lequel des suivis. Variables : attraction, parc, attente (minutes) ; pour le parc,
son nom et ses horaires.

## Action de scène

**Obtenir les temps d'attente** : les attractions choisies (toutes par défaut) en une phrase, pour
un message ou une enceinte : « Thunder 2 Zeus : 70 minutes d'attente. Osiris Convolvulis : en
panne. » Sorties : la phrase, l'attente la plus courte en minutes (-1 si aucune attraction n'est en
service) et le nombre d'attractions en service, pour une étape « Continuer seulement si ».

## Exemples de scènes

- **File courte** : déclencheur « Attente sous un seuil » (Big Thunder Mountain, 15 min) → envoyer
  un message sur votre téléphone.
- **Panne** : déclencheur « Attraction en panne » → message « {{attraction_name}} est en panne ».
- **Point du matin** le jour de la sortie : à 08:30, action « Obtenir les temps d'attente » → lire
  la phrase sur une enceinte.

## Données et rafraîchissement

- Source : l'API publique de [ThemeParks.wiki](https://www.themeparks.wiki), sans clé. Ses
  conditions demandent un User-Agent explicite, des données en direct lues **au plus une fois toutes
  les cinq minutes** (le service se met à jour à ce rythme) et la mention « Powered by
  ThemeParks.wiki » là où les données sont montrées : l'écran de configuration, ce guide et le
  widget la portent.
- Une requête par parc et par rafraîchissement, plus les horaires une fois par jour (ou toutes les
  six heures). La limite du service (300 requêtes par minute) est loin ; un refus (HTTP 429)
  suspend les lectures le temps qu'il demande.
- Les attentes sont celles affichées par les parcs : elles peuvent différer de l'attente réelle.

## Dépannage

- **Rien dans Découverte** : vérifiez qu'un parc est choisi et enregistré, puis lancez **État**.
- **« Parcs introuvables »** : vérifiez l'orthographe dans
  [l'annuaire de ThemeParks.wiki](https://www.themeparks.wiki/browse/directory), ou utilisez
  l'identifiant du parc.
- **« données périmées »** : le service ne répond plus depuis 45 minutes ; l'action État montre la
  dernière erreur.
- **Pas d'attente sur une attraction** : le parc n'en affiche pas (aire de jeux, parcours à pied),
  ou elle est fermée.
- Journaux : `LOG_LEVEL=debug` montre chaque lecture.

## Limites

- Développée sans le matériel (sans visite des parcs) : vos retours sont les bienvenus.
- Seule la file normale est lue : ni file single rider, ni files virtuelles, ni coupe-files payants.
- Les spectacles et restaurants ne sont pas proposés comme appareils.
- Les horaires sont ceux publiés par le parc ; un changement non annoncé apparaît à la lecture
  suivante des horaires.
- Les noms des parcs et attractions viennent du service, surtout en anglais.

## Crédits

- Données : [ThemeParks.wiki](https://www.themeparks.wiki) et ses contributeurs, libres d'usage
  avec mention.
- Intégration : [guim31](https://github.com/guim31), licence Apache-2.0.
