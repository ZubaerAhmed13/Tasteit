// Conservative measurement parsing. No density conversion or guessed measures.
const FRACTIONS = {
  '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3',
  '⅔': '2/3', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8'
};
const UNIT = Object.freeze({
  g: ['g',1], gram: ['g',1], grams: ['g',1],
  kg: ['g',1000], kilogram: ['g',1000], kilograms: ['g',1000],
  ml: ['ml',1], millilitre: ['ml',1], millilitres: ['ml',1], milliliter: ['ml',1], milliliters: ['ml',1],
  l: ['ml',1000], litre: ['ml',1000], litres: ['ml',1000], liter: ['ml',1000], liters: ['ml',1000],
  tsp: ['tsp',1], teaspoon: ['tsp',1], teaspoons: ['tsp',1],
  tbsp: ['tbsp',1], tablespoon: ['tbsp',1], tablespoons: ['tbsp',1],
  cup: ['cup',1], cups: ['cup',1],
  pc: ['pcs',1], pcs: ['pcs',1], piece: ['pcs',1], pieces: ['pcs',1], each: ['pcs',1]
});
function fraction(text) {
  if (!text) return 0;
  const [top,bottom] = text.split('/').map(Number);
  return top >= 0 && bottom > 0 ? top / bottom : NaN;
}
export function parseMeasure(raw) {
  const value = String(raw ?? '').trim().toLowerCase()
    .replace(/(\d),(\d)/g,'$1.$2')
    .replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g,c => ' ' + FRACTIONS[c])
    .replace(/\s+/g,' ').trim().replace(/\.$/,'');
  if (!value || /\b(to taste|approx|about|handful|pinch)\b/.test(value)) return null;
  // Ranges, arbitrary prose and ingredient-specific sizes are not converted.
  const m = value.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(?:\s+(\d+\/\d+))?\s*([a-z]+)?$/);
  if (!m) return null;
  const first = m[1].includes('/') ? fraction(m[1]) : Number(m[1]);
  const amount = first + fraction(m[2]);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  const unit = m[3] ? UNIT[m[3]] : UNIT.pcs;
  if (!unit) return null;
  return { quantity: amount * unit[1], unit: unit[0] };
}
export function pantryMeasure(item) {
  if (item?.quantity === '' || item?.quantity == null) return null;
  const unit = String(item.unit || 'pcs').trim();
  return parseMeasure(String(item.quantity).trim() + ' ' + unit);
}
export function displayAmount(quantity, unit) {
  const nice = number => String(Math.round((number + Number.EPSILON) * 100) / 100);
  if (unit === 'g' && quantity >= 1000) return nice(quantity/1000) + ' kg';
  if (unit === 'ml' && quantity >= 1000) return nice(quantity/1000) + ' l';
  return nice(quantity) + ' ' + unit;
}
export function evaluateQuantity(requirements, lots) {
  // Requirements are raw recipe measures, possibly repeated for meal plans.
  // Lots are unexpired pantry entries for the exact normalised ingredient.
  const present = lots.length > 0;
  if (!requirements.length) return { status:present ? 'review' : 'missing',label:'Check amount' };
  const parsed = requirements.map(parseMeasure);
  if (parsed.some(x => !x) || new Set(parsed.map(x => x.unit)).size !== 1) {
    return { status:present ? 'review' : 'missing',label:'Check recipe amounts' };
  }
  const required = parsed.reduce((sum,x) => sum + x.quantity,0);
  const unit = parsed[0].unit;
  if (!present) return { status:'missing',label:displayAmount(required,unit) + ' needed' };
  const stock = lots.map(pantryMeasure);
  if (stock.some(x => !x || x.unit !== unit)) {
    return { status:'review',label:'Check stock / units' };
  }
  const available = stock.reduce((sum,x) => sum + x.quantity,0);
  const deficit = required - available;
  if (deficit > 0.0000001) return { status:'short',label:displayAmount(deficit,unit) + ' short' };
  return { status:'enough',label:displayAmount(available,unit) + ' available' };
}
