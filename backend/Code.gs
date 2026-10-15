/**
 * =====================================================================
 *  ટોકન / टोकन — Shop token system · Google Apps Script backend (Code.gs)
 *  API_VERSION 1.0-token
 * =====================================================================
 *  SETUP (one time)
 *  1. New Google Sheet → Extensions → Apps Script → paste this whole file.
 *  2. Run  setupSheets  once → creates Users, Menu, Customers, Tokens, Settings (+ example menu + default settings).
 *  3. Edit USERNAME / NAME / PASSWORD in  createUser  and run it (run again for more staff: Cashier, Karigar, Viewer).
 *  4. Deploy → New deployment → Web app → Execute as: Me · Who has access: Anyone → Deploy → copy the URL into site/common.js (API_URL).
 *  UPDATING: Deploy → Manage deployments → pencil → Version: New version → Deploy.
 *
 *  Staff roles (Users tab):  Admin · Cashier · Karigar · Viewer.   Customers log in with mobile + 4-digit PIN (Customers tab).
 *  Token life:  PENDING (customer's own order, waits for the cashier) → CONFIRMED (paid, gets the real token number T-014)
 *               → READY → CLOSED.   Also: REJECTED · EXPIRED (pending too long) · CANCELLED.
 *  Monthly: Admin → Archive month moves finished tokens to a new tab  Tokens_YYYY_MM  (copied + verified first, then removed).
 * =====================================================================
 */

var SHEET_USERS = 'Users', SHEET_MENU = 'Menu', SHEET_CUST = 'Customers', SHEET_TOK = 'Tokens', SHEET_SET = 'Settings';
var HEADERS = {
  Users:     ['Username', 'Name', 'Password', 'Role', 'Status'],
  Menu:      ['Item_ID', 'Name', 'Name_HI', 'Price', 'Status', 'Sort'],
  Customers: ['Customer_ID', 'Name', 'Mobile', 'PIN', 'Status', 'Created'],
  Tokens:    ['Token_ID', 'Date', 'Created_At', 'Pending_Code', 'Token_No', 'Customer_ID', 'Customer_Name', 'Customer_Mobile',
              'Items_JSON', 'Items_Text', 'Total', 'Service', 'Status', 'Pay_Mode', 'UPI_Ref', 'Created_By', 'Confirmed_By',
              'Confirmed_At', 'Closed_At', 'Note'],
  Settings:  ['Key', 'Value']
};
var TEXT_COLS = {   // columns kept as plain text (never auto-converted by Sheets)
  Users: ['Username', 'Password'], Customers: ['Mobile', 'PIN', 'Created'],
  Tokens: ['Date', 'Created_At', 'Pending_Code', 'Token_No', 'Customer_Mobile', 'Items_JSON', 'Items_Text', 'Service', 'Status', 'Pay_Mode',
           'UPI_Ref', 'Created_By', 'Confirmed_By', 'Confirmed_At', 'Closed_At', 'Note'],
  Settings: ['Key', 'Value']
};

var ROLES = ['Admin', 'Cashier', 'Karigar', 'Viewer'];
var S_PENDING = 'PENDING', S_CONFIRMED = 'CONFIRMED', S_READY = 'READY', S_CLOSED = 'CLOSED', S_REJECTED = 'REJECTED', S_EXPIRED = 'EXPIRED', S_CANCELLED = 'CANCELLED';
var OPEN_STATUSES  = [S_PENDING, S_CONFIRMED, S_READY];
var SALE_STATUSES  = [S_CONFIRMED, S_READY, S_CLOSED];            // money counted in reports
var FINAL_STATUSES = [S_CLOSED, S_REJECTED, S_EXPIRED, S_CANCELLED];
var SERVICES = ['PARCEL', 'DINE_IN'];
var PAY_MODES = ['CASH', 'UPI'];
var MENU_STATUSES = ['Active', 'OutOfStock', 'Inactive'];

var SETTING_DEFAULTS = {
  shop_name: 'ટોકન સિસ્ટમ',
  shop_whatsapp: '',                    // shop's WhatsApp number (customers' pending orders are sent here), 10 digits
  app_url: '',                          // public link of the customer page (used in the PIN message)
  pending_expiry_min: '15',
  max_pending_per_customer: '2',
  poll_seconds: '6',
  wa_template_token: '{shop}\nટોકન નં: {token}\n{items}\nકુલ: ₹{total} ({service})',
  wa_template_pending: '{shop}\nપેન્ડિંગ કોડ: {code}\n{items}\nકુલ: ₹{total} ({service})\nકૃપા કરીને કાઉન્ટર પર પેમેન્ટ કરી કન્ફર્મ કરાવો.',
  wa_template_pin: 'તમારો PIN: {pin}\nજાતે ઓર્ડર કરવા: {link}'
};
var SETTING_LIMITS = { pending_expiry_min: [1, 240], max_pending_per_customer: [1, 10], poll_seconds: [3, 30] };

var SESSION_DAYS = 30, MAX_ATTEMPTS = 5, LOCKOUT_SECONDS = 900, MIN_PASSWORD_LEN = 6, MAX_PASSWORD_LEN = 64;
var IST_MS = 19800000;                  // India: UTC+5:30, no daylight saving
var API_VERSION = '1.0-token';

/** Gujarati / Hindi message pair (the app shows both). */
function E_(gu, hi) { return gu + ' / ' + hi; }

// --------------------------- time helpers (overridable in tests) ---------------------------
function nowMs_() { return Date.now(); }
function stamp_(ms) { return new Date(ms + IST_MS).toISOString().slice(0, 19); }     // 'YYYY-MM-DDTHH:mm:ss' (India time)
function today_() { return stamp_(nowMs_()).slice(0, 10); }
function stampMs_(st) { return Date.parse(String(st) + '+05:30'); }

// --------------------------- HTTP ENTRY -----------------------------

function doGet(e) { return json_({ success: true, version: API_VERSION, message: 'Token API is running. Send POST requests.' }); }

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new ApiError('bad_request', E_('ખાલી વિનંતી.', 'खाली अनुरोध।'));
    var body;
    try { body = JSON.parse(e.postData.contents); } catch (x) { throw new ApiError('bad_request', E_('અમાન્ય વિનંતી.', 'अमान्य अनुरोध।')); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError('bad_request', E_('અમાન્ય વિનંતી.', 'अमान्य अनुरोध।'));

    if (body.action === 'login_staff') return ok_(loginStaff_(body));
    if (body.action === 'login_customer') return ok_(loginCustomer_(body));

    var u = authenticate_(body);
    switch (body.action) {
      // ---- everybody
      case 'bootstrap':            return ok_(bootstrap_(u));
      case 'change_password':      return ok_(withLock_(function () { return changeSecret_(body, u); }));
      // ---- staff
      case 'staff_board':          return ok_(staffBoard_(body, u));
      case 'list_customers':       return ok_(listCustomers_(u));
      case 'save_customer':        return ok_(write_(function () { return saveCustomer_(body, u); }));
      case 'reset_customer_pin':   return ok_(write_(function () { return resetCustomerPin_(body, u); }));
      case 'create_token':         return ok_(write_(function () { return createToken_(body, u); }));
      case 'confirm_token':        return ok_(write_(function () { return confirmToken_(body, u); }));
      case 'reject_token':         return ok_(write_(function () { return rejectToken_(body, u); }));
      case 'cancel_token':         return ok_(write_(function () { return cancelToken_(body, u); }));
      case 'set_ready':            return ok_(write_(function () { return advanceToken_(body, u, S_READY); }));
      case 'close_token':          return ok_(write_(function () { return advanceToken_(body, u, S_CLOSED); }));
      case 'report':               return ok_(report_(body, u));
      // ---- admin
      case 'admin_menu':           return ok_(adminMenu_(u));
      case 'save_menu_item':       return ok_(write_(function () { return saveMenuItem_(body, u); }));
      case 'save_settings':        return ok_(write_(function () { return saveSettings_(body, u); }));
      case 'archive_preview':      return ok_(archivePreview_(body, u));
      case 'archive_month':        return ok_(write_(function () { return archiveMonth_(body, u); }));
      // ---- customer
      case 'customer_create_token': return ok_(write_(function () { return customerCreateToken_(body, u); }));
      case 'customer_cancel':      return ok_(write_(function () { return customerCancel_(body, u); }));
      case 'my_tokens':            return ok_(myTokens_(body, u));
      default: throw new ApiError('bad_request', E_('અજાણી વિનંતી.', 'अज्ञात अनुरोध।'));
    }
  } catch (err) {
    if (err instanceof ApiError) return fail_(err.code, err.message);
    console.error(err && err.stack ? err.stack : err);
    return fail_('server_error', E_('સર્વર ભૂલ. ફરી પ્રયત્ન કરો.', 'सर्वर त्रुटि। फिर कोशिश करें।'));
  }
}

