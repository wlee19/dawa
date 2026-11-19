// All OCR assets, including English traineddata, are served from this app.
// OCR reads label text; it cannot establish bottle contents, authenticity or intake.
const assetBase=new URL('./ocr/',import.meta.url);
let runtimePromise,workerPromise,queue=Promise.resolve(),activeProgress=null;
function loadRuntime(){
 if(globalThis.Tesseract?.createWorker)return Promise.resolve(globalThis.Tesseract);
 if(!runtimePromise)runtimePromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=new URL('tesseract.min.js',assetBase).href;script.async=true;
  script.onload=()=>globalThis.Tesseract?.createWorker?resolve(globalThis.Tesseract):reject(new Error('OCR could not start.'));
  script.onerror=()=>{runtimePromise=null;reject(new Error('OCR files could not load. Please try again.'));};document.head.append(script);
 });
 return runtimePromise;
}
async function worker(){
 if(!workerPromise)workerPromise=(async()=>{const runtime=await loadRuntime();const instance=await runtime.createWorker('eng',1,{
  workerPath:new URL('worker.min.js',assetBase).href,
  corePath:assetBase.href.replace(/\/$/,''),
  langPath:new URL('lang/',assetBase).href.replace(/\/$/,''),
  workerBlobURL:false,
  logger:message=>activeProgress?.({status:message.status,progress:message.progress||0}),
  errorHandler:()=>{}
 });await instance.setParameters({tessedit_pageseg_mode:'3',preserve_interword_spaces:'1'});return instance;})().catch(error=>{workerPromise=null;throw error;});
 return workerPromise;
}
export function readBottleText(blobOrUrl,onProgress){
 const job=queue.catch(()=>{}).then(async()=>{
  activeProgress=onProgress||null;
  try{const instance=await worker();const {data}=await instance.recognize(blobOrUrl);return {text:String(data.text||'').trim(),confidence:Number(data.confidence)||0};}
  finally{activeProgress=null;}
 });
 queue=job;return job;
}
export async function stopBottleOCR(){if(workerPromise){try{await (await workerPromise).terminate();}catch{}workerPromise=null;}activeProgress=null;}
