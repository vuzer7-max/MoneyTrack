/* ==========================================================
   MoneyTrack — script.js
   Vanilla JavaScript • localStorage • framework yo'q
   ========================================================== */
"use strict";

(function () {

/* ==========================================================
   1. KONSTANTALAR
   ========================================================== */
const STORAGE_KEY = "moneytrack.v1";
const PREV_KEY = "moneytrack.v1.prev";

const CUR = {
  UZS: { code: "UZS", name: "O'zbekiston so'mi", sym: "so'm" },
  USD: { code: "USD", name: "AQSH dollari", sym: "$" },
  KGS: { code: "KGS", name: "Qirg'iziston somi", sym: "сом" },
};
const CUR_LIST = ["UZS", "USD", "KGS"];
const DEFAULT_RATES = { USD: "12600", KGS: "150" };   // 1 USD / 1 KGS necha so'm
const CUR_COLORS = { UZS: ["#19d3a2", "#4df5cc"], USD: ["#3d7bff", "#6fa3ff"], KGS: ["#35c3ff", "#7ee0ff"] };

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktyabr", "noyabr", "dekabr"];
const MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
const WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

const CITIES = {
  "Toshkent": [41.2995, 69.2401], "Nukus": [42.4531, 59.6103], "Samarqand": [39.6542, 66.9597],
  "Buxoro": [39.7747, 64.4286], "Andijon": [40.7821, 72.3442], "Namangan": [40.9983, 71.6726],
  "Farg'ona": [40.3864, 71.7864], "Qarshi": [38.8606, 65.7891], "Urganch": [41.55, 60.6333],
  "Bishkek": [42.8746, 74.5698],
};

const TYPES = {
  gave:     { label: "Pul berdim",     short: "Berdim",  cls: "red",    icon: "send" },
  received: { label: "Pul oldim",      short: "Oldim",   cls: "green",  icon: "download" },
  expense:  { label: "Xarajat qildim", short: "Xarajat", cls: "orange", icon: "cart" },
};
// [qiymat, sarlavha, izoh]
const KINDS = {
  gave: [
    ["gift", "Oddiy berdim", "Qaytarilmaydi (sovg'a, yordam, to'lov)"],
    ["loan", "Qarz berdim", "Menga qaytarilishi kerak"],
    ["repay", "Qarzimni qaytardim", "Avval olgan qarzim uchun"],
  ],
  received: [
    ["income", "Oddiy oldim", "Maosh, sovg'a va hokazo"],
    ["repay", "Qarzni qaytarishdi", "Ular menga qarzdor edi"],
    ["borrow", "Qarz oldim", "Men qaytarishim kerak"],
  ],
  expense: [],
};
const KIND_BADGE = {
  "gave:loan": ["Qarz berildi", "red"], "gave:gift": ["Berildi", "red"], "gave:repay": ["Qarzim qaytarildi", "red"],
  "received:repay": ["Qarz qaytdi", "green"], "received:borrow": ["Qarz oldim", "purple"], "received:income": ["Olindi", "green"],
  "expense:": ["Xarajat", "orange"],
};
const CATEGORIES = [
  { id: "food", name: "Oziq-ovqat", color: "#1fd6a4" },
  { id: "transport", name: "Transport", color: "#ff4d78" },
  { id: "education", name: "Ta'lim", color: "#ffae2e" },
  { id: "friends", name: "Do'stlar", color: "#35c3ff" },
  { id: "utilities", name: "Kommunal", color: "#8e6dff" },
  { id: "health", name: "Salomatlik", color: "#ff7a59" },
  { id: "clothes", name: "Kiyim-kechak", color: "#e56bdc" },
  { id: "fun", name: "Ko'ngilochar", color: "#5ad1ff" },
  { id: "other", name: "Boshqa", color: "#7f8fb8" },
];
const SERIES = [
  ["received", "Olingan", "#1fd6a4"],
  ["gave", "Berilgan", "#ff4d78"],
  ["expense", "Xarajat", "#ffae2e"],
];
const QUOTES = [
  "Kichik nazorat katta erkinlik beradi.",
  "Har bir so'm hisobni yaxshi ko'radi.",
  "Bugun yozilgan raqam ertangi xotirjamlikdir.",
  "Pulni kuzatgan odam kelajagini boshqaradi.",
  "Qarz aniq yozilsa, do'stlik buzilmaydi.",
  "Tejash — kichik odatlardan boshlanadi.",
  "Nima ketayotganini bilgan, nima qolishini ham biladi.",
];

/* ==========================================================
   2. YORDAMCHI FUNKSIYALAR
   ========================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ico = (n, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const pad = (n) => String(n).padStart(2, "0");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ----- Sana ----- */
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayISO = () => toISO(new Date());
const nowTime = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const isValidISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
const fmtDate = (s) => { const [y, m, d] = s.split("-"); return `${d}.${m}.${y}`; };
const fmtLong = (s) => { const d = parseISO(s); return `${d.getDate()}-${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function weekStart(s) { const d = parseISO(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toISO(d); }
function monthRange(offset) {
  const n = new Date();
  return [toISO(new Date(n.getFullYear(), n.getMonth() + offset, 1)), toISO(new Date(n.getFullYear(), n.getMonth() + offset + 1, 0))];
}
function daysSince(iso) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }

/* ----- PUL: barcha summalar "minor" birlikda (tiyin/sent) BUTUN SON sifatida saqlanadi.
         Shunda 0.1 + 0.2 kabi floating-point xatolar bo'lmaydi. ----- */
function parseAmount(str, allowZero = false) {
  if (typeof str !== "string") return null;
  const s = str.trim().replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  if (w.length > 12) return null;
  const minor = Number(w) * 100 + Number((f + "00").slice(0, 2));
  if (!Number.isSafeInteger(minor)) return null;
  if (minor === 0 && !allowZero) return null;
  return minor;
}
const group = (w) => String(w).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
function fmtNum(minor) {
  const neg = minor < 0, a = Math.abs(minor);
  const w = Math.floor(a / 100), f = a % 100;
  return (neg ? "−" : "") + group(w) + (f ? "," + pad(f) : "");
}
const fmtMoney = (minor, cur) => `${fmtNum(minor)}\u00a0${CUR[cur].sym}`;
const moneyHTML = (minor, cur) => { const n = fmtNum(minor); return `<span class="n${n.length > 12 ? " long" : ""}">${n}</span> <span class="u">${CUR[cur].sym}</span>`; };
function minorToInput(m) {
  const w = Math.floor(m / 100), f = m % 100;
  let s = String(w).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (f) s += "." + pad(f).replace(/0$/, "");
  return s;
}
function minorToPlain(m) { return `${Math.floor(m / 100)}.${pad(m % 100)}`; }
function compact(minor) {
  const n = Math.abs(minor) / 100;
  const t = (v, u) => (Math.round(v * 10) / 10).toString().replace(".", ",") + u;
  if (n >= 1e9) return t(n / 1e9, "B");
  if (n >= 1e6) return t(n / 1e6, "M");
  if (n >= 1e3) return t(n / 1e3, "K");
  return String(Math.round(n * 10) / 10).replace(".", ",");
}

/* ----- Kurslar: 4 xonali kasrgacha butun songa aylantiriladi, BigInt bilan hisoblanadi ----- */
function parseRateScaled(v) {
  if (typeof v !== "string" && typeof v !== "number") return 0;
  const s = String(v).trim().replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(s)) return 0;
  const [w, f = ""] = s.split(".");
  if (w.length > 9) return 0;
  return Number(w) * 10000 + Number((f + "0000").slice(0, 4));
}
function rateScaled(cur) {
  if (cur === "UZS") return 10000n;
  const v = parseRateScaled(state.settings.rates[cur]) || parseRateScaled(DEFAULT_RATES[cur]);
  return BigInt(v);
}
function convert(minor, from, to) {
  if (from === to || minor === 0) return minor;
  const neg = minor < 0;
  const a = BigInt(Math.abs(minor)), rf = rateScaled(from), rt = rateScaled(to);
  const res = (a * rf * 2n + rt) / (2n * rt);   // yaxlitlash bilan
  const n = Number(res);
  return neg ? -n : n;
}

/* ----- Avatar ----- */
function hueOf(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 360;
  return [`hsl(${h} 72% 58%)`, `hsl(${(h + 45) % 360} 70% 42%)`];
}
function avatar(p, size = 40) {
  const name = (p && p.name) || "?";
  const [c1, c2] = hueOf(name);
  const first = (Array.from(name.trim())[0] || "?").toUpperCase();
  const body = p && p.avatar ? `<img src="${p.avatar}" alt="" loading="lazy">` : `<b>${esc(first)}</b>`;
  return `<span class="av" style="--s:${size}px;--c1:${c1};--c2:${c2}">${body}</span>`;
}
const iconAvatar = (name, size = 40) => `<span class="av ic-av" style="--s:${size}px">${ico(name)}</span>`;

/* Rasmni kvadrat qilib kesib, 256px JPEG ga aylantiradi (localStorage tejash uchun) */
function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error("Faqat rasm fayli tanlang."));
    if (file.size > 12 * 1024 * 1024) return reject(new Error("Rasm hajmi 12 MB dan oshmasligi kerak."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = size;
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Rasmni o'qib bo'lmadi.")); };
    img.src = url;
  });
}

/* ==========================================================
   3. HOLAT (STATE) VA SAQLASH
   ========================================================== */
function defaultState() {
  return {
    app: "MoneyTrack",
    version: 1,
    profile: { name: "", avatar: "", city: "Toshkent" },
    settings: {
      theme: "dark",
      base: "UZS",
      view: "ALL",
      rates: { USD: DEFAULT_RATES.USD, KGS: DEFAULT_RATES.KGS, date: todayISO() },
      initial: { UZS: 0, USD: 0, KGS: 0 },
    },
    meta: { lastBackup: "" },
    people: [],
    transactions: [],
  };
}

const IMG_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const cleanAvatar = (v) => (typeof v === "string" && v.length < 700000 && IMG_RE.test(v) ? v : "");

/* Yuklangan yoki import qilingan ma'lumotni qattiq tekshiradi va tozalaydi */
function validateData(o) {
  const errors = [];
  const err = (m) => { if (errors.length < 6) errors.push(m); };
  if (!o || typeof o !== "object" || Array.isArray(o)) return { ok: false, errors: ["Fayl mazmuni noto'g'ri (obyekt kutilgan)."] };
  if (!Array.isArray(o.people) || !Array.isArray(o.transactions)) return { ok: false, errors: ["Faylda «people» va «transactions» ro'yxatlari bo'lishi kerak."] };

  const d = defaultState();
  const pr = o.profile && typeof o.profile === "object" ? o.profile : {};
  d.profile = { name: clip(pr.name, 60), avatar: cleanAvatar(pr.avatar), city: CITIES[pr.city] ? pr.city : "Toshkent" };

  const st = o.settings && typeof o.settings === "object" ? o.settings : {};
  d.settings.theme = st.theme === "light" ? "light" : "dark";
  d.settings.base = CUR[st.base] ? st.base : "UZS";
  d.settings.view = st.view === "ALL" || CUR[st.view] ? st.view : "ALL";
  const rt = st.rates && typeof st.rates === "object" ? st.rates : {};
  for (const c of ["USD", "KGS"]) d.settings.rates[c] = parseRateScaled(rt[c]) > 0 ? String(rt[c]).trim() : DEFAULT_RATES[c];
  d.settings.rates.date = isValidISO(rt.date) ? rt.date : todayISO();
  const ini = st.initial && typeof st.initial === "object" ? st.initial : {};
  for (const c of CUR_LIST) d.settings.initial[c] = Number.isSafeInteger(ini[c]) && ini[c] >= 0 && ini[c] < 1e14 ? ini[c] : 0;
  const mt = o.meta && typeof o.meta === "object" ? o.meta : {};
  d.meta.lastBackup = typeof mt.lastBackup === "string" && !isNaN(Date.parse(mt.lastBackup)) ? mt.lastBackup : "";

  const pids = new Set();
  o.people.forEach((p, i) => {
    if (!p || typeof p !== "object") return err(`Inson #${i + 1}: yozuv noto'g'ri.`);
    const id = clip(String(p.id == null ? "" : p.id), 64), name = clip(p.name, 60);
    if (!id || pids.has(id)) return err(`Inson #${i + 1}: ID yo'q yoki takrorlangan.`);
    if (!name) return err(`Inson #${i + 1}: ism bo'sh.`);
    pids.add(id);
    d.people.push({ id, name, note: clip(p.note, 80), avatar: cleanAvatar(p.avatar), createdAt: clip(p.createdAt, 40) || new Date().toISOString() });
  });

  const tids = new Set();
  o.transactions.forEach((t, i) => {
    const n = `Operatsiya #${i + 1}`;
    if (!t || typeof t !== "object") return err(`${n}: yozuv noto'g'ri.`);
    const id = clip(String(t.id == null ? "" : t.id), 64);
    if (!id || tids.has(id)) return err(`${n}: ID yo'q yoki takrorlangan.`);
    if (!TYPES[t.type]) return err(`${n}: tur noto'g'ri.`);
    if (!CUR[t.currency]) return err(`${n}: valyuta noto'g'ri.`);
    if (!Number.isSafeInteger(t.amount) || t.amount <= 0 || t.amount > 1e14) return err(`${n}: summa noto'g'ri.`);
    if (!isValidISO(t.date)) return err(`${n}: sana noto'g'ri.`);
    let kind = "";
    if (t.type !== "expense") {
      kind = KINDS[t.type].some((k) => k[0] === t.kind) ? t.kind : null;
      if (kind === null) return err(`${n}: maqsad (kind) noto'g'ri.`);
    }
    let personId = null;
    if (t.personId != null && t.personId !== "") {
      personId = String(t.personId);
      if (!pids.has(personId)) return err(`${n}: bog'langan inson topilmadi.`);
    }
    if (t.type !== "expense" && !personId) return err(`${n}: inson ko'rsatilmagan.`);
    tids.add(id);
    d.transactions.push({
      id, type: t.type, kind, amount: t.amount, currency: t.currency, personId,
      reason: clip(t.reason, 120),
      category: t.type === "expense" ? (CATEGORIES.some((c) => c.id === t.category) ? t.category : "other") : "",
      date: t.date, time: /^\d{2}:\d{2}$/.test(t.time || "") ? t.time : "",
      note: clip(t.note, 500), createdAt: clip(t.createdAt, 40) || new Date().toISOString(),
    });
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: d, errors: [] };
}

let storageOK = true;
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const res = validateData(JSON.parse(raw));
    if (res.ok) return res.data;
    // Buzilgan ma'lumotni yo'qotmaslik uchun nusxasini saqlab qo'yamiz
    try { localStorage.setItem(STORAGE_KEY + ".corrupt", raw); } catch (e) { /* e'tiborsiz */ }
    setTimeout(() => toast("Saqlangan ma'lumotda xato topildi. Nusxasi alohida saqlab qo'yildi.", "err"), 600);
    return defaultState();
  } catch (e) {
    storageOK = false;
    return defaultState();
  }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageOK = true;
  } catch (e) {
    storageOK = false;
    toast("Ma'lumotni brauzerga saqlab bo'lmadi (xotira to'lgan yoki yopiq rejim). JSON zaxira oling!", "err");
  }
}

