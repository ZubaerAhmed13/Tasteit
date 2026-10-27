// Focused cooking session logic. A countdown is a voluntary user-entered timer,
// never inferred from community recipe directions or used as a safety guarantee.
const MAX_TIMER_MINUTES = 180;
const MAX_STEP_INDEX = 999;

export function recipeSteps(meal) {
  const raw = String(meal?.strInstructions || '').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n+/).map(x => x.trim()).filter(Boolean);
  return lines.flatMap(line => line
    .replace(/^\s*(?:step\s*)?\d+[.):]\s*/i,'')
    .split(/(?<=[.!?])\s+(?=[A-Z])/u)
    .map(part=>part.trim()).filter(Boolean)).slice(0,300);
}

export function safeCookingSession(session, stepCount) {
  const count = Number.isSafeInteger(stepCount) && stepCount > 0 ? Math.min(stepCount,300) : 1;
  const step = Number.isSafeInteger(session?.step) ? Math.max(0,Math.min(session.step,count-1)) : 0;
  const duration = Number.isSafeInteger(session?.durationSeconds) &&
    session.durationSeconds >= 60 && session.durationSeconds <= MAX_TIMER_MINUTES*60
    ? session.durationSeconds : 300;
  const remaining = Number.isSafeInteger(session?.remainingSeconds)
    ? Math.max(0,Math.min(session.remainingSeconds,duration)) : duration;
  const endsAt = typeof session?.endsAt === 'number' && Number.isSafeInteger(session.endsAt) &&
    session.endsAt > 0 && session.endsAt < 8640000000000000 ? session.endsAt : null;
  return { step, durationSeconds:duration, remainingSeconds:remaining, endsAt,
    ...(Number.isInteger(session?.servings)&&session.servings>=1&&session.servings<=24?{servings:session.servings}:{}),
    ...(Array.isArray(session?.checkedIngredients)?{checkedIngredients:[...new Set(session.checkedIngredients.filter(n=>Number.isInteger(n)&&n>=0&&n<300))].slice(0,300)}:{}) };
}

export function setIngredientChecked(session,index,count) {
 if(!Number.isInteger(count)||count<1||count>300||!Number.isInteger(index)||index<0||index>=count)throw Error('Choose an ingredient in this recipe.');
 const current=safeCookingSession(session,Math.max(1,(session?.step||0)+1));
 const checked=new Set((current.checkedIngredients||[]).filter(n=>n<count));
 if(checked.has(index))checked.delete(index);else checked.add(index);
 return {...current,checkedIngredients:[...checked].sort((a,b)=>a-b)};
}

export function timerStatus(session, now=Date.now()) {
  const value = safeCookingSession(session,Math.max(1,(session?.step || 0)+1));
  const remaining = value.endsAt === null ? value.remainingSeconds :
    Math.max(0,Math.ceil((value.endsAt-now)/1000));
  return { remainingSeconds:remaining, running:value.endsAt !== null && remaining>0,
    complete:value.endsAt !== null && remaining===0,
    text:formatCookingTime(remaining) };
}

export function formatCookingTime(seconds) {
  const s=Math.max(0,Math.floor(Number(seconds)||0));
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
export function moveCookingStep(session,next,stepCount) {
  const current=safeCookingSession(session,stepCount);
  if (!Number.isInteger(next)) throw new Error('Invalid cooking step.');
  return {...current,step:Math.max(0,Math.min(stepCount-1,next))};
}
export function setCookingTimer(session,minutes,stepCount) {
  const n=Number(minutes);
  if (!Number.isSafeInteger(n) || n<1 || n>MAX_TIMER_MINUTES) {
    throw new Error('Choose a timer between 1 and 180 minutes.');
  }
  return {...safeCookingSession(session,stepCount),durationSeconds:n*60,remainingSeconds:n*60,endsAt:null};
}
export function startCookingTimer(session,stepCount,now=Date.now()) {
  const current=safeCookingSession(session,stepCount);
  const remaining=timerStatus(current,now).remainingSeconds;
  if (remaining===0) throw new Error('Reset the timer before starting again.');
  return {...current,remainingSeconds:remaining,endsAt:now+remaining*1000};
}
export function pauseCookingTimer(session,stepCount,now=Date.now()) {
  const current=safeCookingSession(session,stepCount);
  return {...current,remainingSeconds:timerStatus(current,now).remainingSeconds,endsAt:null};
}
export function resetCookingTimer(session,stepCount) {
  const current=safeCookingSession(session,stepCount);
  return {...current,remainingSeconds:current.durationSeconds,endsAt:null};
}
export function validCookingSessions(value) {
  if (value === undefined) return true; // Old backups did not contain this.
  if (!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length>250) return false;
  return Object.entries(value).every(([id,session])=>{
    if (id.length>160 || !session || typeof session!=='object' || Array.isArray(session)) return false;
    const {step,durationSeconds,remainingSeconds,endsAt}=session;
    return (session.servings===undefined||Number.isInteger(session.servings)&&session.servings>=1&&session.servings<=24) &&
      (session.checkedIngredients===undefined || Array.isArray(session.checkedIngredients)&&session.checkedIngredients.length<=300&&new Set(session.checkedIngredients).size===session.checkedIngredients.length&&session.checkedIngredients.every(n=>Number.isInteger(n)&&n>=0&&n<300)) &&
      Number.isSafeInteger(step) && step>=0 && step<=MAX_STEP_INDEX &&
      Number.isSafeInteger(durationSeconds) && durationSeconds>=60 && durationSeconds<=10800 &&
      Number.isSafeInteger(remainingSeconds) && remainingSeconds>=0 && remainingSeconds<=durationSeconds &&
      (endsAt===null || (Number.isSafeInteger(endsAt) && endsAt>0 && endsAt<8640000000000000));
  });
}
