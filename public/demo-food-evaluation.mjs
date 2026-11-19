import {checkFood} from './food-check.mjs';
import {ehrBundle,labsFromEhr} from './next-core.mjs';
const recipes={
 hummus:{ingredients:'Chickpeas, tahini, lemon and olive oil.',vitaminK:true},
 'baba-ghanoush':{ingredients:'Roasted eggplant, tahini, lemon and olive oil.'},
 kibbeh:{ingredients:'Fatty lamb mince, bulgur, onion and vegetable oil.',fatty:true},
 shawarmah:{ingredients:'Fatty lamb, khubz and full-fat yogurt sauce.',fatty:true},
 khubz:{ingredients:'Wheat flour, water, yeast and table salt.'},
 labneh:{ingredients:'Full-fat strained yogurt and table salt.',fatty:true},
 tabbouleh:{ingredients:'Parsley, bulgur, tomato, lemon and olive oil.',vitaminK:true}
};
export function evaluateFoodChoice(state,entry){
 const recipe=state.id==='amina'&&recipes[entry.demoMealId];
 if(!recipe)return checkFood(state,{foodId:entry.foodId,label:entry.en});
 const base={evaluated:true,sampleRecipe:true,ingredients:recipe.ingredients,scope:'This checks the sample ingredients shown, not every recipe or interaction.'};
 if(recipe.vitaminK&&state.meds.some(m=>m.id==='warfarin'))return {...base,level:'yellow',kind:'food',label:'Warfarin: keep portions steady',text:'This sample has vitamin K foods. Keep your usual portions steady with warfarin. Ask your clinic before a big change; do not cut this food out on your own.',source:'warfarinFood'};
 const hasHighLdl=state.useEhrHealth&&state.ehr?.labsAvailable!==false&&labsFromEhr(ehrBundle(state)).some(l=>l.name==='LDL cholesterol'&&l.flag==='H');
 if(recipe.fatty)return {...base,level:'yellow',kind:'nutrition',label:'Nutrition note',text:hasHighLdl?'Your record flags high LDL. This sample uses fatty meat or full-fat dairy. Consider leaner meat or lower-fat dairy. This is a nutrition note, not a medicine ban.':'This sample uses fatty meat or full-fat dairy. Leaner meat or lower-fat dairy are heart-healthy options. This is a nutrition note, not a medicine ban.',source:'foodOptions'};
 return {...base,level:'green',kind:'ingredient-check',label:'Listed ingredient checks passed',text:'No grapefruit, cranberry or pomegranate juice, or potassium salt substitute is in this sample recipe. This is not a full medicine or allergy check.',source:'foodOptions'};
}