let state = loadState();
let pIndex = new Map();
const reindex = () => { pIndex = new Map(state.people.map((p) => [p.id, p])); };
reindex();

/* Interfeys holati (saqlanmaydi) */
const ui = {
  page: "dashboard", personId: null,
  from: "", to: "", period: "month",
  q: "", f: { person: "", currency: "", type: "", from: "", to: "", sort: "new" },
  txLimit: 25, peopleQ: "", peopleSort: "recent", filtersOpen: false,
  weather: null, animate: false,
};

/* ==========================================================
   4. HISOB-KITOB
   ========================================================== */
const view = () => state.settings.view;
const dispCur = () => (view() === "ALL" ? state.settings.base : view());
const inView = (t) => view() === "ALL" || t.currency === view();
const inRange = (t) => (!ui.from || t.date >= ui.from) && (!ui.to || t.date <= ui.to);
const val = (t) => (view() === "ALL" ? convert(t.amount, t.currency, state.settings.base) : t.amount);
const conv = (m, cur) => (view() === "ALL" ? convert(m, cur, state.settings.base) : m);
const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
const sortKey = (t) => `${t.date}T${t.time || "00:00"}|${t.createdAt}`;
const rangeTx = () => state.transactions.filter((t) => inView(t) && inRange(t));

/* Qarz hisobi: musbat = inson menga qarzdor; manfiy = men insonga qarzdorman */
function debtDelta(t) {
  if (!t.personId) return 0;
  if (t.type === "gave" && (t.kind === "loan" || t.kind === "repay")) return t.amount;
  if (t.type === "received" && (t.kind === "repay" || t.kind === "borrow")) return -t.amount;
  return 0;
}

function totals(txs) {
  const T = { gave: 0, received: 0, expense: 0, repaid: 0, nGave: 0, nReceived: 0, nExpense: 0 };
  for (const t of txs) {
    const v = val(t);
    if (t.type === "gave") { T.gave += v; T.nGave++; }
    else if (t.type === "received") { T.received += v; T.nReceived++; if (t.kind === "repay") T.repaid += v; }
    else { T.expense += v; T.nExpense++; }
  }
  return T;
}

/* Joriy qarz qoldig'i (har bir inson + valyuta alohida, keyin jamlanadi) */
function debtSummary(asOf) {
  const m = new Map();
  for (const t of state.transactions) {
    if (asOf && t.date > asOf) continue;
    if (!inView(t)) continue;
    const d = debtDelta(t);
    if (!d) continue;
    const k = t.currency + t.personId;
    m.set(k, (m.get(k) || 0) + d);
  }
  let owed = 0, iOwe = 0;
  for (const [k, b] of m) {
    const v = conv(Math.abs(b), k.slice(0, 3));
    if (b > 0) owed += v; else if (b < 0) iOwe += v;
  }
  return { owed, iOwe };
}

/* Alohida valyutalar bo'yicha balans — hech qachon aralashtirilmaydi */
function balances() {
  const out = {};
  for (const c of CUR_LIST) out[c] = { init: state.settings.initial[c] || 0, in: 0, out: 0, monthNet: 0, bal: 0 };
  const [ms] = monthRange(0);
  for (const t of state.transactions) {
    const o = out[t.currency];
    const s = t.type === "received" ? 1 : -1;
    if (s > 0) o.in += t.amount; else o.out += t.amount;
    if (t.date >= ms) o.monthNet += s * t.amount;
  }
  for (const c of CUR_LIST) out[c].bal = out[c].init + out[c].in - out[c].out;
  return out;
}

/* Bitta inson uchun valyutalar bo'yicha yig'indilar */
function personSums(pid, txs = state.transactions) {
  const by = {};
  let count = 0, last = "";
  for (const t of txs) {
    if (t.personId !== pid) continue;
    count++;
    const k = sortKey(t);
    if (k > last) last = k;
    const o = by[t.currency] || (by[t.currency] = { gave: 0, received: 0, repaid: 0, expense: 0, bal: 0 });
    if (t.type === "gave") o.gave += t.amount;
    else if (t.type === "received") { o.received += t.amount; if (t.kind === "repay") o.repaid += t.amount; }
    else o.expense += t.amount;
    o.bal += debtDelta(t);
  }
  return { by, count, last };
}
/* {UZS: 100, USD: 50} -> "100 so'm · 50 $" */
function curText(map, cls = "") {
  const parts = CUR_LIST.filter((c) => map[c] > 0).map((c) => fmtMoney(map[c], c));
  return parts.length ? `<span class="${cls}">${parts.join(" · ")}</span>` : "—";
}
function personAgg(pid) {
  const { by, count, last } = personSums(pid);
  const r = { gave: {}, received: {}, repaid: {}, owed: {}, iOwe: {}, count, last };
  for (const c of Object.keys(by)) {
    r.gave[c] = by[c].gave; r.received[c] = by[c].received; r.repaid[c] = by[c].repaid;
    if (by[c].bal > 0) r.owed[c] = by[c].bal;
    if (by[c].bal < 0) r.iOwe[c] = -by[c].bal;
  }
  return r;
}

/* Grafik uchun davrlar */
function buildBuckets(period) {
  const now = new Date(), list = [];
  if (period === "day") {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      list.push({ key: toISO(d), label: pad(d.getDate()) + "." + pad(d.getMonth() + 1), title: fmtDate(toISO(d)) });
    }
  } else if (period === "week") {
    const m = parseISO(weekStart(todayISO()));
    for (let i = 11; i >= 0; i--) {
      const d = new Date(m.getFullYear(), m.getMonth(), m.getDate() - i * 7);
      const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6);
      list.push({ key: toISO(d), label: pad(d.getDate()) + "." + pad(d.getMonth() + 1), title: `${fmtDate(toISO(d))} – ${fmtDate(toISO(e))}` });
    }
  } else if (period === "month") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({ key: d.getFullYear() + "-" + pad(d.getMonth() + 1), label: MONTHS_SHORT[d.getMonth()], title: `${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}` });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const y = String(now.getFullYear() - i);
      list.push({ key: y, label: y, title: y + "-yil" });
    }
  }
  for (const b of list) { b.received = 0; b.gave = 0; b.expense = 0; }
  const idx = new Map(list.map((b, i) => [b.key, i]));
  const keyOf = (ds) => (period === "day" ? ds : period === "week" ? weekStart(ds) : period === "month" ? ds.slice(0, 7) : ds.slice(0, 4));
  for (const t of state.transactions) {
    if (!inView(t)) continue;
    const i = idx.get(keyOf(t.date));
    if (i !== undefined) list[i][t.type] += val(t);
  }
  return list;
}

function monthSum(type, offset) {
  const [a, b] = monthRange(offset);
  let s = 0;
  for (const t of state.transactions) if (t.type === type && inView(t) && t.date >= a && t.date <= b) s += val(t);
  return s;
}
function trendOf(now, prev) {
  if (!now && !prev) return null;
  if (!prev) return { text: "yangi", dir: "up" };
  const pct = Math.round(((now - prev) / prev) * 100);
  return { text: Math.abs(pct) + "%", dir: pct >= 0 ? "up" : "down" };
}

function topPeople(limit = 5) {
  const m = new Map();
  for (const t of rangeTx()) {
    if (!t.personId) continue;
    const o = m.get(t.personId) || { gave: 0, count: 0 };
    o.count++;
    if (t.type === "gave") o.gave += val(t);
    m.set(t.personId, o);
  }
  return [...m].map(([id, o]) => ({ p: pIndex.get(id), ...o })).filter((x) => x.p && x.gave > 0).sort((a, b) => b.gave - a.gave).slice(0, limit);
}

function categoryTotals() {
  const m = new Map();
  let total = 0;
  for (const t of rangeTx()) {
    if (t.type !== "expense") continue;
    const v = val(t);
    const k = t.category || "other";
    m.set(k, (m.get(k) || 0) + v);
    total += v;
  }
  const all = [...m].map(([id, value]) => ({ id, name: catOf(id).name, color: catOf(id).color, value })).sort((a, b) => b.value - a.value);
  const main = all.filter((x) => x.id !== "other").slice(0, 4);
  const rest = all.filter((x) => !main.includes(x));
  const items = main.slice();
  if (rest.length) items.push({ id: "other", name: "Boshqa", color: catOf("other").color, value: rest.reduce((s, x) => s + x.value, 0) });
  return { items, total, all };
}
function topExpenseDay() {
  const m = new Map();
  for (const t of rangeTx()) if (t.type === "expense") m.set(t.date, (m.get(t.date) || 0) + val(t));
  let best = null;
  for (const [d, v] of m) if (!best || v > best.v) best = { d, v };
  return best;
}
/* Qarz qoldig'i ro'yxati (inson + valyuta) */
function debtRows() {
  const m = new Map();
  for (const t of state.transactions) {
    const d = debtDelta(t);
    if (!d || !inView(t)) continue;
    const k = t.currency + "|" + t.personId;
    m.set(k, (m.get(k) || 0) + d);
  }
  return [...m].map(([k, bal]) => { const [cur, pid] = [k.slice(0, 3), k.slice(4)]; return { cur, p: pIndex.get(pid), bal }; })
    .filter((r) => r.p && r.bal !== 0).sort((a, b) => Math.abs(conv(b.bal, b.cur)) - Math.abs(conv(a.bal, a.cur)));
}
function personLabel(p) {
  const same = state.people.filter((x) => x.name.toLowerCase() === p.name.toLowerCase());
  let s = p.name;
  if (p.note) s += ` — ${p.note}`;
  else if (same.length > 1) s += ` #${same.indexOf(p) + 1}`;
  return s;
}

/* ==========================================================
   5. INTERFEYS YORDAMCHILARI: xabar, oyna, tasdiqlash
   ========================================================== */
