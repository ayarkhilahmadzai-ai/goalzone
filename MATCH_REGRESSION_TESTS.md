# GoalZone – regressionstester för matchlistan

Det här dokumentet beskriver testfall som behöver verifieras innan ändringarna i `fix/match-deduplication` kan slås ihop med `main`. Automatiska enhetstester täcker delar av matchidentiteten, men checklistan nedan avser fortfarande manuell verifiering i gränssnittet med realistiska API-svar.

## Automatiskt verifierat

- [x] 16 matchidentitets- och regressionsfall passerade i GitHub Actions #132.
- [x] ESLint och TypeScript passerade i GitHub Actions #132.
- [x] Produktionsbygget passerade i GitHub Actions #132.

## Praktisk manuell testprocedur

1. Starta webbplatsen lokalt eller i en separat testmiljö från `fix/match-deduplication`. Använd inte produktionsmiljön eller riktiga användardata för att simulera fel.
2. Öppna matchlistan och webbläsarens utvecklarverktyg. Kontrollera synliga matchkort, konsolvarningar om dubbla React-nycklar samt att vald match visar rätt detaljer.
3. Testa två olika fixture-ID:n med samma lagnamn, liga och avsparkstid. **Förväntat:** två matchkort med korrekta separata detaljer.
4. Testa samma fixture-ID med ändrad avsparkstid. **Förväntat:** samma match uppdateras utan ett extra kort.
5. Simulera ett ofullständigt svar från en datakälla i testmiljön och uppdatera. **Förväntat:** tidigare matcher som saknas behålls tillfälligt; de dubbleras inte.
6. Återställ fullständiga API-svar och uppdatera igen. **Förväntat:** gamla tillfälligt behållna poster försvinner om de inte längre finns i källorna.
7. Upprepa med kolliderande interna UI-ID:n. **Förväntat:** inga dubbla React-nycklar, ingen förväxling av matchdetaljer.
8. Dokumentera för varje scenario: testdata/fixture-ID:n, observerat antal matchkort, rätt/fel detaljvy, konsolfel och resultat. Markera checklistan först när scenariot faktiskt har körts.

**Begränsning:** GitHub Actions kör enhetskontroller och produktionsbygge, inte dessa webbläsarscenarier. Gränssnittstesterna är därför fortfarande öppna.

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
- [x] `npm run build` (GitHub Actions #129)
- [ ] Kontrollera manuellt i gränssnittet med realistiska API-svar.
- [ ] Dokumentera observerat resultat för varje testfall.

**Status:** Automatiska tester och kodkontroller verifierade enligt ovan. Manuella gränssnittstester är inte genomförda.
