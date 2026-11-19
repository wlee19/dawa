// Food/drink guidance reviewed for every synthetic demo medicine on 2026-11-15.
// This is a curated guide summary, not a full interaction or patient-safety clearance.
// Keep conditional cautions and dietary preferences separate from strict avoid items.
const rules={
 metformin:{source:'metforminMeal',avoid:[],noAvoid:'No foods to avoid listed in the NHS guide.',checkFirst:[{label:'Alcohol',note:'Limit alcohol. Ask your pharmacist about it.',source:'metforminMeal'}]},
 lisinopril:{source:'lisinoprilWater',avoid:[],noAvoid:'No foods to avoid listed in the NHS guide.',checkFirst:[{label:'Salt substitutes with potassium',note:'Ask your pharmacist before using them.',source:'lisinoprilSalt'},{label:'Alcohol',note:'It can make low blood pressure worse. Ask your pharmacist.',source:'lisinoprilWater'}]},
 vitaminD:{source:'vitaminDFood',avoid:[],noAvoid:'No foods or drinks to avoid listed in the NHS guide.',checkFirst:[{label:'Extra calcium or vitamin D',note:'Ask your doctor before adding these supplements.',source:'vitaminDSupplements'}]},
 simvastatin:{source:'simvastatinFood',avoid:[{label:'Grapefruit juice',source:'simvastatinFood'}],checkFirst:[{label:'Alcohol',note:'Too much can raise the risk of side effects.',source:'simvastatinFood'}]},
 warfarin:{source:'warfarinFood',avoid:[{label:'Cranberry juice',source:'warfarinFood'},{label:'Grapefruit juice',source:'warfarinFood'},{label:'Pomegranate juice',source:'warfarinFood'}],checkFirst:[{label:'Big changes in leafy greens',note:'Keep the amount you eat steady. Ask your care team before a big change.',source:'warfarinFood'}]},
 gabapentin:{source:'gabapentinFood',avoid:[],noAvoid:'No foods to avoid listed in the NHS guide.',checkFirst:[{label:'Alcohol',note:'It can make you sleepy or tired. Ask your pharmacist.',source:'gabapentinFood'},{label:'Antacids for heartburn',note:'Ask your pharmacist how to space them from this medicine.',source:'gabapentinMedicines'}]}
};
export function medicineWarnings(medId){const entry=rules[medId];return entry?{reviewed:true,reviewedOn:'2026-11-15',...structuredClone(entry)}:{reviewed:false,avoid:[],checkFirst:[]};}
