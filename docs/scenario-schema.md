# Szenario-Format

Jedes Szenario ist eine eigene Datei `data/scenarios/<id>.json` und wird in `data/scenarios/index.json` aufgeführt. Das formale Schema liegt in [`scenario.schema.json`](scenario.schema.json); zusätzliche inhaltliche Regeln prüft [`src/core/validator.js`](../src/core/validator.js) (`npm run validate`).

## Felder

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `id` | ja | kebab-case, identisch mit dem Dateinamen |
| `schemaVersion` | ja | aktuell `1` |
| `locale` | nein | Sprache, Standard `de-CH` |
| `channel` | ja | `email`, `sms` oder `voice` |
| `difficulty` | ja | `easy`, `medium`, `hard` |
| `category` | ja | z. B. `paket`, `bank`, `ceo-fraud`, `quishing` (Liste im Schema) |
| `isPhishing` | ja | `true` oder `false` |
| `title` | ja | Kurztitel für Statistik und Trainer-Ansicht |
| `situation` | nein | Ausgangslage, die über der Nachricht steht («Du hast gestern ein Ticket eröffnet …») |
| `sender.name` | ja | angezeigter Name bzw. Nummer |
| `sender.address` | bei E-Mail | Absenderadresse – nur reservierte Domains |
| `recipient` | nein | Empfänger, Standard ist die Trainings-Persona |
| `subject` | bei E-Mail | Betreff |
| `received` | nein | Zeitangabe im Posteingang (`08:12`, `Gestern`, `Mo`) |
| `headers` | nein | `replyTo`, `returnPath`, `spf`, `dkim`, `dmarc` (`pass`/`fail`/`softfail`/`none`) |
| `body` | ja | Nachrichtentext mit Markup (siehe unten) |
| `links` | nein | `[{ id, url, indicator? }]` |
| `attachments` | nein | `[{ name, size, indicator? }]` |
| `qr` | nein | `{ url, caption?, indicator? }` – wird als nicht scannbares Muster dargestellt |
| `indicators` | ja | Merkmale, die nach dem Entscheid hervorgehoben werden |
| `explanation` | ja | Fazit, mindestens 30 Zeichen |

## Body-Markup

```text
{{flag:indikator-id|markierter Text}}   Textstelle, die zu einem Indikator gehört
{{link:link-id|Linktext}}               Link; die echte URL steht in links[]
```

Vor dem Entscheid sieht die Stelle wie normaler Text bzw. ein normaler Link aus. Danach wird sie markiert und nummeriert. Bei Anrufen steht eine Aussage pro Zeile, beginnend mit `Anrufer:` oder `Du:`.

## Indikatoren

```json
{ "id": "frist", "type": "urgency", "target": "body", "title": "Künstlicher Zeitdruck", "explanation": "…" }
```

**`type`** bestimmt Farbe und Kategorie: `sender`, `urgency`, `grammar`, `link`, `attachment`, `request`, `greeting`, `headers`, `qr`, `offer`, `authority`, `channel`, `context` und `legit` (Echtheitszeichen).

**`target`** bestimmt, wo markiert wird:

| target | Markiert wird … | Voraussetzung |
|---|---|---|
| `body` | die `{{flag:…}}`-Stelle | Flag mit dieser ID im Body |
| `sender` | die Absenderzeile | – |
| `subject` | der Betreff | – |
| `headers` | die Authentifizierungszeile (Details klappen auf) | `headers` vorhanden |
| `link` | der Link | ein Link mit `"indicator": "<id>"` |
| `attachment` | der Anhang | ein Anhang mit `"indicator": "<id>"` |
| `qr` | der QR-Code | `qr.indicator` = `<id>` |
| `general` | nur in der Erklärungsliste | – |

## Inhaltliche Regeln (Validator)

- Alle Mailadressen und URLs (auch im Fliesstext) nur mit reservierten Domains: `.invalid`, `.example`, `.test`, `example.com/.org/.net`.
- Phishing: mindestens 2 Warnsignale. Legitim: mindestens 1 Indikator vom Typ `legit`, sonst nur `legit` oder `context`.
- Jede Markup-Referenz muss existieren, jeder Link muss im Body vorkommen.
- Kein «ß» – Schweizer Rechtschreibung.

## Minimalbeispiel

```json
{
  "$schema": "../../docs/scenario.schema.json",
  "id": "beispiel-paket",
  "schemaVersion": 1,
  "channel": "sms",
  "difficulty": "easy",
  "category": "paket",
  "isPhishing": true,
  "title": "Beispiel: Paket-SMS",
  "sender": { "name": "+41 00 111 22 33" },
  "body": "Ihr Paket wartet. {{flag:frist|Nur heute}} bestätigen: {{link:l|paket-info.invalid/x}}",
  "links": [{ "id": "l", "url": "https://paket-info.invalid/x", "indicator": "link" }],
  "indicators": [
    { "id": "frist", "type": "urgency", "target": "body", "title": "Zeitdruck", "explanation": "«Nur heute» soll zur Eile drängen." },
    { "id": "link", "type": "link", "target": "link", "title": "Fremde Domain", "explanation": "Der Link gehört nicht zum Paketdienst." }
  ],
  "explanation": "Typisches Smishing mit Zeitdruck und fremdem Link. Sendungen immer in der offiziellen App prüfen."
}
```
