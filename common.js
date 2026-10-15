/* =====================================================================
 *  ટોકન / टोकन — common.js : config · Gujarati + Hindi texts · API · session · header / nav · helpers
 *  The only thing to configure: API_URL
 * ===================================================================== */
(function () {
  'use strict';

  /* ============ CONFIG: paste your Apps Script Web App URL ============ */
  const API_URL = 'https://script.google.com/macros/s/AKfycbxv8WyVr7yA7Fz3GwiVoHmH-n-1QdlUdMEetxQ0cifkoqTOx7R_rW4kt75vHIZ8r6EUpQ/exec';   // https://script.google.com/macros/s/XXXX/exec
  /* =================================================================== */

  const SESSION_KEY = 'tok_session_v1', LANG_KEY = 'tok_lang', FLASH_KEY = 'tok_flash_v1';

  /* ------------------------------ texts: [Gujarati, Hindi] ------------------------------ */
  const D = {
    app: ['ટોકન સિસ્ટમ', 'टोकन सिस्टम'], login: ['લોગિન', 'लॉगिन'], staff: ['સ્ટાફ', 'स्टाफ'], customer: ['ગ્રાહક', 'ग्राहक'],
    username: ['યુઝરનેમ', 'यूज़रनेम'], password: ['પાસવર્ડ', 'पासवर्ड'], mobile: ['મોબાઇલ', 'मोबाइल'], pin: ['PIN (૪ આંકડા)', 'PIN (4 अंक)'],
    logout: ['લોગઆઉટ', 'लॉगआउट'], refresh: ['રિફ્રેશ', 'रिफ्रेश'], change_pw: ['પાસવર્ડ / PIN બદલો', 'पासवर्ड / PIN बदलें'],
    current: ['હાલનો', 'मौजूदा'], new_one: ['નવો', 'नया'], repeat: ['ફરી લખો', 'दोबारा लिखें'], save: ['સેવ', 'सेव'], cancel: ['રદ', 'रद्द'], close: ['બંધ કરો', 'बंद करें'],
    done: ['પૂરું', 'पूरा'], loading: ['લોડ થાય છે…', 'लोड हो रहा है…'], saved: ['સેવ થયું', 'सेव हुआ'], refreshed: ['રિફ્રેશ થયું', 'रिफ्रेश हुआ'],
    welcome: ['સ્વાગત છે, {name}!', 'स्वागत है, {name}!'], logged_out: ['લોગઆઉટ થયા.', 'लॉगआउट हो गए।'], expired: ['સત્ર પૂરું થયું. ફરી લોગિન કરો.', 'सत्र समाप्त। फिर लॉगिन करें।'],
    net_err: ['ઇન્ટરનેટ તપાસો અને ફરી પ્રયત્ન કરો.', 'इंटरनेट जाँचें और फिर कोशिश करें।'], bad_resp: ['સર્વરનો અણધાર્યો જવાબ.', 'सर्वर का अनपेक्षित जवाब।'], no_api: ['common.js માં API_URL મૂકો.', 'common.js में API_URL डालें।'],
    pw_short: ['નવો પાસવર્ડ ૬+ અક્ષરનો / PIN ૪ આંકડાનો.', 'नया पासवर्ड 6+ अक्षर / PIN 4 अंक।'], pw_mismatch: ['બંને નવા મેળ ખાતા નથી.', 'दोनों नए मेल नहीं खाते।'], pw_done: ['બદલાઈ ગયું', 'बदल गया'],
    enter_login: ['બધી વિગત લખો.', 'सारी जानकारी लिखें।'], wrong_login: ['ખોટી વિગત.', 'गलत जानकारी।'], role_Admin: ['એડમિન', 'एडमिन'], role_Cashier: ['કેશિયર', 'कैशियर'],
    role_Karigar: ['કારીગર', 'कारीगर'], role_Viewer: ['જોનાર', 'देखने वाला'], role_Customer: ['ગ્રાહક', 'ग्राहक'], no_access: ['આ પેજની પરવાનગી નથી.', 'इस पेज की अनुमति नहीं है।'],
    // nav
    n_counter: ['કાઉન્ટર', 'काउंटर'], n_kitchen: ['કિચન', 'किचन'], n_report: ['રિપોર્ટ', 'रिपोर्ट'], n_admin: ['એડમિન', 'एडमिन'], n_order: ['ઓર્ડર', 'ऑर्डर'],
    // statuses / service / pay
    st_PENDING: ['પેન્ડિંગ', 'पेंडिंग'], st_CONFIRMED: ['કન્ફર્મ', 'कन्फर्म'], st_READY: ['તૈયાર', 'तैयार'], st_CLOSED: ['પૂરો', 'पूरा'], st_REJECTED: ['નામંજૂર', 'नामंज़ूर'],
    st_EXPIRED: ['સમય પૂરો', 'समय समाप्त'], st_CANCELLED: ['રદ', 'रद्द'], svc_PARCEL: ['પાર્સલ', 'पार्सल'], svc_DINE_IN: ['અહીં ખાવા', 'यहीं खाना'],
    pay_CASH: ['કેશ', 'कैश'], pay_UPI: ['UPI', 'UPI'], upi_ref: ['UPI રેફરન્સ (વૈકલ્પિક)', 'UPI रेफरेंस (वैकल्पिक)'], note: ['નોંધ', 'नोट'], note_opt: ['નોંધ (વૈકલ્પિક)', 'नोट (वैकल्पिक)'],
    // counter
    tab_pending: ['પેન્ડિંગ', 'पेंडिंग'], tab_open: ['ચાલુ', 'चालू'], tab_done: ['પૂરા', 'पूरे'], new_token: ['+ નવો ટોકન', '+ नया टोकन'], no_tokens: ['કોઈ ટોકન નથી.', 'कोई टोकन नहीं।'],
    guest: ['ગેસ્ટ (મોબાઇલ વગર)', 'गेस्ट (बिना मोबाइल)'], search_cust: ['નામ કે મોબાઇલ શોધો', 'नाम या मोबाइल खोजें'], new_cust: ['+ નવો ગ્રાહક', '+ नया ग्राहक'], name: ['નામ', 'नाम'],
    cust_sel: ['ગ્રાહક', 'ग्राहक'], items: ['આઇટમ', 'आइटम'], service: ['પાર્સલ કે અહીં ખાવા?', 'पार्सल या यहीं खाना?'], pay_mode: ['પેમેન્ટ', 'भुगतान'], total: ['કુલ', 'कुल'],
    make_token: ['ટોકન બનાવો', 'टोकन बनाएँ'], token_ready: ['ટોકન બની ગયો', 'टोकन बन गया'], need_items: ['આઇટમ પસંદ કરો.', 'आइटम चुनें।'], need_service: ['પાર્સલ કે અહીં ખાવા પસંદ કરો.', 'पार्सल या यहीं खाना चुनें।'],
    need_cust: ['ગ્રાહકનું નામ અને ૧૦ આંકડાનો મોબાઇલ લખો.', 'ग्राहक का नाम और 10 अंकों का मोबाइल लिखें।'], confirm: ['કન્ફર્મ', 'कन्फर्म'], reject: ['નામંજૂર', 'नामंज़ूर'], reason: ['કારણ', 'कारण'],
    ready_btn: ['તૈયાર', 'तैयार'], close_btn: ['આપી દીધું', 'दे दिया'], cancel_tok: ['ટોકન રદ', 'टोकन रद्द'], whatsapp: ['WhatsApp', 'WhatsApp'], no_mobile: ['મોબાઇલ નથી — ટોકન નંબર બોલીને આપો.', 'मोबाइल नहीं — टोकन नंबर बोलकर दें।'],
    new_pin_for: ['ગ્રાહકનો PIN', 'ग्राहक का PIN'], pin_hint: ['આ PIN ફક્ત હમણાં દેખાય છે. WhatsApp મોકલો.', 'यह PIN केवल अभी दिखता है। WhatsApp भेजें।'], reset_pin: ['નવો PIN બનાવો', 'नया PIN बनाएँ'],
    pending_hint: ['ગ્રાહકે પેમેન્ટ કર્યું? કન્ફર્મ દબાવો — ત્યાં સુધી કારીગરને દેખાશે નહીં.', 'ग्राहक ने भुगतान किया? कन्फर्म दबाएँ — तब तक कारीगर को नहीं दिखेगा।'],
    confirm_q: ['પેમેન્ટ કેવી રીતે મળ્યું?', 'भुगतान कैसे मिला?'], reject_q: ['આ ટોકન નામંજૂર કરવો?', 'यह टोकन नामंज़ूर करें?'], cancel_q: ['આ ટોકન રદ કરવો?', 'यह टोकन रद्द करें?'],
    code: ['કોડ', 'कोड'], read_only: ['ફક્ત જોવા માટે', 'केवल देखने के लिए'],
    // kitchen
    k_title: ['કિચન — કરવાના ઓર્ડર', 'किचन — बनाने के ऑर्डर'], k_none: ['હાલ કોઈ ઓર્ડર નથી.', 'अभी कोई ऑर्डर नहीं।'], k_sum: ['કુલ બનાવવાનું', 'कुल बनाना है'], parcel_big: ['🎒 પાર્સલ', '🎒 पार्सल'], dine_big: ['🍽️ અહીં ખાવા', '🍽️ यहीं खाना'],
    // customer order
    o_menu: ['મેનુ', 'मेन्यू'], o_place: ['ઓર્ડર આપો', 'ऑर्डर दें'], o_my: ['મારા ઓર્ડર', 'मेरे ऑर्डर'], o_pending_msg: ['તમારો પેન્ડિંગ કોડ {code}. કાઉન્ટર પર જઈ પેમેન્ટ કરો — કન્ફર્મ થયા પછી ટોકન નંબર મળશે.', 'आपका पेंडिंग कोड {code}। काउंटर पर जाकर भुगतान करें — कन्फर्म होने पर टोकन नंबर मिलेगा।'],
    o_send_shop: ['દુકાનને WhatsApp કરો', 'दुकान को WhatsApp करें'], o_cancel: ['ઓર્ડર રદ કરો', 'ऑर्डर रद्द करें'], o_min_left: ['{n} મિનિટ બાકી', '{n} मिनट बाकी'], o_out: ['સ્ટોક પૂરો', 'स्टॉक खत्म'],
    o_your_token: ['તમારો ટોકન', 'आपका टोकन'], o_empty: ['હજી કોઈ ઓર્ડર નથી.', 'अभी कोई ऑर्डर नहीं।'], o_placed: ['ઓર્ડર નોંધાયો — પેન્ડિંગ', 'ऑर्डर दर्ज — पेंडिंग'],
    // report
    r_today: ['આજ', 'आज'], r_month: ['મહિનો', 'महीना'], r_custom: ['કસ્ટમ', 'कस्टम'], r_sales: ['કુલ વેપાર', 'कुल बिक्री'], r_cash: ['કેશ', 'कैश'], r_upi: ['UPI', 'UPI'], r_orders: ['ઓર્ડર', 'ऑर्डर'],
    r_parcel: ['પાર્સલ', 'पार्सल'], r_dine: ['અહીં ખાવા', 'यहीं खाना'], r_cancelled: ['રદ / નામંજૂર / સમય પૂરો', 'रद्द / नामंज़ूर / समय समाप्त'], r_items: ['કઈ વાનગી કેટલી વેચાઈ', 'कौन सी चीज़ कितनी बिकी'],
    r_top: ['વારંવાર આવતા ગ્રાહક', 'बार-बार आने वाले ग्राहक'], r_byday: ['દિવસ મુજબ', 'दिन के अनुसार'], r_from: ['થી', 'से'], r_to: ['સુધી', 'तक'], r_none: ['આ સમયગાળામાં કોઈ વેપાર નથી.', 'इस अवधि में कोई बिक्री नहीं।'],
    // admin
    a_menu: ['મેનુ', 'मेन्यू'], a_cust: ['ગ્રાહક', 'ग्राहक'], a_settings: ['સેટિંગ્સ', 'सेटिंग्स'], a_archive: ['આર્કાઇવ', 'आर्काइव'], a_add: ['+ ઉમેરો', '+ जोड़ें'],
    m_name: ['નામ (ગુજરાતી)', 'नाम (गुजराती)'], m_name_hi: ['નામ (હિન્દી)', 'नाम (हिंदी)'], m_price: ['ભાવ ₹', 'भाव ₹'], m_status: ['સ્થિતિ', 'स्थिति'], m_sort: ['ક્રમ', 'क्रम'],
    ms_Active: ['ચાલુ', 'चालू'], ms_OutOfStock: ['સ્ટોક પૂરો', 'स्टॉक खत्म'], ms_Inactive: ['બંધ', 'बंद'], c_active: ['ચાલુ', 'चालू'], c_inactive: ['બંધ', 'बंद'],
    s_shop_name: ['દુકાનનું નામ', 'दुकान का नाम'], s_shop_whatsapp: ['દુકાનનો WhatsApp નંબર (૧૦ આંકડા)', 'दुकान का WhatsApp नंबर (10 अंक)'], s_app_url: ['ગ્રાહક પેજની લિંક (https://…)', 'ग्राहक पेज की लिंक (https://…)'],
    s_pending_expiry_min: ['પેન્ડિંગ ટોકન કેટલી મિનિટે એક્સપાયર', 'पेंडिंग टोकन कितने मिनट में एक्सपायर'], s_max_pending_per_customer: ['એક ગ્રાહકના વધુમાં વધુ પેન્ડિંગ', 'एक ग्राहक के अधिकतम पेंडिंग'],
    s_poll_seconds: ['સ્ક્રીન કેટલી સેકન્ડે અપડેટ', 'स्क्रीन कितने सेकंड में अपडेट'], s_wa_template_token: ['WhatsApp મેસેજ — ટોકન', 'WhatsApp मैसेज — टोकन'], s_wa_template_pending: ['WhatsApp મેસેજ — પેન્ડિંગ ઓર્ડર', 'WhatsApp मैसेज — पेंडिंग ऑर्डर'],
    s_wa_template_pin: ['WhatsApp મેસેજ — નવા ગ્રાહકનો PIN', 'WhatsApp मैसेज — नए ग्राहक का PIN'], s_vars: ['ચલ: {shop} {token} {code} {items} {total} {service} {pin} {link}', 'चर: {shop} {token} {code} {items} {total} {service} {pin} {link}'],
    ar_month: ['મહિનો', 'महीना'], ar_preview: ['તપાસો', 'जाँचें'], ar_go: ['આર્કાઇવ કરો', 'आर्काइव करें'], ar_info: ['પૂરા થયેલા {a} ટોકન ટેબ {tab} માં જશે. {b} ટોકન (ચાલુ/પેન્ડિંગ) અહીં જ રહેશે.', 'पूरे हुए {a} टोकन टैब {tab} में जाएँगे। {b} टोकन (चालू/पेंडिंग) यहीं रहेंगे।'],
    ar_confirm: ['{a} ટોકન આર્કાઇવ કરવા? પહેલા કોપી અને ચકાસણી થશે, પછી જ કાઢશે.', '{a} टोकन आर्काइव करें? पहले कॉपी व सत्यापन होगा, फिर ही हटेंगे।'], ar_done: ['{a} ટોકન આર્કાઇવ થયા.', '{a} टोकन आर्काइव हुए।'], ar_none: ['આ મહિનામાં આર્કાઇવ કરવા જેવું કંઈ નથી.', 'इस महीने आर्काइव करने को कुछ नहीं।'],
    cu_edit: ['ગ્રાહક સુધારો', 'ग्राहक सुधारें'], cu_none: ['કોઈ ગ્રાહક નથી.', 'कोई ग्राहक नहीं।']
  };
  let lang = (function () { try { return localStorage.getItem(LANG_KEY) === 'hi' ? 'hi' : 'gu'; } catch (_) { return 'gu'; } })();
  /** t('key', {var}) → text in the chosen language (Gujarati default). Unknown keys come back as-is. */
  const t = (k, v) => {
    const e = D[k]; let s = e ? e[lang === 'hi' ? 1 : 0] : k;
    if (v) Object.keys(v).forEach((x) => { s = s.split('{' + x + '}').join(v[x]); });
    return s;
  };
  const getLang = () => lang;
  function setLang(l) { try { localStorage.setItem(LANG_KEY, l === 'hi' ? 'hi' : 'gu'); } catch (_) {} location.reload(); }

  /* ============================ pure helpers (no DOM) ============================ */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const todayKey = () => ymd(new Date());
  const money = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const normMobile = (v) => { const d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
  const itemName = (it, l) => ((l || lang) === 'hi' && it.name_hi) ? it.name_hi : it.name;
  const itemsLine = (items, l) => items.map((x) => itemName(x, l) + ' ×' + x.qty).join(', ');
  const fillTemplate = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : ''));
  const waUrl = (mobile, text) => 'https://wa.me/91' + normMobile(mobile) + '?text=' + encodeURIComponent(text);
  function monthBounds(y, m) { const last = new Date(y, m + 1, 0).getDate(); return { from: y + '-' + pad(m + 1) + '-01', to: y + '-' + pad(m + 1) + '-' + pad(last) }; }
  function shiftMonth(y, m, d) { const x = new Date(y, m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; }
  /** minutes a pending token still has before it expires (never negative) */
  function minutesLeft(createdAt, expiryMin, nowMs) {
    const created = Date.parse(String(createdAt) + '+05:30');
    return Math.max(0, Math.ceil((created + expiryMin * 60000 - (nowMs == null ? Date.now() : nowMs)) / 60000));
  }
  /** total quantity of every item over a list of tokens (kitchen summary) */
  function kitchenSummary(tokens, l) {
    const by = {};
    tokens.forEach((k) => k.items.forEach((x) => { const key = x.name; by[key] = by[key] || { name: itemName(x, l), qty: 0 }; by[key].qty += x.qty; }));
    return Object.keys(by).map((k) => by[k]).sort((a, b) => b.qty - a.qty);
  }
  const homeFor = (role) => (role === 'Customer' ? 'order.html' : role === 'Karigar' ? 'kitchen.html' : 'counter.html');
  const timeLabel = (stamp) => { const s = String(stamp || ''); return s.length >= 16 ? s.slice(11, 16) : ''; };

  const pure = { pad, ymd, todayKey, money, normMobile, itemName, itemsLine, fillTemplate, waUrl, monthBounds, shiftMonth, minutesLeft, kitchenSummary, homeFor, timeLabel, D };
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  /* ================================= DOM utils ================================= */
  const $ = (id) => document.getElementById(id);
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) Object.keys(props).forEach((k) => {
      const v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k === 'value') n.value = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
    });
    kids.flat(Infinity).forEach((c) => { if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return n;
  }
  function toast(message, type = 'ok') {
    let box = $('toasts');
    if (!box) { box = el('div', { id: 'toasts', class: 'toasts' }); document.body.appendChild(box); }
    const x = el('div', { class: 'toast ' + (type === 'error' ? 'toast-err' : 'toast-ok'), text: message });
    box.appendChild(x); setTimeout(() => x.remove(), type === 'error' ? 4500 : 2500);
  }
  function flash(m, type = 'ok') { try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ m, type })); } catch (_) {} }
  function showFlash() { try { const r = sessionStorage.getItem(FLASH_KEY); if (!r) return; sessionStorage.removeItem(FLASH_KEY); const f = JSON.parse(r); if (f && f.m) toast(f.m, f.type); } catch (_) {} }
  const setBusy = (b, on) => { b.disabled = on; b.classList.toggle('busy', on); };
  /** the server sends "ગુજરાતી / हिन्दी" — show only the chosen language */
  function pickLang(msg) {
    const s = String(msg || ''); const i = s.lastIndexOf(' / ');
    if (i < 0) return s;
    return lang === 'hi' ? s.slice(i + 3) : s.slice(0, i);
  }
  const chip = (kind, text, extra) => el('span', { class: 'chip chip-' + kind + (extra ? ' ' + extra : ''), text });
  const statusChip = (st) => chip(st, t('st_' + st));
  const svcChip = (s) => chip(s === 'PARCEL' ? 'parcel' : 'dine', t('svc_' + s));

  /* ================================== Session ================================== */
  let session = null;
  function loadSession() { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY)); if (s && s.token && s.exp > Date.now()) return s; } catch (_) {} return null; }
  function saveSession(s) { session = s; try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (_) {} }
  function clearSession() { session = null; try { localStorage.removeItem(SESSION_KEY); } catch (_) {} }
  /** roles: allowed roles for the page; anyone else is sent to their own home page. Returns the session or null (redirecting). */
  function requireLogin(roles) {
    const s = loadSession();
    if (!s) { location.replace('index.html'); return null; }
    if (roles && roles.indexOf(s.role) < 0) { location.replace(homeFor(s.role)); return null; }
    session = s; showFlash(); return s;
  }
  function logout() { clearSession(); flash(t('logged_out')); location.replace('index.html'); }

  /* ==================================== API ==================================== */
  class ApiError extends Error { constructor(code, message) { super(message); this.code = code; } }
  async function api(action, payload = {}) {
    if (API_URL.indexOf('PASTE_') === 0) throw new ApiError('config', t('no_api'));
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 30000);
    let res;
    try {
      res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action }, payload)), signal: ctrl.signal });
    } catch (_) { throw new ApiError('network', t('net_err')); } finally { clearTimeout(timer); }
    let data;
    try { data = await res.json(); } catch (_) { throw new ApiError('bad_response', t('bad_resp')); }
    if (!data.success) {
      if (data.error === 'session_expired') { clearSession(); flash(t('expired'), 'error'); location.replace('index.html'); }
      throw new ApiError(data.error || 'error', pickLang(data.message) || '…');
    }
    return data;
  }
  /** Authenticated call: staff = {who, username, token} · customer = {who, mobile, token} */
  function call(action, payload = {}) {
    if (!session) throw new ApiError('session_expired', t('expired'));
    const auth = session.who === 'customer' ? { who: 'customer', mobile: session.mobile, token: session.token } : { who: 'staff', username: session.username, token: session.token };
    return api(action, Object.assign({}, payload, auth));
  }

  /* ============================ header · nav · sheets ============================ */
  function mountHeader(titleKey, onRefresh) {
    const menu = el('div', { class: 'menu', hidden: true },
      el('div', { class: 'menu-note', text: ((session && session.name) || '') + ' · ' + t('role_' + (session && session.role)) }),
      el('button', { class: 'menu-item', type: 'button', text: '⟳  ' + t('refresh'), onclick: () => { menu.hidden = true; refresh(); } }),
      el('button', { class: 'menu-item', type: 'button', text: '🔑  ' + t('change_pw'), onclick: () => { menu.hidden = true; openChangeSecret(); } }),
      el('button', { class: 'menu-item danger', type: 'button', text: '⎋  ' + t('logout'), onclick: logout }));
    const avatar = el('button', { class: 'avatar', type: 'button', 'aria-label': 'menu', text: (Array.from(String((session && session.name) || '?').trim())[0] || '?').toUpperCase() });
    const rbtn = el('button', { class: 'icon-btn', type: 'button', 'aria-label': t('refresh'), text: '⟳', onclick: () => refresh() });
    const lbtn = el('button', { class: 'lang-btn', type: 'button', 'aria-label': 'language', text: lang === 'hi' ? 'ગુ' : 'हि', onclick: () => setLang(lang === 'hi' ? 'gu' : 'hi') });
    async function refresh() {
      if (!onRefresh || rbtn.classList.contains('spin')) return;
      rbtn.classList.add('spin');
      try { await onRefresh(); toast(t('refreshed')); } catch (err) { toast(err.message, 'error'); } finally { rbtn.classList.remove('spin'); }
    }
    avatar.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
    menu.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => { menu.hidden = true; });
    $('hdr').replaceChildren(el('div', { class: 'hdr-bar' }, el('h1', { class: 'hdr-title', text: t(titleKey) }), el('div', { class: 'hdr-right' }, lbtn, rbtn, el('div', { class: 'menu-wrap' }, avatar, menu))));
  }
  const NAV = { Admin: ['counter', 'kitchen', 'report', 'admin'], Cashier: ['counter', 'kitchen'], Viewer: ['counter', 'report'], Karigar: ['kitchen'], Customer: [] };
  const NAV_META = { counter: ['counter.html', '🧾'], kitchen: ['kitchen.html', '👨‍🍳'], report: ['report.html', '📊'], admin: ['admin.html', '⚙️'] };
  function mountNav(active) {
    if (!$('nav')) return;
    const items = (NAV[session.role] || []);
    if (items.length < 2) { $('nav').replaceChildren(); return; }
    $('nav').replaceChildren(el('div', { class: 'nav-inner' }, ...items.map((k) => el('a', { class: 'nav-item' + (k === active ? ' active' : ''), href: NAV_META[k][0] },
      el('span', { class: 'nav-ico', text: NAV_META[k][1] }), el('span', { text: t('n_' + k) })))));
  }
  function openSheet(title, content) {
    const close = () => { overlay.remove(); document.body.classList.remove('no-scroll'); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
      el('div', { class: 'sheet-head' }, el('h2', { text: title }), el('button', { class: 'sheet-x', type: 'button', 'aria-label': t('close'), text: '✕', onclick: close })), content);
    const overlay = el('div', { class: 'overlay', onclick: (e) => { if (e.target === overlay) close(); } }, sheet);
    document.body.appendChild(overlay); document.body.classList.add('no-scroll'); document.addEventListener('keydown', onKey);
    return close;
  }
  /** staff → password (6+) · customer → PIN (4 digits) */
  function openChangeSecret() {
    const isCust = session.role === 'Customer';
    const o = el('input', { class: 'field', type: 'password', id: 'pwOld', inputmode: isCust ? 'numeric' : null });
    const n = el('input', { class: 'field', type: 'password', id: 'pwNew', inputmode: isCust ? 'numeric' : null, maxlength: isCust ? '4' : null });
    const c = el('input', { class: 'field', type: 'password', id: 'pwNew2', inputmode: isCust ? 'numeric' : null, maxlength: isCust ? '4' : null });
    const save = el('button', { class: 'btn btn-primary btn-block', type: 'submit', text: t('save') });
    let close;
    const form = el('form', { novalidate: true }, el('label', { class: 'lbl', for: 'pwOld', text: t('current') }), o, el('label', { class: 'lbl', for: 'pwNew', text: t('new_one') }), n, el('label', { class: 'lbl', for: 'pwNew2', text: t('repeat') }), c, save);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isCust ? !/^\d{4}$/.test(n.value) : n.value.length < 6) { toast(t('pw_short'), 'error'); return; }
      if (n.value !== c.value) { toast(t('pw_mismatch'), 'error'); return; }
      setBusy(save, true);
      try { const d = await call('change_password', { old_secret: o.value, new_secret: n.value }); saveSession(Object.assign({}, session, { token: d.token, exp: d.expires })); close(); toast(t('pw_done')); }
      catch (err) { toast(err.message, 'error'); setBusy(save, false); }
    });
    close = openSheet(t('change_pw'), form); o.focus();
  }

  /** runs fn now and then every getSec() seconds (not while the tab is hidden; never overlapping). Returns stop(). */
  function startPolling(fn, getSec) {
    let stopped = false, busy = false, timer = null;
    async function tick() {
      clearTimeout(timer);
      if (stopped) return;
      if (!busy && !document.hidden) { busy = true; try { await fn(); } catch (_) { /* next tick retries */ } busy = false; }
      if (!stopped) timer = setTimeout(tick, Math.max(3, Number(getSec()) || 6) * 1000);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    tick();
    return () => { stopped = true; clearTimeout(timer); };
  }
  /** WhatsApp message from a template + token. Items always use the shop (Gujarati) names; the message is in the template's language. */
  function waText(tpl, settings, tk, extra) {
    const svc = tk.service === 'PARCEL' ? 'પાર્સલ' : 'અહીં ખાવા';
    return fillTemplate(tpl, Object.assign({ shop: settings.shop_name, token: tk.token_no, code: tk.pending_code, items: itemsLine(tk.items, 'gu'), total: money(tk.total), service: svc }, extra || {}));
  }
  const openWa = (mobile, text) => window.open(waUrl(mobile, text), '_blank', 'noopener');

  window.App = Object.assign({ $, el, toast, flash, showFlash, setBusy, chip, statusChip, svcChip, pickLang, t, getLang, setLang,
    api, call, ApiError, loadSession, saveSession, clearSession, requireLogin, logout, session: () => session,
    mountHeader, mountNav, openSheet, openChangeSecret, startPolling, waText, openWa }, pure);
})();
