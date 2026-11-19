import {pipeline,env} from './vendor/transformers.min.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
env.backends.onnx.wasm.wasmPaths={mjs:new URL('./vendor/ort-wasm-simd-threaded.jsep.mjs',import.meta.url).href,wasm:new URL('./vendor/ort-wasm-simd-threaded.jsep.wasm',import.meta.url).href};
let model=null,loading=null;
async function getModel(id){if(model)return model;if(!loading)loading=pipeline('automatic-speech-recognition','onnx-community/whisper-base',{dtype:'q8',device:'wasm',progress_callback:p=>{if(p.status==='progress')self.postMessage({id,type:'progress',message:'Downloading voice input · '+Math.round(p.progress||0)+'%'});}}).then(result=>{model=result;return model;}).catch(error=>{loading=null;throw error;});return loading;}
self.onmessage=async event=>{const {id,type,audio,lang}=event.data;try{const transcriber=await getModel(id);if(type==='load'){self.postMessage({id,type:'done',result:true});return;}const language={en:'english',ar:'arabic',ru:'russian'}[lang]||'english';const output=await transcriber(audio,{language,task:'transcribe',return_timestamps:false,max_new_tokens:120});self.postMessage({id,type:'done',result:output.text.trim()});}catch(error){self.postMessage({id,type:'error',error:error.message||'Voice input failed'});}};
