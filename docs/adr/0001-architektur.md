# ADR 0001 – Architektur ohne Framework und Build-Tool

- **Status:** angenommen
- **Datum:** 2026-10-28

## Kontext

PhishGuard soll als Portfolio-Projekt auf GitHub Pages laufen, offline funktionieren, einfach für Community-Beiträge sein (Szenarien als JSON) und langfristig wartbar bleiben. Zur Wahl standen Vanilla JS mit ES-Modulen oder TypeScript mit Vite.

## Entscheid

**Vanilla JavaScript mit nativen ES-Modulen, ohne Framework, Bundler oder npm-Abhängigkeiten.** Typen werden mit JSDoc dokumentiert.

## Begründung

- Der Code läuft direkt im Browser; GitHub Pages braucht nur die Dateien zu kopieren.
- Null Abhängigkeiten bedeutet kein Supply-Chain-Risiko – wichtig für ein Sicherheits-Lernprojekt – und keine veralteten Pakete.
- Beitragende brauchen nur Node.js (für Tests) und keinen Build-Schritt.
- Die App ist klein genug, dass ein Framework mehr Komplexität brächte als es spart.

## Aufbau

- `src/core/` – reine Logik ohne DOM: Storage-Adapter, Validator, Scoring, Badges, Fortschritt, Loader. Alles mit `node --test` testbar.
- `src/admin/` – Kampagnen über die Schnittstelle `MailTransport` (siehe ADR 0003).
- `src/ui/` – Hash-Router, Views und ein `html`-Tagged-Template, das alle Werte escaped. Szenario-Texte können so kein HTML einschleusen.
- `src/app.js` – App-Kontext; hier werden Storage und Transport injiziert.
- Persistenz nur über `StorageAdapter` mit asynchroner API, damit später z. B. Firebase möglich ist, ohne Aufrufer anzupassen.
- Strenge CSP (`default-src 'self'`) stellt technisch sicher, dass keine Requests an Dritte möglich sind.

## Konsequenzen

- Keine Typprüfung zur Build-Zeit; das wird durch Tests und den Szenario-Validator kompensiert.
- Ein Wechsel auf TypeScript bleibt möglich, da die Module bereits klar getrennt sind.
