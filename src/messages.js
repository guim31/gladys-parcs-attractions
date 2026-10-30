// -----------------------------------------------------------------------------
// Texts sent from the container (feature names, action messages, widget
// contents, scene outputs), in the four languages of the Gladys interface.
// Entries are strings or functions of one parameter object. German says "du",
// Spanish "usted". Park and attraction names never translate (the API gives
// them in English for most parks).
// -----------------------------------------------------------------------------

export const INIT_FAILED = {
  en: 'Initialization failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

// Feature names, frozen when the device is created (configured language).
export const NAMES = {
  en: {
    open: 'Park open',
    hours: "Today's hours",
    average_wait: 'Average wait',
    down: 'Rides down',
    wait: 'Wait time',
    operating: 'In service',
    status: 'Status',
  },
  fr: {
    open: 'Parc ouvert',
    hours: 'Horaires du jour',
    average_wait: 'Attente moyenne',
    down: 'Attractions en panne',
    wait: "Temps d'attente",
    operating: 'En service',
    status: 'État',
  },
  de: {
    open: 'Park geöffnet',
    hours: 'Heutige Öffnungszeiten',
    average_wait: 'Durchschnittliche Wartezeit',
    down: 'Gestörte Attraktionen',
    wait: 'Wartezeit',
    operating: 'In Betrieb',
    status: 'Zustand',
  },
  es: {
    open: 'Parque abierto',
    hours: 'Horario de hoy',
    average_wait: 'Espera media',
    down: 'Atracciones averiadas',
    wait: 'Tiempo de espera',
    operating: 'En servicio',
    status: 'Estado',
  },
};

const plural = (count, one, many) => (count === 1 ? one : many);
const pluralFr = (count, one, many) => (count > 1 ? many : one);

// Status texts, widget contents and scene outputs.
export const TEXT = {
  en: {
    status_OPERATING: 'in service',
    status_DOWN: 'down',
    status_CLOSED: 'closed',
    status_REFURBISHMENT: 'under refurbishment',
    status_UNKNOWN: 'unknown',
    minutes: ({ wait }) => `${wait} min`,
    noWait: 'no wait posted',
    stale: 'data out of date',
    closedToday: 'closed today',
    noHours: 'no hours published',
    openUntil: ({ time }) => `open until ${time}`,
    opensAt: ({ time }) => `closed, opens at ${time}`,
    parkClosed: 'closed',
    parkLine: ({ name, state }) => `${name}: ${state}`,
    sentence: ({ name, wait }) => `${name}: ${wait} ${plural(wait, 'minute', 'minutes')} wait.`,
    sentenceNoWait: ({ name }) => `${name}: in service, no wait posted.`,
    sentenceStatus: ({ name, status }) => `${name}: ${status}.`,
    sentenceUnknown: ({ name }) => `${name}: no data right now.`,
    pickAttraction:
      'Add an attraction in the Discover tab of the integration, then choose it here.',
    gone: 'This attraction is no longer followed.',
    noAttraction: 'Nothing followed: add an attraction in the Discover tab of the integration.',
  },
  fr: {
    status_OPERATING: 'en service',
    status_DOWN: 'en panne',
    status_CLOSED: 'fermée',
    status_REFURBISHMENT: 'en réhabilitation',
    status_UNKNOWN: 'inconnu',
    minutes: ({ wait }) => `${wait} min`,
    noWait: "pas d'attente affichée",
    stale: 'données périmées',
    closedToday: "fermé aujourd'hui",
    noHours: 'horaires non publiés',
    openUntil: ({ time }) => `ouvert jusqu'à ${time}`,
    opensAt: ({ time }) => `fermé, ouvre à ${time}`,
    parkClosed: 'fermé',
    parkLine: ({ name, state }) => `${name} : ${state}`,
    sentence: ({ name, wait }) =>
      `${name} : ${wait} ${pluralFr(wait, 'minute', 'minutes')} d'attente.`,
    sentenceNoWait: ({ name }) => `${name} : en service, pas d'attente affichée.`,
    sentenceStatus: ({ name, status }) => `${name} : ${status}.`,
    sentenceUnknown: ({ name }) => `${name} : pas de donnée pour l'instant.`,
    pickAttraction:
      "Ajoutez une attraction dans l'onglet Découverte de l'intégration, puis choisissez-la ici.",
    gone: "Cette attraction n'est plus suivie.",
    noAttraction:
      "Rien n'est suivi : ajoutez une attraction dans l'onglet Découverte de l'intégration.",
  },
  de: {
    status_OPERATING: 'in Betrieb',
    status_DOWN: 'gestört',
    status_CLOSED: 'geschlossen',
    status_REFURBISHMENT: 'in Renovierung',
    status_UNKNOWN: 'unbekannt',
    minutes: ({ wait }) => `${wait} Min.`,
    noWait: 'keine Wartezeit angezeigt',
    stale: 'Daten veraltet',
    closedToday: 'heute geschlossen',
    noHours: 'keine Öffnungszeiten veröffentlicht',
    openUntil: ({ time }) => `geöffnet bis ${time}`,
    opensAt: ({ time }) => `geschlossen, öffnet um ${time}`,
    parkClosed: 'geschlossen',
    parkLine: ({ name, state }) => `${name}: ${state}`,
    sentence: ({ name, wait }) =>
      `${name}: ${wait} ${plural(wait, 'Minute', 'Minuten')} Wartezeit.`,
    sentenceNoWait: ({ name }) => `${name}: in Betrieb, keine Wartezeit angezeigt.`,
    sentenceStatus: ({ name, status }) => `${name}: ${status}.`,
    sentenceUnknown: ({ name }) => `${name}: gerade keine Daten.`,
    pickAttraction:
      'Füge im Tab „Entdecken“ der Integration eine Attraktion hinzu und wähle sie dann hier aus.',
    gone: 'Diese Attraktion wird nicht mehr verfolgt.',
    noAttraction:
      'Nichts wird verfolgt: Füge im Tab „Entdecken“ der Integration eine Attraktion hinzu.',
  },
  es: {
    status_OPERATING: 'en servicio',
    status_DOWN: 'averiada',
    status_CLOSED: 'cerrada',
    status_REFURBISHMENT: 'en renovación',
    status_UNKNOWN: 'desconocido',
    minutes: ({ wait }) => `${wait} min`,
    noWait: 'sin espera indicada',
    stale: 'datos desactualizados',
    closedToday: 'cerrado hoy',
    noHours: 'horario no publicado',
    openUntil: ({ time }) => `abierto hasta las ${time}`,
    opensAt: ({ time }) => `cerrado, abre a las ${time}`,
    parkClosed: 'cerrado',
    parkLine: ({ name, state }) => `${name}: ${state}`,
    sentence: ({ name, wait }) =>
      `${name}: ${wait} ${plural(wait, 'minuto', 'minutos')} de espera.`,
    sentenceNoWait: ({ name }) => `${name}: en servicio, sin espera indicada.`,
    sentenceStatus: ({ name, status }) => `${name}: ${status}.`,
    sentenceUnknown: ({ name }) => `${name}: sin datos por ahora.`,
    pickAttraction:
      'Añada una atracción en la pestaña Descubrir de la integración y luego elíjala aquí.',
    gone: 'Esta atracción ya no se sigue.',
    noAttraction:
      'No se sigue nada: añada una atracción en la pestaña Descubrir de la integración.',
  },
};

// Answer of the "Status" configuration action.
export const REPORTS = {
  en: {
    noPark: 'No park chosen: choose one or more parks above, then save.',
    park: ({ name, count }) => `■ ${name}: ${count} ${plural(count, 'attraction', 'attractions')}`,
    read: ({ age }) => `Last reading ${age} s ago.`,
    waiting: 'Not read yet.',
    error: ({ error }) => `Last error: ${error}`,
    unresolved: ({ names }) => `Parks not found: ${names}. See the guide.`,
    watched: ({ count }) => `${count} ${plural(count, 'device', 'devices')} added to Gladys.`,
  },
  fr: {
    noPark: 'Aucun parc choisi : choisissez un ou plusieurs parcs ci-dessus, puis enregistrez.',
    park: ({ name, count }) =>
      `■ ${name} : ${count} ${pluralFr(count, 'attraction', 'attractions')}`,
    read: ({ age }) => `Dernière lecture il y a ${age} s.`,
    waiting: 'Pas encore lu.',
    error: ({ error }) => `Dernière erreur : ${error}`,
    unresolved: ({ names }) => `Parcs introuvables : ${names}. Voir le guide.`,
    watched: ({ count }) =>
      `${count} ${pluralFr(count, 'appareil ajouté', 'appareils ajoutés')} à Gladys.`,
  },
  de: {
    noPark: 'Kein Park gewählt: wähle oben einen oder mehrere Parks und speichere.',
    park: ({ name, count }) => `■ ${name}: ${count} ${plural(count, 'Attraktion', 'Attraktionen')}`,
    read: ({ age }) => `Letzte Abfrage vor ${age} s.`,
    waiting: 'Noch nicht abgefragt.',
    error: ({ error }) => `Letzter Fehler: ${error}`,
    unresolved: ({ names }) => `Parks nicht gefunden: ${names}. Siehe Anleitung.`,
    watched: ({ count }) => `${count} ${plural(count, 'Gerät', 'Geräte')} zu Gladys hinzugefügt.`,
  },
  es: {
    noPark: 'Ningún parque elegido: elija uno o varios parques arriba y guarde.',
    park: ({ name, count }) => `■ ${name}: ${count} ${plural(count, 'atracción', 'atracciones')}`,
    read: ({ age }) => `Última lectura hace ${age} s.`,
    waiting: 'Aún no leído.',
    error: ({ error }) => `Último error: ${error}`,
    unresolved: ({ names }) => `Parques no encontrados: ${names}. Vea la guía.`,
    watched: ({ count }) =>
      `${count} ${plural(count, 'dispositivo añadido', 'dispositivos añadidos')} a Gladys.`,
  },
};

/** One text of a table, in a language (English when missing). */
export function say(table, language, key, params = {}) {
  const entry = table[language]?.[key] ?? table.en[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** The same text in every language of the table: `{ en, fr, de, es }`. */
export function render(table, key, params = {}) {
  return Object.fromEntries(
    Object.keys(table).map((language) => [language, say(table, language, key, params)]),
  );
}

/** Joins rendered messages (or plain strings), language by language, one per line. */
export function lines(...messages) {
  const languages = Object.keys(messages.find((m) => typeof m === 'object' && m) ?? { en: '' });
  return Object.fromEntries(
    languages.map((language) => [
      language,
      messages
        .filter((message) => message !== null && message !== undefined)
        .map((message) => (typeof message === 'string' ? message : message[language]))
        .join('\n'),
    ]),
  );
}
