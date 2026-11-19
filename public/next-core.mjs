import {initialState,normalizeState,checklistRows,localDay,commitChange,toBundle} from './core.mjs';
export const DEMO_DATE='2026-11-15';
export const PROFILES=[
 {id:'emma',name:'Emma Wilson',arName:'إيما ويلسون',initials:'EW',language:'en',age:68,foods:['breakfast','rice','fish','spinach'],avoidPork:false,ldl:158},
 {id:'amina',name:'Amina Hassan',arName:'أمينة حسن',initials:'AH',language:'ar',age:68,foods:['rice','lentils','hummus','spinach','fish'],avoidPork:true,ldl:164}
];
export const ARABIC_DEMO_MEALS=[
 {id:'hummus',en:'Hummus',ar:'حمص',foodId:'hummus'},
 {id:'baba-ghanoush',en:'Baba ghanoush',ar:'بابا غنوج',foodId:null},
 {id:'kibbeh',en:'Kibbeh',ar:'كبة',foodId:null},
 {id:'shawarmah',en:'Shawarmah',ar:'شاورما',foodId:null},
 {id:'khubz',en:'Khubz',ar:'خبز عربي',foodId:null},
 {id:'labneh',en:'Labneh',ar:'لبنة',foodId:null},
 {id:'tabbouleh',en:'Tabbouleh',ar:'تبولة',foodId:null}
];
export function arabicDemoMeals(){return ARABIC_DEMO_MEALS.map(m=>({id:'demo-amina-'+m.id,demoMealId:m.id,label:m.en,foodId:m.foodId,source:'example'}));}
export function profileFor(id){return PROFILES.find(p=>p.id===id)||null;}
export function newPatient(id){const profile=profileFor(id);if(!profile)throw new Error('Unknown demo patient.');const p=normalizeState(initialState());return {...p,id,patientLang:profile.language,foods:id==='amina'?['hummus']:[...profile.foods],...(id==='amina'?{foodEntries:arabicDemoMeals(),mealTemplateVersion:2}:{}),avoidPork:profile.avoidPork,consent:false,clock:'08:00',demoDate:DEMO_DATE,liveClock:false,requireBottle:true,bottleChecks:{},skipped:{},caregiver:null,alerts:[],photos:[],mealNote:'',checkWindowMinutes:30};}
export function restorePatient(raw,id){const base=newPatient(id);if(!raw||raw.id!==id)return base;const mealUpgrade=id==='amina'&&raw.mealTemplateVersion!==2&&!raw.mealEditedAt?{foodEntries:arabicDemoMeals(),foods:['hummus'],mealTemplateVersion:2}:{};return {...base,...normalizeState(raw),...mealUpgrade,id,clock:/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.clock)?raw.clock:base.clock,requireBottle:raw.requireBottle!==false,bottleChecks:raw.bottleChecks||{},skipped:raw.skipped||{},alerts:Array.isArray(raw.alerts)?raw.alerts:[],photos:Array.isArray(raw.photos)?raw.photos:[],caregiver:raw.caregiver||null};}
export function clockDate(p){if(p.liveClock)return new Date();const [y,m,d]=(p.demoDate||DEMO_DATE).split('-').map(Number),[h,min]=p.clock.split(':').map(Number);return new Date(y,m-1,d,h,min);}
export function doseRows(p,now=clockDate(p)){return checklistRows(p,now).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')).map(r=>({...r,skipped:!!p.skipped?.[r.key]}));}
export function timingFor(row,p,now=clockDate(p)){
 if(row.needsReview)return 'review';if(row.checked)return 'taken';if(row.skipped)return 'skipped';
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.time))return 'unknown';
 const current=now.getHours()*60+now.getMinutes(),[h,m]=row.time.split(':').map(Number),due=h*60+m;
 return current<due?'early':current>due+30?'late':'due';
}
export function dueRows(p,now=clockDate(p)){return doseRows(p,now).filter(r=>timingFor(r,p,now)==='due'&&r.reminderEnabled);}
export function enableInitialReminders(p){const next=structuredClone(p);for(const r of doseRows(next))if(!r.needsReview)next.reminders.doses[r.med.id+'|'+r.slot]={enabled:true};return next;}
export function bottleFingerprint(m){let hash=2166136261;for(const c of [m.id,m.name,m.strength,m.form,m.ndc||'',m.original].join('|'))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;return hash.toString(16);}
const canonical=text=>String(text).normalize('NFKC').toLowerCase().replace(/[,،]/g,'').replace(/milligrams?/g,'mg').replace(/international units?/g,'iu').replace(/\s+/g,' ').trim();
const medNames={metformin:/\bmetformin\b/,lisinopril:/\blisinopril\b/,vitaminD:/\bvitamin\s*d\s*3\b|\bcholecalciferol\b/,warfarin:/\bwarfarin\b/,simvastatin:/\bsimvastatin\b/,gabapentin:/\bgabapentin\b/};
export function compareBottle(m,result){
 const text=canonical(result?.text||''),confidence=Number(result?.confidence)||0;
 if(!text||confidence<70)return {status:'unclear',reason:'Could not read the label clearly.'};
 const identified=Object.entries(medNames).filter(([,pattern])=>pattern.test(text)).map(([id])=>id);
 if(identified.length!==1)return {status:identified.length?'unclear':'mismatch',reason:identified.length?'More than one medicine name was found.':'The medicine name does not match.'};
 if(identified[0]!==m.id)return {status:'mismatch',reason:'The medicine name does not match.'};
 const strength=canonical(m.strength).match(/^(\d+(?:\.\d+)?)\s*(mg|iu)$/);if(!strength)return {status:'unclear',reason:'Ask a pharmacist to check the strength.'};
 const found=[...text.matchAll(/\b(\d+(?:\.\d+)?)\s*(mg|iu)\b/g)].map(match=>({value:Number(match[1]),unit:match[2]}));
 if(!found.length)return {status:'unclear',reason:'The strength was not clear.'};
 if(found.some(s=>s.value!==Number(strength[1])||s.unit!==strength[2]))return {status:'mismatch',reason:'The strength does not match.'};
 const form=m.form==='capsule'?/\bcapsules?\b/:/\btablets?\b/;
 if(!form.test(text))return {status:'unclear',reason:'The tablet or capsule type was not clear.'};
 return {status:'matched',reason:'Label name and strength match.',fingerprint:bottleFingerprint(m)};
}
export function nfcTagFor(p,m){return `dawa-demo:v1:${p.id}:${m.id}:${bottleFingerprint(m)}`;}
export function compareTag(p,m,payload){return payload===nfcTagFor(p,m)?{status:'matched',fingerprint:bottleFingerprint(m),reason:'The tag matches this prescription.'}:{status:'mismatch',reason:'This tag does not match this prescription.'};}
export function saveBottleCheck(p,key,result,method){const row=doseRows(p).find(r=>r.key===key);if(!row||result.status!=='matched'||result.fingerprint!==bottleFingerprint(row.med)||!['ocr','nfc','demo-nfc'].includes(method))return p;return {...p,bottleChecks:{...p.bottleChecks,[key]:{patientId:p.id,fingerprint:result.fingerprint,method,checkedAt:new Date().toISOString()}}};}
export function clearBottleCheck(p,key){if(!p.bottleChecks?.[key])return p;const checks={...p.bottleChecks};delete checks[key];return {...p,bottleChecks:checks};}
export function bottleChecked(p,row){const check=p.bottleChecks?.[row.key];return !!check&&check.patientId===p.id&&check.fingerprint===bottleFingerprint(row.med);}
export function logTaken(p,key,now=clockDate(p)){const row=doseRows(p,now).find(r=>r.key===key);if(!row||timingFor(row,p,now)!=='due')return {state:p,error:'Do not take yet'};if(p.requireBottle&&!bottleChecked(p,row))return {state:p,error:'Check the bottle first'};return {state:{...p,checklist:{...p.checklist,[key]:now.toISOString()}}};}
function addAlert(p,row,kind,now){if(!p.caregiver?.notify)return p;const id=[row.key,kind].join('|');if(p.alerts.some(a=>a.id===id))return p;return {...p,alerts:[{id,medId:row.med.id,kind,time:row.time,at:now.toISOString(),read:false},...p.alerts]};}
export function skipDose(p,key,now=clockDate(p)){const row=doseRows(p,now).find(r=>r.key===key);if(!row||row.checked||row.skipped||row.needsReview)return p;const next={...p,skipped:{...p.skipped,[key]:now.toISOString()}};return addAlert(next,row,'skipped',now);}
export function syncMissed(p,now=clockDate(p)){let next=p;for(const row of doseRows(p,now))if(timingFor(row,p,now)==='late')next=addAlert(next,row,'not-logged',now);return next;}
export function setClock(p,clock){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))return p;return syncMissed({...p,clock,liveClock:false});}
export function addCaregiver(p,{name,language,notify}){const cleaned=String(name||'').trim().slice(0,60);if(!cleaned)return p;return syncMissed({...p,consent:true,caregiver:{name:cleaned,language:['en','ar'].includes(language)?language:'en',notify:!!notify},alerts:[]});}
export function removeCaregiver(p){return {...p,consent:false,caregiver:null,alerts:[]};}
export function applyEhrChange(p,action){return commitChange(p,action);}
export function ehrBundle(p){const profile=profileFor(p.id),bundle=toBundle(p),patientRef='Patient/demo-'+p.id;bundle.entry=bundle.entry.filter(e=>!['RelatedPerson','Consent'].includes(e.resource.resourceType));for(const e of bundle.entry){const r=e.resource;if(r.resourceType==='Patient'){r.id='demo-'+p.id;r.name=[{text:profile.name}];r.communication=[{language:{coding:[{code:profile.language}]},preferred:true}];}if(r.resourceType==='DocumentReference'&&r.id==='demo-diet-note')r.description=p.id==='amina'?ARABIC_DEMO_MEALS.map(m=>m.en).join(', ')+'.':'Breakfast meal, rice, baked fish, cooked spinach.';if(r.subject)r.subject.reference=patientRef;if(r.patient)r.patient.reference=patientRef;}
 bundle.entry=bundle.entry.filter(e=>e.resource.id!=='demo-ldl');
 for(const lab of [
 {id:'ldl',name:'LDL cholesterol',value:profile.ldl,unit:'mg/dL',flag:'H',range:'Below 100'},
 {id:'potassium',name:'Potassium',value:4.3,unit:'mmol/L',flag:'N',range:'3.5–5.1'},
 {id:'creatinine',name:'Creatinine',value:0.9,unit:'mg/dL',flag:'N',range:'0.6–1.2'}])bundle.entry.push({resource:{resourceType:'Observation',id:'demo-'+p.id+'-'+lab.id,status:'final',category:[{coding:[{code:'laboratory'}]}],subject:{reference:patientRef},code:{text:lab.name},effectiveDateTime:'2026-11-12T09:00:00Z',valueQuantity:{value:lab.value,unit:lab.unit},referenceRange:[{text:lab.range}],interpretation:[{coding:[{code:lab.flag}]}]}});
 bundle.note='Synthetic FHIR-like fixture only. Remaining counts and lab flags are explicitly recorded, not inferred.';return bundle;
}
export function labsFromEhr(bundle){return (bundle?.entry||[]).map(e=>e.resource).filter(r=>r?.resourceType==='Observation'&&r.category?.some(c=>c.coding?.some(k=>k.code==='laboratory'))&&typeof r.valueQuantity?.value==='number').map(r=>({id:r.id,name:r.code.text,value:r.valueQuantity.value,unit:r.valueQuantity.unit,flag:r.interpretation?.[0]?.coding?.[0]?.code||'unknown',range:r.referenceRange?.[0]?.text||'',date:r.effectiveDateTime}));}
export function patientSourceKey(id){return 'dawa-next-v1:'+id;}
export {localDay};
