// Synthetic reconciled remaining counts, explicitly recorded in the EHR.
// These are not quantities dispensed and are never inferred from a prescription.
export function sampleEhrSupply(){return [
 ['metformin','500 mg',12],['lisinopril','10 mg',18],['vitaminD','1,000 IU',25],['warfarin','2 mg',4],['simvastatin','10 mg',16]
].map(([medId,strength,remaining])=>({id:'demo-supply-'+medId,medId,strength,form:'tablet',ndc:'',remaining,recordedAt:'2026-11-15T17:00:00Z',source:'synthetic-ehr-reconciliation'}));}
export function ehrSupplyFor(state,id){
 if(state.ehr?.supplyAvailable===false)return null;
 const med=state.meds.find(m=>m.id===id);if(!med)return null;
 const record=state.ehr?.medicationSupply?.find(r=>r.medId===id&&r.strength===med.strength&&r.form===med.form&&(r.ndc||'')===(med.ndc||''));
 if(!record||!Number.isInteger(record.remaining)||record.remaining<0||record.remaining>100000||!record.recordedAt||!Number.isFinite(Date.parse(record.recordedAt)))return null;
 return record;
}
export function simulateSupplyUpdate(state,role){
 if(role!=='clinician'||!ehrSupplyFor(state,'metformin'))return state;
 const next=structuredClone(state);const record=next.ehr.medicationSupply.find(r=>r.id===ehrSupplyFor(state,'metformin').id);
 record.remaining=42;record.recordedAt=new Date().toISOString();next.version++;return next;
}
