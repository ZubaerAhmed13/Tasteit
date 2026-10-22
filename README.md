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

## First-release capabilities

- Search real recipes by name and browse by cuisine, with source-provided photographs, ingredients, steps and attributions.
- Save **Want to try**, **Usual dishes**, and **Favourites** independently; mark a dish as cooked.
- Add ingredients to your personal pantry with amount, unit, storage location and optional expiry date; edit and remove them.
- Find candidate recipes from up to four pantry ingredients, then compare **exact ingredient-name presence**, clearly distinguishing missing ingredients and *not* claiming you own sufficient quantities.
- Plan the next seven days from saved recipes and generate a deduplicated list of missing ingredients (quantities require manual verification).
- Local persistence via localStorage, accessible controls, loading/empty/error states and responsive navigation.

## Limits (intentional)

- The developer key \`1\` is for testing/education/personal projects. **Before any public launch** secure a production arrangement with TheMealDB and review its image/content terms. Never claim user-submitted source photography as original Tasteit work.
- TheMealDB is not every recipe in the world, and regional names do not constitute verification of authenticity. Display source and acknowledge variants.
- Browser-local storage is device-specific and can be cleared. There is **no account, cloud sync, backup, or offline recipe guarantee** yet.
- TheMealDB v1 allows single-ingredient filtering. The app aggregates a small set of queries to propose candidates and checks ingredients client-side. Amounts, substitutions, dietary/allergen safety, exact measurements and expiry-based cookability are **not** verified.
- Recipe content and pictures require network access. Do not deploy this developer prototype publicly without reviewing API and image licensing.

## Product roadmap

1. **Foundation** — live discovery, recipe details and reliable local collections (this PR).
2. **Personalisation** — personal cooking notes, custom recipes and collection filters.
3. **Kitchen intelligence** — quantity-aware unit conversions, expiry prioritisation, safer matching and shopping workflows.
4. **Trustworthy world coverage** — licensed expanded sources, multiple genuine regional variants, editorial provenance and image rights.
5. **Accounts and synchronisation** — optional private backend, migration from local data, privacy and security acceptance.
6. **Advanced conveniences** — optional barcode/photo capture with mandatory user confirmation, multilingual UI and guided cooking.

Recipe source and photography attribution: [TheMealDB](https://www.themealdb.com/). [Official API guide](https://www.themealdb.com/docs_api_guide.php) · [Terms of use](https://www.themealdb.com/terms_of_use.php).

Tasteit source code is an original prototype; third-party recipes and photographs retain their respective rights.
