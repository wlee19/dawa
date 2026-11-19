// Ask Dawa: curated, source-linked answers to medicine questions. No API, no model, no network.
// Answers reuse the reviewed food/drink guidance in medicine-warnings.mjs so this page never
// disagrees with "My medicines". Two sample questions have fully written answers for the demo.
import {medicineWarnings} from './medicine-warnings.mjs';
import {MED_LANG} from './core.mjs';

export const ASK_SOURCES={
 ginsengHerbDrug:{title:'NCCIH · Herb-drug interactions: what the science says',url:'https://www.nccih.nih.gov/health/providers/digest/herb-drug-interactions-science',detail:'NCCIH says studies of Asian ginseng with warfarin have had mixed results, that ginseng might interact with some medications, and that people who take medicine should talk with their health care provider before using it. No dose or INR prediction is made.'}
};

// Two questions that are already answered in the system, for the demo.
// "this" = the medicine chosen on the page; tapping a sample selects the matching medicine.
export const SAMPLE_QUESTIONS=[
 {id:'ginseng-warfarin',medId:'warfarin',en:'Can I take ginseng with this?',ar:'هل يمكنني تناول الجينسنغ مع هذا الدواء؟',ru:'Можно ли принимать с этим женьшень?'},
 {id:'grapefruit-simvastatin',medId:'simvastatin',en:'Can I drink grapefruit juice with this?',ar:'هل يمكنني شرب عصير الجريب فروت مع هذا الدواء؟',ru:'Можно ли пить с этим грейпфрутовый сок?'}
];

const CURATED={
 'warfarin|ginseng':{level:'yellow',title:'Ginseng and warfarin',text:'Ask your anticoagulation clinic or pharmacist before you take ginseng with warfarin. Studies have had mixed results, but ginseng might interact with warfarin, and warfarin needs careful monitoring.',steps:['Do not start ginseng on your own.','If you already take it, tell your care team. Do not stop warfarin on your own.','Keep your usual anticoagulation clinic checks.'],sources:['ginsengHerbDrug','supplementSafety']},
 'simvastatin|grapefruit':{level:'red',title:'Grapefruit juice and simvastatin',text:'Avoid grapefruit juice while you take simvastatin. The NHS guide lists it as something to avoid, and the FDA names simvastatin as a medicine that can interact with grapefruit.',steps:['Ask your pharmacist if you have already had some.','Do not stop simvastatin on your own.'],sources:['simvastatinFood','citrus']}
};

// topic -> words people use (English, Arabic and Russian) and the matching rule label in medicine-warnings.mjs
const TOPICS=[
 {id:'ginseng',re:/ginseng|panax|جينسنغ|جنسنغ|جينسينغ|جنسينغ|женьшен/i,herb:true,label:'Ginseng'},
 {id:'grapefruit',re:/grapefruit|pomelo|جريب\s*فروت|جريبفروت|الجريب|грейпфрут/i,rule:'Grapefruit juice'},
 {id:'cranberry',re:/cranberr|توت\s*بري|клюкв/i,rule:'Cranberry juice'},
 {id:'pomegranate',re:/pomegranate|رمان|гранат/i,rule:'Pomegranate juice'},
 {id:'alcohol',re:/alcohol|\bbeer\b|\bwine\b|liquor|كحول|نبيذ|بيرة|алкогол|спиртн|пив[оау]|вин[оау]|водк/i,rule:'Alcohol'},
 {id:'greens',re:/spinach|kale|broccoli|leafy|greens|vitamin\s*k\b|سبانخ|ورقية|بروكلي|فيتامين\s*ك|шпинат|капуст|брокколи|зелен|витамин\s*[кk]\b/i,rule:'Big changes in leafy greens'},
 {id:'salt',re:/salt\s*substitute|lo-?salt|potassium|بديل\s*الملح|بوتاسيوم|заменител[ья]\s*соли|кали[йя]/i,rule:'Salt substitutes with potassium'},
 {id:'antacid',re:/antacid|heartburn|tums|maalox|gaviscon|حموضة|антацид|изжог/i,rule:'Antacids for heartburn'},
 {id:'calcium',re:/calcium|vitamin\s*d\b|كالسيوم|فيتامين\s*د|кальци|витамин\s*d\b/i,rule:'Extra calcium or vitamin D'}
];
const URGENT=/overdose|took too (much|many)|too many (pills|tablets)|double dose|chest pain|trouble breathing|can'?t breathe|severe bleeding|won'?t stop bleeding|allergic reaction|swollen (face|tongue|lips|throat)|passed out|fainted|جرعة زائدة|ألم في الصدر|ألم الصدر|صعوبة في التنفس|نزيف شديد|تورم الوجه|إغماء|передозир|слишком много таблеток|боль в груди|трудно дышать|не могу дышать|сильное кровотечение|отёк лица|отек лица|потерял сознание|потеряла сознание|обморок/i;
const MED_PATTERNS={metformin:/\bmetformin\b/i,lisinopril:/\blisinopril\b/i,vitaminD:/\bvitamin\s*d\s*3\b|\bcholecalciferol\b/i,warfarin:/\bwarfarin\b/i,simvastatin:/\bsimvastatin\b/i,gabapentin:/\bgabapentin\b/i};
const RANK={grey:1,yellow:2,red:3,urgent:4};