// ------------------------------ ROLES -------------------------------

function requireStaff_(u, roles) {
  if (u.kind !== 'staff' || (roles && roles.indexOf(u.role) < 0)) throw new ApiError('forbidden', E_('આ કામની પરવાનગી નથી.', 'इस काम की अनुमति नहीं है।'));
  return u;
}
function requireCustomer_(u) {
  if (u.kind !== 'customer') throw new ApiError('forbidden', E_('આ કામની પરવાનગી નથી.', 'इस काम की अनुमति नहीं है।'));
  return u;
}

// ------------------------------ LOGIN -------------------------------

function loginStaff_(body) {
  var username = str_(body.username, 60), password = String(body.password == null ? '' : body.password);
  var invalid = new ApiError('invalid_credentials', E_('ખોટું યુઝરનેમ અથવા પાસવર્ડ.', 'गलत यूज़रनेम या पासवर्ड।'));
  if (!username || !password) throw invalid;
  assertNotLocked_('s:' + username.toLowerCase());
  var user = findUser_(username);
  if (!user || user.status !== 'Active' || !verifySecret_(user.password, password)) { recordFailure_('s:' + username.toLowerCase()); throw invalid; }
  clearFailures_('s:' + username.toLowerCase());
  if (user.password.indexOf('sha256$') !== 0) {   // upgrade a plain password typed in the sheet
    withLock_(function () { user.password = hashSecret_(password); user.t.sh.getRange(user.row, user.t.idx.Password + 1).setNumberFormat('@').setValue(user.password); });
  }
  var tk = makeToken_('s', user.username, user.role, user.password);
  return { token: tk.token, expires: tk.expires, who: 'staff', user: { username: user.username, name: user.name, role: user.role } };
}

function loginCustomer_(body) {
  var mobile = normMobile_(body.mobile), pin = String(body.pin == null ? '' : body.pin).trim();
  var invalid = new ApiError('invalid_credentials', E_('ખોટો મોબાઇલ અથવા PIN.', 'गलत मोबाइल या PIN।'));
  if (mobile.length !== 10 || !/^\d{4}$/.test(pin)) throw invalid;
  assertNotLocked_('c:' + mobile);
  var c = findCustomerByMobile_(mobile);
  if (!c || c.status !== 'Active' || !verifySecret_(c.pin, pin)) { recordFailure_('c:' + mobile); throw invalid; }
  clearFailures_('c:' + mobile);
  var tk = makeToken_('c', c.id, 'Customer', c.pin);
  return { token: tk.token, expires: tk.expires, who: 'customer', user: { mobile: c.mobile, name: c.name, role: 'Customer' } };
}

/** staff: {who:'staff', username, token} · customer: {who:'customer', mobile, token} */
function authenticate_(body) {
  var expired = new ApiError('session_expired', E_('સત્ર પૂરું થયું. ફરી લોગિન કરો.', 'सत्र समाप्त। फिर लॉगिन करें।'));
  var token = String(body.token || ''), dot = token.indexOf('.');
  if (dot < 1) throw expired;
  var expires = Number(token.slice(0, dot));
  if (!isFinite(expires) || expires < nowMs_()) throw expired;
  var sig = token.slice(dot + 1);
  if (body.who === 'customer') {
    var mobile = normMobile_(body.mobile);
    var c = mobile.length === 10 ? findCustomerByMobile_(mobile) : null;
    if (!c || c.status !== 'Active') throw expired;
    if (!safeEqual_(sign_('c.' + c.id + '.Customer.' + expires + '.' + c.pin), sig)) throw expired;
    return { kind: 'customer', id: c.id, name: c.name, mobile: c.mobile, role: 'Customer', secret: c, sheetRef: c };
  }
  var username = str_(body.username, 60);
  var user = username ? findUser_(username) : null;
  if (!user || user.status !== 'Active') throw expired;
  if (!safeEqual_(sign_('s.' + user.username + '.' + user.role + '.' + expires + '.' + user.password), sig)) throw expired;
  return { kind: 'staff', username: user.username, name: user.name, role: user.role, secret: user, sheetRef: user };
}

function makeToken_(kind, id, role, secret) {
  var expires = nowMs_() + SESSION_DAYS * 86400000;
  return { token: expires + '.' + sign_(kind + '.' + id + '.' + role + '.' + expires + '.' + secret), expires: expires };
}

/** staff: change password · customer: change PIN (4 digits). */
function changeSecret_(body, u) {
  var oldS = String(body.old_secret == null ? '' : body.old_secret), newS = String(body.new_secret == null ? '' : body.new_secret);
  var ref = u.sheetRef;
  var current = u.kind === 'staff' ? ref.password : ref.pin;
  if (!verifySecret_(current, oldS)) throw new ApiError('wrong_password', E_('હાલનો પાસવર્ડ/PIN ખોટો છે.', 'मौजूदा पासवर्ड/PIN गलत है।'));
  if (u.kind === 'customer') {
    if (!/^\d{4}$/.test(newS)) throw new ApiError('bad_request', E_('નવો PIN ૪ આંકડાનો હોવો જોઈએ.', 'नया PIN 4 अंकों का होना चाहिए।'));
    var h = hashSecret_(newS);
    ref.t.sh.getRange(ref.row, ref.t.idx.PIN + 1).setNumberFormat('@').setValue(h);
    ref.pin = h;
    var tk = makeToken_('c', ref.id, 'Customer', h);
    return { token: tk.token, expires: tk.expires };
  }
  if (newS.length < MIN_PASSWORD_LEN || newS.length > MAX_PASSWORD_LEN) throw new ApiError('bad_request', E_('નવો પાસવર્ડ ' + MIN_PASSWORD_LEN + '–' + MAX_PASSWORD_LEN + ' અક્ષરનો હોવો જોઈએ.', 'नया पासवर्ड ' + MIN_PASSWORD_LEN + '–' + MAX_PASSWORD_LEN + ' अक्षर का होना चाहिए।'));
  var hp = hashSecret_(newS);
  ref.t.sh.getRange(ref.row, ref.t.idx.Password + 1).setNumberFormat('@').setValue(hp);
  ref.password = hp;
  var t2 = makeToken_('s', ref.username, ref.role, hp);
  return { token: t2.token, expires: t2.expires };
}

