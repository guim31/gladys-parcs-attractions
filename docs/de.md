# Freizeitparks (Parcs d'attractions)

Die **Live-Wartezeiten und Öffnungszeiten von Freizeitparks**, Attraktion für Attraktion:
Europa-Park, Phantasialand, Disneyland Paris, Efteling, Heide Park… und alle von ThemeParks.wiki
abgedeckten Parks (rund 200 weltweit). **Kein Konto, kein Schlüssel.**

**Powered by [ThemeParks.wiki](https://www.themeparks.wiki).** Inoffizielle Integration, ohne
Verbindung zu ThemeParks.wiki oder zu einem Park oder Betreiber: Park- und Attraktionsnamen sind
Marken ihrer Inhaber und dienen nur der Identifizierung. Ohne Parkbesuch entwickelt: die Daten
wurden am 30.10.2026 live geprüft. Rückmeldungen sind willkommen.

## Was du bekommst

- Ein **Gerät pro Park**, den du hinzufügst: Park geöffnet, heutige Öffnungszeiten (in der
  Ortszeit des Parks), durchschnittliche Wartezeit und Zahl der gestörten Attraktionen.
- Ein **Gerät pro Attraktion**, die du hinzufügst: angezeigte Wartezeit (Minuten), in Betrieb oder
  nicht, Zustand (in Betrieb, gestört, geschlossen, in Renovierung).
- Ein **Widget** „Wartezeiten“: deine Attraktionen nach Wartezeit sortiert, in Grün, Orange oder
  Rot, mit den Öffnungszeiten ihres Parks.
- Vier **Szenen-Auslöser**: die Wartezeit fällt unter eine Schwelle, eine Attraktion fällt aus,
  eine Attraktion ist wieder in Betrieb, der Park öffnet.
- Eine **Szenen-Aktion**: die Wartezeiten deiner Attraktionen in einem fertigen Satz.

## Voraussetzungen

- Gladys Assistant **5.3.0** oder neuer.
- Internetzugang von Gladys aus: die Daten kommen von der API von ThemeParks.wiki.
- Kein Konto, kein API-Schlüssel.

## Installation

1. Öffne in Gladys **Integrationen → Von GitHub installieren**.
2. Gib `https://github.com/guim31/gladys-parcs-attractions` ein und bestätige.
3. Öffne die Konfiguration der Integration, sobald sie gestartet ist.

## Konfiguration

### Einstellungen

- **Parks**: die von ThemeParks.wiki abgedeckten Parks in Europa, französische zuerst. Wähle einen
  oder mehrere.
- **Andere Parks**: jeder andere Park von ThemeParks.wiki (Amerika, Asien…), mit Namen oder
  ThemeParks.wiki-ID, durch Kommas getrennt: `Magic Kingdom Park, Tokyo DisneySea`. Der Name eines
  Resorts (`Walt Disney World® Resort`) bringt alle seine Parks. Akzente und Großschreibung spielen
  keine Rolle.
- **Aktualisierung**: alle 5, 10 oder 15 Minuten (standardmäßig 5, das Minimum des Dienstes).
- **Sprache der Namen und Nachrichten**: standardmäßig Französisch. Die Namen der Funktionen werden
  beim Hinzufügen eines Geräts festgelegt; Zustandstexte, Widget und Szenen-Aktion folgen dieser
  Einstellung.

### Parks und Attraktionen hinzufügen

Speichere die Konfiguration: nach einigen Sekunden listet der Tab **Entdecken** jeden gewählten
Park und dann alle seine Attraktionen auf („Europa-Park · Blue Fire Megacoaster“). Füge zu Gladys
hinzu, was du willst: den Park für seine Öffnungszeiten, die wichtigen Attraktionen für ihre
Wartezeiten. Ein Park mit einem hinzugefügten Gerät wird weiter gelesen, auch wenn du ihn abwählst.

### Prüfen

Die Aktion **Status** der Konfiguration listet die gelesenen Parks, die Zahl der gefundenen
Attraktionen, die Zeit der letzten Abfrage, den letzten Fehler und die per Namen eingegebenen
Parks, die nicht gefunden wurden.

## Geräte

**Park** („Parc Asterix“):

| Funktion                    | Typ            | Wert                                                           |
| --------------------------- | -------------- | -------------------------------------------------------------- |
| Park geöffnet               | Eingang, binär | 1 während der heute veröffentlichten Öffnungszeiten            |
| Heutige Öffnungszeiten      | Text           | `09:00–18:00`, „heute geschlossen“, in der Ortszeit des Parks  |
| Durchschnittliche Wartezeit | Dauer, Minuten | Mittel der angezeigten Wartezeiten der Attraktionen in Betrieb |
| Gestörte Attraktionen       | Zähler         | vom Park als gestört gemeldete Attraktionen                    |

**Attraktion** („Parc Asterix · Thunder 2 Zeus“):

| Funktion   | Typ            | Wert                                                            |
| ---------- | -------------- | --------------------------------------------------------------- |
| Wartezeit  | Dauer, Minuten | angezeigte Wartezeit der normalen Schlange; **0 außer Betrieb** |
| In Betrieb | Eingang, binär | 1 in Betrieb, 0 gestört, geschlossen oder in Renovierung        |
| Zustand    | Text           | in Betrieb, gestört, geschlossen, in Renovierung                |

Attraktionen ohne Schlange (Spielplätze, Walk-throughs) veröffentlichen keine Wartezeit. Abend-
Events mit eigenem Ticket und frühe Stunden für Hotelgäste zählen nicht als Öffnung des Parks.

## Dashboard-Widget

**Wartezeiten**: eine Zeile pro Attraktion (höchstens 10), mit dem Namen, den du ihr in Gladys
gegeben hast:

- die Wartezeit, **grün** bis 15 Minuten, **orange** bis 45, **rot** darüber;
- „gestört“, „geschlossen“… in Grau, wenn die Attraktion nicht in Betrieb ist, „Daten veraltet“,
  wenn der Dienst seit 45 Minuten nicht antwortet.

Einstellungen: die angezeigten Attraktionen (standardmäßig alle), die Reihenfolge (kürzeste oder
längste Wartezeit zuerst), die Zeile mit den **Öffnungszeiten des Parks** oben („Parc Asterix:
geöffnet bis 18:00“) und die **ThemeParks.wiki**-Schaltfläche unten, beide ausblendbar.

## Szenen-Auslöser

| Auslöser                       | Wann                                                             | Felder                 |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------- |
| Wartezeit unter einer Schwelle | die Wartezeit einer Attraktion in Betrieb fällt auf die Schwelle | Attraktionen, Schwelle |
| Attraktion gestört             | eine Attraktion in Betrieb fällt aus                             | Attraktionen           |
| Attraktion wieder in Betrieb   | eine gestörte Attraktion ist wieder in Betrieb                   | Attraktionen           |
| Park öffnet                    | ein Park erreicht seine Öffnungszeit                             | Parks                  |

Schwellen: 5, 10, 15, 20, 30, 45 oder 60 Minuten. Eine Wartezeit wird nur zwischen zwei Abfragen in
Betrieb verglichen: die erste Wartezeit am Morgen löst nichts aus. Ein leeres Attraktions- oder
Parkfeld gilt für jede verfolgte. Variablen: Attraktion, Park, Wartezeit (Minuten); beim Park sein
Name und seine Öffnungszeiten.

## Szenen-Aktion

**Wartezeiten abrufen**: die gewählten Attraktionen (standardmäßig alle) in einem Satz, für eine
Nachricht oder einen Lautsprecher: „Thunder 2 Zeus: 70 Minuten Wartezeit. Osiris Convolvulis:
gestört.“ Ausgaben: der Satz, die kürzeste Wartezeit in Minuten (-1, wenn keine Attraktion in
Betrieb ist) und die Zahl der Attraktionen in Betrieb, für einen Schritt „Nur fortfahren, wenn“.

## Szenen-Beispiele

- **Kurze Schlange**: Auslöser „Wartezeit unter einer Schwelle“ (Blue Fire, 15 Min.) → Nachricht
  an dein Handy.
- **Störung**: Auslöser „Attraktion gestört“ → Nachricht „{{attraction_name}} ist gestört“.
- **Morgenüberblick** am Parktag: um 08:30 Aktion „Wartezeiten abrufen“ → Satz vorlesen.

## Daten und Aktualisierung

- Quelle: die öffentliche API von [ThemeParks.wiki](https://www.themeparks.wiki), ohne Schlüssel.
  Die Nutzungsbedingungen verlangen einen eindeutigen User-Agent, Live-Daten **höchstens alle fünf
  Minuten** (der Dienst aktualisiert in diesem Takt) und den Hinweis „Powered by ThemeParks.wiki“,
  wo die Daten gezeigt werden: Konfiguration, diese Anleitung und das Widget tragen ihn.
- Eine Anfrage pro Park und Aktualisierung, dazu die Öffnungszeiten einmal am Tag (oder alle sechs
  Stunden). Das Limit des Dienstes (300 Anfragen pro Minute) ist weit entfernt; eine Ablehnung
  (HTTP 429) pausiert die Abfragen für die verlangte Zeit.
- Die Wartezeiten sind die von den Parks angezeigten: sie können von der echten Wartezeit abweichen.

## Fehlerbehebung

- **Nichts in Entdecken**: prüfe, dass ein Park gewählt und gespeichert ist, und starte **Status**.
- **„Parks nicht gefunden“**: prüfe die Schreibweise im
  [Verzeichnis von ThemeParks.wiki](https://www.themeparks.wiki/browse/directory) oder nutze die
  ID des Parks.
- **„Daten veraltet“**: der Dienst antwortet seit 45 Minuten nicht; die Aktion Status zeigt den
  letzten Fehler.
- **Keine Wartezeit bei einer Attraktion**: der Park zeigt keine an (Spielplatz, Walk-through),
  oder sie ist geschlossen.
- Protokolle: `LOG_LEVEL=debug` zeigt jede Abfrage.

## Einschränkungen

- Ohne die Hardware entwickelt (ohne Parkbesuch): Rückmeldungen sind willkommen.
- Nur die normale Schlange wird gelesen: weder Single Rider noch virtuelle Schlangen noch bezahlte
  Expresspässe.
- Shows und Restaurants werden nicht als Geräte angeboten.
- Die Öffnungszeiten sind die vom Park veröffentlichten; eine unangekündigte Änderung erscheint bei
  der nächsten Abfrage der Öffnungszeiten.
- Park- und Attraktionsnamen kommen vom Dienst, meist auf Englisch.

## Danksagung

- Daten: [ThemeParks.wiki](https://www.themeparks.wiki) und seine Mitwirkenden, frei nutzbar mit
  Quellenangabe.
- Integration: [guim31](https://github.com/guim31), Lizenz Apache-2.0.
