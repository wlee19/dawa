// Reminder acknowledgement only. These helpers never alter prescriptions or adherence records.
export function supportDefaults(){return {enabled:false,spoken:true,events:[]};}
export function canManageSupport(state,role){return role==='clinician'||(role==='caregiver'&&state.consent);}
export function setSupport(state,role,enabled){
 if(!canManageSupport(state,role))return state;
 const next=structuredClone(state);next.supported={...supportDefaults(),...next.supported,enabled};
 if(!enabled)for(const event of next.supported.events)if(event.status==='pending'){event.status='mode-off';event.closedBy=role;event.closedAt=new Date().toISOString();}
 return next;
}
export function addSupportedEvent(state,row,{preview=false,now=new Date()}={}){
 if(!state.supported?.enabled||!row||row.needsReview)return {state,event:null};
 const duplicate=state.supported.events.find(e=>e.status==='pending'&&e.med.id===row.med.id&&e.slot===row.slot&&e.med.original===row.med.original);
 if(duplicate)return {state,event:duplicate};
 const next=structuredClone(state),event={id:globalThis.crypto?.randomUUID?.()||`${now.getTime()}-${row.med.id}-${row.slot}`,med:structuredClone(row.med),slot:row.slot,time:row.time,createdAt:now.toISOString(),preview,status:'pending',approvalRequested:false};
 next.supported.events.push(event);return {state:next,event};
}
export function pendingSupport(state){return (state.supported?.events||[]).filter(e=>e.status==='pending');}
export function requestSupportApproval(state,id,role){
 if(role!=='patient'||!state.consent)return state;
 const next=structuredClone(state),event=next.supported?.events.find(e=>e.id===id&&e.status==='pending');if(!event)return state;
 event.approvalRequested=true;return next;
}
export function approveSupportEvent(state,id,role){
 if(role!=='caregiver'||!state.consent)return state;
 const next=structuredClone(state),event=next.supported?.events.find(e=>e.id===id&&e.status==='pending');if(!event)return state;
 event.status='caregiver-approved';event.closedBy='caregiver';event.closedAt=new Date().toISOString();return next;
}
export function submitSupportPhoto(state,id,role,photo){
 if(role!=='patient'||!photo||!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size<=0||photo.size>5*1024*1024)return state;
 const next=structuredClone(state),event=next.supported?.events.find(e=>e.id===id&&e.status==='pending');if(!event)return state;
 event.status='photo-submitted';event.photo={type:photo.type,size:photo.size,submittedAt:new Date().toISOString(),identityVerified:false,intakeVerified:false};event.closedAt=event.photo.submittedAt;event.closedBy='patient';return next;
}
export function reconcileSupport(state){
 const next=structuredClone(state);for(const event of next.supported?.events||[]){if(event.status!=='pending')continue;const current=next.meds.find(m=>m.id===event.med.id);if(!current||current.original!==event.med.original){event.status='prescription-updated';event.closedAt=new Date().toISOString();}}
 return next;
}