// ------------------------------ SHEET I/O ---------------------------

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new ApiError('server_error', E_('ટેબ "' + name + '" નથી. setupSheets ચલાવો.', 'टैब "' + name + '" नहीं है। setupSheets चलाएँ।'));
  return sh;
}
/** {sh, idx (header→col), rows (2D values), width}; columns are found by NAME. */
function table_(name) {
  var sh = sheet_(name), need = HEADERS[name] || HEADERS.Tokens;
  var width = Math.max(sh.getLastColumn(), need.length);
  var head = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); });
  var idx = {};
  head.forEach(function (h, i) { if (h) idx[h] = i; });
  need.forEach(function (h) { if (idx[h] === undefined) throw new ApiError('server_error', E_('કોલમ "' + h + '" ' + name + ' માં નથી. setupSheets ચલાવો.', 'कॉलम "' + h + '" ' + name + ' में नहीं है। setupSheets चलाएँ।')); });
  var last = sh.getLastRow();
  return { sh: sh, idx: idx, rows: last > 1 ? sh.getRange(2, 1, last - 1, width).getValues() : [], width: width };
}
function blankRow_(t) { var r = []; for (var i = 0; i < t.width; i++) r.push(''); return r; }
function nextRow_(t) { return Math.max(t.sh.getLastRow(), 1) + 1; }
function writeRow_(t, target, row, name) {
  (TEXT_COLS[name] || []).forEach(function (c) { if (t.idx[c] !== undefined) t.sh.getRange(target, t.idx[c] + 1).setNumberFormat('@'); });
  t.sh.getRange(target, 1, 1, t.width).setValues([row]);
}

// ---- users / customers / menu / settings

function findUser_(username) {
  var t = table_(SHEET_USERS), want = String(username).toLowerCase();
  for (var i = 0; i < t.rows.length; i++) {
    var r = t.rows[i];
    if (String(r[t.idx.Username]).trim().toLowerCase() === want) {
      var role = String(r[t.idx.Role]).trim().toLowerCase(), found = 'Viewer';
      ROLES.forEach(function (x) { if (x.toLowerCase() === role) found = x; });         // unknown role = read-only
      return { t: t, row: i + 2, username: String(r[t.idx.Username]).trim(), name: String(r[t.idx.Name] || r[t.idx.Username]).trim(),
               password: String(r[t.idx.Password] || ''), role: found, status: String(r[t.idx.Status]).trim().toLowerCase() === 'active' ? 'Active' : 'Inactive' };
    }
  }
  return null;
}

