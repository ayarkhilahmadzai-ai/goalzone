# GoalZone – regressionstester för matchlistan

Det här dokumentet beskriver testfall som behöver verifieras innan ändringarna i `fix/match-deduplication` kan slås ihop med `main`. Automatiska enhetstester täcker delar av matchidentiteten, men checklistan nedan avser fortfarande manuell verifiering i gränssnittet med realistiska API-svar.

## Automatiskt verifierat

- [x] 25 matchidentitets- och regressionsfall, inklusive omordning av matcher med kolliderande UI-ID:n, passerade i GitHub Actions #172.
- [x] ESLint och TypeScript passerade i GitHub Actions #172.
- [x] Produktionsbygget passerade i GitHub Actions #172.
- [x] HTTP-smoketest av produktionsversionen under `/goalzone/` samt verifierad hämtning och korrekt MIME-typ för både JavaScript- och CSS-filer passerade i GitHub Actions #172.

- [x] Headless Chrome renderade en icke-tom React-rot från produktionsbygget i GitHub Actions #172 (med isolerade testvärden för Supabase). Detta testar inte klick eller verkliga API-svar.

## Senaste verifiering av mobilversionen (2026-11-22)

- [x] GitHub Actions #205: simulerad backend i Chrome verifierade separata fixture-ID:n, LIVE-matchdetaljer, målskyttar och laguppställningar.
- [x] GitHub Actions #205: 25 regressionstester, lint, TypeScript, produktionsbygge och övriga webbläsartester godkända.
- [x] GitHub Actions #210: produktionsberoenden klarade säkerhetskontrollen efter uppdatering av `ws` till 8.23.0.
- [ ] Den slutliga körningen måste bekräfta att den incheckade `package-lock.json` fungerar direkt med `npm ci`, utan tillfällig låsfilsuppdatering.

- [x] GitHub Actions #201: matchidentitetsregression, ESLint, TypeScript, produktionsbygge, HTTP-kontroll, Chrome-rendering och webbläsarinteraktioner passerade.
- [x] Mobilflikarna Hem, LIVE, Matcher, Ligor och Favoriter samt navigering på 320, 375, 390 och 430 px kontrollerades automatiskt.
- [x] Sidhuvudets desktoplänkar Matches och Live kontrollerades automatiskt.
- [x] Mobilmenyns Matches och Live samt tangentbordsstyrning kontrollerade i GitHub Actions #201.
- [ ] Realistiska API-svar och detaljer för faktiska matcher måste fortfarande verifieras i en isolerad testmiljö.
- [ ] Den automatiska webbläsarkontrollen använder CI-platshållare för Supabase och ersätter inte end-to-end-testning mot en fungerande backend.

## Praktisk manuell testprocedur

1. Starta webbplatsen lokalt eller i en separat testmiljö från `fix/match-deduplication`. Använd inte produktionsmiljön eller riktiga användardata för att simulera fel.
2. Öppna matchlistan och webbläsarens utvecklarverktyg. Kontrollera synliga matchkort, konsolvarningar om dubbla React-nycklar samt att vald match visar rätt detaljer.
3. Testa två olika fixture-ID:n med samma lagnamn, liga och avsparkstid. **Förväntat:** två matchkort med korrekta separata detaljer.
4. Testa samma fixture-ID med ändrad avsparkstid. **Förväntat:** samma match uppdateras utan ett extra kort.
5. Simulera ett ofullständigt svar från en datakälla i testmiljön och uppdatera. **Förväntat:** tidigare matcher som saknas behålls tillfälligt; de dubbleras inte.
6. Återställ fullständiga API-svar och uppdatera igen. **Förväntat:** gamla tillfälligt behållna poster försvinner om de inte längre finns i källorna.
7. Upprepa med kolliderande interna UI-ID:n. **Förväntat:** inga dubbla React-nycklar, ingen förväxling av matchdetaljer.
8. Dokumentera för varje scenario: testdata/fixture-ID:n, observerat antal matchkort, rätt/fel detaljvy, konsolfel och resultat. Markera checklistan först när scenariot faktiskt har körts.

**Begränsning:** GitHub Actions testar nu också interaktiv navigation och vissa matchscenarier med simulerade API-svar (se #205). Det ersätter inte tester mot en riktig backend, och alla scenarier i den manuella checklistan är inte automatiserade.

## Protokoll för webbläsarverifiering

Fyll i tabellen först när respektive scenario faktiskt har körts i en separat testmiljö. Lämna testdata anonymiserade; skriv aldrig API-nycklar eller autentiseringstoken i protokollet.

| Scenario | Förväntat resultat | Utfall | Bevis/anteckning |
| --- | --- | --- | --- |
| Olika fixture-ID, samma lag/tid | Två separata matchkort och rätt detaljvy | Ej kört | – |
| Samma fixture-ID, ändrad tid | Ett uppdaterat matchkort | Ej kört | – |
| Samma UI-ID, olika ligor | Ingen förväxling av matcher | Ej kört | – |
| Kolliderande UI-ID | Inga dubbla React-nycklar eller fel detaljer | Ej kört | – |
| Partiellt API-fel | Tidigare saknade matcher behålls utan dubbletter | Ej kört | – |
| API återhämtar sig | Inga kvarhängande dubbletter | Ej kört | – |
| Manuell match och API-match | En match, med korrekt arena och resultat | Ej kört | – |

**Miljö:** Ej angiven. **Webbläsare/version:** Ej angiven. **Testdatum:** Ej angivet. **Testansvarig:** Ej angiven.

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

- [x] `npm run typecheck` (GitHub Actions #172)
- [x] `npm run lint` (GitHub Actions #172)
- [x] `npm run build` (GitHub Actions #172)
- [x] Produktionsversionen svarar över HTTP på `/goalzone/` och innehåller React-rot samt hämtbara JavaScript- och CSS-resurser med korrekta MIME-typer (GitHub Actions #172).
- [ ] Kontrollera manuellt i gränssnittet med realistiska API-svar.
- [ ] Dokumentera observerat resultat för varje testfall.

**Status:** Automatiska tester inklusive simulerade API-svar verifierade i #205. Manuella tester mot en riktig backend är inte genomförda. Publicering kräver dessutom godkänd säkerhetsgranskning och uttryckligt klartecken.
