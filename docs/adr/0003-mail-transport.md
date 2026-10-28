# ADR 0003 – MailTransport als Schnittstelle, nur Mock implementiert

- **Status:** angenommen
- **Datum:** 2026-10-28

## Kontext

Die Trainer-Ansicht soll zeigen, wie eine Awareness-Kampagne geplant und ausgewertet wird. Echter Versand würde das Projekt zu einem potenziellen Angriffswerkzeug machen und rechtliche Pflichten auslösen (Freigabe, Personalvertretung, DSG).

## Entscheid

- `CampaignService` kennt nur die Schnittstelle `MailTransport` mit zwei Methoden:
  - `send(message) → { messageId }`
  - `fetchEvents(campaignId) → TransportEvent[]` (`sent`, `opened`, `clicked`, `submitted`, `reported`, jeweils mit Minute)
- **Implementiert ist ausschliesslich `MockTransport`.** Er schreibt in den StorageAdapter (Postausgang + Ereignisse) und simuliert Reaktionen deterministisch: abhängig von Schwierigkeit des Szenarios, Awareness der fiktiven Person und optional absolviertem Training.
- Der Transport wird in `src/app.js` injiziert. Die UI zeigt jederzeit sichtbar, dass es sich um einen Mock handelt.
- Empfängerlisten akzeptieren nur Adressen mit `.example` oder `.invalid`.

## Erweiterbarkeit

Ein echter Transport könnte ohne Umbau von Service und UI angedockt werden: eine Klasse, die `MailTransport` erweitert und mit einem eigenen Backend spricht (der Browser darf wegen der CSP ohnehin keine fremden Server kontaktieren).

**Ein solcher Transport wird in diesem Repository nicht implementiert und nicht als Beitrag angenommen.** Wer echte Simulationen durchführen will, braucht ein separates System mit Zugriffskontrolle, Protokollierung, Datenschutzkonzept und schriftlicher Freigabe (siehe README, «Rechtliches»).

## Konsequenzen

- Die Simulationsergebnisse sind Anschauungsbeispiele, keine Messung echten Verhaltens.
- Die Reaktionslogik `simulateReaction` ist eine pure Funktion und getestet (u. a. dass Training die Klickrate senkt und der Mock nie `fetch` verwendet).