function toast(msg, type = "ok") {
  const root = $("#toastRoot");
  const el = document.createElement("div");
  el.className = "toast" + (type === "err" ? " err" : "");
  el.setAttribute("role", type === "err" ? "alert" : "status");
  el.innerHTML = `${ico(type === "err" ? "alert" : "check")}<span>${esc(msg)}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 260); }, type === "err" ? 5500 : 2800);
}

const modalStack = [];
function openModal(html, { cls = "", lock = false, onClose } = {}) {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  $("#modalRoot").appendChild(back);
  document.body.classList.add("modal-open");
  let closed = false;
  const m = {
    el: back, box: back.firstElementChild,
    close() {
      if (closed) return;
      closed = true;
      const i = modalStack.indexOf(m);
      if (i >= 0) modalStack.splice(i, 1);
      back.classList.remove("show");
      setTimeout(() => back.remove(), 200);
      if (!modalStack.length) document.body.classList.remove("modal-open");
      if (onClose) onClose();
    },
  };
  if (!lock) back.addEventListener("mousedown", (e) => { if (e.target === back) m.close(); });
  back.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) m.close(); });
  modalStack.push(m);
  requestAnimationFrame(() => back.classList.add("show"));
  setTimeout(() => { const f = m.box.querySelector("[autofocus], input:not([type=hidden]):not([type=radio]):not([type=file]), select, textarea"); if (f) f.focus(); }, 80);
  return m;
}
function confirmDialog({ title, text, ok = "Ha", cancel = "Bekor qilish", danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    const m = openModal(
      `<h3>${esc(title)}</h3><p style="margin-top:8px">${text}</p>
       <div class="modal-actions"><button class="btn ghost" data-close>${esc(cancel)}</button><button class="btn ${danger ? "danger" : ""}" id="cfOk">${esc(ok)}</button></div>`,
      { onClose: () => resolve(answer) }
    );
    $("#cfOk", m.box).addEventListener("click", () => { answer = true; m.close(); });
    $("#cfOk", m.box).focus();
  });
}

/* ==========================================================
   6. IKONA/RASM KOMPONENTLARI
   ========================================================== */
function flag(cur, cls = "") {
  const svg = {
    UZS: `<rect width="48" height="48" fill="#fff"/><rect width="48" height="15.5" fill="#1eb5e8"/><rect y="32.5" width="48" height="15.5" fill="#1eb53a"/><rect y="15.5" width="48" height="1.6" fill="#ce1126"/><rect y="30.9" width="48" height="1.6" fill="#ce1126"/><circle cx="14" cy="8" r="4.6" fill="#fff"/><circle cx="15.8" cy="8" r="4" fill="#1eb5e8"/><circle cx="22" cy="5" r="1" fill="#fff"/><circle cx="26" cy="8" r="1" fill="#fff"/><circle cx="22" cy="11" r="1" fill="#fff"/><circle cx="30" cy="5" r="1" fill="#fff"/><circle cx="30" cy="11" r="1" fill="#fff"/>`,
    USD: `<rect width="48" height="48" fill="#fff"/>${Array.from({ length: 7 }, (_, i) => `<rect y="${i * 2 * 3.693}" width="48" height="3.693" fill="#b22234"/>`).join("")}<rect width="25" height="25.9" fill="#3c3b6e"/>${[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `<circle cx="${5 + c * 7.5}" cy="${5.5 + r * 7.5}" r="1.5" fill="#fff"/>`)).join("")}`,
    KGS: `<rect width="48" height="48" fill="#e8112d"/><circle cx="24" cy="24" r="12" fill="#ffd400"/><circle cx="24" cy="24" r="6.5" fill="#e8112d"/><circle cx="24" cy="24" r="15" fill="none" stroke="#ffd400" stroke-width="3.2" stroke-dasharray="1.5 2.4"/>`,
  }[cur];
  return `<span class="flag ${cls}"><svg viewBox="0 0 48 48" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-label="${cur}">${svg}</svg></span>`;
}

function heroArt() {
  const trees = Array.from({ length: 34 }, (_, i) => {
    const x = 250 + i * 14 + (i % 3) * 5, h = 24 + ((i * 7) % 20);
    return `M${x} 158 L${x + 7} ${158 - h} L${x + 14} 158Z`;
  }).join("");
  return `<svg class="hero-art" viewBox="0 0 720 220" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="hg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a60"/><stop offset=".42" stop-color="#6a4f94"/><stop offset=".78" stop-color="#f19170"/><stop offset="1" stop-color="#ffd08c"/></linearGradient>
      <linearGradient id="hg-mtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9dcf4"/><stop offset=".3" stop-color="#8d86bd"/><stop offset="1" stop-color="#2b3568"/></linearGradient>
      <linearGradient id="hg-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d89a7c"/><stop offset=".45" stop-color="#46588c"/><stop offset="1" stop-color="#131f46"/></linearGradient>
      <radialGradient id="hg-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe6b0" stop-opacity=".95"/><stop offset="1" stop-color="#ffb066" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="720" height="158" fill="url(#hg-sky)"/>
    <circle cx="560" cy="124" r="80" fill="url(#hg-sun)"/>
    <g fill="#fff" opacity=".5"><circle cx="330" cy="30" r="1"/><circle cx="410" cy="18" r="1.2"/><circle cx="470" cy="44" r=".9"/><circle cx="640" cy="22" r="1.1"/><circle cx="690" cy="52" r=".8"/></g>
    <path d="M300 158 L370 104 L412 126 L462 76 L496 98 L552 52 L596 82 L650 62 L720 108 L720 158Z" fill="#40407f" opacity=".8"/>
    <path d="M420 158 L505 78 L545 22 L566 50 L586 36 L640 104 L690 158Z" fill="url(#hg-mtn)"/>
    <path d="M545 22 L560 54 L548 48 L540 60 L528 46 L520 56 L534 38Z" fill="#fff6ee" opacity=".9"/>
    <path d="M586 36 L598 60 L588 54 L580 64 L576 52Z" fill="#fff6ee" opacity=".75"/>
    <path d="M250 158 L330 118 L392 146 L450 112 L520 158Z" fill="#1f2a5a"/>
    <path d="${trees}" fill="#0c1634"/>
    <rect y="158" width="720" height="62" fill="url(#hg-lake)"/>
    <g transform="translate(0,316) scale(1,-1)" opacity=".28"><path d="M420 158 L505 78 L545 22 L566 50 L586 36 L640 104 L690 158Z" fill="#c9bfe6"/></g>
    <g stroke="#fff" stroke-opacity=".16" stroke-width="1.2" fill="none"><path d="M330 176h120M470 188h160M380 200h90M560 172h110"/></g>
    <path d="${trees}" fill="#0a122b" transform="translate(0,2)"/>
  </svg>`;
}

const panel = (title, icon, body, right = "", cls = "") =>
  `<section class="panel ${cls}"><header class="ph"><span class="ph-ic">${ico(icon)}</span><h3>${title}</h3>${right ? `<div class="ph-r">${right}</div>` : ""}</header>${body}</section>`;
const empty = (icon, title, text, btn = "", cls = "") =>
  `<div class="empty ${cls}"><div class="empty-ic">${ico(icon)}</div><b>${title}</b><p>${text}</p>${btn}</div>`;

/* ==========================================================
   7. GRAFIKLAR (SVG, kutubxonasiz)
   ========================================================== */
function niceScale(max) {
  if (max <= 0) return { top: 4, step: 1 };
  const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { top: step * 4, step };
}
function smoothPath(pts) {
  const n = pts.length;
  if (!n) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const dx = [], m = [], t = new Array(n);
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1].x - pts[i].x; m[i] = (pts[i + 1].y - pts[i].y) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

function drawChart(el) {
  const H = +el.dataset.h || 240;
  const W = Math.max(280, Math.floor(el.clientWidth));
  const buckets = buildBuckets(ui.period);
  const cur = dispCur();
  const n = buckets.length;
  const max = Math.max(0, ...buckets.flatMap((b) => SERIES.map((s) => b[s[0]])));
  const { top, step } = niceScale(max / 100);
  const pl = 44, pr = 14, pt = 12, pb = 28, w = W - pl - pr, h = H - pt - pb;
  const X = (i) => pl + (n === 1 ? w / 2 : (i * w) / (n - 1));
  const Y = (v) => pt + h - (v / 100 / top) * h;
  const id = el.id;

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Pul harakati grafigi"><defs>`;
  for (const s of SERIES) svg += `<linearGradient id="${id}-${s[0]}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s[2]}" stop-opacity=".28"/><stop offset="1" stop-color="${s[2]}" stop-opacity="0"/></linearGradient>`;
  svg += `</defs>`;
  for (let i = 0; i <= 4; i++) {
    const y = pt + h - (i * h) / 4;
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="var(--grid-line)" stroke-dasharray="${i ? "3 5" : "0"}"/>`;
    svg += `<text x="${pl - 10}" y="${y + 4}" text-anchor="end">${compact(Math.round(i * step * 100))}</text>`;
  }
  const every = Math.max(1, Math.ceil((n * 46) / w));
  buckets.forEach((b, i) => { if (i % every === 0 || i === n - 1 && every === 1) svg += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${b.label}</text>`; });
  for (const s of SERIES) {
    const pts = buckets.map((b, i) => ({ x: X(i), y: Y(b[s[0]]) }));
    const line = smoothPath(pts);
    if (n > 1) svg += `<path d="${line} L${X(n - 1)},${pt + h} L${X(0)},${pt + h}Z" fill="url(#${id}-${s[0]})"/>`;
    svg += `<path d="${line}" fill="none" stroke="${s[2]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    pts.forEach((p, i) => { if (buckets[i][s[0]] > 0 || n <= 6) svg += `<circle cx="${p.x}" cy="${p.y}" r="3.2" fill="var(--bg)" stroke="${s[2]}" stroke-width="2"/>`; });
  }
  svg += `<g class="hv" style="display:none"><line y1="${pt}" y2="${pt + h}" stroke="var(--stroke-2)" stroke-width="1.5"/>${SERIES.map((s) => `<circle r="5.5" fill="${s[2]}" stroke="var(--bg)" stroke-width="2"/>`).join("")}</g>`;
  if (max === 0) svg += `<text x="${pl + w / 2}" y="${pt + h / 2}" text-anchor="middle" style="font-size:13px">Bu davrda ma'lumot yo'q</text>`;
  svg += `</svg><div class="chart-tip"></div>`;
  el.innerHTML = svg;

  const hv = $(".hv", el), tip = $(".chart-tip", el), dots = $$("circle", hv), vline = $("line", hv);
  const show = (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const i = Math.max(0, Math.min(n - 1, n === 1 ? 0 : Math.round(((x - pl) / w) * (n - 1))));
    const b = buckets[i], cx = X(i);
    hv.style.display = "";
    vline.setAttribute("x1", cx); vline.setAttribute("x2", cx);
    SERIES.forEach((s, k) => { dots[k].setAttribute("cx", cx); dots[k].setAttribute("cy", Y(b[s[0]])); });
    tip.innerHTML = `<b>${esc(b.title)}</b>` + SERIES.map((s) => `<div style="--c:${s[2]}"><i></i>${s[1]}<span>${fmtMoney(b[s[0]], cur)}</span></div>`).join("");
    tip.style.left = Math.max(4, Math.min(W - 176, cx + 14 > W - 176 ? cx - 184 : cx + 14)) + "px";
    tip.style.opacity = 1;
  };
  const hide = () => { hv.style.display = "none"; tip.style.opacity = 0; };
  el.onpointermove = show; el.onpointerleave = hide; el.onpointerdown = show;
}
function drawCharts() { $$("[data-chart]").forEach(drawChart); }

function donutSVG(items, total) {
  const r = 58, sw = 22, gap = items.length > 1 ? 1 : 0;
  let off = 0, out = `<svg viewBox="0 0 150 150" role="img" aria-label="Xarajatlar taqsimoti"><circle cx="75" cy="75" r="${r}" fill="none" stroke="var(--field-h)" stroke-width="${sw}"/>`;
  for (const it of items) {
    const pct = (it.value / total) * 100;
    out += `<circle cx="75" cy="75" r="${r}" fill="none" stroke="${it.color}" stroke-width="${sw}" pathLength="100" stroke-dasharray="${Math.max(pct - gap, 0.2)} ${100 - Math.max(pct - gap, 0.2)}" stroke-dashoffset="${-off}" transform="rotate(-90 75 75)"/>`;
    off += pct;
  }
  return out + "</svg>";
}

/* ==========================================================
   8. BOSH SAHIFA
   ========================================================== */
const WEATHER_ICONS = (c) => (c === 0 ? "☀️" : c <= 2 ? "🌤️" : c === 3 ? "☁️" : c <= 48 ? "🌫️" : c <= 67 ? "🌧️" : c <= 77 ? "❄️" : c <= 82 ? "🌦️" : "⛈️");
function weatherHTML() {
  const w = ui.weather;
  const city = state.profile.city;
  return `<div class="weather" id="weather"${w ? "" : " hidden"}><span class="w-ic">${w ? WEATHER_ICONS(w.code) : "🌤️"}</span><div><b>${w ? (w.temp > 0 ? "+" : "") + Math.round(w.temp) + "°C" : "—°C"}</b><small>${ico("pin")}${esc(city)}</small></div></div>`;
}
function heroHTML() {
  const d = new Date();
  const name = state.profile.name || "Foydalanuvchi";
  return `<section class="panel hero">${heroArt()}
    <div class="hero-in">
      <button class="hero-av" data-act="change-avatar" aria-label="Rasmni o'zgartirish">${avatar({ name, avatar: state.profile.avatar }, 100)}<span class="cam">${ico("camera")}</span></button>
      <div>
        <h1>Salom, ${esc(name)}!</h1>
        <p>Bugungi moliyaviy holatingizni kuzatib boring.</p>
        <div class="hero-date">${ico("calendar", "sm")}<span>${d.getDate()}-${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${WEEKDAYS[d.getDay()]}</span></div>
      </div>
      ${weatherHTML()}
    </div></section>`;
}

function toolbarHTML() {
  const v = view();
  const seg = [["ALL", "Hammasi"], ...CUR_LIST.map((c) => [c, c])]
    .map(([k, l]) => `<button class="${v === k ? "on" : ""}" data-act="view" data-v="${k}" role="tab" aria-selected="${v === k}">${l}</button>`).join("");
  const r = state.settings.rates;
  const note = v === "ALL"
    ? `<p class="tool-note">${ico("alert", "sm")}<span>Hammasi ${esc(CUR[state.settings.base].code)} ga aylantirilgan · 1 $ = ${esc(fmtRate(r.USD))}, 1 KGS = ${esc(fmtRate(r.KGS))} so'm · kurs sanasi ${fmtDate(r.date)}</span></p>` : "";
  return `<section class="panel toolbar" aria-label="Filtrlar">
    <span class="lbl">Valyuta</span><div class="seg" role="tablist" aria-label="Valyuta ko'rinishi">${seg}</div>
    <div class="range"><div class="dates">${ico("calendar", "sm")}
      <input type="date" id="rangeFrom" value="${ui.from}" aria-label="Boshlanish sanasi"><span class="muted sep">—</span>
      <input type="date" id="rangeTo" value="${ui.to}" aria-label="Tugash sanasi"></div>
      <div class="chips">
      <button class="chip" data-act="range" data-v="month">Bu oy</button>
      <button class="chip" data-act="range" data-v="30">30 kun</button>
      <button class="chip" data-act="range" data-v="year">Bu yil</button>
      ${ui.from || ui.to ? `<button class="chip" data-act="range" data-v="clear">${ico("x", "sm")} Tozalash</button>` : ""}</div>
    </div>${note}</section>`;
}
function fmtRate(str) {
  const s = parseRateScaled(str), w = Math.floor(s / 10000), f = s % 10000;
  return group(w) + (f ? "," + String(f).padStart(4, "0").replace(/0+$/, "") : "");
}

function statsHTML() {
  const cur = dispCur(), T = totals(rangeTx()), debt = debtSummary();
  const debtPrev = debtSummary(monthRange(-1)[1]).owed;
  const cards = [
    { cls: "green", icon: "wallet", title: "Jami olingan", val: T.received, sub: `${T.nReceived} ta operatsiya`, tr: trendOf(monthSum("received", 0), monthSum("received", -1)) },
    { cls: "red", icon: "send", title: "Jami berilgan", val: T.gave, sub: `${T.nGave} ta operatsiya`, tr: trendOf(monthSum("gave", 0), monthSum("gave", -1)) },
    { cls: "orange", icon: "cart", title: "Jami xarajatlar", val: T.expense, sub: `${T.nExpense} ta operatsiya`, tr: trendOf(monthSum("expense", 0), monthSum("expense", -1)) },
    { cls: "purple", icon: "ledger", title: "Qarzlar", small: "(qaytarilishi kerak)", val: debt.owed,
      sub: `Qaytarilgan: ${fmtMoney(T.repaid, cur)}` + (debt.iOwe ? `<br>Men qaytaraman: ${fmtMoney(debt.iOwe, cur)}` : ""), tr: trendOf(debt.owed, debtPrev) },
  ];
  return `<div class="stats">${cards.map((c) => `
    <article class="panel stat ${c.cls}">
      <div class="stat-top"><span class="stat-ic">${ico(c.icon)}</span><div class="stat-title">${c.title}${c.small ? `<small>${c.small}</small>` : ""}</div></div>
      <div class="stat-val" data-count="${c.val}" data-cur="${cur}">${moneyHTML(c.val, cur)}</div>
      <div class="stat-sub">${c.sub}</div>
      <div class="stat-trend">${c.tr ? `<span class="tr">${ico(c.tr.dir === "up" ? "up" : "dn")}${c.tr.text}</span> o'tgan oyga nisbatan` : "O'tgan oyga nisbatan o'zgarish yo'q"}</div>
    </article>`).join("")}</div>`;
}

function chartPanel(id, h) {
  const titles = { day: "Kunlik", week: "Haftalik", month: "Oylik", year: "Yillik" };
  const tabs = `<div class="seg" role="tablist" aria-label="Davr">${[["day", "Kun"], ["week", "Hafta"], ["month", "Oy"], ["year", "Yil"]]
    .map(([v, l]) => `<button class="${ui.period === v ? "on" : ""}" data-act="period" data-v="${v}" role="tab" aria-selected="${ui.period === v}">${l}</button>`).join("")}</div>`;
  const legend = `<div class="legend">${SERIES.map((s) => `<span><i style="--c:${s[2]}"></i>${s[1]}</span>`).join("")}</div>`;
  return panel(`${titles[ui.period]} statistika`, "chart", legend + `<div class="chart" id="${id}" data-chart data-h="${h}"></div>`, tabs);
}

function balancePanel() {
  const b = balances();
  const sumPos = CUR_LIST.reduce((s, c) => s + Math.max(convert(b[c].bal, c, state.settings.base), 0), 0);
  const rows = CUR_LIST.map((c) => {
    const o = b[c];
    const share = sumPos ? Math.round((Math.max(convert(o.bal, c, state.settings.base), 0) / sumPos) * 100) : 0;
    const mn = o.monthNet;
    const em = mn === 0 ? `<em class="muted">bu oy: 0</em>` : `<em class="${mn > 0 ? "pos" : "neg"}">${ico(mn > 0 ? "up" : "dn")}${compact(mn)}</em>`;
    return `<div class="bal-row">${flag(c)}<div class="bal-head"><b>${c}</b><span class="${o.bal < 0 ? "neg" : ""}">${fmtMoney(o.bal, c)}</span>${em}</div>
      <div class="bar" style="--w:0%;--b1:${CUR_COLORS[c][0]};--b2:${CUR_COLORS[c][1]}" data-w="${share}%"><i></i></div></div>`;
  }).join("");
  return panel("Valyutalar bo'yicha balans", "coin", `<div class="bal">${rows}</div>`, `<a class="chip" href="#/currencies">Batafsil</a>`);
}

function rankBadge(i) { return `<i class="rank ${i <= 3 ? "r" + i : ""}">${i}</i>`; }
function topPeoplePanel() {
  const list = topPeople(5), cur = dispCur(), max = list[0] ? list[0].gave : 1;
  const colors = [["#ffae2e", "#ffd36b"], ["#8e6dff", "#b9a4ff"], ["#35c3ff", "#7ee0ff"]];
  const body = list.length
    ? `<div class="list">${list.map((x, i) => {
        const c = colors[Math.min(i, 2)];
        return `<a class="li" href="#/people/${encodeURIComponent(x.p.id)}">${rankBadge(i + 1)}${avatar(x.p, 38)}
          <div class="li-body"><div class="li-top"><b>${esc(x.p.name)}</b><span>${fmtMoney(x.gave, cur)}</span></div>
          <div class="mini-bar" style="--w:0%;--b1:${c[0]};--b2:${c[1]}" data-w="${Math.max(6, Math.round((x.gave / max) * 100))}%"><i></i></div>
          <div class="li-sub"><span class="r">${x.count} operatsiya</span></div></div></a>`;
      }).join("")}</div>`
    : empty("users", "Hali ma'lumot yo'q", "Birovga pul bergan zahoti, bu yerda eng ko'p berilganlar chiqadi.", "", "compact");
  return panel("Eng ko'p pul berilgan insonlar", "users", body);
}

function categoryPanel(full = false) {
  const { items, total, all } = categoryTotals(), cur = dispCur();
  if (!total) return panel("Xarajatlar bo'yicha taqsimot", "chart", empty("cart", "Xarajat yo'q", "Xarajat qo'shsangiz, yo'nalishlar bo'yicha diagramma shu yerda chiqadi.", "", "compact"));
  const legendItems = full ? all : items;
  const legend = legendItems.map((it) => `<div style="--c:${it.color}"><i></i>${esc(it.name)}<b>${full ? fmtMoney(it.value, cur) + " · " : ""}${Math.round((it.value / total) * 100)}%</b></div>`).join("");
  const day = topExpenseDay();
  const hi = day ? `<div class="highlight"><span class="hi-ic">${ico("calendar")}</span><div><b>Eng ko'p xarajat qilingan kun</b><span>${fmtLong(day.d)}</span></div><em>${fmtMoney(day.v, cur)}</em></div>` : "";
  return panel("Xarajatlar bo'yicha taqsimot", "chart",
    `<div class="donut-wrap"><div class="donut">${donutSVG(items, total)}<div class="donut-c"><b style="font-size:${fmtNum(total).length > 11 ? 11.5 : fmtNum(total).length > 8 ? 13.5 : 16}px">${fmtNum(total)}</b><small>${CUR[cur].sym}</small></div></div><div class="dl">${legend}</div></div>${hi}`);
}

function opRowHTML(t) {
  const p = pIndex.get(t.personId);
  const name = p ? p.name : catOf(t.category).name;
  const sign = t.type === "received" ? "+" : "−";
  const cls = t.type === "received" ? "pos" : t.type === "expense" ? "warn" : "neg";
  return `<div class="op">${p ? avatar(p, 40) : iconAvatar("cart", 40)}<div style="min-width:0"><b>${esc(name)}</b><small>${fmtDate(t.date)}${t.time ? " " + t.time : ""}</small></div>
    <div class="amt ${cls}"><span>${sign}${fmtMoney(t.amount, t.currency)}</span><span class="pill ${TYPES[t.type].cls}">${TYPES[t.type].short}</span></div></div>`;
}
function recentOpsPanel() {
  const list = state.transactions.filter(inView).sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1)).slice(0, 5);
  const body = list.length ? list.map(opRowHTML).join("")
    : empty("swap", "Operatsiya yo'q", "Birinchi pul harakatini qo'shing.", `<button class="btn sm" data-act="add-tx">${ico("plus", "sm")} Qo'shish</button>`, "compact");
  return panel("So'nggi operatsiyalar", "swap", body, `<a class="chip" href="#/transactions">Hammasi</a>`);
}

