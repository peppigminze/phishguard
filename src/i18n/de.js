/**
 * Deutsch (Schweiz). Kein Eszett – ein Test stellt das sicher.
 * Für EN/FR: Datei kopieren, Werte übersetzen, in i18n.js registrieren.
 */
export default {
  meta: { htmlLang: 'de-CH', numberLocale: 'de-CH', name: 'Deutsch' },

  app: {
    name: 'PhishGuard',
    tagline: 'Phishing erkennen, bevor es wehtut.',
    simulationNotice: 'Simulation: Alles passiert nur in dieser App. Es werden keine Nachrichten versendet und keine echten Websites aufgerufen.',
    simulationShort: 'Nur Simulation',
    skipToContent: 'Zum Inhalt springen',
    loading: 'Szenarien werden geladen …',
    loadError: 'Die Szenarien konnten nicht geladen werden. Prüfe die Verbindung und lade die Seite neu.',
    offlineReady: 'PhishGuard funktioniert jetzt auch offline.',
    updateReady: 'Eine neue Version ist bereit.',
    reload: 'Neu laden'
  },

  nav: {
    label: 'Hauptnavigation',
    dashboard: 'Cockpit',
    train: 'Training',
    lexicon: 'Lexikon',
    stats: 'Fortschritt',
    admin: 'Trainer'
  },

  difficulty: { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer', all: 'Gemischt' },
  channel: { email: 'E-Mail', sms: 'SMS', voice: 'Anruf' },
  category: {
    paket: 'Paketdienst', bank: 'Bank', zahlung: 'Zahlungs-App', behoerde: 'Behörde', telekom: 'Telekom',
    'it-login': 'Konto-Login', 'ceo-fraud': 'CEO-Fraud', rechnung: 'Rechnungsbetrug', quishing: 'Quishing',
    intern: 'Intern', gutschein: 'Gewinnspiel', messenger: 'Messenger', oev: 'ÖV', krankenkasse: 'Krankenkasse',
    domain: 'Domain'
  },

  onboarding: {
    title: 'Willkommen bei PhishGuard',
    lead: 'Du bekommst realistische Mails, SMS und Anrufe. Entscheide bei jeder Nachricht: sicher, melden oder öffnen. Danach siehst du genau, woran man Phishing erkennt.',
    nameLabel: 'Wie sollen wir dich nennen?',
    namePlaceholder: 'z. B. Lena',
    start: 'Profil anlegen',
    persona: 'Im Training bist du Lena Brunner aus der Finanzabteilung der fiktiven Muster AG.',
    privacy: 'Dein Fortschritt bleibt in diesem Browser. Du kannst ihn jederzeit als Datei sichern.'
  },

  dashboard: {
    greeting: 'Hoi {name}',
    level: 'Level {level}',
    levelTitle: ['Neuling', 'Spürnase', 'Linkprüfer:in', 'Header-Leser:in', 'Absenderdetektiv:in', 'Köderbrecher:in', 'Schutzschild', 'Abwehrprofi', 'Sicherheitsanker', 'Phishing-Legende'],
    xpToNext: '{current} von {needed} XP bis Level {next}',
    maxLevel: 'Höchstes Level erreicht',
    score: 'Punkte',
    streak: 'Serie',
    bestStreak: 'Beste Serie: {n}',
    accuracy: 'Trefferquote',
    solved: 'Gelöst',
    solvedOf: '{n} von {total}',
    startTitle: 'Neue Trainingsrunde',
    startLead: 'Acht Nachrichten, gemischt aus Mail, SMS und Anruf.',
    onlyOpen: 'Nur Nachrichten, die ich noch nicht gelöst habe',
    start: 'Training starten',
    badgesTitle: 'Abzeichen',
    badgesEmpty: 'Noch keine Abzeichen. Dein erstes gibt es für den ersten erkannten Phishing-Versuch.',
    allBadges: 'Alle Abzeichen ansehen',
    tipTitle: 'Merksatz',
    reportHint: 'Echter Verdacht im Alltag? Melde Phishing deiner Informatik und dem Bundesamt für Cybersicherheit (BACS).'
  },

  train: {
    inbox: 'Posteingang',
    progress: 'Nachricht {n} von {total}',
    timer: 'Zeit',
    selectMessage: 'Wähle links eine Nachricht aus.',
    situation: 'Ausgangslage',
    from: 'Von',
    to: 'An',
    replyTo: 'Antwort an',
    returnPath: 'Return-Path',
    auth: 'Authentifizierung',
    date: 'Empfangen',
    showDetails: 'Details anzeigen',
    hideDetails: 'Details ausblenden',
    attachments: 'Anhänge',
    hoverHint: 'Tipp: Fahre mit der Maus über Links (oder fokussiere sie mit Tab), um das echte Ziel zu sehen.',
    linkStatus: 'Ziel: {url}',
    qrCaption: 'QR-Code',
    qrReveal: 'Inhalt des QR-Codes anzeigen',
    qrContent: 'Der Code enthält: {url}',
    qrNote: 'Nicht scannbar – nur Darstellung.',
    smsFrom: 'Nachricht von',
    callFrom: 'Anruf von',
    callTranscript: 'Gesprächsprotokoll',
    you: 'Du',
    caller: 'Anrufer',
    decisionLabel: 'Deine Entscheidung',
    actions: {
      safe: 'Als sicher einstufen',
      report: 'Phishing melden',
      open: { email: 'Link/Anhang öffnen', sms: 'Link öffnen', qr: 'QR-Code öffnen', comply: 'Anweisung befolgen' }
    },
    actionsShort: { safe: 'Sicher', report: 'Gemeldet', open: 'Befolgt' },
    confirmOpen: {
      title: 'Wirklich darauf eingehen?',
      text: 'Damit folgst du der Nachricht – per Link, Anhang, QR-Code oder Anweisung. Das zählt als deine Entscheidung.',
      confirm: 'Ja, fortfahren',
      cancel: 'Abbrechen'
    },
    outcome: {
      caught: 'Richtig erkannt: Das war Phishing.',
      trusted: 'Richtig: Diese Nachricht war echt.',
      missed: 'Übersehen: Das war Phishing.',
      compromised: 'Erwischt: Du hast auf Phishing reagiert.',
      'false-positive': 'Fehlalarm: Diese Nachricht war echt.'
    },
    outcomeDetail: {
      caught: '',
      trusted: '',
      compromised: 'Im Ernstfall wären jetzt Zugangsdaten, Geld oder dein Gerät in Gefahr. Melde so etwas sofort der Informatik – je früher, desto besser.',
      'false-positive': 'Melden ist besser als klicken. Zu viele Fehlalarme kosten aber Zeit und Vertrauen – achte auch auf Zeichen von Echtheit.',
      missed: 'Kein Klick, aber die Nachricht bleibt im Postfach – und vielleicht klickt jemand anders darauf. Melden schützt alle.'
    },
    points: '{points} Punkte',
    pointsBreakdown: '(Basis {base} + Zeitbonus {bonus}) × Serienfaktor {multiplier}',
    replayNote: 'Wiederholung: Punkte gibt es nur beim ersten Versuch.',
    evidence: 'Woran man es erkennt',
    evidenceLegit: 'Warum die Nachricht echt ist',
    takeaway: 'Fazit',
    next: 'Nächste Nachricht',
    finish: 'Runde abschliessen',
    newBadge: 'Neues Abzeichen: {title}',
    levelUp: 'Level {level} erreicht!',
    authResult: { pass: 'bestanden', fail: 'fehlgeschlagen', softfail: 'zweifelhaft', none: 'keine Angabe' },
    readStatus: { unread: 'ungelesen', done: 'entschieden' }
  },

  summary: {
    title: 'Runde abgeschlossen',
    correct: '{correct} von {total} richtig',
    points: '{points} Punkte in dieser Runde',
    again: 'Neue Runde',
    toDashboard: 'Zum Cockpit',
    review: 'Deine Entscheidungen'
  },

  lexicon: {
    title: 'Lexikon',
    lead: 'Die wichtigsten Merkmale und was du bei Verdacht tun kannst.',
    search: 'Lexikon durchsuchen',
    noResults: 'Kein Eintrag gefunden. Versuche einen anderen Begriff.'
  },

  stats: {
    title: 'Fortschritt',
    overview: 'Überblick',
    byDifficulty: 'Nach Schwierigkeit',
    byChannel: 'Nach Kanal',
    byCategory: 'Nach Thema',
    falsePositives: 'Fehlalarme',
    missed: 'Übersehen',
    compromised: 'Geöffnet',
    avgTime: 'Ø Zeit',
    seconds: '{n} s',
    history: 'Letzte Entscheidungen',
    historyEmpty: 'Noch keine Entscheidungen. Starte eine Trainingsrunde im Cockpit.',
    badges: 'Abzeichen',
    profile: 'Profil',
    profiles: 'Profile auf diesem Gerät',
    newProfile: 'Neues Profil',
    switchTo: 'Wechseln',
    active: 'aktiv',
    deleteProfile: 'Profil löschen',
    confirmDelete: 'Profil «{name}» und den ganzen Fortschritt löschen?',
    export: 'Fortschritt exportieren',
    import: 'Fortschritt importieren',
    importOk: 'Fortschritt von «{name}» importiert.',
    exportHint: 'Die JSON-Datei enthält nur deinen Trainingsfortschritt.',
    rate: 'Quote',
    replay: 'Wiederholung'
  },

  import: {
    invalidJson: 'Die Datei ist kein gültiges JSON.',
    notPhishguard: 'Die Datei stammt nicht aus PhishGuard.',
    wrongVersion: 'Die Datei hat eine nicht unterstützte Version.'
  },

  admin: {
    title: 'Trainer-Ansicht',
    lead: 'Plane eine simulierte Kampagne und sieh dir an, wie ein Bericht aussehen würde.',
    mockBanner: 'Mock-Versand: Diese Ansicht verschickt nichts. Reaktionen werden im Browser simuliert und nur lokal gespeichert.',
    transport: 'Versandweg: {label}',
    newCampaign: 'Neue Kampagne',
    name: 'Name der Kampagne',
    namePlaceholder: 'z. B. Awareness Q4 Finanzen',
    scenario: 'Szenario',
    recipients: 'Empfängerliste (fiktiv)',
    generate: 'Liste erzeugen',
    count: 'Anzahl',
    paste: 'Eigene Testliste einfügen',
    pasteHint: 'Eine Person pro Zeile: Name; E-Mail; Abteilung. Nur Adressen mit .example oder .invalid.',
    pasteApply: 'Liste übernehmen',
    pasteErrors: '{n} Zeilen übersprungen (Format oder nicht erlaubte Domain).',
    recipientsCount: '{n} Empfänger:innen',
    trained: 'Teilnehmende haben das Training bereits absolviert',
    trainedHint: 'Erhöht die simulierte Aufmerksamkeit – so siehst du den Effekt von Schulungen.',
    create: 'Kampagne anlegen',
    start: 'Kampagne starten (simuliert)',
    starting: 'Simulation läuft …',
    campaigns: 'Kampagnen',
    noCampaigns: 'Noch keine Kampagnen. Lege oben eine an.',
    status: { draft: 'Entwurf', done: 'Simuliert' },
    delete: 'Löschen',
    report: 'Bericht',
    kpi: { sent: 'Zugestellt', opened: 'Geöffnet', clicked: 'Geklickt', submitted: 'Daten eingegeben', reported: 'Gemeldet' },
    funnel: 'Reaktionen',
    timeline: 'Verlauf über 72 Stunden',
    hours: '{n} h',
    departments: 'Nach Abteilung',
    department: 'Abteilung',
    size: 'Personen',
    medianReport: 'Median bis zur ersten Meldung: {time}',
    noReports: 'Niemand hat gemeldet.',
    outbox: 'Simulierter Postausgang',
    outboxNote: 'Diese Einträge existieren nur im localStorage dieses Browsers.',
    errors: {
      nameRequired: 'Gib der Kampagne einen Namen.',
      scenarioRequired: 'Wähle ein Szenario.',
      recipientsRequired: 'Erzeuge oder füge eine Empfängerliste ein.',
      notFound: 'Kampagne nicht gefunden.'
    }
  },

  badges: {
    'erster-fang': { title: 'Erster Fang', desc: 'Den ersten Phishing-Versuch gemeldet.' },
    'serie-5': { title: 'Fünferserie', desc: 'Fünf richtige Entscheidungen in Folge.' },
    'serie-10': { title: 'Zehnerserie', desc: 'Zehn richtige Entscheidungen in Folge.' },
    blitzmerker: { title: 'Blitzmerker', desc: 'Fünfmal in höchstens 10 Sekunden richtig entschieden.' },
    vertrauen: { title: 'Gesundes Vertrauen', desc: 'Fünf echte Nachrichten als sicher erkannt.' },
    'kein-fehlalarm': { title: 'Kein Fehlalarm', desc: 'Alle echten Nachrichten richtig eingeschätzt.' },
    'quishing-profi': { title: 'QR-Durchblick', desc: 'Alle Quishing-Szenarien gelöst.' },
    'smishing-profi': { title: 'SMS-Profi', desc: 'Alle SMS-Szenarien richtig gelöst.' },
    'vishing-profi': { title: 'Gutes Gehör', desc: 'Alle Anruf-Szenarien richtig gelöst.' },
    'leicht-perfekt': { title: 'Solide Basis', desc: 'Alle leichten Szenarien richtig.' },
    'mittel-perfekt': { title: 'Scharfer Blick', desc: 'Alle mittleren Szenarien richtig.' },
    'schwer-perfekt': { title: 'Nicht zu täuschen', desc: 'Alle schweren Szenarien richtig.' },
    komplett: { title: 'Alles gesehen', desc: 'Jedes Szenario mindestens einmal beantwortet.' },
    'level-5': { title: 'Level 5', desc: 'Level 5 erreicht.' }
  },

  indicatorType: {
    sender: 'Absender', urgency: 'Dringlichkeit', grammar: 'Sprache', link: 'Link', attachment: 'Anhang',
    request: 'Forderung', greeting: 'Anrede', headers: 'Header', qr: 'QR-Code', offer: 'Köder',
    authority: 'Autorität', channel: 'Kanal', context: 'Kontext', legit: 'Echtheitszeichen'
  },

  common: { close: 'Schliessen', cancel: 'Abbrechen', save: 'Speichern', yes: 'Ja', no: 'Nein', minutes: '{n} min', hoursMinutes: '{h} h {m} min' }
};
