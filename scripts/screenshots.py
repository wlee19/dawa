"""Regenerate the README screenshots. Serve public/ first (npm start), then:
python3 scripts/screenshots.py [base_url]"""
import sys
from playwright.sync_api import sync_playwright
from PIL import Image
base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
out = 'docs/screenshots/'
FAKE_NFC = "window.NDEFReader=class{async scan(){} async write(){}};"
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def page(nfc=False):
        ctx = b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        if nfc: ctx.add_init_script(FAKE_NFC)
        pg = ctx.new_page(); pg.goto(base); pg.wait_for_selector('.patient-login'); return pg
    def shot(pg, name, selector=None):
        pg.wait_for_timeout(250)
        (pg.locator(selector).screenshot if selector else pg.screenshot)(path=out+name)
    # Login in each language
    for lang in ['en','ar','ru']:
        pg = page(); pg.select_option('#language', lang); shot(pg, f'login-{lang}.png'); pg.context.close()
    # Take Now home (English)
    pg = page(); pg.click('[data-login=emma]'); pg.wait_for_timeout(400); pg.click('dialog[open] [data-action=close]'); shot(pg, 'take-now-en.png'); pg.context.close()
    # Bottle check matched by tag (Russian patient)
    pg = page(); pg.click('[data-login=olga]'); pg.wait_for_timeout(400); pg.click('dialog[open] [data-action=demo-tag]')
    pg.evaluate("document.querySelector('dialog .bottle-check').scrollIntoView({block:'center'})"); shot(pg, 'bottle-check-ru.png'); pg.context.close()
    # Programming a tag (English, Android)
    pg = page(nfc=True); pg.click('[data-login=emma]'); pg.wait_for_timeout(400); pg.click('dialog[open] [data-action=close]')
    pg.click('[data-view=meds]'); pg.click('[data-med=warfarin]'); pg.click('dialog[open] [data-write-tag]')
    pg.evaluate("document.querySelector('dialog .tag-text').scrollIntoView({block:'center'})"); shot(pg, 'nfc-tag-en.png'); pg.context.close()
    # Food checks (Arabic patient)
    pg = page(); pg.click('[data-login=amina]'); pg.wait_for_timeout(400); pg.click('dialog[open] [data-action=close]')
    pg.click('[data-view=food]'); pg.evaluate("document.querySelector('#food-results').scrollIntoView({block:'start'})"); shot(pg, 'food-ar.png'); pg.context.close()
    # Ask Dawa (English)
    pg = page(); pg.click('[data-login=emma]'); pg.wait_for_timeout(400); pg.click('dialog[open] [data-action=close]')
    pg.click('[data-view=ask]'); pg.click('[data-ask-sample=grapefruit-simvastatin]'); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#ask-answer').scrollIntoView({block:'center'})"); shot(pg, 'ask-dawa-en.png'); pg.context.close()
    b.close()
# Banner: the three languages side by side
ims = [Image.open(out+f'login-{l}.png') for l in ['en','ar','ru']]
w, h = ims[0].size; gap = 40
banner = Image.new('RGB', (w*3 + gap*4, h + gap*2), (21,74,59))
for i, im in enumerate(ims): banner.paste(im, (gap + i*(w+gap), gap))
banner.thumbnail((1800, 1800)); banner.save(out+'banner.png', optimize=True)
for name in ['take-now-en','bottle-check-ru','nfc-tag-en','food-ar','ask-dawa-en','login-en','login-ar','login-ru']:
    im = Image.open(out+name+'.png'); im.thumbnail((585, 1266)); im.save(out+name+'.png', optimize=True)
print('ok')
