import {ehrSupplyFor} from './ehr-supply.mjs';
export function supplyFor(state,id){const preferences=state.supply?.[id]||{},record=ehrSupplyFor(state,id);return {refillAt:preferences.refillAt??7,remind:preferences.remind??true,expiresOn:preferences.expiresOn||'',count:record?.remaining??null,source:record?'ehr':null,recordedAt:record?.recordedAt||null};}
export function saveSupply(state,role,id,input){
 if(role!=='patient'||!state.meds.some(m=>m.id===id))return state;
 const refillAt=Number(input.refillAt);
 if(!Number.isInteger(refillAt)||refillAt<0||refillAt>100000)throw new Error('Enter a whole refill reminder count.');
 const expiresOn=input.expiresOn||'';
 const date=new Date(expiresOn+'T12:00:00Z');
 if(expiresOn&&(!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==expiresOn))throw new Error('Check the expiration date.');
 // Only personal settings are saved. Supplied/legacy manual counts cannot override the EHR.
 return {...state,supply:{...state.supply,[id]:{refillAt,remind:!!input.remind,expiresOn,updatedAt:new Date().toISOString()}}};
}
export function refillDue(state,id){const s=supplyFor(state,id);return s.remind&&s.count!==null&&s.count<=s.refillAt;}
export function expirationPassed(state,id,today){const date=supplyFor(state,id).expiresOn;return !!date&&date<today;}
