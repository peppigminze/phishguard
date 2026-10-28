# Sicherheitsrichtlinie

## Zweck des Projekts

PhishGuard ist ein **reines Schulungs- und Simulationstool**. Es versendet keine Nachrichten, ruft keine Websites Dritter auf und speichert Daten ausschliesslich lokal im Browser (`localStorage`). Die Content Security Policy in `index.html` erlaubt nur Ressourcen vom eigenen Ursprung.

## Unterstützte Versionen

Sicherheitsupdates gibt es für den aktuellen Stand des Branches `main` bzw. die auf GitHub Pages veröffentlichte Version.

## Schwachstelle melden

Bitte **kein öffentliches Issue** eröffnen. Nutze stattdessen die private Meldefunktion von GitHub:
**Security → Report a vulnerability** in diesem Repository.

Hilfreich sind: betroffene Datei oder Ansicht, Schritte zur Reproduktion und die mögliche Auswirkung. Du erhältst innerhalb von 7 Tagen eine erste Rückmeldung.

## Was als Sicherheitsproblem gilt

- Einschleusen von HTML/JavaScript über Szenario-Dateien oder importierte Fortschrittsdateien (XSS)
- Umgehung der Content Security Policy oder Requests an fremde Server
- Szenarien, die echte Domains, Marken, Telefonnummern oder funktionierende Phishing-Inhalte enthalten
- Probleme im Service Worker, die fremde Inhalte zwischenspeichern

## Missbrauch

Das Projekt darf nicht dazu verwendet werden, echte Phishing-Nachrichten zu erstellen oder zu verschicken. Beiträge, die den Simulationscharakter aufweichen (z. B. echter Mailversand, echte Login-Seiten), werden nicht angenommen.

## Echter Phishing-Verdacht?

Das ist keine Sicherheitslücke in diesem Projekt. Melde echte Phishing-Versuche in der Schweiz deiner Informatik und über [antiphishing.ch](https://www.antiphishing.ch) beim Bundesamt für Cybersicherheit (BACS).
