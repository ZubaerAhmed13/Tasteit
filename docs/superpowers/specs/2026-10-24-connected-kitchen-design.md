# Connected shopping, pantry and cooking

User authorised starting the second audit stage after the first: connect shopping,
pantry and cooking, with reviewed purchases, confirmed stock usage and leftovers.
Keep the existing browser-local app, IDs, real source photos and version-1 backups.
No merge or deployment. No backend or new product dependencies.

## Approach

Add explicit review forms to the existing shopping and cooking flows. This builds
on the current measured pantry batches rather than silently treating a shopping
tick or a cooking journal entry as proof of quantity movement. New pure kitchen
functions validate and prepare a complete store update; the UI persists it once
before changing memory. Automatic deduction without review was rejected because
source quantities, purchases and actual consumption can differ.

- Checked shopping rows can be reviewed for stock. Select actual food purchases,
  enter actual quantity/unit, storage and optional recorded date, then confirm.
  Each purchase creates a separate batch. Track transferred row fingerprints so
  the same checked row cannot be transferred twice. Non-food extras are optional.
- Cooking completion offers an optional review of measured pantry batches and
  actual quantities used. Suggestions use only compatible clear units and the
  selected serving scale; no amount is deducted unless its row is selected.
  Unknown measures require manual amounts. Changed stock invalidates stale review.
- Save the journal, confirmed deductions, optional leftover record and cleared
  cooking session in one transaction; storage failure preserves everything.
- Leftovers have a dish name, portion count, preparation date, location and an
  optional user-set reminder date. They are tracked separately from raw ingredients.
  Users can use one portion or remove a record; dates are not food-safety verdicts.
- Add optional shoppingStocked and leftovers fields to version-1 backups and
  local state, with strict validation and backward-compatible defaults.

## Acceptance

Pure regressions cover separate batches, duplicate receipt protection, stale rows,
invalid/negative quantities, compatible-unit usage, overdraw, changed stock,
unknown measures, atomic persistence failures and old/new backup round trips.
Browser acceptance covers checked purchase -> review -> stock, cooking -> reviewed
usage + leftovers, storage failure, reload and narrow mobile controls. Keep all
existing browser checks. Run independent review before final completion.
