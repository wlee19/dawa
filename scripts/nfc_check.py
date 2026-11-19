"""End-to-end check of the NFC flow with a simulated Web NFC (Chrome on Android) in headless Chrome.
Usage: python3 scripts/nfc_check.py [base_url]"""
import sys
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
FAKE = """
window.__nfc={writes:[],readers:[],scanError:null};
class NDEFReader{
  constructor(){this.onreading=null;this.onreadingerror=null;}
  async scan(opts){if(window.__nfc.scanError){const e=new Error('x');e.name=window.__nfc.scanError;throw e;}
    window.__nfc.readers.push(this);opts?.signal?.addEventListener('abort',()=>{window.__nfc.readers=window.__nfc.readers.filter(r=>r!==this)});}
  async write(message){window.__nfc.writes.push(message);}
}
window.NDEFReader=NDEFReader;
const enc=s=>new DataView(new TextEncoder().encode(s).buffer);
window.__tap=records=>{const msg={records:records.map(r=>({recordType:r.recordType,encoding:'utf-8',data:enc(r.data)}))};
  for(const r of [...window.__nfc.readers])r.onreading?.({message:msg});return window.__nfc.readers.length;};
"""
results=[]
def check(name, ok, detail=''):
    results.append(ok); print(('PASS ' if ok else 'FAIL ')+name+(' — '+detail if detail and not ok else ''))
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':400,'height':860}); ctx.add_init_script(FAKE)
    errors=[]; pg=ctx.new_page(); pg.on('pageerror',lambda e:errors.append(str(e)))
    pg.goto(base); pg.click('[data-login=emma]'); pg.wait_for_timeout(400)
    if pg.query_selector('dialog[open]'): pg.click('dialog[open] [data-action=close]')
    # 1. Program a tag from the medicine details
    pg.click('[data-view=meds]'); pg.click('[data-med=metformin]'); pg.wait_for_timeout(150)
    check('details show a Write button when NFC exists', pg.query_selector('dialog[open] [data-write-tag=metformin]') is not None)
    payload=pg.inner_text('dialog[open] .tag-text').strip()
    pg.click('dialog[open] [data-write-tag=metformin]'); pg.wait_for_timeout(200)
    w=pg.evaluate('window.__nfc.writes')
    check('write sends a URL record and a text record', len(w)==1 and [r['recordType'] for r in w[0]['records']]==['url','text'], str(w))
    check('text record holds the tag payload', w and w[0]['records'][1]['data']==payload)
    url=w[0]['records'][0]['data'] if w else ''
    check('URL record opens the app with #tag=', '#tag=' in url and url.startswith(base), url)
    check('write confirmation shown', 'Tag written' in pg.inner_text('#tag-write-status'))
    pg.click('dialog[open] [data-action=close]')
    # 2. Tap the programmed tag during check-in
    pg.click('[data-view=now]'); pg.click('[data-action=start]'); pg.wait_for_timeout(200)
    pg.click('dialog[open] [data-action=nfc]'); pg.wait_for_timeout(150)
    check('waiting state while scanning', 'Waiting for the tag' in pg.inner_text('#scan-status'))
    pg.evaluate('p=>window.__tap([{recordType:"url",data:"https://x/#tag=nope"},{recordType:"text",data:p}])', payload); pg.wait_for_timeout(200)
    check('tapping the right tag matches', 'The tag matches this prescription' in pg.inner_text('#scan-status'))
    check('"I took it" is enabled after a match', pg.is_enabled('dialog[open] [data-action=record-dose]'))
    check('scanner stops after a read', pg.evaluate('window.__nfc.readers.length')==0)
    # 3. Tag that only has the URL record (e.g. written by another app)
    pg.click('dialog[open] [data-action=nfc]'); pg.wait_for_timeout(100)
    pg.evaluate('u=>window.__tap([{recordType:"url",data:u}])', url); pg.wait_for_timeout(200)
    check('URL-only tag also matches', 'The tag matches this prescription' in pg.inner_text('#scan-status'))
    # 4. A different medicine's tag
    pg.click('dialog[open] [data-action=nfc]'); pg.wait_for_timeout(100)
    pg.evaluate('p=>window.__tap([{recordType:"text",data:p.replace(":metformin:",":lisinopril:")}])', payload); pg.wait_for_timeout(200)
    st=pg.inner_text('#scan-status')
    check('another medicine\'s tag is named', 'another medicine' in st and 'Lisinopril' in st, st)
    check('"I took it" disabled after a mismatch', not pg.is_enabled('dialog[open] [data-action=record-dose]'))
    check('mismatch offers to program this bottle', pg.query_selector('#scan-status [data-write-tag]') is not None)
    # 5. A random NFC sticker
    pg.click('dialog[open] [data-action=nfc]'); pg.wait_for_timeout(100)
    pg.evaluate('()=>window.__tap([{recordType:"text",data:"hello"}])'); pg.wait_for_timeout(200)
    check('non-dawa tag explained', 'not a dawa bottle tag' in pg.inner_text('#scan-status'))
    # 6. Cancel
    pg.click('dialog[open] [data-action=nfc]'); pg.wait_for_timeout(100); pg.click('#scan-status [data-action=nfc-cancel]'); pg.wait_for_timeout(100)
    check('cancel stops scanning', pg.evaluate('window.__nfc.readers.length')==0 and 'Waiting' not in pg.inner_text('#scan-status'))
    # 7. NFC switched off on the phone
    pg.evaluate('window.__nfc.scanError="NotSupportedError"'); pg.click('dialog[open] [data-action=nfc]'); pg.wait_for_timeout(150)
    check('NFC-off message', 'Turn on NFC' in pg.inner_text('#scan-status'))
    pg.evaluate('window.__nfc.scanError=null')
    # 8. Tapping a tag while the app is closed opens the app on that dose
    pg2=ctx.new_page(); pg2.on('pageerror',lambda e:errors.append(str(e)))
    pg2.goto(base); pg2.evaluate('()=>{sessionStorage.clear();localStorage.clear()}')
    pg2.goto(url); pg2.wait_for_timeout(900)
    st=pg2.inner_text('#scan-status') if pg2.query_selector('#scan-status') else ''
    check('tag link logs in and checks the bottle', 'The tag matches this prescription' in st and pg2.is_enabled('dialog[open] [data-action=record-dose]'), st)
    check('tag link clears #tag from the address bar', '#tag=' not in pg2.url, pg2.url)
    check('no script errors', not errors, '; '.join(errors))
    b.close()
print(f'{sum(results)}/{len(results)} checks passed'); sys.exit(0 if all(results) else 1)
