import {medicineClip} from './voice-catalog.mjs';
export const VOICE_LANGUAGES=[{code:'en',label:'English',recognition:'english'},{code:'ar',label:'العربية',recognition:'arabic'},{code:'ru',label:'Русский',recognition:'russian'}];
let playbackQueue=Promise.resolve(),playbackGeneration=0,finishPlayback=null;
let speechRate=1;
export function setVoiceRate(rate){speechRate=[0.75,1,1.25].includes(Number(rate))?Number(rate):1;if(player)player.playbackRate=speechRate;if(typeof document!=='undefined')document.querySelectorAll('audio').forEach(a=>{a.playbackRate=speechRate;});return speechRate;}
if(typeof document!=='undefined')document.addEventListener('loadedmetadata',e=>{if(e.target.tagName==='AUDIO')e.target.playbackRate=speechRate;},true);
let player=null,worker=null,modelReady=false,recording=null,recordTimer=null,sequence=0,recordingGeneration=0;
const pending=new Map();
export function voiceReady(){return modelReady;}
export function isRecording(){return !!recording;}
export function stopVoice(){playbackGeneration++;if(player){player.pause();player.currentTime=0;player=null;}if(typeof document!=='undefined')document.querySelectorAll('audio').forEach(a=>{a.pause();a.currentTime=0;});finishPlayback?.();finishPlayback=null;if('speechSynthesis' in globalThis)globalThis.speechSynthesis.cancel();}
export async function playMedicine(m,lang,enqueue=false){
 if(!enqueue)stopVoice();const generation=playbackGeneration,code=VOICE_LANGUAGES.some(l=>l.code===lang)?lang:'en',clip=medicineClip(m,code);
 if(!clip)throw new Error('No recording matches these directions. Please read the displayed prescription.');
 const play=async()=>{if(generation!==playbackGeneration)return;player=new Audio(new URL(`./voices/${clip.file}`,import.meta.url).href);player.playbackRate=speechRate;await new Promise((resolve,reject)=>{finishPlayback=resolve;player.onended=resolve;player.onerror=()=>reject(new Error('Voice playback failed'));player.play().catch(reject);});};
 if(enqueue){playbackQueue=playbackQueue.catch(()=>{}).then(play);return playbackQueue;}return play();
}
export async function playSample(lang){stopVoice();player=new Audio(new URL(`./voices/${lang}/sample.wav`,import.meta.url).href);player.playbackRate=speechRate;await player.play();}
function ensureWorker(onStatus){if(!worker){worker=new Worker(new URL('./voice-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=event=>{const m=event.data,request=pending.get(m.id);if(!request)return;if(m.type==='progress'){request.status?.(m.message);return;}pending.delete(m.id);if(m.type==='error')request.reject(new Error(m.error));else request.resolve(m.result);};worker.onerror=()=>{for(const request of pending.values())request.reject(new Error('Voice input could not start. Please reload and try again.'));pending.clear();worker?.terminate();worker=null;modelReady=false;};}return worker;}
function send(type,data,onStatus){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject,status:onStatus});ensureWorker(onStatus).postMessage({id,type,...data});});}
export async function prepareVoice(onStatus){if(modelReady)return;await send('load',{},onStatus);modelReady=true;}
async function decodeAudio(buffer){const context=new AudioContext();try{const decoded=await context.decodeAudioData(buffer.slice(0));if(decoded.duration>30)throw new Error('Please use a recording under 30 seconds.');const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*16000),16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();return rendered.getChannelData(0);}finally{await context.close();}}
export async function transcribeBlob(blob,lang,onStatus){await prepareVoice(onStatus);const audio=await decodeAudio(await blob.arrayBuffer());return send('transcribe',{audio,lang},onStatus);}
export async function transcribeSample(lang,onStatus){const response=await fetch(new URL(`./voices/${lang}/sample.wav`,import.meta.url));if(!response.ok)throw new Error('Sample audio unavailable');return transcribeBlob(await response.blob(),lang,onStatus);}
export async function startRecording(lang,onStatus){
 if(recording)return;
 const requestedGeneration=recordingGeneration;await prepareVoice(onStatus);if(requestedGeneration!==recordingGeneration)throw new Error('Recording cancelled');
 if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder)throw new Error('Microphone recording is unavailable. You can upload a short audio clip.');
 const stream=await navigator.mediaDevices.getUserMedia({audio:true}),parts=[],recorder=new MediaRecorder(stream);
 recording={recorder,stream,lang,parts,stopped:new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());resolve(new Blob(parts,{type:recorder.mimeType}));};recorder.onerror=()=>{stream.getTracks().forEach(t=>t.stop());reject(new Error('Recording failed'));};})};
 recorder.start();recordTimer=setTimeout(()=>{if(recording)recording.recorder.stop();},20000);return recording;
}
export async function finishRecording(onStatus){if(!recording)return '';const active=recording;recording=null;clearTimeout(recordTimer);if(active.recorder.state!=='inactive')active.recorder.stop();const blob=await active.stopped;return transcribeBlob(blob,active.lang,onStatus);}
export function cancelRecording(){recordingGeneration++;if(!recording)return;const active=recording;recording=null;clearTimeout(recordTimer);if(active.recorder.state!=='inactive')active.recorder.stop();active.stream.getTracks().forEach(t=>t.stop());}