function customerFromRow_(t, r, i) {
  return { t: t, row: i + 2, id: String(r[t.idx.Customer_ID] || ''), name: String(r[t.idx.Name] || '').trim(), mobile: normMobile_(r[t.idx.Mobile]),
           pin: String(r[t.idx.PIN] || ''), status: String(r[t.idx.Status]).trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active', created: String(r[t.idx.Created] || '') };
}
function readCustomers_() { var t = table_(SHEET_CUST); return t.rows.map(function (r, i) { return customerFromRow_(t, r, i); }).filter(function (c) { return c.id; }); }
function findCustomerByMobile_(m) { var l = readCustomers_(); for (var i = 0; i < l.length; i++) if (l[i].mobile === m) return l[i]; return null; }
function findCustomerById_(id) { var l = readCustomers_(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }

function readMenu_() {
  var t = table_(SHEET_MENU), out = [];
  t.rows.forEach(function (r, i) {
    var id = String(r[t.idx.Item_ID] || '').trim(), name = String(r[t.idx.Name] || '').trim();
    if (!id || !name) return;
    var st = String(r[t.idx.Status]).trim().toLowerCase();
    out.push({ id: id, name: name, name_hi: String(r[t.idx.Name_HI] || '').trim(), price: Number(r[t.idx.Price]) || 0,
               status: st === 'outofstock' ? 'OutOfStock' : st === 'inactive' ? 'Inactive' : 'Active', sort: Number(r[t.idx.Sort]) || 0, _row: i + 2, _t: t });
  });
  out.sort(function (a, b) { return a.sort - b.sort || (a.name < b.name ? -1 : 1); });
  return out;
}
function publicMenuItem_(m) { return { id: m.id, name: m.name, name_hi: m.name_hi, price: m.price, status: m.status, sort: m.sort }; }

function readSettings_() {
  var t = table_(SHEET_SET), out = {}, k;
  for (k in SETTING_DEFAULTS) out[k] = SETTING_DEFAULTS[k];
  t.rows.forEach(function (r) { var key = String(r[t.idx.Key] || '').trim(); if (key && SETTING_DEFAULTS[key] !== undefined && String(r[t.idx.Value]) !== '') out[key] = unsafeText_(String(r[t.idx.Value])); });
  return out;
}
function numSetting_(s, key) { var n = Number(s[key]); var lim = SETTING_LIMITS[key]; if (!isFinite(n) || n < lim[0] || n > lim[1]) n = Number(SETTING_DEFAULTS[key]); return n; }

// ---- tokens

function tokenFromRow_(t, r, i) {
  var items = [];
  try { items = JSON.parse(String(r[t.idx.Items_JSON] || '[]')); } catch (e) { items = []; }
  return { id: String(r[t.idx.Token_ID] || ''), date: String(r[t.idx.Date] || ''), created_at: String(r[t.idx.Created_At] || ''),
           pending_code: String(r[t.idx.Pending_Code] || ''), token_no: String(r[t.idx.Token_No] || ''), customer_id: String(r[t.idx.Customer_ID] || ''),
           customer_name: unsafeText_(String(r[t.idx.Customer_Name] || '')), customer_mobile: normMobile_(r[t.idx.Customer_Mobile]), items: items,
           total: Number(r[t.idx.Total]) || 0, service: String(r[t.idx.Service] || ''), status: String(r[t.idx.Status] || ''),
           pay_mode: String(r[t.idx.Pay_Mode] || ''), upi_ref: unsafeText_(String(r[t.idx.UPI_Ref] || '')), created_by: String(r[t.idx.Created_By] || ''),
           confirmed_by: String(r[t.idx.Confirmed_By] || ''), confirmed_at: String(r[t.idx.Confirmed_At] || ''), closed_at: String(r[t.idx.Closed_At] || ''),
           note: unsafeText_(String(r[t.idx.Note] || '')), _row: i + 2, _t: t };
}
function readTokens_(name) { var t = table_(name || SHEET_TOK); return t.rows.map(function (r, i) { return tokenFromRow_(t, r, i); }).filter(function (k) { return k.id; }); }
function findToken_(id) {
  var l = readTokens_();
  for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
  throw new ApiError('not_found', E_('ટોકન મળ્યો નથી.', 'टोकन नहीं मिला।'));
}
function itemsText_(items) { return items.map(function (x) { return x.name + ' ×' + x.qty; }).join(', '); }
function rowFromToken_(t, k) {
  var r = blankRow_(t);
  r[t.idx.Token_ID] = k.id; r[t.idx.Date] = k.date; r[t.idx.Created_At] = k.created_at; r[t.idx.Pending_Code] = k.pending_code; r[t.idx.Token_No] = k.token_no;
  r[t.idx.Customer_ID] = k.customer_id; r[t.idx.Customer_Name] = safeText_(k.customer_name); r[t.idx.Customer_Mobile] = k.customer_mobile;
  r[t.idx.Items_JSON] = JSON.stringify(k.items); r[t.idx.Items_Text] = safeText_(itemsText_(k.items)); r[t.idx.Total] = k.total; r[t.idx.Service] = k.service;
  r[t.idx.Status] = k.status; r[t.idx.Pay_Mode] = k.pay_mode; r[t.idx.UPI_Ref] = safeText_(k.upi_ref); r[t.idx.Created_By] = k.created_by;
  r[t.idx.Confirmed_By] = k.confirmed_by; r[t.idx.Confirmed_At] = k.confirmed_at; r[t.idx.Closed_At] = k.closed_at; r[t.idx.Note] = safeText_(k.note);
  return r;
}
function saveTokenRow_(k) { writeRow_(k._t, k._row, rowFromToken_(k._t, k), SHEET_TOK); }

function nextSeq_(prefix, date, pad) {
  var props = PropertiesService.getScriptProperties(), key = prefix + '_' + date;
  var n = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(n));
  var s = String(n); while (s.length < pad) s = '0' + s;
  return s;
}

/** Validates {item_id, qty}[] against the menu and returns price-snapshotted items + total. */
function buildItems_(list, menu) {
  if (!Array.isArray(list) || !list.length) throw new ApiError('bad_request', E_('ઓછામાં ઓછી એક આઇટમ પસંદ કરો.', 'कम से कम एक आइटम चुनें।'));
  if (list.length > 30) throw new ApiError('bad_request', E_('બહુ બધી આઇટમ.', 'बहुत ज़्यादा आइटम।'));
  var by = {}; menu.forEach(function (m) { by[m.id] = m; });
  var seen = {}, items = [], total = 0;
  list.forEach(function (x) {
    if (!x || typeof x !== 'object') throw new ApiError('bad_request', E_('અમાન્ય આઇટમ.', 'अमान्य आइटम।'));
    var m = by[String(x.item_id)], q = Number(x.qty);
    if (!m || m.status !== 'Active') throw new ApiError('bad_request', E_('આ આઇટમ હાલ ઉપલબ્ધ નથી.', 'यह आइटम अभी उपलब्ध नहीं है।'));
    if (!isFinite(q) || q % 1 || q < 1 || q > 50) throw new ApiError('bad_request', E_('જથ્થો ૧ થી ૫૦ વચ્ચે હોવો જોઈએ.', 'मात्रा 1 से 50 के बीच होनी चाहिए।'));
    if (seen[m.id]) throw new ApiError('bad_request', E_('એક આઇટમ બે વાર નહીં.', 'एक आइटम दो बार नहीं।'));
    seen[m.id] = true;
    items.push({ id: m.id, name: m.name, name_hi: m.name_hi, qty: q, price: m.price });     // price is frozen into the token
    total += m.price * q;
  });
  return { items: items, total: Math.round(total * 100) / 100 };
}

// ---------------------------------- BOARD (polling) ----------------------------------

function version_() { return Number(PropertiesService.getScriptProperties().getProperty('ver') || 0); }
function bumpVersion_() { PropertiesService.getScriptProperties().setProperty('ver', String(version_() + 1)); }
/** every action that changes data goes through here: lock → run → bump the board version */
function write_(fn) { return withLock_(function () { sweepExpired_(true); var r = fn(); bumpVersion_(); return r; }); }

/** PENDING tokens older than the expiry setting become EXPIRED (checked at most every 20 s unless forced). */
function sweepExpired_(force) {
  var cache = CacheService.getScriptCache();
  if (!force && cache.get('swept')) return;
  var limit = numSetting_(readSettings_(), 'pending_expiry_min') * 60000, now = nowMs_(), changed = 0;
  readTokens_().forEach(function (k) {
    if (k.status === S_PENDING && now - stampMs_(k.created_at) > limit) { k.status = S_EXPIRED; k.closed_at = stamp_(now); saveTokenRow_(k); changed++; }
  });
  cache.put('swept', '1', 20);
  if (changed) bumpVersion_();
}

function karigarView_(k) {
  return { id: k.id, token_no: k.token_no, customer_name: k.customer_name, customer_mobile: k.customer_mobile, service: k.service, status: k.status,
           created_at: k.confirmed_at || k.created_at, note: k.note,
           items: k.items.map(function (x) { return { name: x.name, name_hi: x.name_hi, qty: x.qty }; }) };
}
function staffView_(k) {
  return { id: k.id, date: k.date, created_at: k.created_at, pending_code: k.pending_code, token_no: k.token_no, customer_id: k.customer_id, customer_name: k.customer_name,
           customer_mobile: k.customer_mobile, items: k.items, total: k.total, service: k.service, status: k.status, pay_mode: k.pay_mode, upi_ref: k.upi_ref,
           created_by: k.created_by, confirmed_at: k.confirmed_at, closed_at: k.closed_at, note: k.note };
}

function staffBoard_(body, u) {
  requireStaff_(u);
  var ver = version_();
  if (!body.force && body.version !== undefined && body.version !== null && Number(body.version) === ver) {
    sweepExpired_(false);
    if (version_() === ver) return { unchanged: true, version: ver };
    ver = version_();
  } else { sweepExpired_(false); ver = version_(); }
  var today = today_(), karigar = u.role === 'Karigar';
  var out = [];
  readTokens_().forEach(function (k) {
    var open = OPEN_STATUSES.indexOf(k.status) >= 0;
    if (!open && k.date !== today) return;
    if (karigar) { if (k.status === S_CONFIRMED || k.status === S_READY) out.push(karigarView_(k)); return; }
    out.push(staffView_(k));
  });
  out.sort(function (a, b) { return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0; });
  return { version: ver, today: today, tokens: out };
}

// ---------------------------------- bootstrap ----------------------------------

function publicSettings_(s) {
  return { shop_name: s.shop_name, shop_whatsapp: normMobile_(s.shop_whatsapp), app_url: s.app_url, pending_expiry_min: numSetting_(s, 'pending_expiry_min'),
           max_pending_per_customer: numSetting_(s, 'max_pending_per_customer'), poll_seconds: numSetting_(s, 'poll_seconds'),
           wa_template_token: s.wa_template_token, wa_template_pending: s.wa_template_pending, wa_template_pin: s.wa_template_pin };
}
function bootstrap_(u) {
  var s = readSettings_();
  return { kind: u.kind, role: u.role, name: u.name, settings: publicSettings_(s),
           menu: readMenu_().filter(function (m) { return m.status !== 'Inactive'; }).map(publicMenuItem_) };
}

// ---------------------------------- customers ----------------------------------

function listCustomers_(u) {
  requireStaff_(u, ['Admin', 'Cashier']);
  return { customers: readCustomers_().map(function (c) { return { id: c.id, name: c.name, mobile: c.mobile, status: c.status }; }) };
}
function newPin_() { return String(1000 + Math.floor(Math.random() * 9000)); }

/** New customer (cashier / admin): returns the 4-digit PIN ONCE (it is stored hashed). Edit: name (cashier / admin), status (admin). */
function saveCustomer_(body, u) {
  requireStaff_(u, ['Admin', 'Cashier']);
  var name = cleanName_(body.name, 60), id = str_(body.id, 40);
  var mobile = normMobile_(body.mobile);
  if (mobile.length !== 10) throw new ApiError('bad_request', E_('૧૦ આંકડાનો મોબાઇલ નંબર લખો.', '10 अंकों का मोबाइल नंबर लिखें।'));
  var t = table_(SHEET_CUST), list = readCustomers_(), target = null;
  list.forEach(function (c) { if (id && c.id === id) target = c; });
  if (id && !target) throw new ApiError('not_found', E_('ગ્રાહક મળ્યો નથી.', 'ग्राहक नहीं मिला।'));
  list.forEach(function (c) { if (c.mobile === mobile && c !== target) throw new ApiError('bad_request', E_('આ મોબાઇલ નંબર પહેલેથી નોંધાયેલ છે.', 'यह मोबाइल नंबर पहले से दर्ज है।')); });
  if (target) {
    if (u.role !== 'Admin' && target.mobile !== mobile) throw new ApiError('forbidden', E_('મોબાઇલ ફક્ત એડમિન બદલી શકે.', 'मोबाइल केवल एडमिन बदल सकता है।'));
    var status = u.role === 'Admin' && body.status === 'Inactive' ? 'Inactive' : (u.role === 'Admin' && body.status === 'Active' ? 'Active' : target.status);
    var row = t.rows[target.row - 2].slice();
    row[t.idx.Name] = safeText_(name); row[t.idx.Mobile] = mobile; row[t.idx.Status] = status;
    writeRow_(t, target.row, row, SHEET_CUST);
    return { customer: { id: target.id, name: name, mobile: mobile, status: status } };
  }
  var pin = newPin_(), nr = blankRow_(t), cid = newId_('C');
  nr[t.idx.Customer_ID] = cid; nr[t.idx.Name] = safeText_(name); nr[t.idx.Mobile] = mobile; nr[t.idx.PIN] = hashSecret_(pin); nr[t.idx.Status] = 'Active'; nr[t.idx.Created] = today_();
  writeRow_(t, nextRow_(t), nr, SHEET_CUST);
  return { customer: { id: cid, name: name, mobile: mobile, status: 'Active' }, pin: pin };
}

function resetCustomerPin_(body, u) {
  requireStaff_(u, ['Admin', 'Cashier']);
  var c = findCustomerById_(str_(body.customer_id, 40));
  if (!c) throw new ApiError('not_found', E_('ગ્રાહક મળ્યો નથી.', 'ग्राहक नहीं मिला।'));
  var pin = newPin_();
  c.t.sh.getRange(c.row, c.t.idx.PIN + 1).setNumberFormat('@').setValue(hashSecret_(pin));
  clearFailures_('c:' + c.mobile);
  return { pin: pin };
}

// ---------------------------------- creating tokens ----------------------------------

function pickService_(v) { var s = String(v || ''); if (SERVICES.indexOf(s) < 0) throw new ApiError('bad_request', E_('PARCEL કે DINE-IN પસંદ કરો.', 'PARCEL या DINE-IN चुनें।')); return s; }

function insertToken_(k) {
  var t = table_(SHEET_TOK);
  k._t = t; k._row = nextRow_(t);
  saveTokenRow_(k);
  return k;
}
function newToken_(over) {
  var now = nowMs_();
  var k = { id: newId_('K'), date: stamp_(now).slice(0, 10), created_at: stamp_(now), pending_code: '', token_no: '', customer_id: '', customer_name: '', customer_mobile: '',
            items: [], total: 0, service: '', status: '', pay_mode: '', upi_ref: '', created_by: '', confirmed_by: '', confirmed_at: '', closed_at: '', note: '' };
  for (var key in over) k[key] = over[key];
  return k;
}

/** Cashier / admin: a PAID token (cash or UPI taken at the counter) — gets the real token number at once. Guest = no customer. */
function createToken_(body, u) {
  requireStaff_(u, ['Admin', 'Cashier']);
  var b = buildItems_(body.items, readMenu_());
  var service = pickService_(body.service), pay = String(body.pay_mode || '');
  if (PAY_MODES.indexOf(pay) < 0) throw new ApiError('bad_request', E_('કેશ કે UPI પસંદ કરો.', 'कैश या UPI चुनें।'));
  var cid = str_(body.customer_id, 40), cname = '', cmob = '';
  if (cid) {
    var c = findCustomerById_(cid);
    if (!c || c.status !== 'Active') throw new ApiError('bad_request', E_('ગ્રાહક મળ્યો નથી.', 'ग्राहक नहीं मिला।'));
    cname = c.name; cmob = c.mobile;
  } else { cname = str_(body.guest_name, 40) || 'ગેસ્ટ'; }
  var today = today_();
  var k = newToken_({ customer_id: cid, customer_name: cname, customer_mobile: cmob, items: b.items, total: b.total, service: service, status: S_CONFIRMED, pay_mode: pay,
                      upi_ref: str_(body.upi_ref, 40), created_by: u.username, confirmed_by: u.username, note: strMulti_(body.note, 200) });
  k.token_no = 'T-' + nextSeq_('seq', k.date, 3); k.confirmed_at = k.created_at;
  insertToken_(k);
  return { token: staffView_(k) };
}

/** Registered customer's own order: PENDING until the cashier confirms the payment. Prices are always taken from the menu. */
function customerCreateToken_(body, u) {
  requireCustomer_(u);
  var s = readSettings_(), c = u.sheetRef;
  var b = buildItems_(body.items, readMenu_());
  var service = pickService_(body.service);
  var pending = readTokens_().filter(function (k) { return k.customer_id === c.id && k.status === S_PENDING; }).length;
  if (pending >= numSetting_(s, 'max_pending_per_customer')) throw new ApiError('bad_request', E_('પહેલા તમારો પેન્ડિંગ ટોકન કન્ફર્મ કરાવો અથવા રદ કરો.', 'पहले अपना पेंडिंग टोकन कन्फर्म कराएँ या रद्द करें।'));
  var k = newToken_({ customer_id: c.id, customer_name: c.name, customer_mobile: c.mobile, items: b.items, total: b.total, service: service, status: S_PENDING,
                      created_by: 'customer', note: strMulti_(body.note, 200) });
  k.pending_code = 'P-' + nextSeq_('pseq', k.date, 2);
  insertToken_(k);
  return { token: customerView_(k) };
}

function customerView_(k) {
  return { id: k.id, date: k.date, created_at: k.created_at, pending_code: k.pending_code, token_no: k.token_no, items: k.items, total: k.total, service: k.service,
           status: k.status, pay_mode: k.pay_mode, note: k.note };
}
function myTokens_(body, u) {
  requireCustomer_(u);
  sweepExpired_(false);
  var ver = version_();
  if (!body.force && body.version !== undefined && body.version !== null && Number(body.version) === ver) return { unchanged: true, version: ver };
  var today = today_(), mine = readTokens_().filter(function (k) { return k.customer_id === u.id && (OPEN_STATUSES.indexOf(k.status) >= 0 || k.date === today); });
  mine.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
  return { version: ver, tokens: mine.slice(0, 30).map(customerView_) };
}
function customerCancel_(body, u) {
  requireCustomer_(u);
  var k = findToken_(str_(body.token_id, 40));
  if (k.customer_id !== u.id) throw new ApiError('forbidden', E_('આ તમારો ટોકન નથી.', 'यह आपका टोकन नहीं है।'));
  if (k.status !== S_PENDING) throw new ApiError('bad_request', E_('ફક્ત પેન્ડિંગ ટોકન રદ થઈ શકે.', 'केवल पेंडिंग टोकन रद्द हो सकता है।'));
  k.status = S_CANCELLED; k.closed_at = stamp_(nowMs_()); k.note = (k.note ? k.note + ' · ' : '') + 'ગ્રાહકે રદ કર્યો';
  saveTokenRow_(k);
  return { token: customerView_(k) };
}

// ---------------------------------- cashier / karigar actions ----------------------------------

function confirmToken_(body, u) {
  requireStaff_(u, ['Admin', 'Cashier']);
  var k = findToken_(str_(body.token_id, 40)), pay = String(body.pay_mode || '');
  if (PAY_MODES.indexOf(pay) < 0) throw new ApiError('bad_request', E_('કેશ કે UPI પસંદ કરો.', 'कैश या UPI चुनें।'));
  if (k.status === S_EXPIRED) throw new ApiError('bad_request', E_('આ ટોકન સમય પૂરો થવાથી રદ થયો છે.', 'यह टोकन समय समाप्त होने से रद्द हो गया है।'));
  if (k.status !== S_PENDING) throw new ApiError('bad_request', E_('આ ટોકન પેન્ડિંગ નથી.', 'यह टोकन पेंडिंग नहीं है।'));
  var now = stamp_(nowMs_());
  k.status = S_CONFIRMED; k.pay_mode = pay; k.upi_ref = str_(body.upi_ref, 40) || k.upi_ref; k.confirmed_by = u.username; k.confirmed_at = now;
  k.token_no = 'T-' + nextSeq_('seq', today_(), 3);                      // the REAL number is given only now
  saveTokenRow_(k);
  return { token: staffView_(k) };
}
function rejectToken_(body, u) {
  requireStaff_(u, ['Admin', 'Cashier']);
  var k = findToken_(str_(body.token_id, 40));
  if (k.status !== S_PENDING) throw new ApiError('bad_request', E_('ફક્ત પેન્ડિંગ ટોકન રદ થઈ શકે.', 'केवल पेंडिंग टोकन रद्द हो सकता है।'));
  k.status = S_REJECTED; k.closed_at = stamp_(nowMs_()); k.note = (k.note ? k.note + ' · ' : '') + str_(body.reason, 80);
  saveTokenRow_(k);
  return { token: staffView_(k) };
}
function cancelToken_(body, u) {
  requireStaff_(u, ['Admin']);
  var k = findToken_(str_(body.token_id, 40));
  if (OPEN_STATUSES.indexOf(k.status) < 0) throw new ApiError('bad_request', E_('આ ટોકન હવે રદ થઈ શકે નહીં.', 'यह टोकन अब रद्द नहीं हो सकता।'));
  k.status = S_CANCELLED; k.closed_at = stamp_(nowMs_()); k.note = (k.note ? k.note + ' · ' : '') + str_(body.reason, 80);
  saveTokenRow_(k);
  return { token: staffView_(k) };
}
/** READY / CLOSED — karigar, cashier, admin. */
function advanceToken_(body, u, to) {
  requireStaff_(u, ['Admin', 'Cashier', 'Karigar']);
  var k = findToken_(str_(body.token_id, 40));
  var okFrom = to === S_READY ? [S_CONFIRMED] : [S_CONFIRMED, S_READY];
  if (okFrom.indexOf(k.status) < 0) throw new ApiError('bad_request', E_('આ ટોકન હજી કન્ફર્મ નથી અથવા પૂરો થઈ ગયો છે.', 'यह टोकन अभी कन्फर्म नहीं है या पूरा हो चुका है।'));
  k.status = to;
  if (to === S_CLOSED) k.closed_at = stamp_(nowMs_());
  saveTokenRow_(k);
  return u.role === 'Karigar' ? { token: karigarView_(k) } : { token: staffView_(k) };
}

// ---------------------------------- reports ----------------------------------

function monthsBetween_(from, to) {
  var out = [], y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7)), ey = Number(to.slice(0, 4)), em = Number(to.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) { out.push(y + '_' + (m < 10 ? '0' + m : m)); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

/** Sales (CONFIRMED / READY / CLOSED) for a date range, from the active tab AND any archive tabs: totals, per day, items, top customers. */
function report_(body, u) {
  requireStaff_(u, ['Admin', 'Viewer']);
  var from = dateKey_(body.from), to = dateKey_(body.to);
  if (from > to) throw new ApiError('bad_request', E_('અમાન્ય તારીખ સમયગાળો.', 'अमान्य तारीख अवधि।'));
  var span = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (span > 366) throw new ApiError('bad_request', E_('સમયગાળો ૧ વર્ષથી વધુ નથી ચાલે.', 'अवधि 1 वर्ष से अधिक नहीं हो सकती।'));
  var all = readTokens_();
  monthsBetween_(from, to).forEach(function (m) {
    var tab = ss_().getSheetByName('Tokens_' + m);
    if (tab) all = all.concat(readTokens_('Tokens_' + m));
  });
  var seen = {}, tot = { count: 0, amount: 0, cash: 0, upi: 0, parcel: 0, dine_in: 0, cancelled: 0, rejected: 0, expired: 0 }, byDay = {}, items = {}, custs = {};
  all.forEach(function (k) {
    if (seen[k.id] || k.date < from || k.date > to) return;
    seen[k.id] = true;
    if (k.status === S_CANCELLED) tot.cancelled++; else if (k.status === S_REJECTED) tot.rejected++; else if (k.status === S_EXPIRED) tot.expired++;
    if (SALE_STATUSES.indexOf(k.status) < 0) return;
    tot.count++; tot.amount += k.total;
    if (k.pay_mode === 'UPI') tot.upi += k.total; else tot.cash += k.total;
    if (k.service === 'PARCEL') tot.parcel++; else tot.dine_in++;
    var d = byDay[k.date] = byDay[k.date] || { date: k.date, count: 0, amount: 0, cash: 0, upi: 0 };
    d.count++; d.amount += k.total; if (k.pay_mode === 'UPI') d.upi += k.total; else d.cash += k.total;
    k.items.forEach(function (x) { var it = items[x.id] = items[x.id] || { name: x.name, name_hi: x.name_hi, qty: 0, amount: 0 }; it.qty += x.qty; it.amount += x.qty * x.price; });
    var ck = k.customer_id || 'guest', c = custs[ck] = custs[ck] || { name: k.customer_id ? k.customer_name : 'ગેસ્ટ', mobile: k.customer_mobile, count: 0, amount: 0 };
    c.count++; c.amount += k.total;
  });
  function r2(n) { return Math.round(n * 100) / 100; }
  ['amount', 'cash', 'upi'].forEach(function (f) { tot[f] = r2(tot[f]); });
  var days = Object.keys(byDay).sort().map(function (d) { var x = byDay[d]; x.amount = r2(x.amount); x.cash = r2(x.cash); x.upi = r2(x.upi); return x; });
  var itemList = Object.keys(items).map(function (i) { var x = items[i]; x.amount = r2(x.amount); return x; }).sort(function (a, b) { return b.qty - a.qty; });
  var custList = Object.keys(custs).map(function (i) { var x = custs[i]; x.amount = r2(x.amount); return x; }).sort(function (a, b) { return b.amount - a.amount; }).slice(0, 10);
  return { from: from, to: to, totals: tot, by_day: days, items: itemList, customers: custList };
}

// ---------------------------------- admin: menu / settings / archive ----------------------------------

function adminMenu_(u) { requireStaff_(u, ['Admin']); return { menu: readMenu_().map(publicMenuItem_) }; }

function saveMenuItem_(body, u) {
  requireStaff_(u, ['Admin']);
  var name = cleanName_(body.name, 60), id = str_(body.item_id, 40);
  var price = Number(body.price);
  if (!isFinite(price) || price < 0 || price > 100000) throw new ApiError('bad_request', E_('સાચો ભાવ લખો.', 'सही भाव लिखें।'));
  var status = MENU_STATUSES.indexOf(body.status) >= 0 ? body.status : 'Active';
  var sort = Number(body.sort); if (!isFinite(sort)) sort = 0;
  var t = table_(SHEET_MENU), target = -1;
  t.rows.forEach(function (r, i) { if (id && String(r[t.idx.Item_ID]).trim() === id) target = i; });
  if (id && target < 0) throw new ApiError('not_found', E_('આઇટમ મળી નથી.', 'आइटम नहीं मिला।'));
  var row = target < 0 ? blankRow_(t) : t.rows[target].slice();
  row[t.idx.Item_ID] = target < 0 ? newId_('M') : id; row[t.idx.Name] = safeText_(name); row[t.idx.Name_HI] = safeText_(str_(body.name_hi, 60));
  row[t.idx.Price] = Math.round(price * 100) / 100; row[t.idx.Status] = status; row[t.idx.Sort] = sort;
  writeRow_(t, target < 0 ? nextRow_(t) : target + 2, row, SHEET_MENU);
  return { menu: readMenu_().map(publicMenuItem_) };
}

function saveSettings_(body, u) {
  requireStaff_(u, ['Admin']);
  if (!body.values || typeof body.values !== 'object') throw new ApiError('bad_request', E_('અમાન્ય વિનંતી.', 'अमान्य अनुरोध।'));
  var clean = {};
  Object.keys(body.values).forEach(function (k) {
    if (SETTING_DEFAULTS[k] === undefined) return;
    var v = body.values[k];
    if (v !== null && typeof v === 'object') throw new ApiError('bad_request', E_('અમાન્ય વિનંતી.', 'अमान्य अनुरोध।'));
    v = String(v == null ? '' : v);
    if (SETTING_LIMITS[k]) {
      var n = Number(v);
      if (!isFinite(n) || n % 1 || n < SETTING_LIMITS[k][0] || n > SETTING_LIMITS[k][1]) throw new ApiError('bad_request', E_(k + ' ' + SETTING_LIMITS[k][0] + ' થી ' + SETTING_LIMITS[k][1] + ' વચ્ચે હોવું જોઈએ.', k + ' ' + SETTING_LIMITS[k][0] + ' से ' + SETTING_LIMITS[k][1] + ' के बीच होना चाहिए।'));
      v = String(n);
    } else if (k === 'shop_whatsapp') { v = v.trim() === '' ? '' : normMobile_(v); if (v && v.length !== 10) throw new ApiError('bad_request', E_('WhatsApp નંબર ૧૦ આંકડાનો હોવો જોઈએ.', 'WhatsApp नंबर 10 अंकों का होना चाहिए।')); }
    else if (k === 'app_url') { v = v.trim().slice(0, 200); if (v && !/^https:\/\//.test(v)) throw new ApiError('bad_request', E_('લિંક https:// થી શરૂ થવી જોઈએ.', 'लिंक https:// से शुरू होनी चाहिए।')); }
    else v = strMulti_(v, 500);
    clean[k] = v;
  });
  var t = table_(SHEET_SET), pos = {};
  t.rows.forEach(function (r, i) { pos[String(r[t.idx.Key]).trim()] = i + 2; });
  Object.keys(clean).forEach(function (k) {
    var row = blankRow_(t); row[t.idx.Key] = k; row[t.idx.Value] = safeText_(clean[k]);
    writeRow_(t, pos[k] || nextRow_(t), row, SHEET_SET);
    if (!pos[k]) pos[k] = t.sh.getLastRow();
  });
  return { settings: publicSettings_(readSettings_()) };
}

function monthKey_(v) {
  var s = String(v == null ? '' : v);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) throw new ApiError('bad_request', E_('અમાન્ય મહિનો.', 'अमान्य महीना।'));
  return s;
}
function archivePreview_(body, u) {
  requireStaff_(u, ['Admin']);
  var m = monthKey_(body.month), finals = 0, open = 0;
  readTokens_().forEach(function (k) { if (k.date.slice(0, 7) !== m) return; if (FINAL_STATUSES.indexOf(k.status) >= 0) finals++; else open++; });
  var tab = ss_().getSheetByName('Tokens_' + m.replace('-', '_'));
  return { month: m, to_archive: finals, stays_open: open, archive_tab: 'Tokens_' + m.replace('-', '_'), archive_exists: !!tab };
}

/**
 * Moves the FINISHED tokens (CLOSED / REJECTED / EXPIRED / CANCELLED) of a month to the tab Tokens_YYYY_MM.
 * Order: copy → flush → read back and VERIFY every id → only then delete from the active tab (bottom up).
 * Open tokens (PENDING / CONFIRMED / READY) always stay. Customers / Menu / Users are never touched.
 */
function archiveMonth_(body, u) {
  requireStaff_(u, ['Admin']);
  var m = monthKey_(body.month), tabName = 'Tokens_' + m.replace('-', '_');
  var active = table_(SHEET_TOK);
  var move = [], open = 0;
  active.rows.forEach(function (r, i) {
    var k = tokenFromRow_(active, r, i);
    if (!k.id || k.date.slice(0, 7) !== m) return;
    if (FINAL_STATUSES.indexOf(k.status) >= 0) move.push({ k: k, raw: r }); else open++;
  });
  if (!move.length) return { moved: 0, stays_open: open, archive_tab: tabName };

  var ss = ss_(), arch = ss.getSheetByName(tabName);
  if (!arch) {
    arch = ss.insertSheet(tabName);
    arch.getRange(1, 1, 1, HEADERS.Tokens.length).setValues([HEADERS.Tokens]);
    if (arch.setFrozenRows) arch.setFrozenRows(1);
  }
  var at = table_(tabName);
  var start = nextRow_(at), width = at.width;
  var rows = move.map(function (x) { var r = x.raw.slice(0, width); while (r.length < width) r.push(''); return r; });
  TEXT_COLS.Tokens.forEach(function (c) { if (at.idx[c] !== undefined) at.sh.getRange(start, at.idx[c] + 1, rows.length, 1).setNumberFormat('@'); });
  at.sh.getRange(start, 1, rows.length, width).setValues(rows);
  SpreadsheetApp.flush();

  var back = at.sh.getRange(start, at.idx.Token_ID + 1, rows.length, 1).getValues().map(function (r) { return String(r[0]); });
  var okIds = {}; back.forEach(function (id) { okIds[id] = true; });
  var verified = move.every(function (x) { return okIds[x.k.id]; });
  if (!verified) throw new ApiError('server_error', E_('આર્કાઇવ ચકાસણી નિષ્ફળ — કંઈ કાઢ્યું નથી. ફરી પ્રયત્ન કરો.', 'आर्काइव सत्यापन विफल — कुछ नहीं हटाया। फिर कोशिश करें।'));

  move.map(function (x) { return x.k._row; }).sort(function (a, b) { return b - a; }).forEach(function (rowNo) { active.sh.deleteRow(rowNo); });
  SpreadsheetApp.flush();
  return { moved: move.length, stays_open: open, archive_tab: tabName };
}

// ---------------------------------- validation / helpers ----------------------------------

function str_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max); }
function strMulti_(v, max) { return String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max); }
/** setValues() evaluates strings starting with = + - @ even in text cells → apostrophe guard (stripped on read). */
function safeText_(s) { s = String(s == null ? '' : s); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function unsafeText_(s) { return /^'[=+\-@]/.test(s) ? s.slice(1) : s; }
function cleanName_(v, max) { var n = str_(v, max); if (!n) throw new ApiError('bad_request', E_('નામ લખવું જરૂરી છે.', 'नाम लिखना ज़रूरी है।')); return n; }
function normMobile_(v) { var d = String(v == null ? '' : v).replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; }
function newId_(prefix) { return prefix + nowMs_().toString(36) + Math.floor(Math.random() * 1679616).toString(36); }
function dateKey_(v) {
  var s = String(v == null ? '' : v), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new ApiError('bad_request', E_('અમાન્ય તારીખ.', 'अमान्य तारीख।'));
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) throw new ApiError('bad_request', E_('અમાન્ય તારીખ.', 'अमान्य तारीख।'));
  return s;
}

// ------------------------- secrets (passwords / PINs) & tokens -----------------------

function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ((b < 0 ? b + 256 : b)).toString(16).padStart(2, '0'); }).join('');
}
function hashSecret_(plain) { var salt = Utilities.getUuid().replace(/-/g, ''); return 'sha256$' + salt + '$' + sha256Hex_(salt + plain); }
function verifySecret_(stored, plain) {
  stored = String(stored);
  if (stored.indexOf('sha256$') === 0) { var p = stored.split('$'); return p.length === 3 && safeEqual_(sha256Hex_(p[1] + plain), p[2]); }
  return stored !== '' && safeEqual_(stored, plain);
}
function safeEqual_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length, n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function secret_() {
  var props = PropertiesService.getScriptProperties(), s = props.getProperty('TOKEN_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('TOKEN_SECRET', s); }
  return s;
}
function sign_(m) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(m, secret_())); }

