# ADR 0002 – Scoring und Balancing

- **Status:** angenommen
- **Datum:** 2026-10-28

## Ziel

Das Punktesystem soll motivieren, aber das *richtige* Verhalten belohnen: genau hinschauen, melden statt klicken, und nicht blind alles melden.

## Regeln

| Ergebnis | Punkte | Serie |
|---|---|---|
| Phishing gemeldet | Basis + Zeitbonus, × Serienfaktor | +1 |
| Echte Nachricht als sicher eingestuft oder geöffnet | Basis + Zeitbonus, × Serienfaktor | +1 |
| Phishing übersehen (als sicher eingestuft) | 0 | zurück auf 0 |
| Echte Nachricht gemeldet (Fehlalarm) | 0 | zurück auf 0 |
| Auf Phishing eingegangen (Link, Anhang, Anweisung) | − halbe Basis | zurück auf 0 |

- **Basis:** Leicht 100, Mittel 150, Schwer 200.
- **Zeitbonus:** bis 50 Punkte – voll bis 10 s, linear auf 0 bei 60 s. Unter 2 s gibt es keinen Bonus, damit Durchklicken nicht belohnt wird.
- **Serienfaktor:** +10 % pro richtiger Antwort in Folge, höchstens +50 %.
- **XP** = positive Punkte + 10 Teilnahme-XP pro Entscheid (auch Fehler sind Lernmomente).
- **Level:** Level *n* braucht 250 · (n−1) · n / 2 XP, maximal Level 20.
- **Nur der erste Versuch zählt.** Wiederholungen werden im Verlauf protokolliert, ändern aber weder Punkte noch Serie. So bleibt die Statistik ehrlich.
- Der Gesamtscore fällt nie unter 0.

## Bewusste Entscheide

- **Fehlalarm kostet keine Punkte, aber die Serie.** Melden ist in der Realität nie falsch, aber übertriebenes Melden soll sich nicht lohnen.
- **«Öffnen» bei echten Nachrichten ist korrekt** – sonst würde das Training lehren, nie etwas anzuklicken.
- **Die drei Entscheidungs-Buttons sind gleich gestaltet**, damit Farben keine Antwort verraten.

## Balancing-Prüfung

`npm run balance` zeigt die Verteilung. Stand Version 1.0:

- 33 Szenarien, davon 10 legitim (30 %)
- Leicht 10, Mittel 15, Schwer 8, jeweils mit mindestens 2 legitimen
- Perfekter erster Durchlauf: 9'510 Punkte, 9'840 XP, entspricht Level 9

Damit erreicht man bei realistischer Trefferquote (60–80 %) nach einem Durchlauf etwa Level 6–7. Das Abzeichen «Level 5» ist gut erreichbar, Level 10+ verlangt Zusatz-Packs. Die Tests in `tests/pack.test.js` erzwingen die Mindestverteilung.
