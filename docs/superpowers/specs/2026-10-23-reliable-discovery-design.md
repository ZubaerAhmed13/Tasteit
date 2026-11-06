# Reliable saves and simpler discovery

The user approved the first audit stage: fix reliability and simplify discovery.
Keep the existing dependency-free, browser-local application and source photographs.
The existing checkout is a dedicated clone on the draft feature branch; work there.
Do not merge or deploy. Preserve existing records and backup compatibility.

## Approach

Improve the existing application with small pure modules rather than replace its
framework or redesign unrelated screens. Transactional updates fix failed-save
state drift; explicit API reports distinguish empty, partial and failed searches.
A compact filter form combines cuisine, category, name and initial. Query-string
routes work on static hosts and support reload, direct recipe links and Back.
The alternative full rewrite would risk unrelated working features and is outside
this approved first stage. Automatic retries are avoided: offer explicit retry and
bound requests, without hiding prolonged failures or multiplying provider calls.

## Acceptance

- Failed recipe flag/label/source-cache writes leave memory, UI and stored data unchanged.
- Removing the last cookbook flag does not silently remove a planned meal.
- Empty provider results are distinct from failed requests; partial pantry results
  retain local recipes and explain missing remote results. Cancellation wins races.
- Cuisine, category, name and initial filters combine; choosing one keeps the others.
- A compact cuisine entry with suggestions, category selector and optional A-Z
  selector replace the three long button rails; clear/remove-filter actions recover.
- Query-string navigation restores view and discovery filters on reload/Back/Forward.
  Recipe dialogs have links and close correctly after direct entry or in-app opening.
- Pending recipe requests cannot reopen dialogs after navigation or replace a newer recipe.
- Verify Node regressions and all existing checks; extend fixture browser acceptance
  to failed writes, failure/partial results, combined filters, URL history and mobile.
  Headless tests do not certify live sources or physical devices.