function assertNotLocked_(k) { if (Number(CacheService.getScriptCache().get('fail_' + k) || 0) >= MAX_ATTEMPTS) throw new ApiError('too_many_attempts', E_('ઘણા ખોટા પ્રયત્નો. ૧૫ મિનિટ પછી પ્રયત્ન કરો.', 'बहुत ग़लत प्रयास। 15 मिनट बाद कोशिश करें।')); }
function recordFailure_(k) { var c = CacheService.getScriptCache(); c.put('fail_' + k, String(Number(c.get('fail_' + k) || 0) + 1), LOCKOUT_SECONDS); }
function clearFailures_(k) { CacheService.getScriptCache().remove('fail_' + k); }

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally { lock.releaseLock(); }
}
class ApiError extends Error { constructor(code, message) { super(message); this.code = code; } }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ok_(d) { d = d || {}; d.success = true; return json_(d); }
function fail_(code, message) { return json_({ success: false, error: code, message: message }); }

// ------------------------- ADMIN (run from the editor) -------------------------

/** Creates / completes every tab, formats, dropdowns, default settings and an example menu. Safe to re-run (never touches data). */
function setupSheets() {
  var ss = ss_();
  if (ss.getName().indexOf('Untitled') === 0) ss.rename('ટોકન સિસ્ટમ');
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var need = HEADERS[name];
    var have = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
    need.forEach(function (h) { if (have.indexOf(h) < 0) { sh.getRange(1, have.length + 1).setValue(h); have.push(h); } });
    sh.getRange(1, 1, 1, have.length).setFontWeight('bold').setBackground('#FFE0B2');
    sh.setFrozenRows(1);
    var t = table_(name);
    (TEXT_COLS[name] || []).forEach(function (c) { if (t.idx[c] !== undefined) t.sh.getRange(2, t.idx[c] + 1, 5000, 1).setNumberFormat('@'); });
  });
  var first = ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);

  var mt = table_(SHEET_MENU), ut = table_(SHEET_USERS), ct = table_(SHEET_CUST);
  function list(t, col, values, n) { t.sh.getRange(2, t.idx[col] + 1, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build()); }
  list(mt, 'Status', MENU_STATUSES, 200); list(ut, 'Role', ROLES, 50); list(ut, 'Status', ['Active', 'Inactive'], 50); list(ct, 'Status', ['Active', 'Inactive'], 5000);
  mt.sh.getRange(2, mt.idx.Price + 1, 200, 1).setNumberFormat('#,##0.00');

  // default settings (only the missing keys)
  var st = table_(SHEET_SET), have2 = {};
  st.rows.forEach(function (r) { have2[String(r[st.idx.Key]).trim()] = true; });
  Object.keys(SETTING_DEFAULTS).forEach(function (k) {
    if (have2[k]) return;
    var row = blankRow_(st); row[st.idx.Key] = k; row[st.idx.Value] = safeText_(SETTING_DEFAULTS[k]);
    writeRow_(st, nextRow_(st), row, SHEET_SET);
  });
  // example menu (only when empty)
  var mt2 = table_(SHEET_MENU);
  if (!mt2.rows.length) {
    [['ખમણ', 'खमण', 40], ['સમોસા', 'समोसा', 15], ['ઇડદા', 'इडदा', 30], ['ચા', 'चाय', 10]].forEach(function (d, i) {
      var row = blankRow_(mt2); row[mt2.idx.Item_ID] = newId_('M') + i; row[mt2.idx.Name] = d[0]; row[mt2.idx.Name_HI] = d[1]; row[mt2.idx.Price] = d[2]; row[mt2.idx.Status] = 'Active'; row[mt2.idx.Sort] = (i + 1) * 10;
      writeRow_(mt2, nextRow_(mt2), row, SHEET_MENU);
    });
  }
  SpreadsheetApp.flush();
}

