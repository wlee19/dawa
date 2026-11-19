import {ARABIC_DEMO_MEALS,PROFILES} from './next-core.mjs';
import {DEMO_FOODS,foodEntries} from './food-check.mjs';

// Search names only. Recipe-specific dishes deliberately have no inferred foodId.
const normalise=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const aliases={
 'baba-ghanoush':['baba ghanouj','baba ghanoush','baba ghannouj','baba ganoush','babaghanoush','بابا غنوج','بابا غنوش'],
 shawarmah:['shawarma','shawarmah','شاورما','شاورمة'],
 khubz:['pita','pita bread','arabic bread','khobz','khubz','خبز','خبز عربي'],
 kibbeh:['kibbe','kibbeh','kibbah','كبة'],
 labneh:['labneh','labnah','لبنة'],
 tabbouleh:['tabbouleh','tabouleh','tabouli','tabbouli','تبولة'],
 hummus:['hummus','houmous','hommus','حمص'],
 grapefruit:['grapefruit juice','عصير الجريب فروت','جريب فروت']
};
const foodEntry=food=>({id:food.id,en:food.en,ar:food.ar,foodId:food.id});
const mealEntry=meal=>({id:meal.id,en:meal.en,ar:meal.ar,foodId:meal.foodId,demoMealId:meal.id});
function catalogue(){
 const meals=ARABIC_DEMO_MEALS.map(mealEntry),ids=new Set(meals.map(meal=>meal.id));
 return [...meals,...DEMO_FOODS.filter(food=>!ids.has(food.id)).map(foodEntry)];
}
export function searchFoods(patientId,query=''){
 const profile=PROFILES.find(patient=>patient.id===patientId);if(!profile)return [];
 const needle=normalise(query);
 if(!needle)return patientId==='amina'?ARABIC_DEMO_MEALS.map(mealEntry):profile.foods.map(id=>DEMO_FOODS.find(food=>food.id===id)).filter(Boolean).map(foodEntry);
 return catalogue().filter(entry=>[entry.en,entry.ar,...(aliases[entry.id]||[])].some(name=>normalise(name).includes(needle)));
}

// Add/remove catalogue flow. Profile defaults affect ordering, never another patient's state.
export function foodChoices(patientId){
 if(!PROFILES.some(profile=>profile.id===patientId))return [];
 const all=catalogue(),preferred=searchFoods(patientId).map(entry=>entry.id),seen=new Set(preferred);
 return [...preferred.map(id=>all.find(entry=>entry.id===id)),...all.filter(entry=>!seen.has(entry.id))].map(entry=>({...entry}));
}
function choiceForStored(entry,all){
 const direct=all.find(choice=>choice.id===entry.catalogId)||all.find(choice=>choice.demoMealId&&choice.demoMealId===entry.demoMealId)||all.find(choice=>choice.foodId&&choice.foodId===entry.foodId)||all.find(choice=>choice.id===entry.id);
 if(direct)return direct;
 const name=normalise(entry.label||entry.en||'');
 return name?all.find(choice=>[choice.en,choice.ar,...(aliases[choice.id]||[])].some(label=>normalise(label)===name)):null;
}
export function selectedFoods(state){
 if(!state)return [];
 const all=catalogue(),seen=new Set(),selected=[];
 for(const entry of foodEntries(state)){
  const choice=choiceForStored(entry,all),id=choice?.id||entry.catalogId||'custom:'+entry.id;
  if(seen.has(id))continue;seen.add(id);
  selected.push(choice?{...choice,storedId:entry.id}:{id,en:entry.label||entry.en||'',ar:entry.label||entry.ar||entry.en||'',foodId:null,storedId:entry.id});
 }
 return selected;
}
function normalisedStoredEntries(state){
 const all=catalogue();
 return foodEntries(state).map(entry=>{
  const choice=choiceForStored(entry,all);
  return choice?{...entry,catalogId:choice.id,en:choice.en,ar:choice.ar,foodId:choice.foodId,...(choice.demoMealId?{demoMealId:choice.demoMealId}:{})}:{...entry,catalogId:entry.catalogId||'custom:'+entry.id};
 });
}
function withFoodChoices(state,entries){return {...state,foodEntries:entries,foods:[...new Set(entries.map(entry=>entry.foodId).filter(Boolean))],dietSource:'patient',mealEditedAt:new Date().toISOString()};}
export function addFoodChoice(state,catalogId){
 const choice=state?foodChoices(state.id).find(entry=>entry.id===catalogId):null;
 if(!choice)return {state,duplicate:false};
 if(selectedFoods(state).some(entry=>entry.id===catalogId))return {state,duplicate:true};
 const entry={id:globalThis.crypto?.randomUUID?.()||'food-'+Date.now()+'-'+catalogId,catalogId:choice.id,label:choice.en,en:choice.en,ar:choice.ar,foodId:choice.foodId,...(choice.demoMealId?{demoMealId:choice.demoMealId}:{}),source:'patient'};
 return {state:withFoodChoices(state,[...normalisedStoredEntries(state),entry]),duplicate:false};
}
export function removeFoodChoice(state,catalogId){
 if(!state||!selectedFoods(state).some(entry=>entry.id===catalogId))return state;
 return withFoodChoices(state,normalisedStoredEntries(state).filter(entry=>entry.catalogId!==catalogId));
}