function recentPeoplePanel() {
  const list = state.people.map((p) => ({ p, a: personAgg(p.id) })).filter((x) => x.a.count).sort((a, b) => (a.a.last < b.a.last ? 1 : -1)).slice(0, 6);
  const body = list.length
    ? `<div class="hscroll">${list.map(({ p, a }) => `<a class="pmini" href="#/people/${encodeURIComponent(p.id)}">${avatar(p, 46)}<div style="min-width:0"><b>${esc(p.name)}</b><small>${curText(a.gave)}</small><small>${a.count} operatsiya</small></div></a>`).join("")}</div>`
    : empty("users", "Hali inson qo'shilmagan", "Operatsiya qo'shayotganda yangi inson yaratishingiz mumkin.", "", "compact");
  return panel("So'nggi insonlar", "users", body, `<a class="chip" href="#/people">Hammasi</a>`);
}

function ratesPanel() {
  const r = state.settings.rates;
  const cross = fmtMoney(convert(100, "USD", "KGS"), "KGS");
  return panel("Valyuta kurslari", "coin", `<div class="rates">
    <div class="rate"><div class="rate-h">${flag("USD", "sm")} USD</div><span class="rate-v">1 $ = ${fmtRate(r.USD)} so'm</span><small>Qo'lda kiritilgan</small></div>
    <div class="rate"><div class="rate-h">${flag("KGS", "sm")} KGS</div><span class="rate-v">1 KGS = ${fmtRate(r.KGS)} so'm</span><small>Qo'lda kiritilgan</small></div>
    <div class="rate"><div class="rate-h">${flag("USD", "sm")} USD → KGS</div><span class="rate-v">1 $ = ${cross}</span><small>Kurslardan hisoblandi</small></div></div>`,
    `<span class="ph-note">Kurs sanasi: ${fmtDate(r.date)}</span><a class="chip" href="#/currencies">O'zgartirish</a>`);
}

function profilePanel() {
  const name = state.profile.name || "Foydalanuvchi";
  return `<section class="panel pcard-me">
    <div class="me-top"><div class="cam-badge"><button data-act="change-avatar" aria-label="Rasmni o'zgartirish" style="border-radius:50%">${avatar({ name, avatar: state.profile.avatar }, 70)}<span class="cam">${ico("pencil")}</span></button></div>
      <div style="min-width:0"><b>${esc(name)}</b><small>Foydalanuvchi</small></div></div>
    <div class="menu-list">
      <button data-act="edit-profile">${ico("pencil")}<span>Profilni tahrirlash</span>${ico("right")}</button>
      <button data-act="change-avatar">${ico("image")}<span>Rasmini o'zgartirish</span>${ico("right")}</button>
      <a href="#/settings">${ico("settings")}<span>Sozlamalar</span>${ico("right")}</a>
    </div>
    <button class="btn ghost wide" data-act="export-json">${ico("download")} Zaxira nusxa olish</button></section>`;
}
function quickPanel() {
  const b = (cls, icon, label, extra) => `<button class="qa-btn ${cls}" data-act="add-tx" ${extra}><span class="qi">${ico(icon)}</span>${label}</button>`;
  return panel("Tez amal", "bolt", `<div class="qa">
    ${b("", "send", "Pul berish", `data-type="gave" data-kind="gift"`)}
    ${b("green", "download", "Pul olish", `data-type="received" data-kind="income"`)}
    ${b("orange", "cart", "Xarajat qo'shish", `data-type="expense"`)}
    ${b("purple", "ledger", "Qarz qo'shish", `data-type="gave" data-kind="loan"`)}
  </div>`);
}

function pageDashboard() {
  return `<div class="dash"><div class="dash-main">
      ${heroHTML()}${toolbarHTML()}${statsHTML()}
      <div class="row2">${chartPanel("chart-dash", 236)}${balancePanel()}</div>
      <div class="row3">${topPeoplePanel()}${categoryPanel()}${recentOpsPanel()}</div>
      <div class="row-b">${recentPeoplePanel()}${ratesPanel()}</div>
    </div><aside class="dash-side">${profilePanel()}${quickPanel()}</aside></div>`;
}

/* ==========================================================
   9. STATISTIKA SAHIFASI
   ========================================================== */
