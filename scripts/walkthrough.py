"""Click through every screen of the app in one language and report untranslated text.
Usage: python3 scripts/walkthrough.py <patient> <lang> [base_url]"""
import sys, re, json
from playwright.sync_api import sync_playwright
patient, lang = sys.argv[1], sys.argv[2]
base = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8765/'
errors, seen = [], set()
ALLOW = {'dawa','Dawa','EHR','NHS','FDA','NFC','OCR','LDL','JPG','PNG','WebP','Wispr','Flow','API','mg','dL','mmol','IU','Chrome','Android','iPhone','English','Arabic','Russian','EW','AH','OI','NDC','PDF','Wilson','Emma','Amina','Hassan','Olga','Ivanova','push','CUH','Cambridge','University','Hospitals','Metformin','Lisinopril','Warfarin','Simvastatin','Gabapentin','Vitamin','D3','demo','v1','NTAG'}
def latin_words(text):
    return [w for w in re.findall(r"[A-Za-z][A-Za-z’']{2,}", text) if w not in ALLOW]
def snap(page, where):
    if lang == 'en': return
    for el in page.query_selector_all('#app, dialog[open]'):
        txt = el.inner_text()
        for line in txt.split('\n'):
            line=line.strip()
            if not line or line in seen: continue
            if '·' in line and ('English' in line): continue
            bad = latin_words(line)
            if bad and not re.search(r'dawa-demo:|https?://|\.wav|\.png', line):
                seen.add(line); print(f'  [{where}] {line[:110]}')
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width':430,'height':900})
    pg.on('pageerror', lambda e: errors.append('pageerror: '+str(e)))
    pg.on('console', lambda m: errors.append('console: '+m.text) if m.type=='error' else None)
    pg.goto(base); pg.wait_for_selector('.patient-login')
    pg.select_option('#language', lang); pg.wait_for_timeout(200)
    snap(pg,'login')
    pg.click(f'[data-login={patient}]'); pg.wait_for_timeout(400)
    def dialog_close():
        if pg.query_selector('dialog[open]'): pg.click('dialog[open] [data-action=close]'); pg.wait_for_timeout(150)
    snap(pg,'queue')
    if pg.query_selector('dialog[open] [data-action=demo-tag]'):
        for a in ['wrong-tag','demo-tag','nfc']:
            pg.click(f'dialog[open] [data-action={a}]'); pg.wait_for_timeout(250); snap(pg,'dose:'+a)
        pg.click('dialog[open] [data-action=record-dose]'); pg.wait_for_timeout(250); snap(pg,'after-dose')
    dialog_close(); snap(pg,'now')
    pg.click('[data-action=schedule]'); pg.wait_for_timeout(200); snap(pg,'schedule'); dialog_close()
    pg.click('[data-view=meds]'); pg.wait_for_timeout(200); snap(pg,'meds')
    for mid in [e.get_attribute('data-med') for e in pg.query_selector_all('[data-med]')]:
        pg.click(f'[data-med="{mid}"]'); pg.wait_for_timeout(150); snap(pg,'med:'+mid)
        pg.click('dialog[open] [data-copy-tag]'); pg.wait_for_timeout(100); dialog_close()
    pg.click('[data-subview=supplements]'); pg.wait_for_timeout(150); snap(pg,'supplements')
    pg.click('[data-view=food]'); pg.wait_for_timeout(200); snap(pg,'food')
    opts = pg.eval_on_selector_all('#food-choice option','els=>els.map(e=>e.value)')
    for v in opts[:12]:
        pg.select_option('#food-choice', v); pg.click('[data-action=add-food]'); pg.wait_for_timeout(80)
    snap(pg,'food-added')
    for fid in [e.get_attribute('data-check-food') for e in pg.query_selector_all('[data-check-food]')]:
        pg.click(f'[data-check-food="{fid}"]'); pg.wait_for_timeout(100); snap(pg,'foodcheck:'+fid); dialog_close()
    pg.click('[data-view=ask]'); pg.wait_for_timeout(200); snap(pg,'ask')
    for sid in [e.get_attribute('data-ask-sample') for e in pg.query_selector_all('[data-ask-sample]')]:
        pg.click(f'[data-ask-sample="{sid}"]'); pg.wait_for_timeout(150); snap(pg,'ask:'+sid)
    for q in {'ru':['Можно ли антацид?','Боль в груди'],'ar':['هل يمكنني الكحول؟'],'en':['Can I drink alcohol?']}[lang]:
        pg.fill('#ask-text', q); pg.click('[data-action=ask-submit]'); pg.wait_for_timeout(150); snap(pg,'ask-typed')
    pg.click('[data-view=me]'); pg.wait_for_timeout(200); snap(pg,'me')
    pg.fill('#caregiver-name','Test'); pg.click('[data-action=save-caregiver]'); pg.wait_for_timeout(200); snap(pg,'me-caregiver')
    for a in ['accessibility','clock','ehr']:
        pg.click(f'#app [data-action={a}]'); pg.wait_for_timeout(150); snap(pg,a); dialog_close()
    pg.click('#app [data-action=reset]'); pg.wait_for_timeout(150); snap(pg,'reset'); dialog_close()
    pg.click('#app [data-action=caregiver]'); pg.wait_for_timeout(200); snap(pg,'caregiver')
    pg.click('#app [data-action=patient]'); pg.wait_for_timeout(150)
    missing = pg.evaluate("async()=>[...(await import('./next-locales.mjs')).missingTranslations]")
    pg.screenshot(path=f'/tmp/shot-{patient}-{lang}.png')
    b.close()
print('MISSING', len(missing)); [print('  ', m) for m in missing]
print('ERRORS', len(errors)); [print('  ', e[:200]) for e in errors[:20]]
