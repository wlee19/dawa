import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {textFor,LANGUAGES} from '../public/next-locales.mjs';
import {MED_LANG} from '../public/core.mjs';
import {PROFILES,ARABIC_DEMO_MEALS} from '../public/next-core.mjs';
import {SAMPLE_QUESTIONS} from '../public/ask-dawa.mjs';
import {VOICE_CLIPS} from '../public/voice-catalog.mjs';

const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
// Every literal passed to t('...') in the interface.
const literals=[...new Set([...app.matchAll(/\bt\('((?:[^'\\]|\\.)+)'\)/g)].map(m=>m[1].replace(/\\'/g,"'")))];
const hasLetters=s=>/\p{L}/u.test(s);

test('the language menu offers English, Arabic and Russian',()=>{
 assert.deepEqual(LANGUAGES.map(l=>l.code),['en','ar','ru']);
 assert.equal(LANGUAGES.find(l=>l.code==='ar').dir,'rtl');
});

for(const lang of ['ar','ru']){
 test(`every interface string has a ${lang} translation`,()=>{
  const missing=literals.filter(s=>hasLetters(s)&&textFor(s,lang)===s);
  assert.deepEqual(missing,[],`${missing.length} strings fall back to English`);
 });
}

test('found a meaningful number of interface strings',()=>{assert.ok(literals.length>150,String(literals.length));});

test('medicine names and directions exist in Russian',()=>{
 for(const [id,entry] of Object.entries(MED_LANG)){assert.ok(entry.ruName,id+' ruName');assert.ok(entry.ru,id+' ru directions');}
});

test('patients, meals and sample questions have Russian text',()=>{
 for(const p of PROFILES)assert.ok(p.ruName,p.id);
 assert.ok(PROFILES.some(p=>p.language==='ru'),'a Russian-speaking demo patient exists');
 for(const m of ARABIC_DEMO_MEALS)assert.ok(m.ru,m.id);
 for(const q of SAMPLE_QUESTIONS)assert.ok(q.ru,q.id);
});

test('every medicine has a Russian voice clip',()=>{
 const meds=new Set(VOICE_CLIPS.map(c=>c.medId));
 for(const id of meds)assert.ok(VOICE_CLIPS.some(c=>c.medId===id&&c.lang==='ru'),id);
});
