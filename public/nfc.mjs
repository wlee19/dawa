// Web NFC helpers for dawa bottle tags.
//
// A bottle tag holds two NDEF records:
//   1. a URL record  -> https://<app>/#tag=<payload>  (tapping a locked phone opens the app)
//   2. a text record -> dawa-demo:v1:<patient>:<medicine>:<fingerprint>
// Reading accepts either record, so tags written by other NFC apps (plain text) also work.
//
// Web NFC exists only in Chrome on Android, on HTTPS pages. Everything else gets a clear message.
import {TAG_PREFIX} from './next-core.mjs';

export function nfcSupported(){return typeof globalThis.NDEFReader==='function';}
export function isIOS(){const nav=globalThis.navigator;return !!nav&&(/iPad|iPhone|iPod/.test(nav.userAgent||'')||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1));}
export function unsupportedMessage(){return isIOS()?'iPhone browsers cannot read NFC tags. Use a bottle photo or the demo tag.':'This browser cannot read NFC tags. Use Chrome on an Android phone, a bottle photo, or the demo tag.';}

// URL that a tapped tag opens. Only the hash changes, so it works from any folder the app is hosted in.
export function tagUrl(payload,base=globalThis.location?.href){const url=new URL('./',base);url.hash='tag='+encodeURIComponent(payload);return url.href;}
export function payloadFromHash(hash){const match=/(?:^#|&)tag=([^&]+)/.exec(String(hash||''));if(!match)return '';try{return decodeURIComponent(match[1]).trim();}catch{return '';}}

function decode(record){
 if(!record?.data)return '';
 try{const encoding=record.recordType==='text'?(record.encoding||'utf-8'):'utf-8';return new TextDecoder(encoding).decode(record.data);}catch{return '';}
}
// Pick the dawa payload out of an NDEF message's records. Text records win over URL records.
export function payloadFromRecords(records){
 const texts=[],urls=[];
 for(const record of Array.from(records||[])){
  const text=decode(record).trim();if(!text)continue;
  if(record.recordType==='text'||record.mediaType==='text/plain')texts.push(text);
  else if(record.recordType==='url'||record.recordType==='absolute-url')urls.push(text.includes('#')?payloadFromHash(text.slice(text.indexOf('#'))):'');
 }
 // A dawa payload in a text record, then one inside a URL, then whatever text the tag had (so the UI can say it is not a dawa tag).
 return texts.find(t=>t.startsWith(TAG_PREFIX))||urls.find(u=>u.startsWith(TAG_PREFIX))||texts[0]||urls.find(Boolean)||'';
}

// English message keys; the UI translates them. Returns null when the user cancelled.
export function nfcErrorMessage(error,mode='read'){
 switch(error?.name){
  case 'AbortError':return null;
  case 'NotAllowedError':return 'NFC permission was denied. Allow NFC for this site in Chrome settings.';
  case 'NotSupportedError':return 'NFC is turned off. Turn on NFC in your phone settings, then try again.';
  case 'NotReadableError':return mode==='write'?'This tag is locked and cannot be rewritten. Use a new sticker.':'The tag could not be read. Hold the phone still and try again.';
  default:return mode==='write'?'Could not write the tag. Hold the phone still against the sticker and try again.':'The tag could not be read. Hold the phone still and try again.';
 }
}

// Start listening for one tag. Resolves once scanning has started; onPayload/onError fire later.
export async function startTagScan({signal,onPayload,onError}){
 const reader=new globalThis.NDEFReader();
 reader.onreading=event=>onPayload(payloadFromRecords(event.message?.records));
 reader.onreadingerror=()=>onError?.('The tag could not be read. Hold the phone still and try again.');
 await reader.scan({signal});
 return reader;
}

export async function writeBottleTag(payload,{signal,base}={}){
 const writer=new globalThis.NDEFReader();
 await writer.write({records:[{recordType:'url',data:tagUrl(payload,base)},{recordType:'text',data:payload,lang:'en'}]},{signal,overwrite:true});
}
