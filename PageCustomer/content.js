/* ============================================================
   PageCustomer - applique le style choisi sur la page courante
   ============================================================ */

const STYLE_ID = 'pagecustomer-style';

const DEFAULTS = {
  enabled: false,
  useColors: false,
  bg: '#ffffff', fg: '#111111', link: '#1a73e8', bgImage: '',
  font: '', zoom: 100, lh: 100, width: 2000, radius: 0,
  bright: 100, contrast: 100, sat: 100,
  invert: false, hideImages: false, noAnim: false,
  css: ''
};

const HOST = location.hostname;

/* Le reglage du site l'emporte sur le reglage global. */
function resolve(store) {
  const site = (store.sites || {})[HOST];
  const base = site || store.global || {};
  return Object.assign({}, DEFAULTS, base);
}

function buildCSS(s) {
  const out = [];

  /* --- filtres globaux --- */
  const filters = [];
  if (s.invert) filters.push('invert(1)', 'hue-rotate(180deg)');
  if (s.bright !== 100) filters.push('brightness(' + s.bright + '%)');
  if (s.contrast !== 100) filters.push('contrast(' + s.contrast + '%)');
  if (s.sat !== 100) filters.push('saturate(' + s.sat + '%)');

  if (filters.length) {
    out.push('html { filter: ' + filters.join(' ') + ' !important; }');
  }
  if (s.invert) {
    /* on re-inverse les medias pour qu'ils gardent leurs vraies couleurs */
    out.push('img, video, picture, canvas, svg, iframe, [style*="background-image"] {' +
             ' filter: invert(1) hue-rotate(180deg) !important; }');
    out.push('html { background: #101216 !important; }');
  }

  /* --- couleurs forcees --- */
  if (s.useColors) {
    out.push('html, body { background-color: ' + s.bg + ' !important; color: ' + s.fg + ' !important; }');
    out.push('body *:not(img):not(video):not(canvas):not(svg):not(iframe):not(input):not(textarea):not(select) {' +
             ' background-color: transparent !important; color: ' + s.fg + ' !important;' +
             ' border-color: rgba(128,128,128,.35) !important; }');
    out.push('a, a * { color: ' + s.link + ' !important; }');
    out.push('input, textarea, select { background-color: ' + s.bg + ' !important; color: ' + s.fg + ' !important; }');
  }

  /* --- image de fond --- */
  if (s.bgImage) {
    out.push('html { background-image: url("' + s.bgImage.replace(/"/g, '%22') + '") !important;' +
             ' background-size: cover !important; background-position: center !important;' +
             ' background-attachment: fixed !important; }');
    out.push('body { background-color: transparent !important; }');
  }

  /* --- typographie --- */
  if (s.font) {
    out.push('*:not(i):not([class*="icon"]):not([class*="fa-"]):not(.material-icons) {' +
             ' font-family: ' + s.font + ' !important; }');
  }
  if (s.zoom !== 100) out.push('body { zoom: ' + (s.zoom / 100) + '; }');
  if (s.lh !== 100) {
    out.push('p, li, dd, dt, td, blockquote, article, span { line-height: ' + (s.lh / 100 * 1.4) + ' !important; }');
  }
  if (s.width < 2000) {
    out.push('body { max-width: ' + s.width + 'px !important;' +
             ' margin-left: auto !important; margin-right: auto !important; }');
  }
  if (s.radius > 0) {
    out.push('img, video, button, input, textarea, select, table, article, section, aside, .card {' +
             ' border-radius: ' + s.radius + 'px !important; }');
  }

  /* --- options --- */
  if (s.hideImages) out.push('img, picture, video, figure { display: none !important; }');
  if (s.noAnim) {
    out.push('*, *::before, *::after { animation: none !important;' +
             ' transition: none !important; scroll-behavior: auto !important; }');
  }

  /* --- CSS libre de l'utilisateur --- */
  if (s.css) out.push(s.css);

  return out.join('\n');
}

function apply(store) {
  const s = resolve(store);
  let tag = document.getElementById(STYLE_ID);

  if (!s.enabled) {
    if (tag) tag.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('style');
    tag.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(tag);
  }
  tag.textContent = buildCSS(s);

  /* le <style> doit rester le dernier enfant pour battre les CSS du site */
  const parent = document.head || document.documentElement;
  if (parent.lastElementChild !== tag) parent.appendChild(tag);
}

chrome.storage.local.get({ global: DEFAULTS, sites: {} }, apply);

chrome.storage.onChanged.addListener(() => {
  chrome.storage.local.get({ global: DEFAULTS, sites: {} }, apply);
});

/* Certains sites reinjectent leur <head> : on se remet en dernier. */
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get({ global: DEFAULTS, sites: {} }, apply);
});
