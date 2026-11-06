import {collectedRecipe} from './selected-kitchen.js';
import {validPlanKey} from './meal-plan.js';
export function recipePlanningMetadata(meal,registry=[]) {
 const recipe=collectedRecipe(meal);
 if(!recipe||!Array.isArray(registry))return null;
 const rows=registry.filter(row=>row?.id===recipe.id&&row.url===recipe.url);
 if(rows.length!==1)return null;
 const row=rows[0];
 const minutes=n=>n===null||Number.isInteger(n)&&n>=0&&n<=14400;
 if(row.verified!==true||!validPlanKey(row.checkedAt)||row.checkedAt.length!==10||
   ![row.prepMinutes,row.cookMinutes,row.totalMinutes].every(minutes)||
   !(row.yieldText===null||typeof row.yieldText==='string'&&row.yieldText.trim()&&row.yieldText.length<=120))return null;
 return row;
}