function bucketTablePanel() {
  const cur = dispCur();
  const rows = buildBuckets(ui.period).reverse().map((b) => {
    const net = b.received - b.gave - b.expense;
    const z = (v, c) => (v ? `<span class="${c}">${fmtMoney(v, cur)}</span>` : `<span class="muted">—</span>`);
    return `<tr><td>${esc(b.title)}</td><td class="num">${z(b.received, "pos")}</td><td class="num">${z(b.gave, "neg")}</td><td class="num">${z(b.expense, "warn")}</td><td class="num">${net ? `<span class="${net > 0 ? "pos" : "neg"}">${net > 0 ? "+" : ""}${fmtMoney(net, cur)}</span>` : `<span class="muted">—</span>`}</td></tr>`;
  }).join("");
  const names = { day: "Kunlik", week: "Haftalik", month: "Oylik", year: "Yillik" };
  return panel(`${names[ui.period]} jadval`, "file", `<div class="tbl-wrap"><table class="tbl simple"><thead><tr><th>Davr</th><th class="num">Olingan</th><th class="num">Berilgan</th><th class="num">Xarajat</th><th class="num">Farq</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}
function debtPanel() {
  const rows = debtRows();
  const mk = (list, cls, emptyText) => list.length
    ? `<div class="list">${list.map((r) => `<a class="li" href="#/people/${encodeURIComponent(r.p.id)}">${avatar(r.p, 38)}<div class="li-body"><div class="li-top"><b>${esc(r.p.name)}</b><span class="${cls}">${fmtMoney(Math.abs(r.bal), r.cur)}</span></div>${r.p.note ? `<div class="li-sub">${esc(r.p.note)}</div>` : ""}</div></a>`).join("")}</div>`
    : `<p class="muted" style="padding:8px 4px">${emptyText}</p>`;
  return `<div class="cards2">
    ${panel("Menga qarzdorlar", "ledger", mk(rows.filter((r) => r.bal > 0), "pur", "Hozircha sizga qarzdor inson yo'q."))}
    ${panel("Men qarzdorman", "ledger", mk(rows.filter((r) => r.bal < 0), "warn", "Siz hech kimga qarzdor emassiz."))}</div>`;
}
function pageStats() {
  return `<div class="page-head"><div><h2>Statistika</h2><p>Haqiqiy operatsiyalaringizdan avtomatik hisoblanadi</p></div></div>
    <div class="stack">${toolbarHTML()}${chartPanel("chart-stats", 320)}
    <div class="cards2">${categoryPanel(true)}${topPeoplePanel()}</div>
    ${debtPanel()}${bucketTablePanel()}</div>`;
}

/* ==========================================================
   10. OPERATSIYALAR SAHIFASI
   ========================================================== */
function filteredTx(personId) {
  let list, sort = "new";
  if (personId) {
    list = state.transactions.filter((t) => t.personId === personId);
  } else {
    const q = ui.q.trim().toLowerCase(), f = ui.f;
    sort = f.sort;
    list = state.transactions.filter((t) => {
      if (f.person && t.personId !== f.person) return false;
      if (f.currency && t.currency !== f.currency) return false;
      if (f.type && t.type !== f.type) return false;
      if (f.from && t.date < f.from) return false;
      if (f.to && t.date > f.to) return false;
      if (q) {
        const p = pIndex.get(t.personId);
        const hay = [p ? p.name : "", p ? p.note : "", t.reason, t.note, t.type === "expense" ? catOf(t.category).name : "", TYPES[t.type].label,
          (KIND_BADGE[`${t.type}:${t.kind || ""}`] || [""])[0], fmtNum(t.amount), String(t.amount / 100), t.currency, fmtDate(t.date)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
  const base = state.settings.base;
  list.sort((a, b) => sort === "old" ? (sortKey(a) < sortKey(b) ? -1 : 1)
    : sort === "big" ? convert(b.amount, b.currency, base) - convert(a.amount, a.currency, base)
    : (sortKey(a) < sortKey(b) ? 1 : -1));
  return list;
}

function txRow(t, showPerson = true) {
  const p = pIndex.get(t.personId);
  const [bl] = KIND_BADGE[`${t.type}:${t.kind || ""}`] || [TYPES[t.type].short];
  const sign = t.type === "received" ? "+" : "−";
  const cls = t.type === "received" ? "pos" : t.type === "expense" ? "warn" : "neg";
  const who = p
    ? `<div class="cell-p">${avatar(p, 36)}<div style="min-width:0"><b>${esc(p.name)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ""}</div></div>`
    : `<div class="cell-p">${iconAvatar("cart", 36)}<div><b>—</b><small>Inson ko'rsatilmagan</small></div></div>`;
  const desc = (t.type === "expense" ? `<b>${esc(catOf(t.category).name)}</b>${t.reason ? `<br>${esc(t.reason)}` : ""}` : t.reason ? `<b>${esc(t.reason)}</b>` : `<span class="muted">Sabab ko'rsatilmagan</span>`)
    + (t.note ? `<br><small>${esc(t.note)}</small>` : "");
  return `<tr>
    <td class="c-dt cell-d"><b>${fmtDate(t.date)}</b><small>${t.time || ""}</small></td>
    ${showPerson ? `<td class="c-p">${who}</td>` : ""}
    <td class="c-t ${showPerson ? "" : "c-p"}"><div class="cell-t"><span class="pill ${TYPES[t.type].cls}">${TYPES[t.type].short}</span>${bl !== TYPES[t.type].short ? `<small>${esc(bl)}</small>` : ""}</div></td>
    <td class="c-d desc">${desc}</td>
    <td class="num ${cls}">${sign}${fmtMoney(t.amount, t.currency)}</td>
    <td class="act"><button class="mini-btn" data-act="edit-tx" data-id="${esc(t.id)}" aria-label="Tahrirlash" title="Tahrirlash">${ico("pencil")}</button><button class="mini-btn del" data-act="del-tx" data-id="${esc(t.id)}" aria-label="O'chirish" title="O'chirish">${ico("trash")}</button></td>
  </tr>`;
}

function txListHTML(personId) {
  if (!state.transactions.length) {
    return empty("swap", "Hali operatsiya yo'q", "Kimga pul berdingiz, kimdan oldingiz yoki nimaga sarfladingiz — birinchi yozuvni qo'shing.",
      `<button class="btn" data-act="add-tx">${ico("plus", "sm")} Operatsiya qo'shish</button>`);
  }
  const list = filteredTx(personId);
  if (!list.length) {
    return empty("search", "Hech narsa topilmadi", "Qidiruv so'zi yoki filtrlarni o'zgartirib ko'ring.",
      `<button class="btn ghost" data-act="clear-filters">Filtrlarni tozalash</button>`);
  }
  const shown = list.slice(0, ui.txLimit);
  const sums = {};
  for (const t of list) { const o = sums[t.currency] || (sums[t.currency] = { gave: 0, received: 0, expense: 0 }); o[t.type] += t.amount; }
  const chips = CUR_LIST.filter((c) => sums[c]).map((c) => {
    const o = sums[c];
    return `<div class="sum-chip"><b>${c}</b>${o.gave ? `<span class="neg">Berilgan: ${fmtMoney(o.gave, c)}</span>` : ""}${o.received ? `<span class="pos">Olingan: ${fmtMoney(o.received, c)}</span>` : ""}${o.expense ? `<span class="warn">Xarajat: ${fmtMoney(o.expense, c)}</span>` : ""}</div>`;
  }).join("");
  const showPerson = !personId;
  return `<div class="sum-box"><div class="sum-chip"><b>${list.length}</b> ta operatsiya</div>${chips}</div>
    <div class="tbl-wrap"><table class="tbl tx"><thead><tr><th>Sana</th>${showPerson ? "<th>Inson</th>" : ""}<th>Tur</th><th>Sabab / izoh</th><th class="num">Summa</th><th></th></tr></thead>
    <tbody>${shown.map((t) => txRow(t, showPerson)).join("")}</tbody></table></div>
    ${list.length > shown.length ? `<div class="more"><button class="btn ghost" data-act="more-tx">Yana ko'rsatish (${list.length - shown.length})</button></div>` : ""}`;
}

const opts = (list, sel) => list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(l)}</option>`).join("");
function pageTransactions() {
  const f = ui.f;
  const people = [...state.people].sort((a, b) => a.name.localeCompare(b.name, "uz")).map((p) => [p.id, personLabel(p)]);
  const active = [f.person, f.currency, f.type, f.from, f.to].filter(Boolean).length;
  return `<div class="page-head"><div><h2>Operatsiyalar</h2><p>Barcha pul harakatlari tarixi</p></div>
      <div class="btn-row"><button class="btn ghost" data-act="export-csv">${ico("download", "sm")} CSV</button><button class="btn" data-act="add-tx">${ico("plus", "sm")} Operatsiya qo'shish</button></div></div>
    <div class="stack"><section class="panel filters${ui.filtersOpen ? " open" : ""}" aria-label="Filtrlar">
      <label class="fld f-search"><span>Qidiruv</span><input type="search" id="txSearch" value="${esc(ui.q)}" placeholder="Inson, izoh, sabab..." autocomplete="off"></label>
      <button class="btn ghost filter-toggle" data-act="toggle-filters" aria-expanded="${ui.filtersOpen ? "true" : "false"}">${ico("sliders", "sm")} Filtrlar${active ? ` (${active})` : ""} ${ico("down", "sm")}</button>
      <label class="fld"><span>Inson</span><select data-flt="person"><option value="">Hammasi</option>${opts(people, f.person)}</select></label>
      <label class="fld"><span>Valyuta</span><select data-flt="currency"><option value="">Hammasi</option>${opts(CUR_LIST.map((c) => [c, c]), f.currency)}</select></label>
      <label class="fld"><span>Tur</span><select data-flt="type"><option value="">Hammasi</option>${opts(Object.entries(TYPES).map(([k, v]) => [k, v.label]), f.type)}</select></label>
      <label class="fld"><span>Saralash</span><select data-flt="sort">${opts([["new", "Yangilari avval"], ["old", "Eskilari avval"], ["big", "Katta summa avval"]], f.sort)}</select></label>
      <label class="fld"><span>Sanadan</span><input type="date" data-flt="from" value="${f.from}"></label>
      <label class="fld"><span>Sanagacha</span><input type="date" data-flt="to" value="${f.to}"></label>
      <button class="btn ghost clear-btn" data-act="clear-filters">Tozalash</button>
    </section>
    <section class="panel" id="txPanel">${txListHTML()}</section></div>`;
}

/* ==========================================================
   11. INSONLAR SAHIFASI
   ========================================================== */
function personCard(p) {
  const a = personAgg(p.id);
  const owes = Object.keys(a.owed).length, iowe = Object.keys(a.iOwe).length;
  return `<a class="panel pc" href="#/people/${encodeURIComponent(p.id)}">
    <div class="pc-h">${avatar(p, 52)}<div style="min-width:0"><b>${esc(p.name)}</b><small>${esc(p.note || "Izoh yo'q")}</small></div>
      ${owes ? `<span class="pill purple">Qarzdor</span>` : iowe ? `<span class="pill orange">Men qarzdorman</span>` : ""}</div>
    <div class="kv">
      <div>Operatsiyalar<span>${a.count} ta</span></div>
      <div>Jami berilgan<span>${curText(a.gave)}</span></div>
      <div>Qaytarib olingan<span>${curText(a.repaid)}</span></div>
      <div>Qaytarilishi kerak<span>${curText(a.owed, "pur")}</span></div>
      ${iowe ? `<div>Men qaytarishim kerak<span>${curText(a.iOwe, "warn")}</span></div>` : ""}
    </div></a>`;
}
function pagePeople() {
  if (ui.personId) { const p = pIndex.get(ui.personId); if (p) return personDetail(p); }
  const q = ui.peopleQ.trim().toLowerCase(), base = state.settings.base;
  let list = state.people.filter((p) => !q || (p.name + " " + p.note).toLowerCase().includes(q));
  const agg = new Map(list.map((p) => [p.id, personAgg(p.id)]));
  const owedTotal = (id) => Object.entries(agg.get(id).owed).reduce((s, [c, v]) => s + convert(v, c, base), 0);
  list.sort((a, b) => ui.peopleSort === "name" ? a.name.localeCompare(b.name, "uz")
    : ui.peopleSort === "owed" ? owedTotal(b.id) - owedTotal(a.id)
    : (agg.get(a.id).last < agg.get(b.id).last ? 1 : -1));
  const body = !state.people.length
    ? panel("Insonlar", "users", empty("users", "Hali inson qo'shilmagan", "Har bir inson uchun alohida hisob yuritiladi: kimga qancha berdingiz, qancha qaytdi, qancha qoldi.", `<button class="btn" data-act="add-person">${ico("plus", "sm")} Inson qo'shish</button>`))
    : list.length ? `<div class="people-grid">${list.map(personCard).join("")}</div>` : panel("Insonlar", "users", empty("search", "Hech kim topilmadi", "Boshqa ism bilan qidirib ko'ring.", "", "compact"));
  return `<div class="page-head"><div><h2>Insonlar</h2><p>Har bir inson bilan alohida hisob-kitob</p></div>
      <div class="btn-row"><button class="btn" data-act="add-person">${ico("plus", "sm")} Yangi inson</button></div></div>
    <div class="stack"><section class="panel filters pf">
      <label class="fld"><span>Qidiruv</span><input type="search" id="peopleSearch" value="${esc(ui.peopleQ)}" placeholder="Ism yoki izoh..." autocomplete="off"></label>
      <label class="fld"><span>Saralash</span><select id="peopleSort">${opts([["recent", "Oxirgi faollik"], ["name", "Ism bo'yicha"], ["owed", "Eng ko'p qarzdor"]], ui.peopleSort)}</select></label>
    </section>${body}</div>`;
}
function personDetail(p) {
  const { by, count } = personSums(p.id);
  const txs = state.transactions.filter((t) => t.personId === p.id);
  const first = txs.reduce((m, t) => (!m || t.date < m ? t.date : m), "");
  const rows = CUR_LIST.filter((c) => by[c]).map((c) => {
    const o = by[c];
    return `<tr><td><span class="cell-p">${flag(c, "sm")}<b>${c}</b></span></td><td class="num">${fmtMoney(o.gave, c)}</td><td class="num">${fmtMoney(o.received, c)}</td><td class="num pos">${fmtMoney(o.repaid, c)}</td><td class="num pur">${o.bal > 0 ? fmtMoney(o.bal, c) : "—"}</td><td class="num warn">${o.bal < 0 ? fmtMoney(-o.bal, c) : "—"}</td></tr>`;
  }).join("");
  return `<a class="back" href="#/people">${ico("left", "sm")} Insonlar</a>
    <div class="stack">
    <section class="panel"><div class="pd-head">${avatar(p, 76)}
      <div style="min-width:0"><h2>${esc(p.name)}</h2><p>${esc(p.note || "Izoh yo'q")} · ${count} ta operatsiya${first ? ` · birinchisi: ${fmtDate(first)}` : ""}</p></div>
      <div class="btn-row"><button class="btn" data-act="add-tx" data-person="${esc(p.id)}">${ico("plus", "sm")} Operatsiya</button>
        <button class="btn ghost" data-act="edit-person" data-id="${esc(p.id)}">${ico("pencil", "sm")} Tahrirlash</button>
        <button class="btn ghost" data-act="del-person" data-id="${esc(p.id)}">${ico("trash", "sm")} O'chirish</button></div></div></section>
    ${panel("Valyutalar bo'yicha hisob", "coin", rows
      ? `<div class="tbl-wrap"><table class="tbl simple"><thead><tr><th>Valyuta</th><th class="num">Jami berilgan</th><th class="num">Jami olingan</th><th class="num">Qaytarib olingan</th><th class="num">Qaytarilishi kerak</th><th class="num">Men qarzdorman</th></tr></thead><tbody>${rows}</tbody></table></div><p class="hint" style="margin-top:10px">Har bir valyuta alohida hisoblanadi, ular o'zaro qo'shilmaydi.</p>`
      : empty("coin", "Hali operatsiya yo'q", "Bu insonga bog'liq operatsiyalar qo'shilganda hisob shu yerda chiqadi.", "", "compact"))}
    ${panel("Operatsiyalar tarixi", "swap", `<div id="txPanel">${txListHTML(p.id)}</div>`)}</div>`;
}

/* ==========================================================
   12. VALYUTALAR SAHIFASI
   ========================================================== */
function pageCurrencies() {
  const b = balances(), r = state.settings.rates;
  const cards = CUR_LIST.map((c) => {
    const o = b[c];
    return panel(`${c} <span class="muted" style="font-weight:500">· ${CUR[c].name}</span>`, "coin", `<div class="cur-card">
      <div style="display:flex;align-items:center;gap:14px">${flag(c)}<div class="big ${o.bal < 0 ? "neg" : ""}">${fmtMoney(o.bal, c)}</div></div>
      <div class="kv"><div>Boshlang'ich qoldiq<span>${fmtMoney(o.init, c)}</span></div><div>Jami kirim (olingan)<span class="pos">${fmtMoney(o.in, c)}</span></div>
      <div>Jami chiqim (berilgan + xarajat)<span class="neg">${fmtMoney(o.out, c)}</span></div><div>Bu oy sof o'zgarish<span class="${o.monthNet >= 0 ? "pos" : "neg"}">${o.monthNet > 0 ? "+" : ""}${fmtMoney(o.monthNet, c)}</span></div></div></div>`);
  }).join("");
  return `<div class="page-head"><div><h2>Valyutalar</h2><p>Har bir valyuta alohida hisoblanadi, kurslarni o'zingiz belgilaysiz</p></div></div>
    <div class="stack"><div class="cards3">${cards}</div>
    <div class="cards2">
      ${panel("Almashtirish kurslari", "refresh", `<form class="form-grid" data-form="rates" novalidate>
        <div class="grid2"><label class="fld"><span>1 USD necha so'm?</span><input id="rateUSD" inputmode="decimal" value="${esc(r.USD)}" autocomplete="off"></label>
        <label class="fld"><span>1 KGS necha so'm?</span><input id="rateKGS" inputmode="decimal" value="${esc(r.KGS)}" autocomplete="off"></label></div>
        <label class="fld"><span>Kurs sanasi</span><input type="date" id="rateDate" value="${r.date}"></label>
        <p class="form-err" id="rateErr" hidden></p>
        <div class="form-actions"><button class="btn" type="submit">${ico("check", "sm")} Saqlash</button>
          <button class="btn ghost" type="button" data-act="rates-today">Bugungi sana</button>
          <button class="btn ghost" type="button" data-act="rates-fetch">${ico("download", "sm")} Markaziy bank kursi</button></div>
        <div class="info">${ico("alert", "sm")}<span>Kurslar o'zingiz kiritgan qiymat bo'yicha ishlaydi va o'z-o'zidan yangilanmaydi. «Hammasi» ko'rinishidagi umumiy hisoblar shu kurslar bo'yicha so'mga aylantiriladi; asl operatsiyalar o'z valyutasida saqlanadi.</span></div></form>`)}
      ${panel("Konvertor", "swap", `<div class="form-grid">
        <div class="grid2"><label class="fld"><span>Summa</span><input id="cvAmt" data-money inputmode="decimal" placeholder="0" value="100" autocomplete="off"></label>
        <label class="fld"><span>Valyuta</span><select id="cvFrom">${opts(CUR_LIST.map((c) => [c, c]), "USD")}</select></label></div>
        <label class="fld"><span>Natija valyutasi</span><select id="cvTo">${opts(CUR_LIST.map((c) => [c, c]), "UZS")}</select></label>
        <div class="big-out" id="cvOut" aria-live="polite">—</div>
        <p class="hint">Kurs sanasi: ${fmtDate(r.date)}</p></div>`)}
    </div></div>`;
}
function updateConverter() {
  const out = $("#cvOut");
  if (!out) return;
  const m = parseAmount($("#cvAmt").value, true);
  out.textContent = m === null ? "—" : fmtMoney(convert(m, $("#cvFrom").value, $("#cvTo").value), $("#cvTo").value);
}

/* ==========================================================
   13. ZAXIRA / IMPORT SAHIFASI
   ========================================================== */
function pageBackup() {
  const size = new Blob([JSON.stringify(state)]).size;
  const lb = state.meta.lastBackup;
  const stale = state.transactions.length > 0 && (!lb || daysSince(lb) > 7);
  const hasPrev = !!localStorage.getItem(PREV_KEY);
  const card = (a, icon, title, text, btn) => `<section class="panel act-card" style="--a:${a}"><span class="ac-ic">${ico(icon)}</span><h3>${title}</h3><p>${text}</p>${btn}</section>`;
  return `<div class="page-head"><div><h2>Zaxira / Import</h2><p>Ma'lumotlaringizni yo'qotmaslik uchun muntazam nusxa oling</p></div></div>
    <div class="stack">
    ${stale ? `<div class="info warn-box">${ico("alert")}<span>${lb ? `Oxirgi zaxira nusxa ${daysSince(lb)} kun oldin olingan.` : "Hali zaxira nusxa olinmagan."} Brauzer ma'lumotlari tozalansa, barcha yozuvlar yo'qolishi mumkin — hozir JSON nusxa oling.</span></div>` : ""}
    <div class="cards3">
      ${card("#3d7bff", "download", "JSON zaxira nusxa", "Barcha ma'lumotlar (profil, insonlar, operatsiyalar, sozlamalar) bitta faylga saqlanadi. Keyin shu fayldan to'liq tiklash mumkin.", `<button class="btn" data-act="export-json">${ico("download", "sm")} Yuklab olish</button>`)}
      ${card("#1fd6a4", "upload", "Zaxiradan tiklash", "Avval olingan JSON faylni tanlang. Fayl tekshiriladi, xato bo'lsa hech narsa o'zgarmaydi. Almashtirish yoki mavjudlarga qo'shishni tanlaysiz.", `<button class="btn" data-act="import-json">${ico("upload", "sm")} Fayl tanlash</button>`)}
      ${card("#ffae2e", "file", "CSV eksport", "Barcha operatsiyalar jadval ko'rinishida (Excel va Google Sheets uchun mos). CSV faqat ko'rish uchun; tiklash uchun JSON ishlating.", `<button class="btn" data-act="export-csv">${ico("file", "sm")} CSV yuklab olish</button>`)}
    </div>
    <section class="panel"><div class="kv-big">
      <div><small>Operatsiyalar</small><b>${state.transactions.length}</b></div><div><small>Insonlar</small><b>${state.people.length}</b></div>
      <div><small>Ma'lumot hajmi</small><b>${size < 1024 ? size + " B" : (size / 1024).toFixed(1) + " KB"}</b></div>
      <div><small>Oxirgi zaxira</small><b>${lb ? fmtDate(toISO(new Date(lb))) : "—"}</b></div></div>
      ${hasPrev ? `<div class="form-actions" style="margin-top:14px"><button class="btn ghost sm" data-act="restore-prev">${ico("refresh", "sm")} Oxirgi importdan oldingi holatni tiklash</button></div>` : ""}</section>
    <div class="info">${ico("shield")}<span><b>Ma'lumotlar qayerda saqlanadi?</b> Faqat shu qurilmadagi shu brauzerning xotirasida (localStorage). Telefon va kompyuter o'rtasida avtomatik sinxronlash yo'q — buning uchun backend va ma'lumotlar bazasi kerak. Hozircha JSON zaxira orqali bir qurilmadan boshqasiga ko'chirishingiz mumkin.</span></div>
    </div>`;
}