/** Edit the constants, then run once: adds a staff login (or resets that user's password / role). */
function createUser() {
  var USERNAME = 'admin';
  var NAME     = 'એડમિન';
  var PASSWORD = 'ChangeMe123';
  var ROLE     = 'Admin';                 // Admin · Cashier · Karigar · Viewer
  if (PASSWORD.length < MIN_PASSWORD_LEN) throw new Error('Password must be at least 6 characters.');
  if (ROLES.indexOf(ROLE) < 0) throw new Error('Role must be one of: ' + ROLES.join(', '));
  var existing = findUser_(USERNAME), hash = hashSecret_(PASSWORD);
  if (existing) {
    var t = existing.t;
    t.sh.getRange(existing.row, t.idx.Password + 1).setNumberFormat('@').setValue(hash);
    t.sh.getRange(existing.row, t.idx.Role + 1).setValue(ROLE);
    t.sh.getRange(existing.row, t.idx.Status + 1).setValue('Active');
  } else {
    var u = table_(SHEET_USERS), row = blankRow_(u);
    row[u.idx.Username] = USERNAME; row[u.idx.Name] = NAME; row[u.idx.Password] = hash; row[u.idx.Role] = ROLE; row[u.idx.Status] = 'Active';
    writeRow_(u, nextRow_(u), row, SHEET_USERS);
  }
  Logger.log('User ready: ' + USERNAME + ' (' + ROLE + ')');
}
