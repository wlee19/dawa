import {test} from 'node:test';
import assert from 'node:assert/strict';
import {payloadFromRecords,payloadFromHash,tagUrl,nfcErrorMessage} from '../public/nfc.mjs';
import {newPatient,nfcTagFor,parseTag,compareTag} from '../public/next-core.mjs';

const record=(recordType,data)=>({recordType,encoding:'utf-8',data:new DataView(new TextEncoder().encode(data).buffer)});
const emma=newPatient('emma');
const metformin=emma.meds.find(m=>m.id==='metformin');
const payload=nfcTagFor(emma,metformin);

test('tag payload has the documented shape',()=>{
 assert.match(payload,/^dawa-demo:v1:emma:metformin:[0-9a-f]+$/);
 assert.deepEqual(parseTag(payload),{patientId:'emma',medId:'metformin',fingerprint:payload.split(':').pop()});
 assert.equal(parseTag('hello'),null);
 assert.equal(parseTag('dawa-demo:v1:emma:metformin'),null);
});

test('reads the payload from a text record',()=>{
 assert.equal(payloadFromRecords([record('text',payload)]),payload);
});

test('a dawa text record wins over an unrelated URL record',()=>{
 assert.equal(payloadFromRecords([record('url','https://example.com/#tag=nope'),record('text',payload)]),payload);
});

test('reads the payload from a URL-only tag',()=>{
 const url=tagUrl(payload,'https://dawa.example/app/');
 assert.equal(url,'https://dawa.example/app/#tag='+encodeURIComponent(payload));
 assert.equal(payloadFromRecords([record('url',url)]),payload);
 assert.equal(payloadFromHash(new URL(url).hash),payload);
});

test('unknown tags return their text so the UI can explain',()=>{
 assert.equal(payloadFromRecords([record('text','hello')]),'hello');
 assert.equal(payloadFromRecords([]),'');
});

test('compareTag explains each kind of mismatch',()=>{
 assert.equal(compareTag(emma,metformin,payload).status,'matched');
 assert.equal(compareTag(emma,metformin,'  '+payload+'\n').status,'matched','surrounding whitespace is ignored');
 const lisinopril=emma.meds.find(m=>m.id==='lisinopril');
 const other=compareTag(emma,metformin,nfcTagFor(emma,lisinopril));
 assert.equal(other.status,'mismatch');assert.equal(other.otherMedId,'lisinopril');
 assert.match(compareTag(emma,metformin,nfcTagFor(newPatient('amina'),metformin)).reason,/another patient/);
 assert.match(compareTag(emma,metformin,'hello').reason,/not a dawa bottle tag/);
});

test('NFC errors map to plain messages; cancelling is silent',()=>{
 assert.equal(nfcErrorMessage({name:'AbortError'}),null);
 assert.match(nfcErrorMessage({name:'NotSupportedError'}),/Turn on NFC/);
 assert.match(nfcErrorMessage({name:'NotAllowedError'}),/permission/);
 assert.match(nfcErrorMessage({name:'NotReadableError'},'write'),/locked/);
});