/* ==========================================================
   14. SOZLAMALAR SAHIFASI
   ========================================================== */
function pageSettings() {
  const s = state.settings, name = state.profile.name;
  const money = (id, label, v) => `<label class="fld"><span>${label}</span><input id="${id}" data-money inputmode="decimal" placeholder="0" value="${v ? minorToInput(v) : ""}" autocomplete="off"></label>`;
  return `<div class="page-head"><div><h2>Sozlamalar</h2><p>Profil, ko'rinish va boshlang'ich qoldiqlar</p></div></div>
    <div class="stack"><div class="cards2">
      ${panel("Profil", "user", `<form class="form-grid" data-form="profile" novalidate>
        <div class="avatar-edit">${avatar({ name: name || "?", avatar: state.profile.avatar }, 72)}
          <div class="form-actions" style="margin:0"><button type="button" class="btn ghost sm" data-act="change-avatar">${ico("image", "sm")} Rasm yuklash</button>${state.profile.avatar ? `<button type="button" class="btn ghost sm" data-act="remove-avatar">Rasmni olib tashlash</button>` : ""}</div></div>
        <label class="fld"><span>Ismingiz</span><input id="setName" maxlength="60" value="${esc(name)}" autocomplete="name"></label>
        <label class="fld"><span>Shahar (ob-havo uchun)</span><select id="setCity">${opts(Object.keys(CITIES).map((c) => [c, c]), state.profile.city)}</select></label>
        <p class="form-err" id="setErr" hidden></p>
        <div class="form-actions"><button class="btn" type="submit">${ico("check", "sm")} Saqlash</button></div></form>`)}
      ${panel("Ko'rinish", "sliders", `<div class="form-grid">
        <div class="fld"><span class="lbl">Mavzu</span><div class="seg" role="group"><button class="${s.theme === "dark" ? "on" : ""}" data-act="set-theme" data-v="dark">${ico("moon", "sm")} Qorong'i</button><button class="${s.theme === "light" ? "on" : ""}" data-act="set-theme" data-v="light">${ico("sun", "sm")} Yorug'</button></div></div>
        <label class="fld"><span>Umumiy hisob valyutasi</span><select id="setBase">${opts(CUR_LIST.map((c) => [c, `${c} — ${CUR[c].name}`]), s.base)}</select></label>
        <p class="hint">«Hammasi» ko'rinishida barcha valyutalar shu valyutaga kurs bo'yicha aylantirib ko'rsatiladi.</p></div>`)}
    </div>
    ${panel("Boshlang'ich qoldiqlar", "wallet", `<form class="form-grid" data-form="initial" novalidate>
      <p class="hint">Dasturdan foydalanishni boshlagan paytdagi pulingiz. Valyutalar balansi shundan boshlab hisoblanadi.</p>
      <div class="cards3" style="gap:14px">${CUR_LIST.map((c) => money("ini" + c, `${c} (${CUR[c].sym})`, s.initial[c])).join("")}</div>
      <p class="form-err" id="iniErr" hidden></p>
      <div class="form-actions"><button class="btn" type="submit">${ico("check", "sm")} Saqlash</button></div></form>`)}
    ${panel("Ma'lumotlar", "shield", `<div class="form-grid">
      <p class="hint">Hozir ${state.transactions.length} ta operatsiya va ${state.people.length} ta inson saqlangan.</p>
      <div class="form-actions"><button class="btn ghost" data-act="demo">Namunaviy ma'lumotlarni yuklash</button><button class="btn danger" data-act="clear-all">${ico("trash", "sm")} Barcha ma'lumotni o'chirish</button></div></div>`, "", "danger-zone")}
    </div>`;
}

/* ==========================================================
   15. MENYU, BILDIRISHNOMA, ASOSIY CHIZISH
   ========================================================== */
function buildNotes() {
  const list = [];
  const lb = state.meta.lastBackup;
  if (state.transactions.length && (!lb || daysSince(lb) > 7)) {
    list.push({ icon: "backup", color: "var(--orange)", title: "Zaxira nusxa oling", text: lb ? `Oxirgi nusxa ${daysSince(lb)} kun oldin olingan` : "Hali zaxira nusxa olinmagan", href: "#/backup" });
  }
  const owed = state.people.map((p) => ({ p, a: personAgg(p.id) })).filter((x) => Object.keys(x.a.owed).length)
    .sort((a, b) => (a.a.last < b.a.last ? 1 : -1)).slice(0, 4);
  for (const { p, a } of owed) {
    list.push({ icon: "ledger", color: "var(--purple)", title: `${p.name} sizga qarzdor`,
      text: CUR_LIST.filter((c) => a.owed[c] > 0).map((c) => fmtMoney(a.owed[c], c)).join(" · "), href: `#/people/${encodeURIComponent(p.id)}` });
  }
  return list;
}
function notesHTML() {
  const list = buildNotes();
  return `<div class="dd-title">Bildirishnomalar</div>` + (list.length
    ? list.map((n) => `<a class="note-item" href="${n.href}"><span class="ni-ic" style="color:${n.color};background:color-mix(in srgb, ${n.color} 16%, transparent)">${ico(n.icon)}</span><span><b>${esc(n.title)}</b><small>${esc(n.text)}</small></span></a>`).join("")
    : `<p class="muted" style="padding:10px 12px 14px">Yangi bildirishnoma yo'q.</p>`);
}
function closeDropdowns() { $("#bellPanel").hidden = true; $("#userMenu").hidden = true; }
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#overlay").classList.remove("show"); }
function toggleSidebar() { const o = $("#sidebar").classList.toggle("open"); $("#overlay").classList.toggle("show", o); }

function updateChrome() {
  document.documentElement.setAttribute("data-theme", state.settings.theme);
  $("#themeSwitch").setAttribute("aria-checked", String(state.settings.theme === "dark"));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", state.settings.theme === "dark" ? "#071030" : "#e9f0ff");
  const name = state.profile.name || "Foydalanuvchi";
  $("#userName").textContent = name;
  $("#userAv").innerHTML = avatar({ name, avatar: state.profile.avatar }, 38);
  $$(".nav-item").forEach((a) => a.classList.toggle("active", a.dataset.route === ui.page));
  $("#bellDot").hidden = !buildNotes().length;
  const q = $("#quote");
  if (!q.dataset.set) {
    const d = new Date();
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    q.innerHTML = `<p>${esc(QUOTES[day % QUOTES.length])}</p><hr>`;
    q.dataset.set = "1";
  }
}

const PAGES = { dashboard: pageDashboard, transactions: pageTransactions, people: pagePeople, stats: pageStats, currencies: pageCurrencies, backup: pageBackup, settings: pageSettings };
const TITLES = { dashboard: "Bosh sahifa", transactions: "Operatsiyalar", people: "Insonlar", stats: "Statistika", currencies: "Valyutalar", backup: "Zaxira / Import", settings: "Sozlamalar" };

function render(animate = false) {
  reindex();
  const v = $("#view"), y = window.scrollY;
  v.innerHTML = (PAGES[ui.page] || pageDashboard)();
  v.classList.remove("enter");
  if (animate) { void v.offsetWidth; v.classList.add("enter"); }
  ui.animate = animate;
  document.title = `${TITLES[ui.page] || "MoneyTrack"} — MoneyTrack`;
  afterRender();
  if (!animate) window.scrollTo(0, y);
}
function afterRender() {
  updateChrome();
  drawCharts();
  requestAnimationFrame(() => requestAnimationFrame(() => $$("[data-w]").forEach((e) => e.style.setProperty("--w", e.dataset.w))));
  animateCounts();
  updateConverter();
}
function animateCounts() {
  if (!ui.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  $$("[data-count]").forEach((el) => {
    const to = +el.dataset.count, cur = el.dataset.cur;
    if (!to) return;
    el.textContent = fmtMoney(0, cur);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 700);
      el.textContent = fmtMoney(Math.round(to * (1 - Math.pow(1 - p, 3))), cur);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
function commit(msg) { reindex(); save(); render(); if (msg) toast(msg); }

/* ----- Yo'naltirish (hash) ----- */
function parseHash() {
  const [page, id] = location.hash.replace(/^#\/?/, "").split("/");
  return { page: PAGES[page] ? page : "dashboard", id: id ? decodeURIComponent(id) : null };
}
function route() {
  const r = parseHash();
  ui.page = r.page; ui.personId = r.page === "people" ? r.id : null; ui.txLimit = 25;
  closeSidebar(); closeDropdowns();
  render(true);
  window.scrollTo(0, 0);
}
function refreshTx() { const p = $("#txPanel"); if (p && ui.page === "transactions") p.innerHTML = txListHTML(); }
function setTheme(t) { state.settings.theme = t === "light" ? "light" : "dark"; save(); render(); }
function setRange(v) {
  const n = new Date();
  if (v === "clear") { ui.from = ""; ui.to = ""; }
  else if (v === "month") { [ui.from, ui.to] = monthRange(0); }
  else if (v === "year") { ui.from = `${n.getFullYear()}-01-01`; ui.to = `${n.getFullYear()}-12-31`; }
  else if (v === "30") { ui.to = toISO(n); ui.from = toISO(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 29)); }
  render();
}

/* ==========================================================
   16. SUMMA KIRITISH MAYDONI (probel bilan guruhlash)
   ========================================================== */
function fmtMoneyInput(el) {
  const pos = el.selectionStart == null ? el.value.length : el.selectionStart;
  const before = el.value.slice(0, pos);
  const digitsBefore = (before.match(/\d/g) || []).length;
  const v = el.value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parts = v.split(".");
  const w = parts[0].replace(/^0+(?=\d)/, "");
  const f = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : null;
  el.value = w.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (f !== null ? "." + f : "");
  let count = 0, i = 0;
  for (; i < el.value.length && count < digitsBefore; i++) if (/\d/.test(el.value[i])) count++;
  if (/[.,]$/.test(before) && el.value.indexOf(".") >= 0) i = el.value.indexOf(".") + 1;
  try { el.setSelectionRange(i, i); } catch (e) { /* e'tiborsiz */ }
}

/* ==========================================================
   17. OPERATSIYA OYNASI (qo'shish / tahrirlash)
   ========================================================== */
function lastCurrency() {
  if (view() !== "ALL") return view();
  const t = [...state.transactions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  return t ? t.currency : state.settings.base;
}
const defaultKind = (type) => (type === "gave" ? "gift" : type === "received" ? "income" : "");
const kindOptsHTML = (type, sel) => KINDS[type].map(([v, l, h]) => `<label class="kind"><input type="radio" name="kind" value="${v}"${v === sel ? " checked" : ""}><span><b>${l}</b><small>${h}</small></span></label>`).join("");

function openTxModal(o = {}) {
  const editing = o.id ? state.transactions.find((x) => x.id === o.id) : null;
  if (o.id && !editing) return;
  const base = editing ? { ...editing } : { type: o.type || "gave", kind: o.kind || "", currency: lastCurrency(), personId: o.personId || "", reason: "", category: "food", date: todayISO(), time: nowTime(), note: "", amount: 0 };
  if (!TYPES[base.type]) base.type = "gave";
  if (base.type !== "expense" && !KINDS[base.type].some((k) => k[0] === base.kind)) base.kind = defaultKind(base.type);
  const people = [...state.people].sort((a, b) => a.name.localeCompare(b.name, "uz"));

  const html = `<h3>${editing ? "Operatsiyani tahrirlash" : "Yangi operatsiya"}</h3><p class="m-sub">${editing ? "O'zgartirib, saqlang" : "Pul harakatini yozib qo'ying"}</p>
  <form id="txForm" novalidate>
    <div class="type-seg" role="radiogroup" aria-label="Operatsiya turi">${Object.entries(TYPES).map(([k, v]) => `<label><input type="radio" name="type" value="${k}"${k === base.type ? " checked" : ""}><span>${ico(v.icon)}${v.label}</span></label>`).join("")}</div>
    <div class="grid2">
      <label class="fld"><span>Summa</span><input id="fAmount" data-money inputmode="decimal" placeholder="0" autocomplete="off"></label>
      <label class="fld"><span>Valyuta</span><select id="fCur">${opts(CUR_LIST.map((c) => [c, `${c} (${CUR[c].sym})`]), base.currency)}</select></label>
    </div>
    <div class="fld"><label class="lbl" for="fPerson" id="personLbl">Inson</label>
      <select id="fPerson"><option value="">Tanlang...</option>${people.map((p) => `<option value="${esc(p.id)}">${esc(personLabel(p))}</option>`).join("")}<option value="__new">+ Yangi inson yaratish</option></select>
      <div class="new-person" id="newBox" hidden>
        <input class="input" id="fNewName" maxlength="60" placeholder="Yangi inson ismi" autocomplete="off">
        <input class="input" id="fNewNote" maxlength="80" placeholder="Izoh (ixtiyoriy): masalan, qo'shni" autocomplete="off">
        <div class="dups" id="dups" hidden></div>
      </div></div>
    <div class="fld" id="kindFld"><span class="lbl">Maqsad</span><div class="kind-opts" id="kindOpts"></div></div>
    <label class="fld" id="catFld"><span>Yo'nalish</span><select id="fCat">${opts(CATEGORIES.map((c) => [c.id, c.name]), base.category || "food")}</select></label>
    <label class="fld"><span>Sabab (nima uchun?)</span><input id="fReason" maxlength="120" placeholder="Masalan: tug'ilgan kun sovg'asi" autocomplete="off"></label>
    <div class="grid2"><label class="fld"><span>Sana</span><input type="date" id="fDate"></label><label class="fld"><span>Vaqt</span><input type="time" id="fTime"></label></div>
    <label class="fld"><span>Izoh</span><textarea id="fNote" rows="2" maxlength="500" placeholder="Qo'shimcha ma'lumot (ixtiyoriy)"></textarea></label>
    <p class="form-err" id="fErr" role="alert" hidden></p>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Bekor qilish</button><button type="submit" class="btn" id="fSave">Saqlash</button></div>
  </form>`;
  const m = openModal(html, { cls: "lg", lock: true });
  const f = $("#txForm", m.box), q = (s) => $(s, m.box);
  q("#fAmount").value = base.amount ? minorToInput(base.amount) : "";
  q("#fReason").value = base.reason; q("#fDate").value = base.date; q("#fTime").value = base.time || ""; q("#fNote").value = base.note;
  q("#fPerson").value = base.personId;
  if (q("#fPerson").value !== base.personId) q("#fPerson").value = "";

  const curType = () => f.elements.type.value;
  let lastType = base.type;
  function syncType() {
    const t = curType(), exp = t === "expense";
    let sel;
    if (t !== lastType) sel = defaultKind(t);
    else sel = f.elements.kind ? f.elements.kind.value : base.kind;
    if (!KINDS[t].some((k) => k[0] === sel)) sel = defaultKind(t);
    lastType = t;
    q("#kindFld").hidden = exp; q("#catFld").hidden = !exp;
    q("#kindOpts").innerHTML = kindOptsHTML(t, sel);
    q("#personLbl").textContent = exp ? "Inson (ixtiyoriy)" : "Inson";
    q("#fPerson").options[0].textContent = exp ? "— Tanlanmagan —" : "Tanlang...";
  }
  syncType();
  $$('input[name="type"]', f).forEach((r) => r.addEventListener("change", syncType));

  q("#fPerson").addEventListener("change", () => {
    const isNew = q("#fPerson").value === "__new";
    q("#newBox").hidden = !isNew;
    if (isNew) q("#fNewName").focus();
  });
  q("#fNewName").addEventListener("input", () => {
    const name = q("#fNewName").value.trim().toLowerCase(), box = q("#dups");
    const found = name.length < 2 ? [] : people.filter((p) => p.name.toLowerCase().includes(name)).slice(0, 5);
    box.hidden = !found.length;
    if (found.length) box.innerHTML = `<span>Mavjud insonlar:</span>` + found.map((p) => `<button type="button" class="chip" data-pick="${esc(p.id)}">${esc(personLabel(p))}</button>`).join("");
  });
  q("#dups").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    q("#fPerson").value = b.dataset.pick; q("#newBox").hidden = true;
  });

  let busy = false;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const err = q("#fErr");
    $$(".invalid", m.box).forEach((x) => x.classList.remove("invalid"));
    err.hidden = true;
    const fail = (msg, sel) => { err.textContent = msg; err.hidden = false; if (sel) { const el = q(sel); el.classList.add("invalid"); el.focus(); } };

    const type = curType();
    const amount = parseAmount(q("#fAmount").value);
    if (amount === null) return fail("Summani to'g'ri kiriting: noldan katta son bo'lishi kerak (masalan, 150000 yoki 25.50).", "#fAmount");
    const currency = q("#fCur").value;
    if (!CUR[currency]) return fail("Valyutani tanlang.", "#fCur");

    let personId = q("#fPerson").value, newPerson = null;
    if (personId === "__new") {
      const name = clip(q("#fNewName").value, 60), note = clip(q("#fNewNote").value, 80);
      if (!name) return fail("Yangi inson ismini kiriting.", "#fNewName");
      const dup = state.people.find((p) => p.name.toLowerCase() === name.toLowerCase() && (p.note || "").toLowerCase() === note.toLowerCase());
      if (dup) return fail(`«${dup.name}» ismli inson allaqachon bor. Uni ro'yxatdan tanlang yoki boshqa odam bo'lsa, izohda farqlang (masalan: qo'shni).`, "#fNewName");
      newPerson = { id: uid(), name, note, avatar: "", createdAt: new Date().toISOString() };
      personId = newPerson.id;
    } else if (personId && !pIndex.has(personId)) personId = "";
    if (type !== "expense" && !personId) return fail("Insonni tanlang yoki yangi inson yarating.", "#fPerson");

    const date = q("#fDate").value;
    if (!isValidISO(date)) return fail("Sanani to'g'ri kiriting.", "#fDate");
    const time = /^\d{2}:\d{2}$/.test(q("#fTime").value) ? q("#fTime").value : "";
    const kind = type === "expense" ? "" : (f.elements.kind ? f.elements.kind.value : "");
    if (type !== "expense" && !KINDS[type].some((k) => k[0] === kind)) return fail("Maqsadni tanlang.");

    const rec = {
      id: editing ? editing.id : uid(), type, kind, amount, currency, personId: personId || null,
      reason: clip(q("#fReason").value, 120), category: type === "expense" ? q("#fCat").value : "",
      date, time, note: clip(q("#fNote").value, 500), createdAt: editing ? editing.createdAt : new Date().toISOString(),
    };

    if (!newPerson) {
      const same = state.transactions.find((x) => x.id !== rec.id && x.type === rec.type && x.kind === rec.kind && x.amount === rec.amount && x.currency === rec.currency
        && (x.personId || null) === rec.personId && x.date === rec.date && x.reason.toLowerCase() === rec.reason.toLowerCase() && x.category === rec.category);
      if (same) {
        busy = true;
        const ok = await confirmDialog({ title: "Xuddi shunday operatsiya bor", text: `${fmtDate(rec.date)} sanasida bir xil summa (<b>${fmtMoney(rec.amount, rec.currency)}</b>) va ma'lumotlar bilan operatsiya allaqachon saqlangan. Baribir qo'shilsinmi?`, ok: "Ha, qo'shilsin" });
        busy = false;
        if (!ok) return;
      }
    }
    busy = true;
    q("#fSave").disabled = true;
    if (newPerson) state.people.push(newPerson);
    if (editing) state.transactions[state.transactions.findIndex((x) => x.id === editing.id)] = rec;
    else state.transactions.push(rec);
    m.close();
    commit(editing ? "Operatsiya yangilandi" : "Operatsiya saqlandi");
  });
}

