# Mitwirken bei PhishGuard

Danke, dass du helfen willst! Am meisten bringen **neue Szenarien**. Dafür brauchst du keine Programmierkenntnisse – nur eine JSON-Datei.

## Grundregeln (nicht verhandelbar)

1. **Nur fiktive Marken.** Keine echten Firmennamen, Logos oder Produktnamen. Erkennbar nachempfundene Fantasienamen sind okay («Postis», «Bahnix», «Twinto»).
2. **Nur reservierte Domains.** Alle Adressen und URLs müssen auf `.invalid`, `.example`, `.test` oder `example.com/.org/.net` enden. Der Validator lehnt alles andere ab.
3. **Keine funktionierenden Angriffe.** Keine echten Phishing-Seiten, kein Schadcode, keine echten Telefonnummern (verwende `+41 00 …`).
4. **Schweizer Rechtschreibung:** «ss» statt «ß» (wird geprüft), Franken als `CHF 12.50` bzw. `CHF 40.–`, Tausender mit Apostroph (`48'500`).
5. **Lehrreich statt fies.** Jedes Szenario muss erklären, *warum* es Phishing ist – oder warum nicht.

## Ein Szenario beisteuern

1. Kopiere ein ähnliches Szenario aus [`data/scenarios/`](data/scenarios/) als Vorlage.
2. Benenne die Datei nach der `id`: `meine-neue-id.json` (kebab-case).
3. Fülle die Felder aus – das Format ist in [docs/scenario-schema.md](docs/scenario-schema.md) beschrieben. Editoren wie VS Code helfen mit Autovervollständigung, wenn du oben `"$schema": "../../docs/scenario.schema.json"` einträgst.
4. Trage den Dateinamen in [`data/scenarios/index.json`](data/scenarios/index.json) ein.
5. Prüfe lokal:
   ```bash
   npm run validate    # Szenario-Regeln
   npm run balance     # Verteilung (Anteil legitimer Mails, Schwierigkeiten)
   npm test
   ```
6. Teste das Szenario im Browser (`npm start`, im Cockpit die passende Schwierigkeit wählen).
7. Öffne einen Pull Request.

### Gute Szenarien

- **Ausgewogen:** Rund 30 % des Packs sollen legitime Nachrichten sein. Legitime Szenarien, die einem Phishing-Szenario ähneln (gleicher Absender, gleiches Thema), sind besonders wertvoll.
- **Phishing:** mindestens zwei Warnsignale, jedes mit konkreter Erklärung.
- **Legitim:** mindestens ein Echtheitszeichen (`type: "legit"`), keine Warnsignale.
- **Schwierigkeit realistisch einschätzen:** *Leicht* = mehrere offensichtliche Signale; *Mittel* = plausibel, aber Domain/Link verraten es; *Schwer* = nur Details wie Header, Reply-To oder Kontext.
- **Kurz und echt:** So schreiben, wie echte Mails aussehen. Absichtliche Sprachfehler nur in Phishing-Szenarien und dann als `grammar`-Indikator markieren.

## Code-Beiträge

- Keine neuen Laufzeit-Abhängigkeiten ohne vorherige Diskussion in einem Issue.
- Logik als pure Funktionen in `src/core/` und mit Tests in `tests/`.
- UI-Texte nur über `src/i18n/` (kein Text direkt im Code).
- Barrierefreiheit beachten: Tastaturbedienung, sichtbarer Fokus, ARIA wo nötig.
- Die App darf **keine Requests an Dritte** machen (siehe CSP in `index.html`).
- `MailTransport` bekommt in diesem Repository **keinen echten Versand** (siehe [ADR 0003](docs/adr/0003-mail-transport.md)).

## Commit-Nachrichten

Wir verwenden [Conventional Commits](https://www.conventionalcommits.org/de/):

```
feat(scenarios): Szenario «Leasing-Rückzahlung» hinzugefügt
fix(train): Timer pausiert im Hintergrund-Tab
docs: Schema-Beispiel ergänzt
test(scoring): Grenzfälle Zeitbonus
```