function detectMed(text,meds){
 const lower=text.toLowerCase(),hits=meds.filter(m=>MED_PATTERNS[m.id]?.test(text)||(MED_LANG[m.id]?.arName&&text.includes(MED_LANG[m.id].arName))||(MED_LANG[m.id]?.ruName&&lower.includes(MED_LANG[m.id].ruName.toLowerCase().slice(0,-1))));
 return hits.length===1?hits[0].id:null;
}
function itemFor(medId,topic){
 const curated=CURATED[medId+'|'+topic.id];
 if(curated)return {...structuredClone(curated),curated:true};
 if(topic.herb)return {level:'grey',title:topic.label,text:'Dawa has not reviewed this herbal product with this medicine. Herbal products can interact with medicines.',steps:['Show the label to your pharmacist before you start it.'],sources:['supplementSafety']};
 const w=medicineWarnings(medId),avoid=w.avoid.find(a=>a.label===topic.rule),check=w.checkFirst.find(c=>c.label===topic.rule);
 if(avoid)return {level:'red',title:avoid.label,text:'This is on the avoid list for this medicine in the guide.',steps:['Ask your pharmacist if you have already had some.'],sources:[avoid.source]};
 if(check)return {level:'yellow',title:check.label,text:check.note,steps:[],sources:[check.source]};
 return unreviewed();
}
function unreviewed(){return {level:'grey',title:'Ask your pharmacist',text:'Dawa does not have a reviewed answer to this question yet.',steps:['Ask your pharmacist or care team. Do not start, stop or change a medicine or supplement based on this demo.'],sources:['supplementSafety']};}

// askDawa({medId, text, meds}) -> {error} | {medId, question, level, items:[{level,title,text,steps,sources,curated?}]}
// All text fields are English keys; the UI translates them (textFor).
export function askDawa({medId,text,meds}){
 const question=String(text??'').trim().slice(0,200);
 if(!question)return {error:'Type or choose a question first.'};
 const list=Array.isArray(meds)?meds:[];
 const med=list.find(m=>m.id===detectMed(question,list))||list.find(m=>m.id===medId)||list[0];
 if(!med)return {error:'Type or choose a question first.'};
 let items;
 if(URGENT.test(question))items=[{level:'urgent',title:'If this may be an emergency',text:'Call your local emergency number or poison control right away. Do not wait for an app answer.',steps:[],sources:[]}];
 else{
  items=TOPICS.filter(t=>t.re.test(question)).slice(0,3).map(t=>itemFor(med.id,t));
  if(!items.length)items=[unreviewed()];
 }
 const level=items.reduce((worst,i)=>RANK[i.level]>RANK[worst]?i.level:worst,'grey');
 return {medId:med.id,question,level,items};
}
