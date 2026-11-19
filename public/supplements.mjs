export function supplementReview(state,item){
 const ingredients=(item.ingredients||'').toLowerCase(),notes=[];
 if(/vitamin\s*k\b|فيتامين\s*ك|витамин\s*[kк]/i.test(ingredients)&&state.meds.some(m=>m.id==='warfarin'))notes.push({kind:'interaction',title:'Check vitamin K with warfarin',text:'Vitamin K can affect warfarin. Ask a pharmacist to review this product and its amount. Do not change either on your own.',source:'nutrition'});
 if(/vitamin\s*d\b|vitamin\s*d3|cholecalciferol|فيتامين\s*د|витамин\s*[dд]/i.test(ingredients)&&state.meds.some(m=>m.id==='vitaminD'))notes.push({kind:'duplicate',title:'Vitamin D is already on your list',text:'This may repeat an ingredient in your prescription. Ask your pharmacist to check the total amount before adding it.',source:'supplementSafety'});
 if(!ingredients.trim()||/unknown|not sure|غير معروف|неизвест/i.test(ingredients))notes.push({kind:'unknown',title:'We need the ingredient list',text:'Bring the label or ingredient list to a pharmacist. We cannot review this product without it.',source:'supplementSafety'});
 if(!notes.length)notes.push({kind:'review',title:'Ask a pharmacist to review it',text:'This demo has only a few supplement checks. No flag does not mean a product is safe for you.',source:'supplementSafety'});
 return notes;
}
export function addSupplement(state,role,item){
 if(role!=='patient'||!item.name?.trim()||item.name.length>80)return state;
 const next=structuredClone(state);next.supplements=[{id:globalThis.crypto?.randomUUID?.()||String(Date.now()),name:item.name.trim(),ingredients:(item.ingredients||'').slice(0,500),use:(item.use||'').slice(0,120),stage:item.stage==='taking'?'taking':'considering',kind:item.kind||'other',source:'patient-reported',addedAt:new Date().toISOString()},...(next.supplements||[])];return next;
}
