# GoalZone – regressionstester för matchlistan

Det här dokumentet beskriver testfall som behöver verifieras innan ändringarna i `fix/match-deduplication` kan slås ihop med `main`. Automatiska enhetstester täcker delar av matchidentiteten, men checklistan nedan avser fortfarande manuell verifiering i gränssnittet med realistiska API-svar.

## Automatiskt verifierat

- [x] 15 matchidentitets- och regressionsfall passerade i GitHub Actions #129.
- [x] ESLint och TypeScript passerade i GitHub Actions #129.
- [ ] Produktionsbygget i #129 inväntar slutresultat.

## Matchidentitet

- [ ] Samma verifierade fixture-ID i samma liga, men uppdaterad avsparkstid: en matchpost; behåll korrekt matchidentitet.
- [ ] Olika verifierade fixture-ID:n i samma liga, med samma lag och avsparkstid: två matchposter.
- [ ] Olika verifierade fixture-ID:n med kolliderande UI-ID: två matchposter; inga detaljer från fel match.
- [ ] Saknat fixture-ID, samma lag och avsparkstid inom 15 minuter: hantera som möjlig dubblett.
- [ ] Saknat fixture-ID, samma lag men olika matcher på skilda tider: separata matchposter.
- [ ] Tomma eller ogiltiga normaliserade lagnamn: slå inte ihop matcher enbart på namnen.
- [ ] Samma UI-ID i olika ligor: matcherna får inte förväxlas.

## Uppdateringar och tillfälliga fel

- [ ] API:t returnerar samma fixture flera gånger: visa en matchpost.
- [ ] Manuellt inlagd match motsvarar en API-match: ingen extra dubblett; manuellt arenanamn fyller bara tom arena.
- [ ] Ett API-svar är ofullständigt: behåll tidigare matcher som saknas tills en fullständig uppdatering lyckas.
- [ ] Två gamla matcher delar UI-ID: återanvänd inte detaljer godtyckligt.
- [ ] Två nya matcher delar UI-ID: återanvänd inte detaljer godtyckligt.
- [ ] Matchdetaljer och händelser återanvänds bara när verifierad matchidentitet är förenlig.
- [ ] Efter återhämtning från ett API-fel: inga kvarhängande gamla dubbletter.

## Validering

- [x] `npm run typecheck` (GitHub Actions #129)
- [x] `npm run lint` (GitHub Actions #129)
- [ ] `npm run build`
- [ ] Kontrollera manuellt i gränssnittet med realistiska API-svar.
- [ ] Dokumentera observerat resultat för varje testfall.

**Status:** Automatiska tester och kodkontroller verifierade enligt ovan. Manuella gränssnittstester är inte genomförda.