async function deleteTx(id) {
  const t = state.transactions.find((x) => x.id === id);
  if (!t) return;
  const p = pIndex.get(t.personId);
  const ok = await confirmDialog({
    title: "Operatsiyani o'chirasizmi?",
    text: `<b>${esc(TYPES[t.type].label)}</b>${p ? ` — ${esc(p.name)}` : ""}: <b>${fmtMoney(t.amount, t.currency)}</b> (${fmtDate(t.date)}).<br>Bu amalni qaytarib bo'lmaydi.`,
    ok: "Ha, o'chirish", danger: true,
  });
  if (!ok) return;
  state.transactions = state.transactions.filter((x) => x.id !== id);
  commit("Operatsiya o'chirildi");
}

/* ==========================================================
   18. INSON VA PROFIL OYNALARI
   ========================================================== */
const photoHTML = `<div class="photo-pick"><span id="phAv"></span><div class="form-actions" style="margin:0"><button type="button" class="btn ghost sm" id="phPick">${ico("image", "sm")} Rasm tanlash</button><button type="button" class="btn ghost sm" id="phDel">Olib tashlash</button></div><input type="file" id="phFile" accept="image/*" hidden></div>`;
function bindPhoto(box, initial, nameInput) {
  const st = { pending: undefined };
  const av = $("#phAv", box), file = $("#phFile", box), del = $("#phDel", box);
  const paint = () => {
    const src = st.pending === undefined ? initial : st.pending;
    av.innerHTML = avatar({ name: nameInput.value || "?", avatar: src }, 72);
    del.hidden = !src;
  };
  nameInput.addEventListener("input", paint);
  $("#phPick", box).addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    try { st.pending = await resizeImage(file.files[0]); paint(); } catch (e) { toast(e.message, "err"); }
    file.value = "";
  });
  del.addEventListener("click", () => { st.pending = ""; paint(); });
  paint();
  return st;
}

function openPersonModal(id) {
  const editing = id ? pIndex.get(id) : null;
  if (id && !editing) return;
  const m = openModal(`<h3>${editing ? "Insonni tahrirlash" : "Yangi inson"}</h3><p class="m-sub">Har bir inson uchun alohida hisob yuritiladi</p>
    <form id="pForm" novalidate>${photoHTML}
      <label class="fld"><span>Ism</span><input id="pName" maxlength="60" autocomplete="off"></label>
      <label class="fld"><span>Izoh (ixtiyoriy)</span><input id="pNote" maxlength="80" placeholder="Masalan: qo'shni, hamkasb" autocomplete="off"></label>
      <p class="form-err" id="pErr" hidden></p>
      <div class="modal-actions"><button type="button" class="btn ghost" data-close>Bekor qilish</button><button type="submit" class="btn">Saqlash</button></div></form>`, { lock: true });
  const q = (s) => $(s, m.box);
  q("#pName").value = editing ? editing.name : ""; q("#pNote").value = editing ? editing.note : "";
  const ph = bindPhoto(m.box, editing ? editing.avatar : "", q("#pName"));
  q("#pForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = clip(q("#pName").value, 60), note = clip(q("#pNote").value, 80), err = q("#pErr");
    err.hidden = true; q("#pName").classList.remove("invalid");
    const fail = (msg) => { err.textContent = msg; err.hidden = false; q("#pName").classList.add("invalid"); q("#pName").focus(); };
    if (!name) return fail("Ismni kiriting.");
    const dup = state.people.find((p) => p.id !== (editing && editing.id) && p.name.toLowerCase() === name.toLowerCase() && (p.note || "").toLowerCase() === note.toLowerCase());
    if (dup) return fail(`«${dup.name}» ismli inson allaqachon bor. Boshqa odam bo'lsa, izohda farqlang (masalan: qo'shni).`);
    if (editing) {
      editing.name = name; editing.note = note;
      if (ph.pending !== undefined) editing.avatar = ph.pending;
    } else {
      state.people.push({ id: uid(), name, note, avatar: ph.pending || "", createdAt: new Date().toISOString() });
    }
    m.close();
    commit(editing ? "Inson yangilandi" : "Inson qo'shildi");
  });
}

async function deletePerson(id) {
  const p = pIndex.get(id);
  if (!p) return;
  const n = state.transactions.filter((t) => t.personId === id).length;
  const ok = await confirmDialog({
    title: `«${p.name}» o'chirilsinmi?`,
    text: n ? `Inson va unga bog'liq <b>${n} ta operatsiya</b> butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.` : "Bu inson ro'yxatdan o'chiriladi.",
    ok: "Ha, o'chirish", danger: true,
  });
  if (!ok) return;
  state.people = state.people.filter((x) => x.id !== id);
  state.transactions = state.transactions.filter((t) => t.personId !== id);
  reindex(); save();
  toast("Inson o'chirildi");
  if (location.hash.startsWith("#/people/")) location.hash = "#/people"; else render();
}

function openProfileModal(first = false) {
  let demoAfter = false;
  const m = openModal(`<h3>${first ? "Xush kelibsiz!" : "Profilni tahrirlash"}</h3><p class="m-sub">${first ? "Ismingizni kiriting va rasm tanlang — keyinroq o'zgartirishingiz mumkin." : "Ism va rasmingiz saytda ko'rinib turadi"}</p>
    <form id="prForm" novalidate>${photoHTML}
      <label class="fld"><span>Ismingiz</span><input id="prName" maxlength="60" autocomplete="name" placeholder="Masalan: Abdulloh"></label>
      <label class="fld"><span>Shahar (ob-havo uchun)</span><select id="prCity">${opts(Object.keys(CITIES).map((c) => [c, c]), state.profile.city)}</select></label>
      <p class="form-err" id="prErr" hidden></p>
      <div class="modal-actions" style="flex-wrap:wrap">${first ? "" : `<button type="button" class="btn ghost" data-close>Bekor qilish</button>`}
        ${first ? `<button type="button" class="btn ghost" id="prDemo">Namuna bilan boshlash</button>` : ""}<button type="submit" class="btn" id="prSave">${first ? "Boshlash" : "Saqlash"}</button></div></form>`, { lock: true, persistent: first });
  const q = (s) => $(s, m.box);
  q("#prName").value = state.profile.name;
  const ph = bindPhoto(m.box, state.profile.avatar, q("#prName"));
  if (first) q("#prDemo").addEventListener("click", () => { demoAfter = true; q("#prSave").click(); });
  q("#prForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = clip(q("#prName").value, 60), err = q("#prErr");
    if (!name) { demoAfter = false; err.textContent = "Ismingizni kiriting."; err.hidden = false; q("#prName").classList.add("invalid"); q("#prName").focus(); return; }
    state.profile.name = name; state.profile.city = CITIES[q("#prCity").value] ? q("#prCity").value : "Toshkent";
    if (ph.pending !== undefined) state.profile.avatar = ph.pending;
    m.close();
    if (demoAfter) { fillDemo(); save(); render(); toast("Namunaviy ma'lumotlar yuklandi"); }
    else commit(first ? `Xush kelibsiz, ${name}!` : "Profil saqlandi");
    loadWeather();
  });
}

/* ==========================================================
   19. ZAXIRA, IMPORT, CSV, NAMUNA
   ========================================================== */
