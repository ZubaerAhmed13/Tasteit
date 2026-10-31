export const MEAL_SLOTS=Object.freeze(['breakfast','lunch','dinner','snack']);
export const slotLabel=slot=>slot[0].toUpperCase()+slot.slice(1);
export function validPlanKey(key) {
 if(typeof key!=='string'||!/^\d{4}-\d{2}-\d{2}(?::(?:breakfast|lunch|snack))?$/.test(key))return false;
 const day=key.slice(0,10),date=new Date(day+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
}
export function planKey(day,slot='dinner') {
 if(!MEAL_SLOTS.includes(slot)||!validPlanKey(day)||day.length!==10)throw Error('Choose a valid date and meal slot.');
 return slot==='dinner'?day:day+':'+slot;
}
export function planForDates(plan,dates) {
 const keys=new Set(dates.map(d=>typeof d==='string'?d:d.key));
 return Object.fromEntries(Object.entries(plan).filter(([key])=>validPlanKey(key)&&keys.has(key.slice(0,10))));
}
