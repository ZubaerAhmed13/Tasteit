import { normalizeIngredient } from './model.js';

// An explicit, human-reviewed bulk-entry format. It never invents stock quantities,
// locations, best-before dates, or substitutes for a different product.
const UNITS = new Set(['pcs','g','kg','ml','l','tsp','tbsp','cups','packs']);
const LOCATIONS = ['Pantry','Fridge','Freezer','Other'];
const MAX_ITEMS = 100;

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}

function parseQuantity(raw) {
  const text = String(raw || '').trim().toLowerCase().replace(',', '.');
  if (!text) return { quantity: '', unit:'pcs' };
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(pcs|g|kg|ml|l|tsp|tbsp|cups|packs)$/);
  if (!match || !Number.isFinite(Number(match[1])) || Number(match[1]) <= 0) return null;
  return { quantity: match[1], unit: match[2] };
}

export function parseBulkPantry(input, existing = []) {
  const raw = String(input || '');
  // Comma-separated names are accepted for a single plain row only;
  // explicit structured rows use " | " and one ingredient per line.
  const lines = (!raw.includes('\n') && !raw.includes('|') && raw.includes(','))
    ? raw.split(',') : raw.split(/\r?\n/);
  const nonempty = lines.map((text, index) => ({ text:text.trim(), line:index+1 })).filter(x => x.text);
  const errors = [];
  const items = [];
  const skipped = [];
  const seen = new Set(existing.map(x => normalizeIngredient(x?.name)).filter(Boolean));
  if (nonempty.length > MAX_ITEMS) {
    return { items:[], skipped:[], errors:[{line:0,message:'Add at most 100 items per batch.'}] };
  }
  for (const row of nonempty) {
    const parts = row.text.split('|').map(part => part.trim());
    if (parts.length > 4) {
      errors.push({ line:row.line, message:'Use Name | amount and unit | location | date (up to four fields).' });
      continue;
    }
    const [name, amount='', location='', expiry=''] = parts;
    if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
      errors.push({line:row.line,message:'Enter an ingredient name up to 80 characters.'});
      continue;
    }
    const parsed = parseQuantity(amount);
    if (!parsed) {
      errors.push({line:row.line,message:'Enter an amount like 500 g or 6 pcs, or leave it empty. No unit is assumed.'});
      continue;
    }
    const matchLocation = location ? LOCATIONS.find(x => x.toLowerCase() === location.toLowerCase()) : 'Pantry';
    if (!matchLocation) {
      errors.push({line:row.line,message:'Location must be Pantry, Fridge, Freezer or Other.'});
      continue;
    }
    if (expiry && !validDate(expiry)) {
      errors.push({line:row.line,message:'Use a valid date in YYYY-MM-DD format.'});
      continue;
    }
    const key = normalizeIngredient(name);
    if (!key) {
      errors.push({line:row.line,message:'Ingredient name is empty after normalisation.'});
      continue;
    }
    if (seen.has(key)) {
      skipped.push({line:row.line,name,message:'Already on your list or repeated in this batch.'});
      continue;
    }
    seen.add(key);
    items.push({name, quantity:parsed.quantity, unit:parsed.unit, location:matchLocation, expiry});
  }
  if (!nonempty.length) errors.push({line:0,message:'Enter at least one ingredient.'});
  return { items, skipped, errors };
}

export function applyBulkPantry(existing, preview, idProvider) {
  if (!preview || !Array.isArray(preview.items) || preview.errors?.length) {
    throw new Error('Please fix the highlighted lines before adding ingredients.');
  }
  if (typeof idProvider !== 'function') throw new Error('An ingredient ID generator is required.');
  const next = [...existing];
  const keys = new Set(next.map(x => normalizeIngredient(x.name)));
  for (const item of preview.items) {
    const key = normalizeIngredient(item.name);
    if (!key || keys.has(key)) continue; // Never overwrite or duplicate existing lots.
    const id = idProvider();
    if (typeof id !== 'string' || !id) throw new Error('Unable to identify a pantry item.');
    next.push({ ...item, id });
    keys.add(key);
  }
  return next;
}