function download(name, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function exportJSON() {
  state.meta.lastBackup = new Date().toISOString();
  const payload = { ...state, exportedAt: state.meta.lastBackup };
  download(`moneytrack-zaxira-${todayISO()}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  save(); render();
  toast("Zaxira nusxa yuklab olindi");
}
function csvCell(v) {
  let s = String(v == null ? "" : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;      // Excel formulalaridan himoya
  if (/[";\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function exportCSV() {
  if (!state.transactions.length) return toast("Eksport qilish uchun operatsiya yo'q", "err");
  const head = ["ID", "Sana", "Vaqt", "Tur", "Maqsad", "Inson", "Inson izohi", "Summa", "Valyuta", "Sabab", "Yo'nalish", "Izoh"];
  const rows = [...state.transactions].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1)).map((t) => {
    const p = pIndex.get(t.personId);
    return [t.id, t.date, t.time, TYPES[t.type].label, (KIND_BADGE[`${t.type}:${t.kind || ""}`] || [""])[0], p ? p.name : "", p ? p.note : "",
      minorToPlain(t.amount), t.currency, t.reason, t.type === "expense" ? catOf(t.category).name : "", t.note];
  });
  const csv = "\ufeff" + [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
  download(`moneytrack-operatsiyalar-${todayISO()}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
  toast("CSV yuklab olindi");
}

function keepPrev() { try { localStorage.setItem(PREV_KEY, JSON.stringify(state)); } catch (e) { /* xotira to'lgan bo'lishi mumkin */ } }

async function handleImportFile(file) {
  if (!file) return;
  const errBox = (list) => openModal(`<h3>Faylni import qilib bo'lmadi</h3><p style="margin-top:8px">Hech narsa o'zgartirilmadi. Sabablar:</p>
    <ul style="color:var(--text-2);line-height:1.6;padding-left:20px">${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><div class="modal-actions"><button class="btn" data-close>Yopish</button></div>`);
  if (file.size > 30 * 1024 * 1024) return errBox(["Fayl 30 MB dan katta."]);
  let obj;
  try { obj = JSON.parse(await file.text()); } catch (e) { return errBox(["Bu to'g'ri JSON fayl emas."]); }
  const res = validateData(obj);
  if (!res.ok) return errBox(res.errors);
  const d = res.data;
  const m = openModal(`<h3>Fayl tekshirildi ✓</h3>
    <div class="kv-big" style="margin:14px 0"><div><small>Fayldagi operatsiyalar</small><b>${d.transactions.length}</b></div><div><small>Fayldagi insonlar</small><b>${d.people.length}</b></div></div>
    <p><b>Birlashtirish</b> — faqat yangi yozuvlar qo'shiladi, mavjudlari o'zgarmaydi.<br><b>Almashtirish</b> — joriy ma'lumot (${state.transactions.length} ta operatsiya, ${state.people.length} ta inson) fayldagi bilan almashadi; eski holat nusxasi saqlab qo'yiladi.</p>
    <div class="modal-actions" style="flex-wrap:wrap"><button class="btn ghost" data-close>Bekor qilish</button><button class="btn ghost" id="imMerge">Birlashtirish</button><button class="btn danger" id="imReplace">Almashtirish</button></div>`);
  $("#imReplace", m.box).addEventListener("click", () => { keepPrev(); state = d; m.close(); commit("Zaxiradan tiklandi"); });
  $("#imMerge", m.box).addEventListener("click", () => {
    const pids = new Set(state.people.map((p) => p.id)), tids = new Set(state.transactions.map((t) => t.id));
    let np = 0, nt = 0;
    for (const p of d.people) if (!pids.has(p.id)) { state.people.push(p); np++; }
    for (const t of d.transactions) if (!tids.has(t.id)) { state.transactions.push(t); nt++; }
    m.close();
    commit(`${nt} ta operatsiya va ${np} ta inson qo'shildi`);
  });
}
async function restorePrev() {
  let res;
  try { res = validateData(JSON.parse(localStorage.getItem(PREV_KEY))); } catch (e) { res = { ok: false }; }
  if (!res.ok) return toast("Oldingi holat topilmadi", "err");
  const ok = await confirmDialog({ title: "Oldingi holat tiklansinmi?", text: "Joriy ma'lumot oxirgi importdan oldingi holat bilan almashtiriladi.", ok: "Tiklash" });
  if (!ok) return;
  state = res.data; commit("Oldingi holat tiklandi");
}
async function clearAll() {
  const ok = await confirmDialog({ title: "Hamma ma'lumot o'chirilsinmi?", text: `<b>${state.transactions.length}</b> ta operatsiya va <b>${state.people.length}</b> ta inson butunlay o'chadi. Avval JSON zaxira nusxa olishni tavsiya qilamiz.`, ok: "Ha, hammasini o'chirish", danger: true });
  if (!ok) return;
  keepPrev();
  state.people = []; state.transactions = []; state.settings.initial = { UZS: 0, USD: 0, KGS: 0 }; state.meta.lastBackup = "";
  commit("Barcha ma'lumot o'chirildi");
}

function fillDemo() {
  const names = [["Ali", "do'st"], ["Mehribon", "opa"], ["Vali", "hamkasb"], ["Azizbek", "qo'shni"], ["Dilshod", "do'st"]];
  const people = names.map(([name, note], i) => ({ id: uid() + i, name, note, avatar: "", createdAt: new Date().toISOString() }));
  // [necha kun oldin, tur, maqsad/yo'nalish, inson, summa, valyuta, sabab]
  const D = [
    [0, "gave", "loan", 0, 300000, "UZS", "Bozorlik uchun qarz"], [1, "received", "income", 1, 250000, "UZS", "Sovg'a pul"],
    [1, "expense", "food", null, 85000, "UZS", "Supermarket"], [2, "gave", "gift", 2, 50, "USD", "Tug'ilgan kun sovg'asi"],
    [3, "expense", "transport", null, 40000, "UZS", "Taksi"], [4, "received", "repay", 4, 120000, "UZS", "Qarzning bir qismi"],
    [6, "gave", "loan", 4, 310000, "UZS", "Telefon ta'miri"], [7, "expense", "education", null, 450000, "UZS", "Ingliz tili kursi"],
    [9, "gave", "loan", 0, 400000, "UZS", "Oylik yetmadi"], [12, "received", "income", 3, 500000, "UZS", "Loyiha uchun to'lov"],
    [14, "expense", "friends", null, 120000, "UZS", "Do'stlar bilan kafe"], [15, "gave", "loan", 1, 780000, "UZS", "Ta'mir uchun"],
    [18, "gave", "loan", 4, 12500, "KGS", "Bishkek safari"], [20, "received", "borrow", 2, 100, "USD", "Qarz oldim"],
    [22, "expense", "utilities", null, 210000, "UZS", "Kommunal to'lovlar"], [25, "gave", "gift", 3, 420000, "UZS", "To'y uchun"],
    [28, "received", "income", 1, 3000, "KGS", "Sovg'a"], [30, "gave", "loan", 0, 650000, "UZS", "Mashina ta'miri"],
    [35, "received", "income", 2, 320, "USD", "Frilans to'lov"], [40, "expense", "health", null, 180000, "UZS", "Dorixona"],
    [45, "gave", "loan", 2, 560000, "UZS", "Qarz"], [50, "received", "repay", 0, 200000, "UZS", "Qarzni qaytardi"],
    [55, "expense", "transport", null, 2500, "KGS", "Bishkekda taksi"], [60, "expense", "food", null, 300000, "UZS", "Oylik oziq-ovqat"],
    [80, "gave", "gift", 1, 150, "USD", "Sovg'a"], [100, "expense", "fun", null, 90000, "UZS", "Kino va o'yin"],
    [130, "received", "income", 3, 1200000, "UZS", "Maosh"], [160, "received", "income", 1, 2000000, "UZS", "Maosh"],
    [190, "gave", "gift", 0, 300000, "UZS", "Yordam"],
  ];
  const now = new Date();
  const txs = D.map(([off, type, k, pi, amt, currency, reason], i) => {
    const exp = type === "expense";
    return { id: uid() + "d" + i, type, kind: exp ? "" : k, amount: amt * 100, currency, personId: pi == null ? null : people[pi].id, reason,
      category: exp ? k : "", date: toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - off)), time: pad(9 + ((i * 7) % 12)) + ":" + pad((i * 13) % 60), note: "",
      createdAt: new Date(now.getTime() - off * 86400000 + i * 1000).toISOString() };
  });
  state.people = people; state.transactions = txs;
  state.settings.initial = { UZS: 1500000 * 100, USD: 0, KGS: 0 };
}
async function loadDemo() {
  if (state.transactions.length || state.people.length) {
    const ok = await confirmDialog({ title: "Namunaviy ma'lumot yuklansinmi?", text: "Joriy insonlar va operatsiyalar namunaviy ma'lumot bilan almashtiriladi (eski holat nusxasi saqlab qo'yiladi).", ok: "Yuklash" });
    if (!ok) return;
  }
  keepPrev(); fillDemo(); commit("Namunaviy ma'lumotlar yuklandi");
}

/* ==========================================================
   20. OB-HAVO VA MARKAZIY BANK KURSI (ixtiyoriy, internet kerak)
   ========================================================== */
async function loadWeather() {
  const city = state.profile.city, c = CITIES[city] || CITIES.Toshkent;
  if (ui.weather && ui.weather.city === city && Date.now() - ui.weather.at < 30 * 60000) return;
  try {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c[0]}&longitude=${c[1]}&current=temperature_2m,weather_code&timezone=auto`, { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) throw new Error("http");
    const cu = (await r.json()).current;
    if (!cu || typeof cu.temperature_2m !== "number") throw new Error("data");
    ui.weather = { city, temp: cu.temperature_2m, code: cu.weather_code | 0, at: Date.now() };
    const w = $("#weather");
    if (w) w.outerHTML = weatherHTML();
  } catch (e) { /* internet yo'q bo'lsa ob-havo ko'rinmaydi, sayt ishlayveradi */ }
}
async function fetchCBU() {
  const btn = $('[data-act="rates-fetch"]');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/");
    if (!r.ok) throw new Error("http");
    const arr = await r.json(), out = {};
    let date = "";
    for (const c of ["USD", "KGS"]) {
      const x = arr.find((i) => i.Ccy === c);
      if (!x) throw new Error("yo'q");
      const v = parseFloat(String(x.Rate).replace(",", ".")) / (parseFloat(x.Nominal) || 1);
      if (!(v > 0)) throw new Error("qiymat");
      out[c] = String(Math.round(v * 10000) / 10000);
      date = x.Date;
    }
    $("#rateUSD").value = out.USD; $("#rateKGS").value = out.KGS;
    const mm = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date || "");
    if (mm) $("#rateDate").value = `${mm[3]}-${mm[2]}-${mm[1]}`;
    toast("Kurslar yuklandi. «Saqlash» tugmasini bosing.");
  } catch (e) {
    toast("Markaziy bank kursini olib bo'lmadi. Kursni qo'lda kiriting.", "err");
  } finally { if (btn) btn.disabled = false; }
}

/* ==========================================================
   21. HODISALAR (tugmalar, maydonlar, klaviatura)
   ========================================================== */
document.addEventListener("click", (e) => {
  const t = e.target;
  if (!t.closest(".dropdown")) closeDropdowns();
  if (t.closest(".nav-item") || t.closest(".brand")) closeSidebar();
  const el = t.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act, d = el.dataset;
  if (act !== "bell" && act !== "user") closeDropdowns();
  switch (act) {
    case "menu": toggleSidebar(); break;
    case "theme": setTheme(state.settings.theme === "dark" ? "light" : "dark"); break;
    case "set-theme": setTheme(d.v); break;
    case "bell": { const p = $("#bellPanel"), open = p.hidden; closeDropdowns(); if (open) { p.innerHTML = notesHTML(); p.hidden = false; } break; }
    case "user": { const p = $("#userMenu"), open = p.hidden; closeDropdowns(); p.hidden = !open; break; }
    case "add-tx": openTxModal({ type: d.type, kind: d.kind, personId: d.person }); break;
    case "edit-tx": openTxModal({ id: d.id }); break;
    case "del-tx": deleteTx(d.id); break;
    case "add-person": openPersonModal(); break;
    case "edit-person": openPersonModal(d.id); break;
    case "del-person": deletePerson(d.id); break;
    case "edit-profile": openProfileModal(false); break;
    case "change-avatar": $("#fileAvatar").click(); break;
    case "remove-avatar": state.profile.avatar = ""; commit("Rasm olib tashlandi"); break;
    case "view": state.settings.view = d.v; save(); render(); break;
    case "period": ui.period = d.v; render(); break;
    case "range": setRange(d.v); break;
    case "clear-filters": ui.q = ""; ui.f = { person: "", currency: "", type: "", from: "", to: "", sort: "new" }; $("#globalSearch").value = ""; render(); break;
    case "more-tx": ui.txLimit += 25; render(); break;
    case "export-json": exportJSON(); break;
    case "import-json": $("#fileImport").click(); break;
    case "export-csv": exportCSV(); break;
    case "restore-prev": restorePrev(); break;
    case "rates-today": { const i = $("#rateDate"); if (i) i.value = todayISO(); break; }
    case "rates-fetch": fetchCBU(); break;
    case "demo": loadDemo(); break;
    case "clear-all": clearAll(); break;
  }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.matches && t.matches("[data-money]")) { fmtMoneyInput(t); if (t.id === "cvAmt") updateConverter(); return; }
  if (t.id === "globalSearch" || t.id === "txSearch") {
    ui.q = t.value; ui.txLimit = 25;
    const other = $(t.id === "globalSearch" ? "#txSearch" : "#globalSearch");
    if (other && other.value !== t.value) other.value = t.value;
    if (ui.page !== "transactions") location.hash = "#/transactions"; else refreshTx();
    return;
  }
  if (t.id === "peopleSearch") {
    ui.peopleQ = t.value; render();
    const el = $("#peopleSearch");
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
});

document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.flt) { ui.f[t.dataset.flt] = t.value; ui.txLimit = 25; refreshTx(); return; }
  switch (t.id) {
    case "rangeFrom": case "rangeTo":
      if (t.id === "rangeFrom") ui.from = t.value; else ui.to = t.value;
      if (ui.from && ui.to && ui.from > ui.to) [ui.from, ui.to] = [ui.to, ui.from];
      render(); break;
    case "peopleSort": ui.peopleSort = t.value; render(); break;
    case "cvFrom": case "cvTo": updateConverter(); break;
    case "setBase": state.settings.base = CUR[t.value] ? t.value : "UZS"; commit("Saqlandi"); break;
    case "fileAvatar":
      try { if (t.files[0]) { state.profile.avatar = await resizeImage(t.files[0]); commit("Rasm yangilandi"); } } catch (err) { toast(err.message, "err"); }
      t.value = ""; break;
    case "fileImport": handleImportFile(t.files[0]); t.value = ""; break;
  }
});

document.addEventListener("submit", (e) => {
  const f = e.target, kind = f.dataset && f.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const show = (id, msg) => { const el = $(id); el.textContent = msg; el.hidden = false; };
  if (kind === "profile") {
    const name = clip($("#setName").value, 60);
    if (!name) return show("#setErr", "Ismingizni kiriting.");
    state.profile.name = name; state.profile.city = CITIES[$("#setCity").value] ? $("#setCity").value : "Toshkent";
    commit("Profil saqlandi"); loadWeather();
  } else if (kind === "initial") {
    const vals = {};
    for (const c of CUR_LIST) {
      const raw = $("#ini" + c).value.trim();
      const v = raw === "" ? 0 : parseAmount(raw, true);
      if (v === null) return show("#iniErr", `${c}: summani to'g'ri kiriting (masalan, 1500000 yoki 25.50).`);
      vals[c] = v;
    }
    state.settings.initial = vals; commit("Boshlang'ich qoldiqlar saqlandi");
  } else if (kind === "rates") {
    const usd = $("#rateUSD").value.trim(), kgs = $("#rateKGS").value.trim(), date = $("#rateDate").value;
    if (!(parseRateScaled(usd) > 0) || !(parseRateScaled(kgs) > 0)) return show("#rateErr", "Kurslarni to'g'ri kiriting: noldan katta son (masalan, 12600 yoki 150.5).");
    if (!isValidISO(date)) return show("#rateErr", "Kurs sanasini kiriting.");
    state.settings.rates = { USD: usd.replace(/\s/g, "").replace(",", "."), KGS: kgs.replace(/\s/g, "").replace(",", "."), date };
    commit("Kurslar saqlandi");
  }
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#globalSearch").focus(); return; }
  if (e.key === "Escape") {
    if (modalStack.length) { const m = modalStack[modalStack.length - 1]; if (!m.persistent) m.close(); }
    else { closeDropdowns(); closeSidebar(); }
  }
});

/* ==========================================================
   22. ISHGA TUSHIRISH
   ========================================================== */
function init() {
  updateChrome();
  window.addEventListener("hashchange", route);
  route();
  loadWeather();
  if (!storageOK) toast("Brauzer xotirasi yopiq: ma'lumotlar saqlanmaydi. JSON zaxira oling.", "err");
  if (!state.profile.name) setTimeout(() => openProfileModal(true), 250);
  if ("ResizeObserver" in window) {
    let w = 0, raf = 0;
    new ResizeObserver(() => {
      const nw = $("#view").clientWidth;
      if (nw !== w) { w = nw; cancelAnimationFrame(raf); raf = requestAnimationFrame(drawCharts); }
    }).observe($("#view"));
  } else window.addEventListener("resize", drawCharts);
}
init();

})();