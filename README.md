# Tasteit 🍽️

**A personal recipe universe** — explore cooking traditions, save dishes you want to try, keep track of what's in your kitchen, and plan meals using what you have.

> **Status:** GitHub-only development prototype. Nothing has been deployed. This first release uses TheMealDB's developer/test API and saves personal data locally in the browser.

## Run it

Use any local HTTP server, for example:

~~~bash
python3 -m http.server 4173
# open http://localhost:4173
~~~

Modern browsers require serving the JavaScript modules over HTTP; opening index.html using file:// may not work.

No npm install is needed. Node 20+ runs automated tests:

~~~bash
npm run verify
~~~

GitHub Actions also runs a separate **Playwright headless browser smoke test** (against fixture-backed API responses) covering discovery, saving, personal recipes, a cooking journal, expired pantry ingredients, quantity-aware meal planning, backup/restore and narrow mobile layout. Browser fixtures test UI reliability, not live API uptime or image licensing.

## First-release capabilities

- Search real recipes by name and browse source-provided cuisines, with credited photographs, ingredients and instructions. The discovery feed mixes several starting letters instead of presenting only one alphabetical slice.
- Save **Want to try**, **Usual dishes**, and **Favourites** independently; record ratings and cooking notes with dates; add and edit your own usual recipes.
- Add ingredients to your personal pantry with amount, unit, storage location and optional expiry date; edit and remove them.
- Find recipe candidates from up to four pantry ingredients. Match ingredient names and report **missing**, **insufficient** or **uncertain** amounts when the recipe and pantry units permit a safe comparison.
- Plan the next seven days and generate a shopping list that totals compatible amounts across days, subtracts measured pantry stock, and flags vague or incompatible quantities for checking.
- Local persistence via localStorage, JSON backup export/import, accessible controls, loading/empty/error states and responsive navigation.

## Limits (intentional)

- The developer key \`1\` is for testing/education/personal projects. **Before any public launch** secure a production arrangement with TheMealDB and review its image/content terms. Never claim user-submitted source photography as original Tasteit work.
- TheMealDB is not every recipe in the world, and regional names do not constitute verification of authenticity. Display source and acknowledge variants.
- Browser-local storage is device-specific and can be cleared. There is **no account, cloud sync, automatic backup, or offline recipe guarantee** yet. Manual JSON backups are available under My recipes.
- TheMealDB v1 allows single-ingredient filtering. The app aggregates a small set of queries to propose candidates and checks ingredients client-side. Expired or zero-quantity pantry entries are excluded. The quantity engine compares only unambiguous amounts (including g/kg and ml/l), never guesses densities or converts cups to grams, and flags uncertain measurements. Substitutions, dietary/allergen safety and actual food freshness are **not** verified.
- Recipe content and pictures require network access. Do not deploy this developer prototype publicly without reviewing API and image licensing.

## Product roadmap

1. **Foundation** — diverse discovery, recipe details, personal recipes, local collections, backups and browser acceptance (this PR).
2. **Personalisation** — cooking history/notes and custom recipes started; richer filters, tags, last-cooked reminders and personal photo uploads remain.
3. **Kitchen intelligence** — conservative amount comparisons added; improve ingredient synonyms, shopping quantities, expiry-based priority and combined inventory lots.
4. **Trustworthy world coverage** — licensed expanded sources, multiple genuine regional variants, editorial provenance and image rights.
5. **Accounts and synchronisation** — optional private backend, migration from local data, privacy and security acceptance.
6. **Advanced conveniences** — optional barcode/photo capture with mandatory user confirmation, multilingual UI and guided cooking.

Recipe source and photography attribution: [TheMealDB](https://www.themealdb.com/). [Official API guide](https://www.themealdb.com/docs_api_guide.php) · [Terms of use](https://www.themealdb.com/terms_of_use.php).

Tasteit source code is an original prototype; third-party recipes and photographs retain their respective rights.
