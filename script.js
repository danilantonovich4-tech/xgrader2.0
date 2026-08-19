const el = id => document.querySelector(`[data-id="${id}"]`);

/* ==== Firebase ====
   Конфиг из консоли Firebase (Project settings -> Add Firebase SDK).
   Пользователи (баланс, инвентарь) хранятся в Realtime Database по пути users/{id}.
   ВАЖНО: в Rules базы данных нужно разрешить чтение/запись, иначе всё будет падать
   с ошибкой PERMISSION_DENIED (правила по умолчанию всё запрещают). Для теста подойдут:
   { "rules": { ".read": true, ".write": true } }
   (Это открытые правила, как и было с анонимным ключом Supabase — для реального проекта
   их стоит ужесточить, но для демо-макета этого достаточно.) */
const firebaseConfig = {
  apiKey: "AIzaSyCujC-4wuKjFR-OUvEUpe7IHAXiAkOy53o",
  authDomain: "xgrader-949ce.firebaseapp.com",
  databaseURL: "https://xgrader-949ce-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "xgrader-949ce",
  storageBucket: "xgrader-949ce.firebasestorage.app",
  messagingSenderId: "954106347110",
  appId: "1:954106347110:web:183f425148f2fd185637a7",
  measurementId: "G-FE0SY44Q4C"
};
let supa = null; // db-объект (имя оставлено, чтобы не переписывать весь код ниже)
try {
  if (window.firebase) {
    firebase.initializeApp(firebaseConfig);
    supa = firebase.database();
  }
} catch(e) { console.warn('Firebase не инициализирован:', e); }

const THEMES = [
  { id: 'white',  label: 'Белый',    dot: 'rgb(248, 248, 248)', pShape: 'snowflake', pColor: 'rgba(120, 160, 255, 0.5)' },
  { id: 'black',  label: 'Чёрный',   dot: 'rgb(28, 28, 28)',   pShape: 'star',      pColor: 'rgba(255, 255, 255, 0.4)' },
  { id: 'red',    label: 'Красный',  dot: 'rgb(224, 64, 64)',  pShape: 'triangle',  pColor: 'rgba(255, 80, 80, 0.4)' },
  { id: 'purple', label: 'Фиолетовый', dot: 'rgb(160, 90, 230)', pShape: 'diamond', pColor: 'rgba(180, 100, 255, 0.4)' },
  { id: 'blue',   label: 'Синий',    dot: 'rgb(70, 140, 235)', pShape: 'circle',    pColor: 'rgba(100, 180, 255, 0.4)' },
  { id: 'green',  label: 'Зелёный',  dot: 'rgb(80, 200, 120)', pShape: 'square',    pColor: 'rgba(100, 220, 130, 0.4)' },
  { id: 'yellow', label: 'Жёлтый',   dot: 'rgb(230, 195, 60)', pShape: 'star',      pColor: 'rgba(255, 220, 100, 0.4)' },
];

let currentThemeConfig = THEMES[1];

function applyTheme(themeId){
  document.documentElement.setAttribute('data-theme', themeId);
  try { localStorage.setItem('xgrader-theme', themeId); } catch(e) {}
  document.querySelectorAll('.theme-picker .swatch-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.theme === themeId);
  });
  currentThemeConfig = THEMES.find(t => t.id === themeId) || THEMES[1];
  if (window.fillRange) {
    window.fillRange(el('particleCountRange'));
    window.fillRange(el('particleSpeedRange'));
  }
  updateAutoShapeIcon();
}

function updateAutoShapeIcon(){
  const btn = document.querySelector('.shape-picker .shape-btn[data-shape="auto"]');
  if (!btn) return;
  const match = PARTICLE_SHAPES.find(s => s.id === currentThemeConfig.pShape);
  btn.textContent = match ? match.icon : '✦';
}

(function initThemePicker(){
  const picker = el('themePicker');
  THEMES.forEach(t=>{
    const btn = document.createElement('button');
    btn.className = 'swatch-btn';
    btn.dataset.theme = t.id;
    btn.title = t.label;
    btn.style.background = t.dot;
    btn.addEventListener('click', ()=>applyTheme(t.id));
    picker.appendChild(btn);
  });
  let saved = 'black';
  try { saved = localStorage.getItem('xgrader-theme') || 'black'; } catch(e) {}
  applyTheme(saved);
})();

const PARTICLE_SHAPES = [
  { id: 'auto',      label: 'Авто (по теме)', icon: '✦' },
  { id: 'snowflake', label: 'Снежинки',        icon: '❄' },
  { id: 'circle',    label: 'Кружки',          icon: '●' },
  { id: 'star',      label: 'Звёзды',          icon: '★' },
  { id: 'triangle',  label: 'Треугольники',    icon: '▲' },
  { id: 'diamond',   label: 'Ромбы',           icon: '◆' },
  { id: 'square',    label: 'Квадраты',        icon: '■' },
];

let currentParticleShape = 'auto';

function applyParticleShape(shapeId){
  currentParticleShape = shapeId;
  try { localStorage.setItem('xgrader-particle-shape', shapeId); } catch(e) {}
  document.querySelectorAll('.shape-picker .shape-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.shape === shapeId);
  });
}

function getEffectiveParticleShape(){
  return currentParticleShape === 'auto' ? currentThemeConfig.pShape : currentParticleShape;
}

(function initShapePicker(){
  const picker = el('shapePicker');
  if (!picker) return;
  PARTICLE_SHAPES.forEach(s=>{
    const btn = document.createElement('button');
    btn.className = 'shape-btn';
    btn.dataset.shape = s.id;
    btn.title = s.label;
    btn.textContent = s.icon;
    btn.type = 'button';
    btn.addEventListener('click', ()=>applyParticleShape(s.id));
    picker.appendChild(btn);
  });
  let savedShape = 'auto';
  try { savedShape = localStorage.getItem('xgrader-particle-shape') || 'auto'; } catch(e) {}
  applyParticleShape(savedShape);
  updateAutoShapeIcon();
})();

let promoCodes = {};

/* ==== Система редкости (официальная шкала Standoff 2) ====
   Common / Uncommon / Rare / Epic / Legendary / Arcane / Nameless —
   такая же семиуровневая шкала и цветовая гамма, что используется в самой игре. */
/* ==== Система редкости (официальная шкала Standoff 2) ====
   Common / Uncommon / Rare / Epic / Legendary / Arcane —
   в этом магазине нет предметов уровня Nameless (это самая высшая,
   уникальная редкость игры — золотой Karambit, MAC10 Ruby Shadow и т.п.),
   поэтому шкала здесь ограничена шестью уровнями. */
const RARITIES = [
  { name: 'Common',    max: 2000,     color: '#9e9e9e' },
  { name: 'Uncommon',  max: 4500,     color: '#4fc3f7' },
  { name: 'Rare',      max: 9500,     color: '#3b6cff' },
  { name: 'Epic',      max: 14000,    color: '#a020f0' },
  { name: 'Legendary', max: 19500,    color: '#ff4fc3' },
  { name: 'Arcane',    max: Infinity, color: '#ff3b3b' },
];

/* Редкость реальных предметов Standoff 2, найденная по названиям в открытых
   источниках (вики-коллекции Rival, Project Z9, Kitsune Dreams и т.д.):
   - AKR "Carbon" — редкость Rare (коллекция Rival)
   - Kunai "Bone" / "Poison" — награды сезона Project Z9 (нож), Legendary
   - Kunai "WaveSong" — топовая награда коллекции Kitsune Dreams, Arcane
   - jKommando "Luxury" — отдельная категория ножей коллекции Rival, Arcane
   Ножи, перчатки и другое холодное оружие (Kunai, Fang, Butterfly, Flip,
   Stiletto, Dual Daggers, jKommando, Gloves) в Standoff 2 всегда выше по
   редкости, чем обычное огнестрельное оружие того же ценового диапазона —
   их нельзя скрафтить из низких категорий, поэтому они размечены как
   Legendary/Arcane, даже если в этом магазине стоят дешевле оружия. */
const RARITY_OVERRIDES = {
  'AKR | Carbon':               'Rare',
  'ST AKR | Carbon':             'Rare',
  'M16 | Murena':                'Legendary',
  'AKR Nano | StatTrak™':        'Rare',
  'Famas | Feral':               'Legendary',
  'Sticker | Mummy':             'Rare',
  'ST AKR12 | Geometric':        'Legendary',
  'MP7 | Winter Sport':          'Rare',
  'Sticker | Alpha7 Esports':    'Legendary',
  'Sticker | Toxic':             'Epic',
  'Kunai | Reaper':              'Arcane',
  'Mantis | Nest':               'Arcane',
  'Tanto | Dojo':                'Arcane',
  'Mantis | Citrine':            'Arcane',
  'ST M40 | Quake':              'Epic',
  'Scorpion | Holiday Frosy':    'Arcane',
  'Sting | Corrode':             'Arcane',
  'Scorpion | Veil':             'Arcane',
  'Scorpion | Starfail':         'Arcane',
  'Flip | Dragon Glass':         'Arcane',
  'AKR | Mirage Menace':         'Arcane',
  'Kunai | Show Camo':           'Arcane',
  'Gloves | Onyx':               'Arcane',
  'Sting | Temper Shades':       'Arcane',
  'Fang | Wavesong':             'Arcane',
  'ST G22 | Frozen':             'Arcane',
  'M4A1 | BubbleGum':            'Arcane',
  'Kunai | Bone':                'Arcane',
  'Gloves | Immolation':         'Arcane',
  'Butterfly | Glitch':          'Arcane',
  'Kunai | Poison':              'Arcane',
  'Sting | Shroud':              'Arcane',
  'AKR | Reis':                  'Arcane',
  'Gloves | Thung':              'Arcane',
  'Gloves | Templar':            'Arcane',
  'jKommando | Luxury':          'Arcane',
  'Stiletto | Soul Devourer':    'Arcane',
  'Gloves | Acid':               'Arcane',
  'Butterfly | Saphira':         'Arcane',
  'Butterfly | Legacy':          'Arcane',
  'Kunai | WaveSong':            'Arcane',
  'Dual Daggers | Demonic Steel':'Arcane',
  'Fang | Damascus':             'Arcane',
};

function getRarityByPrice(price){
  for (const r of RARITIES) if (price <= r.max) return r;
  return RARITIES[RARITIES.length - 1];
}
function getRarity(priceOrItem, maybeName){
  // Поддержка старого вызова getRarity(price) и нового getRarity(item)
  let price, name;
  if (typeof priceOrItem === 'object' && priceOrItem !== null) {
    price = priceOrItem.price;
    name = priceOrItem.name;
  } else {
    price = priceOrItem;
    name = maybeName;
  }
  if (name && RARITY_OVERRIDES[name]) {
    const forced = RARITY_OVERRIDES[name];
    return RARITIES.find(r => r.name === forced) || getRarityByPrice(price);
  }
  return getRarityByPrice(price);
}
function rarityLabelHtml(item){
  if (!item || !item.price) return '';
  const r = getRarity(item);
  return `<div class="rarity-label" style="color:${r.color}">${r.name}</div>`;
}

/* ==== Подсветка тега "ST" (StatTrak) жёлтым в названиях оружия ==== */
function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function highlightItemName(name){
  const esc = escapeHtml(name);
  return esc.replace(/\bST\b/g, '<span class="st-tag">ST</span>');
}
function setItemNameHtml(element, name){
  if (!element) return;
  element.innerHTML = highlightItemName(name);
}

const COLORS = [
  'rgb(235,235,235)', 'rgb(200,200,200)', 'rgb(170,170,170)', 'rgb(140,140,140)',
  'rgb(110,110,110)', 'rgb(90,90,90)', 'rgb(60,60,60)', 'rgb(220,220,220)'
];
const NAMES = ['Комета','Затмение','Зенит','Пульсар','Мираж','Обсидиан','Феникс','Аврора','Вихрь','Кварц','Небула','Разлом'];

function makeItem(price, seed){
  const n = NAMES[seed % NAMES.length] + ' ' + (100+seed);
  const c = COLORS[seed % COLORS.length];
  // Без фото: для процедурно генерируемых предметов используется цветной
  // градиент (см. setItemBg) — так как для них нет фиксированной картинки.
  return {id:'i'+seed, name:n, price, color:c};
}

let seed = 1;
let inventory = [];

const shopSkins = [
  {name:'AKR | Carbon', price:500, image:'img/akr-carbon.png'},
  {name:'M16 | Murena', price:1000, image:'img/m16-murena.png'},
  {name:'AKR Nano | StatTrak™', price:1500, image:'img/akr-nano-stattrak.png'},
  {name:'Famas | Feral', price:2000, image:'img/famas-feral.png'},
  {name:'Sticker | Mummy', price:2500, image:'img/sticker-mummy.png'},
  {name:'ST AKR12 | Geometric', price:3000, image:'img/st-akr12-geometric.png'},
  {name:'MP7 | Winter Sport', price:3500, image:'img/mp7-winter-sport.png'},
  {name:'Sticker | Alpha7 Esports', price:4000, image:'img/sticker-alpha7-esports.png'},
  {name:'Sticker | Toxic', price:4500, image:'img/sticker-toxic.png'},
  {name:'Charm | Snow Flake', price:5000, image:'img/charm-snow-flake.png'},
  {name:'Tanto | Dojo', price:5500, image:'img/tanto-dojo.png'},
  {name:'Mantis | Citrine', price:6000, image:'img/mantis-citrine.png'},
  {name:'ST M40 | Quake', price:6500, image:'img/st-m40-quake.png'},
  {name:'Kunai | Reaper', price:7000, image:'img/kunai-reaper.png'},
  {name:'Sticker | Ghosty', price:7500, image:'img/sticker-ghosty.png'},
  {name:'Mantis | Nest', price:8000, image:'img/mantis-nest.png'},
  {name:'Scorpion | Holiday Frosy', price:8500, image:'img/scorpion-holiday-frosy.png'},
  {name:'Sting | Corrode', price:9000, image:'img/sting-corrode.png'},
  {name:'Scorpion | Veil', price:9500, image:'img/scorpion-veil.png'},
  {name:'Scorpion | Starfail', price:10000, image:'img/scorpion-starfail.png'},
  {name:'Flip | Dragon Glass', price:10500, image:'img/flip-dragon-glass.png'},
  {name:'AKR | Mirage Menace', price:11500, image:'img/akr-mirage-menace.png'},
  {name:'Kunai | Show Camo', price:12000, image:'img/kunai-show-camo.png'},
  {name:'Gloves | Onyx', price:12500, image:'img/gloves-onyx.png'},
  {name:'Sting | Temper Shades', price:13000, image:'img/sting-temper-shades.png'},
  {name:'Fang | Wavesong', price:13500, image:'img/fang-wavesong.png'},
  {name:'ST AKR | Sport', price:14000, image:'img/st-akr-sport.png'},
  {name:'ST G22 | Frozen', price:14500, image:'img/st-g22-frozen.png'},
  {name:'M4A1 | BubbleGum', price:15000, image:'img/m4a1-bubblegum.png'},
  {name:'Kunai | Bone', price:15500, image:'img/kunai-bone.png'},
  {name:'Gloves | Immolation', price:16000, image:'img/gloves-immolation.png'},
  {name:'Butterfly | Glitch', price:16500, image:'img/butterfly-glitch.png'},
  {name:'Kunai | Poison', price:17000, image:'img/kunai-poison.png'},
  {name:'Sting | Shroud', price:17500, image:'img/sting-shroud.png'},
  {name:'AKR | Reis', price:18000, image:'img/akr-reis.png'},
  {name:'Gloves | Thung', price:18500, image:'img/gloves-thung.png'},
  {name:'Gloves | Templar', price:19000, image:'img/gloves-templar.png'},
  {name:'jKommando | Luxury', price:19500, image:'img/jkommando-luxury.png'},
  {name:'ST AKR | Carbon', price:20000, image:'img/st-akr-carbon.png'},
  {name:'Stiletto | Soul Devourer', price:20500, image:'img/stiletto-soul-devourer.png'},
  {name:'Gloves | Acid', price:21000, image:'img/gloves-acid.png'},
  {name:'Agent T | Marco', price:21500, image:'img/agent-t-marco.png'},
  {name:'Butterfly | Saphira', price:22000, image:'img/butterfly-saphira.png'},
  {name:'ST AKR | Genesis', price:22500, image:'img/st-akr-genesis.png'},
  {name:'Sticker | Samurai', price:23000, image:'img/sticker-samurai.png'},
  {name:'Butterfly | Legacy', price:23500, image:'img/butterfly-legacy.png'},
  {name:'Sticker | Golden Ox', price:24000, image:'img/sticker-golden-ox.png'},
  {name:'Kunai | WaveSong', price:24500, image:'img/kunai-wavesong.png'},
  {name:'Dual Daggers | Demonic Steel', price:25000, image:'img/dual-daggers-demonic-steel.png'},
  {name:'Fang | Damascus', price:25500, image:'img/fang-damascus.png'},
  {name:'Karambit | Cold Flame', price:30000, image:'img/karambit-cold-flame.png'},
  {name:'S1 Mantis | Ink Wash', price:30500, image:'img/s1-mantis-ink-wash.png'},
  {name:'Butterfly | Dragon Glass', price:31000, image:'img/butterfly-dragon-glass.png'},
  {name:'Gloves | Neuro', price:31500, image:'img/gloves-neuro.png'},
  {name:'Gloves | Geometric', price:32000, image:'img/gloves-geometric.png'},
  {name:'Agent T | Adam', price:32500, image:'img/agent-t-adam.png'},
  {name:'Butterfly | Jade Stone', price:33000, image:'img/butterfly-jade-stone.png'},
  {name:'Karambit | Snow Camo', price:33500, image:'img/karambit-snow-camo.png'},
  {name:'Stiletto | Voidroot', price:34000, image:'img/stiletto-voidroot.png'},
  {name:'Tanto | Blossom', price:34500, image:'img/tanto-blossom.png'},
  {name:'Gloves | Hanami', price:35000, image:'img/gloves-hanami.png'},
  {name:'Agent CT | Warden', price:35500, image:'img/agent-ct-warden.png'},
  {name:'Karambit | Year Of The Tiger', price:36000, image:'img/karambit-year-of-the-tiger.png'},
  {name:'Stiletto | Tie Dye', price:36500, image:'img/stiletto-tie-dye.png'},
  {name:'Gloves | Ironclad', price:37000, image:'img/gloves-ironclad.png'},
  {name:'M9 | Dark Shiver', price:37500, image:'img/m9-dark-shiver.png'},
  {name:'Sticker | Z9 Mask', price:38000, image:'img/sticker-z9-mask.png'},
  {name:'ST AWM | Gear', price:38500, image:'img/st-awm-gear.png'},
  {name:'Mantis | Impact', price:39000, image:'img/mantis-impact.png'},
  {name:'AWM | Genesis', price:39500, image:'img/awm-genesis.png'},
  {name:'Karambit | Frozen', price:40000, image:'img/karambit-frozen.png'}
].map((s, i) => ({...s, id:'shopskin'+i, color: COLORS[i % COLORS.length]}));

const cases = [
  {name:'БОМЖ', price:1500, image:'img/case-bomzh.png', items: shopSkins.slice(0, 4)},
  {name:'НОРМАЛДЫ', price:2750, image:'img/case-normaldy.png', items: shopSkins.slice(4, 8)},
  {name:'ИМБИЩЕ', price:3875, image:'img/case-imbische.png', items: [shopSkins[4], ...shopSkins.slice(8, 11)]},
  {name:'ИЗИ БРИДЖИ', price:4670, image:'img/case-easy-bridge.png',
    items: [
      shopSkins.find(s => s.name === 'ST AKR12 | Geometric'),
      shopSkins.find(s => s.name === 'MP7 | Winter Sport'),
      shopSkins.find(s => s.name === 'Sticker | Alpha7 Esports'),
      shopSkins.find(s => s.name === 'Mantis | Citrine'),
    ],
    weights: {
      'ST AKR12 | Geometric': 50,
      'MP7 | Winter Sport': 25,
      'Sticker | Alpha7 Esports': 15,
      'Mantis | Citrine': 10,
    }
  },
  {name:'БЕМ БЕМ', price:5600, image:'img/case-bem-bem.png',
    items: [
      shopSkins.find(s => s.name === 'Sticker | Toxic'),
      shopSkins.find(s => s.name === 'Charm | Snow Flake'),
      shopSkins.find(s => s.name === 'Tanto | Dojo'),
      shopSkins.find(s => s.name === 'ST M40 | Quake'),
    ],
    weights: {
      'Sticker | Toxic': 50,
      'Charm | Snow Flake': 25,
      'Tanto | Dojo': 15,
      'ST M40 | Quake': 10,
    }
  },
  {name:'ДА ДА НЕТ НЕТ', price:6870, image:'img/case-dadanetnet.png',
    items: [
      shopSkins.find(s => s.name === 'Charm | Snow Flake'),
      shopSkins.find(s => s.name === 'Mantis | Citrine'),
      shopSkins.find(s => s.name === 'ST M40 | Quake'),
      shopSkins.find(s => s.name === 'Sticker | Ghosty'),
    ],
    weights: {
      'Charm | Snow Flake': 50,
      'Mantis | Citrine': 25,
      'ST M40 | Quake': 15,
      'Sticker | Ghosty': 10,
    }
  },
  {name:'ФУРИ', price:10000, image:'img/case-furi.png',
    items: [
      shopSkins.find(s => s.name === 'Mantis | Nest'),
      shopSkins.find(s => s.name === 'Scorpion | Starfail'),
      shopSkins.find(s => s.name === 'Flip | Dragon Glass'),
      shopSkins.find(s => s.name === 'Sting | Temper Shades'),
    ],
    weights: {
      'Mantis | Nest': 50,
      'Scorpion | Starfail': 25,
      'Flip | Dragon Glass': 10,
      'Sting | Temper Shades': 5,
    }
  },
];

let balance = 0;
let fromItem = null, toItem = null;
let addedGold = 0;
let currentArrowAngle = 180;

function generateNumericId(){
  // 9 цифр, первая не 0, чтобы ID всегда был ровно 9-значным числом
  let digits = String(Math.floor(Math.random() * 9) + 1);
  for (let i = 0; i < 8; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}

let userId = localStorage.getItem('nova_uid');
// Если сохранённый ID старого формата (например "UID-28PWAW") или пустой —
// перегенерируем его в новом формате: ровно 9 цифр.
if (!userId || !/^[1-9][0-9]{8}$/.test(userId)) {
  userId = generateNumericId();
  localStorage.setItem('nova_uid', userId);
}
el('userIdDisplay').textContent = userId;

/* ==== Синхронизация текущего пользователя с Firebase ====
   Баланс и инвентарь хранятся в Realtime Database по пути users/{id}.
   Если supa не настроен (Firebase SDK не подключён), сайт работает как раньше — только через localStorage. */
let supaSyncTimer = null;
function scheduleSupaSync(){
  if (!supa) return;
  if (supaSyncTimer) clearTimeout(supaSyncTimer);
  supaSyncTimer = setTimeout(syncUserToSupabase, 400);
}
async function syncUserToSupabase(){
  if (!supa) return;
  try {
    await supa.ref('users/' + userId).set({
      id: userId,
      balance: balance,
      inventory: inventory,
      nickname: (typeof nickname !== 'undefined' ? nickname : null),
      updated_at: new Date().toISOString()
    });
  } catch(e) { console.warn('Ошибка синхронизации с Firebase:', e); }
}
async function loadUserFromSupabase(){
  if (!supa) return;
  try {
    const snap = await supa.ref('users/' + userId).once('value');
    const data = snap.val();
    if (data) {
      balance = data.balance || 0;
      inventory = Array.isArray(data.inventory) ? data.inventory : [];
      displayedBalance = balance;
      balanceOut.textContent = balance;
      updateProfile();
    } else {
      // Пользователя ещё нет в базе — создаём запись
      await syncUserToSupabase();
    }
  } catch(e) { console.warn('Ошибка загрузки из Firebase:', e); }
}

/* ==== Журнал пользователей (ID + баланс) ====
   Хранится в localStorage этого браузера — сайт статический, без сервера,
   поэтому "настоящего" общего файла на диске быть не может. Журнал можно
   выгрузить в CSV кнопкой в админ-панели. */
const USERS_LOG_KEY = 'nova_users_log';

function loadUsersLog(){
  try {
    const raw = localStorage.getItem(USERS_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){
    return [];
  }
}

function saveUsersLog(log){
  localStorage.setItem(USERS_LOG_KEY, JSON.stringify(log));
}

function upsertUserLog(id, bal){
  const log = loadUsersLog();
  const now = new Date().toISOString();
  const idx = log.findIndex(u => u.id === id);
  if (idx === -1) {
    log.push({ id, balance: bal, createdAt: now, updatedAt: now });
  } else {
    log[idx].balance = bal;
    log[idx].updatedAt = now;
  }
  saveUsersLog(log);
}

function downloadUsersLog(){
  const log = loadUsersLog();
  if (!log.length) return false;
  const header = 'id,balance,createdAt,updatedAt';
  const rows = log.map(u => [u.id, u.balance, u.createdAt, u.updatedAt].join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'users_log.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

// Записываем текущего пользователя в журнал сразу при загрузке
upsertUserLog(userId, balance);

const copyIdBtn = el('copyIdBtn');
const copyIdIconDefault = copyIdBtn.innerHTML;
const copyIdIconCheck = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
copyIdBtn.addEventListener('click', ()=>{
  const finish = () => {
    copyIdBtn.classList.add('copied');
    copyIdBtn.innerHTML = copyIdIconCheck;
    setTimeout(()=>{
      copyIdBtn.classList.remove('copied');
      copyIdBtn.innerHTML = copyIdIconDefault;
    }, 1200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(userId).then(finish).catch(()=>{
      const ta = document.createElement('textarea');
      ta.value = userId;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      finish();
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = userId;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    finish();
  }
});

let nickname = localStorage.getItem('nova_nickname') || 'Игрок';
function applyNickname(){
  const h = el('profNickname');
  if (h) h.textContent = nickname;
}
applyNickname();

const registerOverlay = el('registerOverlay');
const authTitle = el('authTitle');
const authTabLogin = el('authTabLogin');
const authTabRegister = el('authTabRegister');
const authNickInput = el('authNickInput');
const authPassInput = el('authPassInput');
const authSubmitBtn = el('authSubmitBtn');
const registerStatus = el('registerStatus');

function getStoredAccount(){
  const raw = localStorage.getItem('nova_account');
  return raw ? JSON.parse(raw) : null;
}

let authMode = getStoredAccount() ? 'login' : 'register';

function renderAuthMode(){
  registerStatus.textContent = '';
  if (authMode === 'login') {
    authTabLogin.classList.add('active');
    authTabRegister.classList.remove('active');
    authTitle.textContent = 'Вход в X GRADER';
    authSubmitBtn.textContent = 'Войти';
  } else {
    authTabRegister.classList.add('active');
    authTabLogin.classList.remove('active');
    authTitle.textContent = 'Регистрация в X GRADER';
    authSubmitBtn.textContent = 'Зарегистрироваться';
  }
}
renderAuthMode();

authTabLogin.addEventListener('click', ()=>{ authMode = 'login'; renderAuthMode(); });
authTabRegister.addEventListener('click', ()=>{ authMode = 'register'; renderAuthMode(); });

registerOverlay.classList.add('show');
setTimeout(()=>authNickInput.focus(), 0);

authNickInput.addEventListener('input', ()=>{
  const filtered = authNickInput.value.replace(/[^A-Za-z0-9_]/g, '');
  if (filtered !== authNickInput.value) authNickInput.value = filtered;
});

authPassInput.addEventListener('input', ()=>{
  const filtered = authPassInput.value.replace(/[^\x20-\x7E]/g, '');
  if (filtered !== authPassInput.value) authPassInput.value = filtered;
});

function completeAuth(){
  const nick = authNickInput.value.trim();
  const pass = authPassInput.value;

  if (!nick || !pass) {
    registerStatus.textContent = 'Заполните никнейм и пароль';
    registerStatus.style.color = 'var(--bad)';
    return;
  }

  if (authMode === 'register') {
    if (!/^[A-Za-z0-9_]+$/.test(nick)) {
      registerStatus.textContent = 'Никнейм только латиницей (A-Z, 0-9, _)';
      registerStatus.style.color = 'var(--bad)';
      return;
    }
    if (!/^[\x21-\x7E]+$/.test(pass)) {
      registerStatus.textContent = 'Пароль только латиницей, без пробелов и кириллицы';
      registerStatus.style.color = 'var(--bad)';
      return;
    }
    if (pass.length < 8) {
      registerStatus.textContent = 'Пароль минимум 8 символов';
      registerStatus.style.color = 'var(--bad)';
      return;
    }
    const account = { nickname: nick.slice(0, 20), password: pass };
    localStorage.setItem('nova_account', JSON.stringify(account));
    nickname = account.nickname;
    localStorage.setItem('nova_nickname', nickname);
    applyNickname();
    registerOverlay.classList.remove('show');
  } else {
    const account = getStoredAccount();
    if (!account) {
      registerStatus.textContent = 'Аккаунт не найден, зарегистрируйтесь';
      registerStatus.style.color = 'var(--bad)';
      return;
    }
    if (account.nickname.toLowerCase() !== nick.toLowerCase() || account.password !== pass) {
      registerStatus.textContent = 'Неверный никнейм или пароль';
      registerStatus.style.color = 'var(--bad)';
      return;
    }
    nickname = account.nickname;
    localStorage.setItem('nova_nickname', nickname);
    applyNickname();
    registerOverlay.classList.remove('show');
  }
}
authSubmitBtn.addEventListener('click', completeAuth);
[authNickInput, authPassInput].forEach(inp => {
  inp.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter') completeAuth();
  });
});

function setItemBg(element, item) {
  if (item && item.image) {
    element.classList.add('img-loading');
    const img = new Image();
    img.onload = () => {
      element.classList.remove('img-loading');
      element.style.backgroundImage = `url('${item.image}')`;
    };
    img.onerror = () => {
      element.classList.remove('img-loading');
      element.style.background = `linear-gradient(160deg, ${item.color || 'rgb(120,120,120)'}, rgb(10, 10, 10))`;
    };
    img.src = item.image;
  } else {
    element.classList.remove('img-loading');
    element.style.background = `linear-gradient(160deg, ${item ? item.color : 'rgb(120,120,120)'}, rgb(10, 10, 10))`;
  }
  if (item && item.price) {
    const r = getRarity(item);
    element.style.borderColor = r.color;
    element.style.boxShadow = `0 0 12px ${r.color}99, inset 0 0 14px ${r.color}33`;
    element.dataset.rarity = r.name;
    element.setAttribute('data-tooltip', `${item.name} · ${r.name} · ${item.price} G`);
  }
}

function updateProfile() {
  const pId = el('profUserId');
  if (pId) {
    pId.textContent = userId;
    el('profBalance').textContent = balance;
    el('profInvCount').textContent = inventory.length;
  }
}

const balanceOut = el('balanceOut');
const balanceBox = balanceOut.closest('.balance');
let displayedBalance = balance;
let balanceAnimId = null;

function animateBalanceNumber(from, to){
  if (balanceAnimId) cancelAnimationFrame(balanceAnimId);
  const diff = to - from;
  if (balanceBox) {
    balanceBox.classList.remove('balance-up', 'balance-down');
    if (diff > 0) balanceBox.classList.add('balance-up');
    else if (diff < 0) balanceBox.classList.add('balance-down');
  }
  const startTime = performance.now();
  const duration = 550;
  function step(time){
    const t = Math.min((time - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + diff * eased);
    balanceOut.textContent = value;
    if (t < 1) {
      balanceAnimId = requestAnimationFrame(step);
    } else {
      balanceOut.textContent = to;
      displayedBalance = to;
      balanceAnimId = null;
      if (balanceBox) setTimeout(()=> balanceBox.classList.remove('balance-up', 'balance-down'), 350);
    }
  }
  balanceAnimId = requestAnimationFrame(step);
}

function setBalance(v){
  const next = Math.max(0, Math.round(v));
  const from = displayedBalance;
  balance = next;
  animateBalanceNumber(from, next);
  updateProfile();
  upsertUserLog(userId, next);
  scheduleSupaSync();
}
balanceOut.textContent = balance;
updateProfile();
loadUserFromSupabase();

/* ==== Sticky header: блюр фона при скролле ==== */
(function initStickyHeader(){
  const headerEl = document.querySelector('header');
  if (!headerEl) return;
  function onScroll(){
    headerEl.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ==== Аватар профиля ==== */
(function initAvatar(){
  const profAvatar = el('profAvatar');
  const avatarInput = el('avatarInput');
  const profAvatarEmoji = el('profAvatarEmoji');
  if (!profAvatar || !avatarInput) return;

  function applyAvatar(dataUrl){
    profAvatar.style.backgroundImage = `url('${dataUrl}')`;
    if (profAvatarEmoji) profAvatarEmoji.style.display = 'none';
  }

  let savedAvatar = null;
  try { savedAvatar = localStorage.getItem('nova_avatar'); } catch(e) {}
  if (savedAvatar) applyAvatar(savedAvatar);

  profAvatar.addEventListener('click', ()=> avatarInput.click());
  avatarInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const dataUrl = reader.result;
      try { localStorage.setItem('nova_avatar', dataUrl); } catch(err) {}
      applyAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  });
})();

document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    if(t.dataset.id === 'promoBtn' || t.dataset.id === 'shopBtn' || t.dataset.id === 'inventoryBtn') return; 
    document.querySelectorAll('.tab[data-tab]').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    el('panel-'+t.dataset.tab).classList.add('active');
    const dropFeed = el('dropFeed');
    if (dropFeed) dropFeed.style.display = (t.dataset.tab === 'upgrade') ? '' : 'none';
  });
});

const inventoryOverlay = el('inventoryOverlay');
const inventoryCloseBtn = el('inventoryCloseBtn');
const inventoryContent = el('inventoryContent');

let inventorySort = 'price-desc';

function getSortedInventory(){
  const list = inventory.slice();
  switch (inventorySort) {
    case 'price-desc': return list.sort((a, b) => b.price - a.price);
    case 'price-asc':  return list.sort((a, b) => a.price - b.price);
    case 'rarity':      return list.sort((a, b) => b.price - a.price); // редкость завязана на цену
    case 'name':        return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    default:             return list;
  }
}

/* ==== Стрелка сортировки по цене (верхний левый угол попапа инвентаря) ====
   Стрелка вверх — от большего к меньшему (price-desc).
   Стрелка вниз — от меньшего к большему (price-asc). */
const invSortArrowBtn = el('invSortArrowBtn');

function syncInvSortArrow(){
  if (!invSortArrowBtn) return;
  const isAsc = inventorySort === 'price-asc';
  invSortArrowBtn.classList.toggle('asc', isAsc);
  invSortArrowBtn.title = isAsc ? 'Дешевле → дороже' : 'Дороже → дешевле';
}

if (invSortArrowBtn) {
  invSortArrowBtn.addEventListener('click', ()=>{
    inventorySort = (inventorySort === 'price-desc') ? 'price-asc' : 'price-desc';
    syncInvSortArrow();
    renderInventoryPopup();
  });
  syncInvSortArrow();
}

function renderInventoryPopup(){
  inventoryContent.innerHTML = '';
  if (inventory.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'inv-item-empty';
    empty.textContent = 'Инвентарь пуст';
    inventoryContent.appendChild(empty);
    return;
  }
  getSortedInventory().forEach(item => {
    const div = document.createElement('div');
    div.className = 'inv-item';
    const sw = document.createElement('div');
    sw.className = 'sw';
    setItemBg(sw, item);
    div.appendChild(sw);
    const nm = document.createElement('div');
    nm.className = 'nm';
    setItemNameHtml(nm, item.name);
    div.appendChild(nm);
    const rl = document.createElement('div');
    rl.className = 'rarity-label';
    const rarity = getRarity(item);
    rl.textContent = rarity.name;
    rl.style.color = rarity.color;
    div.appendChild(rl);
    const pr = document.createElement('div');
    pr.className = 'pr';
    pr.textContent = item.price + ' G';
    div.appendChild(pr);
    const sellBtn = document.createElement('button');
    sellBtn.className = 'buy-btn';
    const payout = Math.round(item.price * (1 - SELL_COMMISSION));
    sellBtn.textContent = `Продать за ${payout} G (комиссия 15%)`;
    sellBtn.addEventListener('click', ()=>{
      sellItem(item.id);
      renderInventoryPopup();
    });
    div.appendChild(sellBtn);
    inventoryContent.appendChild(div);
  });
}

const SELL_COMMISSION = 0.15;

function sellItem(itemId){
  const idx = inventory.findIndex(i => i.id === itemId);
  if (idx === -1) return;
  const [sold] = inventory.splice(idx, 1);
  const payout = Math.round(sold.price * (1 - SELL_COMMISSION));
  setBalance(balance + payout);
  scheduleSupaSync();
  playSellSound();
  renderInv();
}

function showSkeleton(container, count, cardClass){
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton ' + cardClass;
    container.appendChild(sk);
  }
}

el('inventoryBtn').addEventListener('click', ()=>{
  showSkeleton(inventoryContent, Math.min(Math.max(inventory.length, 3), 6), 'skeleton-item');
  inventoryOverlay.classList.add('show');
  setTimeout(renderInventoryPopup, 380);
});
inventoryCloseBtn.addEventListener('click', ()=>{
  inventoryOverlay.classList.remove('show');
});
inventoryOverlay.addEventListener('click', (e)=>{
  if (e.target === inventoryOverlay) inventoryOverlay.classList.remove('show');
});

const shopSkinsOverlay = el('shopSkinsOverlay');
const shopBtn = el('shopBtn');
const shopSkinsCloseBtn = el('shopSkinsCloseBtn');
const shopSkinsGrid = el('shopSkinsGrid');

function renderShopSkins(){
  shopSkinsGrid.innerHTML = '';
  shopSkins.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'inv-item shop-item';

    const sw = document.createElement('div');
    sw.className = 'sw';
    setItemBg(sw, item);
    div.appendChild(sw);

    const nm = document.createElement('div');
    nm.className = 'nm';
    setItemNameHtml(nm, item.name);
    div.appendChild(nm);

    const rl = document.createElement('div');
    rl.className = 'rarity-label';
    const rarity = getRarity(item);
    rl.textContent = rarity.name;
    rl.style.color = rarity.color;
    div.appendChild(rl);

    const pr = document.createElement('div');
    pr.className = 'pr';
    pr.textContent = item.price + ' G';
    div.appendChild(pr);

    const buyBtn = document.createElement('button');
    buyBtn.className = 'buy-btn';
    buyBtn.textContent = 'Купить';
    buyBtn.addEventListener('click', ()=>{
      if (balance < item.price) {
        const prevText = buyBtn.textContent;
        buyBtn.textContent = 'Не хватает G';
        setTimeout(()=>{ buyBtn.textContent = prevText; }, 1200);
        return;
      }
      setBalance(balance - item.price);
      const bought = { id: 'i' + (seed++), name: item.name, price: item.price, color: item.color, image: item.image };
      inventory.push(bought);
      scheduleSupaSync();
      renderInv();
      playPurchaseSound();
      buyBtn.textContent = 'Куплено!';
      setTimeout(()=>{ buyBtn.textContent = 'Купить'; }, 1200);
    });
    div.appendChild(buyBtn);

    shopSkinsGrid.appendChild(div);
  });
}

shopBtn.addEventListener('click', ()=>{
  showSkeleton(shopSkinsGrid, 6, 'skeleton-item');
  shopSkinsOverlay.classList.add('show');
  setTimeout(renderShopSkins, 380);
});
shopSkinsCloseBtn.addEventListener('click', ()=>{
  shopSkinsOverlay.classList.remove('show');
});
shopSkinsOverlay.addEventListener('click', (e)=>{
  if (e.target === shopSkinsOverlay) shopSkinsOverlay.classList.remove('show');
});

function swatch(item, size){
  const d = document.createElement('div');
  d.className='sw';
  if(size) { d.style.width=size+'px'; d.style.height=size+'px'; }
  setItemBg(d, item);
  d.style.border = '1px solid var(--line-strong)';
  return d;
}

function renderInv(){
  const list = el('invList');
  list.innerHTML='';
  inventory.forEach(it=>{
    const row = document.createElement('div');
    row.className='row-item' + (fromItem && fromItem.id === it.id ? ' selected' : '');
    const sw = document.createElement('div'); sw.className='sw'; 
    setItemBg(sw, it);
    row.appendChild(sw);
    const nm = document.createElement('div'); nm.className='nm'; setItemNameHtml(nm, it.name); row.appendChild(nm);
    const pr = document.createElement('div'); pr.className='pr'; pr.textContent = it.price+' G'; row.appendChild(pr);
    const check = document.createElement('div'); check.className='check'; check.textContent='✓'; row.appendChild(check);
    row.addEventListener('click', ()=>{
      fromItem = (fromItem && fromItem.id === it.id) ? null : it;
      renderSlots();
    });
    list.appendChild(row);
  });

  const strip = el('invStrip');
  strip.innerHTML='';
  inventory.forEach(it=>{
    strip.appendChild(swatch(it,44));
  });
  updateProfile();
}

function renderShop(){
  const list = el('shopList');
  list.innerHTML='';

  const minPrice = fromItem ? fromItem.price : -1;
  const availableTargets = shopSkins.filter(it => it.price > minPrice);

  if (!fromItem) {
    // подсказка убрана
  } else if (availableTargets.length === 0) {
    const hint = document.createElement('div');
    hint.style.cssText = 'color:var(--text-mute);font-size:13px;padding:8px 2px;';
    hint.textContent = 'Нет доступных целей — это ваш самый дорогой предмет';
    list.appendChild(hint);
  }

  availableTargets.forEach(it=>{
    const row = document.createElement('div');
    row.className='row-item' + (toItem && toItem.id === it.id ? ' selected' : '');
    const sw = document.createElement('div'); sw.className='sw'; 
    setItemBg(sw, it);
    row.appendChild(sw);
    const nm = document.createElement('div'); nm.className='nm'; setItemNameHtml(nm, it.name); row.appendChild(nm);
    const pr = document.createElement('div'); pr.className='pr'; pr.textContent = it.price+' G'; row.appendChild(pr);
    const check = document.createElement('div'); check.className='check'; check.textContent='✓'; row.appendChild(check);
    row.addEventListener('click', ()=>{
      toItem = (toItem && toItem.id === it.id) ? null : it;
      renderSlots();
    });
    list.appendChild(row);
  });
}

function chanceFor(from, to){
  if(!from || !to) return 0;
  let c = (from.price/to.price)*100;
  return Math.max(1, Math.min(75, Math.round(c)));
}

function effectiveFromValue(){
  if(!fromItem) return 0;
  return fromItem.price + addedGold;
}

const circumference = 2 * Math.PI * 90;
let displayedPercent = 0;

// Цвет кольца/процента в зависимости от шанса: красный (низкий) -> жёлтый -> зелёный (высокий)
function chanceColor(pct){
  const clamped = Math.max(0, Math.min(100, pct));
  // Держим чистый красный дольше (0-35%), затем плавно к жёлтому (35-65%) и зелёному (65-100%)
  let hue;
  if (clamped <= 35) {
    hue = (clamped / 35) * 15; // 0-35% -> 0-15° (остаётся красным)
  } else if (clamped <= 65) {
    hue = 15 + ((clamped - 35) / 30) * 45; // 35-65% -> 15-60° (к жёлтому)
  } else {
    hue = 60 + ((clamped - 65) / 35) * 60; // 65-100% -> 60-120° (к зелёному)
  }
  return `hsl(${hue}, 82%, 54%)`;
}

function updateProgress(percent){
  const circle = el('progressCircle');
  const dial = el('dial');
  const strokeLength = (percent / 100) * circumference;
  const strokeOffset = circumference - strokeLength;
  circle.setAttribute('stroke-dasharray', `${circumference}`);
  circle.setAttribute('stroke-dashoffset', `${strokeOffset}`);
  const startAngle = 90 - (percent / 2) * 3.6;
  circle.setAttribute('transform', `rotate(${startAngle} 110 110)`);
  const edgeAngle = 180 + (percent / 2) * 3.6;
  el('arrowGroup').classList.remove('no-transition');
  el('arrowGroup').setAttribute('transform', `translate(110,110) rotate(${edgeAngle})`);
  currentArrowAngle = edgeAngle;
  if (percent > 0) {
    const color = chanceColor(percent);
    circle.style.stroke = color;
    circle.style.color = color;
    if (!dial.classList.contains('win') && !dial.classList.contains('lose')) {
      dial.style.boxShadow = `0 0 22px 2px ${color}55, inset 0 0 30px ${color}22`;
    }
  } else {
    circle.style.stroke = '';
    circle.style.color = '';
    dial.style.boxShadow = '';
  }
  animatePctNumber(percent);
}

function animatePctNumber(target){
  const node = el('pctAbove');
  const dial = el('dial');
  const start = displayedPercent;
  const startTime = performance.now();
  const duration = 500;
  function step(time){
    const t = Math.min((time - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(start + (target - start) * eased);
    node.textContent = value + '%';
    if (!dial.classList.contains('win') && !dial.classList.contains('lose')) {
      node.style.color = value > 0 ? chanceColor(value) : '';
    }
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      displayedPercent = target;
    }
  }
  requestAnimationFrame(step);
}

function renderSlots(){
  const fromSlot = el('fromSlot');
  const toSlot = el('toSlot');

  if (fromItem && toItem && toItem.price <= fromItem.price) {
    toItem = null;
  }

  fromSlot.innerHTML='';
  if(fromItem){
    const box = document.createElement('div'); box.className='picked';
    box.appendChild(swatch(fromItem,70));
    const nm=document.createElement('div'); nm.className='nm'; setItemNameHtml(nm, fromItem.name); box.appendChild(nm);
    const pr=document.createElement('div'); pr.className='pr'; pr.textContent=fromItem.price+' G'; box.appendChild(pr);
    const cl=document.createElement('div'); cl.className='clear'; cl.textContent='убрать'; cl.addEventListener('click',()=>{fromItem=null; addedGold=0; renderSlots();}); box.appendChild(cl);
    fromSlot.appendChild(box);
  } else {
    fromSlot.innerHTML='';
    const addBtn = document.createElement('button');
    addBtn.className = 'slot-add'; addBtn.type = 'button'; addBtn.textContent = '+';
    addBtn.addEventListener('click', openPickFrom);
    fromSlot.appendChild(addBtn);
  }

  toSlot.innerHTML='';
  if(toItem){
    const box = document.createElement('div'); box.className='picked';
    box.appendChild(swatch(toItem,70));
    const nm=document.createElement('div'); nm.className='nm'; setItemNameHtml(nm, toItem.name); box.appendChild(nm);
    const pr=document.createElement('div'); pr.className='pr'; pr.textContent=toItem.price+' G'; box.appendChild(pr);
    const cl=document.createElement('div'); cl.className='clear'; cl.textContent='убрать'; cl.addEventListener('click',()=>{toItem=null; renderSlots();}); box.appendChild(cl);
    toSlot.appendChild(box);
  } else {
    toSlot.innerHTML='';
    const addBtn = document.createElement('button');
    addBtn.className = 'slot-add'; addBtn.type = 'button'; addBtn.textContent = '+';
    addBtn.addEventListener('click', openPickTo);
    toSlot.appendChild(addBtn);
  }

  const dial = el('dial');
  const pctAbove = el('pctAbove');
  const note = el('dialNote');
  const goBtn = el('goBtn');
  dial.classList.remove('win','lose','spin');
  pctAbove.classList.remove('win','lose');

  const topupRow = el('topupRow');
  const topupSlider = el('topupSlider');
  const topupValue = el('topupValue');

  if(fromItem){
    topupRow.style.display = '';
    const maxAdd = Math.max(0, balance);
    addedGold = Math.max(0, Math.min(addedGold, maxAdd));
    topupSlider.min = 0;
    topupSlider.max = maxAdd;
    topupSlider.value = addedGold;
    topupSlider.disabled = maxAdd === 0;
    topupValue.textContent = addedGold + ' G';
  } else {
    topupRow.style.display = 'none';
    addedGold = 0;
  }

  if(fromItem && toItem){
    const effFrom = { price: effectiveFromValue() };
    const c = chanceFor(effFrom, toItem);
    updateProgress(c);
    const lossNote = addedGold > 0
      ? `в случае неудачи ${highlightItemName(fromItem.name)} и <b>${addedGold} G</b> будут потеряны`
      : `в случае неудачи ${highlightItemName(fromItem.name)} будет потерян`;
    note.innerHTML = lossNote;
    goBtn.disabled = false;
  } else {
    updateProgress(0);
    note.textContent = 'выберите предмет и цель';
    goBtn.disabled = true;
  }

  renderShop();
  if(typeof updatePctBtnActive === 'function') updatePctBtnActive();
}


/* ==== Доплата из баланса в апгрейдере ==== */
const topupSliderEl = el('topupSlider');
if (topupSliderEl) {
  topupSliderEl.addEventListener('input', ()=>{
    if(!fromItem) return;
    const maxAdd = Math.max(0, balance);
    addedGold = Math.max(0, Math.min(parseInt(topupSliderEl.value, 10) || 0, maxAdd));
    renderSlots();
  });
}

/* ==== Попапы выбора предмета / цели ==== */
const pickFromOverlay = el('pickFromOverlay');
const pickFromGrid = el('pickFromGrid');
const pickFromCloseBtn = el('pickFromCloseBtn');
const pickToOverlay = el('pickToOverlay');
const pickToGrid = el('pickToGrid');
const pickToCloseBtn = el('pickToCloseBtn');

function pickCard(item, onClick){
  const card = document.createElement('div');
  card.className = 'row-item';
  const sw = document.createElement('div'); sw.className = 'sw';
  setItemBg(sw, item);
  card.appendChild(sw);
  const nm = document.createElement('div'); nm.className = 'nm'; setItemNameHtml(nm, item.name); card.appendChild(nm);
  const pr = document.createElement('div'); pr.className = 'pr'; pr.textContent = item.price + ' G'; card.appendChild(pr);
  card.addEventListener('click', onClick);
  return card;
}

function renderPickFrom(){
  pickFromGrid.innerHTML = '';
  if(inventory.length === 0){
    const hint = document.createElement('div');
    hint.style.cssText = 'color:var(--text-mute);font-size:13px;padding:8px 2px;grid-column:1/-1;';
    hint.textContent = 'В инвентаре пока пусто';
    pickFromGrid.appendChild(hint);
    return;
  }
  inventory.forEach(it=>{
    const card = pickCard(it, ()=>{
      fromItem = it;
      addedGold = 0;
      pickFromOverlay.classList.remove('show');
      renderSlots();
    });
    if(fromItem && fromItem.id === it.id) card.classList.add('selected');
    pickFromGrid.appendChild(card);
  });
}

function renderPickTo(){
  pickToGrid.innerHTML = '';
  const minPrice = fromItem ? fromItem.price : -1;
  const availableTargets = shopSkins.filter(it => it.price > minPrice);
  if(!fromItem){
    const hint = document.createElement('div');
    hint.style.cssText = 'color:var(--text-mute);font-size:13px;padding:8px 2px;grid-column:1/-1;';
    hint.textContent = 'Сначала выберите предмет для улучшения';
    pickToGrid.appendChild(hint);
    return;
  }
  if(availableTargets.length === 0){
    const hint = document.createElement('div');
    hint.style.cssText = 'color:var(--text-mute);font-size:13px;padding:8px 2px;grid-column:1/-1;';
    hint.textContent = 'Нет доступных целей — это ваш самый дорогой предмет';
    pickToGrid.appendChild(hint);
    return;
  }
  availableTargets.forEach(it=>{
    const card = pickCard(it, ()=>{
      toItem = it;
      pickToOverlay.classList.remove('show');
      renderSlots();
    });
    if(toItem && toItem.id === it.id) card.classList.add('selected');
    pickToGrid.appendChild(card);
  });
}

/* ==== Быстрый выбор процента апгрейда ==== */
function pickTargetForChance(desiredPct){
  const note = el('dialNote');
  if(!fromItem){
    note.textContent = 'сначала выберите предмет для улучшения';
    return;
  }
  const targets = shopSkins.filter(it => it.price > fromItem.price);
  if(!targets.length){
    note.textContent = 'нет доступных целей — это ваш самый дорогой предмет';
    return;
  }
  const effFrom = { price: effectiveFromValue() };
  let best = null, bestDiff = Infinity;
  targets.forEach(it=>{
    const c = chanceFor(effFrom, it);
    const diff = Math.abs(c - desiredPct);
    if(diff < bestDiff){ bestDiff = diff; best = it; }
  });
  toItem = best;
  renderSlots();
  updatePctBtnActive();
}

function updatePctBtnActive(){
  const c = (fromItem && toItem) ? chanceFor({price: effectiveFromValue()}, toItem) : null;
  [['pctBtn75',75],['pctBtn50',50],['pctBtn30',30]].forEach(([id,pct])=>{
    const btn = el(id);
    if(!btn) return;
    btn.classList.toggle('active', c !== null && Math.abs(c - pct) <= 2);
  });
}

['pctBtn75','pctBtn50','pctBtn30'].forEach(id=>{
  const btn = el(id);
  if(btn){
    btn.addEventListener('click', ()=> pickTargetForChance(parseInt(btn.dataset.pct, 10)));
  }
});

function openPickFrom(){
  renderPickFrom();
  pickFromOverlay.classList.add('show');
}
function openPickTo(){
  renderPickTo();
  pickToOverlay.classList.add('show');
}
pickFromCloseBtn.addEventListener('click', ()=> pickFromOverlay.classList.remove('show'));
pickFromOverlay.addEventListener('click', (e)=>{ if(e.target === pickFromOverlay) pickFromOverlay.classList.remove('show'); });
pickToCloseBtn.addEventListener('click', ()=> pickToOverlay.classList.remove('show'));
pickToOverlay.addEventListener('click', (e)=>{ if(e.target === pickToOverlay) pickToOverlay.classList.remove('show'); });

function spinArrow(targetAngle, duration, callback) {
  const arrowGroup = el('arrowGroup');
  arrowGroup.classList.add('no-transition');
  const startAngle = currentArrowAngle;
  const diff = targetAngle - startAngle;
  const startTime = performance.now();
  const tickStep = 12;
  let lastTickStep = Math.floor(startAngle / tickStep);

  function animate(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startAngle + diff * eased;
    arrowGroup.setAttribute('transform', `translate(110,110) rotate(${current})`);

    const step = Math.floor(current / tickStep);
    if (step !== lastTickStep && progress < 1) {
      lastTickStep = step;
      const remaining = 1 - progress;
      playWheelTick(0.04 + remaining * 0.12);
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      currentArrowAngle = targetAngle;
      callback();
    }
  }
  requestAnimationFrame(animate);
}

function showUpgradeResult(win){
  const dial = el('dial');
  let badge = dial.querySelector('.result-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'result-badge';
    dial.appendChild(badge);
  }
  badge.textContent = win ? 'УСПЕХ!' : 'ПРОВАЛ';
  badge.classList.remove('win','lose','show');
  // форсируем перерасчёт стилей, чтобы анимация перезапустилась при повторных кликах
  void badge.offsetWidth;
  badge.classList.add(win ? 'win' : 'lose', 'show');
  clearTimeout(showUpgradeResult._t);
  showUpgradeResult._t = setTimeout(()=>{ badge.classList.remove('show'); }, 1600);
}

el('goBtn').addEventListener('click', ()=>{
  if(!fromItem || !toItem) return;
  const stakeGold = addedGold;
  const chance = chanceFor({price: effectiveFromValue()}, toItem);
  const dial = el('dial');
  const pctAbove = el('pctAbove');
  const circle = el('progressCircle');
  const goBtn = el('goBtn');
  goBtn.disabled = true;
  if (topupSliderEl) topupSliderEl.disabled = true;
  dial.classList.remove('win','lose');
  pctAbove.classList.remove('win','lose');

  if (stakeGold > 0) {
    setBalance(balance - stakeGold);
  }

  const roll = Math.random()*100;
  const win = roll <= chance;
  
  let rollAngle;
  if (win) {
    const halfArc = (chance / 2) * 3.6;
    const offset = (Math.random() * 2 - 1) * halfArc;
    rollAngle = 180 + offset;
  } else {
    const halfArc = (chance / 2) * 3.6;
    const loseRange = 360 - (halfArc * 2);
    const offset = halfArc + Math.random() * loseRange;
    rollAngle = 180 + offset;
  }

  const extraSpins = 3;
  const targetAngle = rollAngle + extraSpins*360;
  spinArrow(targetAngle, 2000, ()=>{
    if(win){
      playUpgradeWinSound();
      inventory = inventory.filter(i=>i.id!==fromItem.id);
      const wonItem = { id: 'i' + (seed++), name: toItem.name, price: toItem.price, color: toItem.color, image: toItem.image };
      inventory.push(wonItem);
    } else {
      playUpgradeLoseSound();
      inventory = inventory.filter(i=>i.id!==fromItem.id);
    }
    fromItem = null; toItem = null;
    scheduleSupaSync();
    renderInv();
    renderSlots();
    // Применяем результат ПОСЛЕ renderSlots(): она сбрасывает классы win/lose,
    // поэтому если добавить их раньше, браузер не успевает отрисовать кадр с подсветкой.
    if(win){
      dial.classList.add('win');
      pctAbove.classList.add('win');
    } else {
      dial.classList.add('lose');
      pctAbove.classList.add('lose');
    }
    showUpgradeResult(win);
    goBtn.disabled = false;
  });
});

function computeCaseWeights(defs, manualWeights){
  const sorted = [...defs].sort((a,b)=>a.price-b.price);

  // Если для кейса заданы ручные проценты (manualWeights: {название: процент}),
  // используем их напрямую вместо расчёта по цене.
  if (manualWeights) {
    return sorted.map((it) => {
      const pct = manualWeights[it.name] != null ? manualWeights[it.name] : 0;
      return { item: it, weight: pct / 100, pct: Math.round(pct * 10) / 10 };
    });
  }

  const RARITY_EXPONENT = 2.3;
  const raw = sorted.map(it => 1 / Math.pow(Math.max(1, it.price), RARITY_EXPONENT));
  const sum = raw.reduce((a,b)=>a+b, 0);
  return sorted.map((it,i) => ({
    item: it,
    weight: raw[i] / sum,
    pct: Math.round((raw[i] / sum) * 1000) / 10
  }));
}

function renderCases(){
  const grid = el('caseGrid');
  grid.innerHTML='';
  cases.forEach((c, idx)=>{
    const card = document.createElement('div'); card.className='case-card';
    card.dataset.caseName = c.name;
    const icon = document.createElement('div'); icon.className='case-icon';
    if (c.image) {
      setItemBg(icon, {image: c.image, color: COLORS[idx*2 % COLORS.length]});
    } else {
      icon.style.background = `linear-gradient(160deg, ${COLORS[idx*2 % COLORS.length]}, rgb(10, 10, 10))`;
    }
    card.appendChild(icon);
    const nm = document.createElement('div'); nm.className='case-name'; nm.textContent = c.name; card.appendChild(nm);
    const pr = document.createElement('div'); pr.className='case-price'; pr.textContent = c.price+' G'; card.appendChild(pr);

    if (c.items && c.items.length) {
      const oddsBox = document.createElement('div'); oddsBox.className = 'case-odds';
      const weighted = computeCaseWeights(c.items, c.weights);
      weighted.forEach(({item: it, pct})=>{
        const row = document.createElement('div'); row.className = 'case-odds-row';
        const sw = document.createElement('div'); sw.className = 'sw';
        setItemBg(sw, it);
        row.appendChild(sw);
        const nmSpan = document.createElement('span'); nmSpan.className = 'nm'; setItemNameHtml(nmSpan, it.name);
        row.appendChild(nmSpan);
        const pctSpan = document.createElement('span'); pctSpan.className = 'pct';
        pctSpan.textContent = pct + '%';
        row.appendChild(pctSpan);
        oddsBox.appendChild(row);
      });
      card.appendChild(oddsBox);
    }

    const btn = document.createElement('button'); btn.className='case-open'; btn.textContent='Открыть';
    btn.addEventListener('click', (e)=>{
      const cardEl = e.currentTarget.closest('.case-card');
      openCaseWithScroll(c, cardEl);
    });
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

function pickWeightedCaseItem(defs, manualWeights){
  const weighted = computeCaseWeights(defs, manualWeights);
  const roll = Math.random();
  let cumulative = 0;
  for (const w of weighted) {
    cumulative += w.weight;
    if (roll < cumulative) return w.item;
  }
  return weighted[weighted.length - 1].item;
}

function makeCaseVisualItem(def, colorIdx){
  const color = def.color || COLORS[colorIdx % COLORS.length];
  return { id: 'ci' + (seed++), name: def.name, price: def.price, color, image: def.image };
}

function generateCaseItems(caseObj){
  const items = [];
  const count = 40;

  if (caseObj.items && caseObj.items.length) {
    for (let i = 0; i < count; i++) {
      const def = caseObj.items[Math.floor(Math.random() * caseObj.items.length)];
      const colorIdx = caseObj.items.indexOf(def);
      items.push(makeCaseVisualItem(def, colorIdx));
    }
    const dropDef = pickWeightedCaseItem(caseObj.items, caseObj.weights);
    const dropColorIdx = caseObj.items.indexOf(dropDef);
    items[35] = makeCaseVisualItem(dropDef, dropColorIdx);
  } else {
    for (let i = 0; i < count; i++) {
      const price = Math.round(caseObj.min + Math.random() * (caseObj.max - caseObj.min));
      const item = makeItem(price, seed++);
      items.push(item);
    }
  }

  return items;
}

let soundVolume = 100;
try {
  const savedVol = localStorage.getItem('xgrader-sound-volume');
  if (savedVol !== null) {
    soundVolume = parseInt(savedVol);
  } else {
    // миграция со старого бинарного тумблера звука
    soundVolume = localStorage.getItem('xgrader-sound-enabled') === '0' ? 0 : 100;
  }
  if (isNaN(soundVolume)) soundVolume = 100;
} catch(e) {}

function setSoundVolume(v){
  soundVolume = Math.max(0, Math.min(100, v));
  try { localStorage.setItem('xgrader-sound-volume', String(soundVolume)); } catch(e) {}
  if (masterGain) masterGain.gain.value = soundVolume / 100;
}

(function initSoundControl(){
  const range = el('soundVolumeRange');
  const val = el('soundVolumeValue');
  if (!range) return;

  function fillThisRange(){
    const min = parseFloat(range.min) || 0;
    const max = parseFloat(range.max) || 100;
    const v = parseFloat(range.value) || 0;
    const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
    range.style.background =
      `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--bg-2) ${pct}%, var(--bg-2) 100%)`;
  }

  range.value = soundVolume;
  if (val) val.textContent = soundVolume + '%';
  fillThisRange();
  range.addEventListener('input', ()=>{
    const v = parseInt(range.value);
    setSoundVolume(v);
    if (val) val.textContent = v + '%';
    fillThisRange();
  });
})();

let audioCtx = null;
let masterGain = null;
function getAudioCtx(){
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = soundVolume / 100;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// === Звуковые файлы (mp3) ===
// Кладите свои файлы в папку Sound/ с этими именами — они заиграют вместо
// сгенерированных звуков автоматически. Если файла нет или он не грузится,
// используется встроенный звук ниже (ничего не сломается).
const soundFileCache = {};
// rate: playbackRate — меняет высоту звука (>1 выше/быстрее, <1 ниже/медленнее)
function playFileSound(fileName, fallbackFn, rate){
  if (soundVolume <= 0) return;
  let entry = soundFileCache[fileName];
  if (!entry) {
    const audio = new Audio('Sound/' + fileName);
    entry = { audio: audio, broken: false };
    audio.addEventListener('error', function(){ entry.broken = true; });
    soundFileCache[fileName] = entry;
  }
  if (entry.broken) { fallbackFn(); return; }
  entry.audio.currentTime = 0;
  entry.audio.volume = Math.max(0, Math.min(1, soundVolume / 100));
  entry.audio.playbackRate = rate || 1;
  const playPromise = entry.audio.play();
  if (playPromise && playPromise.catch) {
    playPromise.catch(function(){ fallbackFn(); });
  }
}

function playRevealSound(){ playFileSound('reveal.mp3', playRevealSoundSynth); }
function playUpgradeWinSound(){ playFileSound('upgrade-win.mp3', playUpgradeWinSoundSynth); }
function playArcaneWinSound(){ playFileSound('arcane-win.mp3', playArcaneWinSoundSynth); }
function playUpgradeLoseSound(){ playFileSound('upgrade-lose.mp3', playUpgradeLoseSoundSynth); }
// Покупка — звук чуть выше и звонче (но не совпадает с успешным апгрейдом)
function playPurchaseSound(){ playFileSound('purchase.mp3', playPurchaseSoundSynth, 1.18); }
// Продажа — звук ниже и глуше
function playSellSound(){ playFileSound('sell.mp3', playSellSoundSynth, 0.8); }
function playPromoSound(){ playFileSound('promo.mp3', playPromoSoundSynth); }

// Звук при первом открытии/взаимодействии с сайтом (Sound/site-open.mp3).
// Браузеры блокируют звук до того, как пользователь хоть раз кликнет по
// странице — поэтому проигрываем его при первом клике/нажатии клавиши.
(function initSiteOpenSound(){
  let played = false;
  function trigger(){
    if (played) return;
    played = true;
    playFileSound('site-open.mp3', function(){});
    document.removeEventListener('click', trigger);
    document.removeEventListener('keydown', trigger);
  }
  document.addEventListener('click', trigger);
  document.addEventListener('keydown', trigger);
})();

function playTick(volume){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 620;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

function playRevealSoundSynth(){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [587, 880, 1174].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.27, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

function playWheelTick(volume){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1400;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.03);
}

function playUpgradeWinSoundSynth(){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [523, 698, 880, 1318].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const start = now + i * 0.07;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.5);
  });
}

function playArcaneWinSoundSynth(){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  // Глубокий бас-удар в начале
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(90, now);
  bass.frequency.exponentialRampToValueAtTime(45, now + 0.35);
  bassGain.gain.setValueAtTime(0.32, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  bass.connect(bassGain);
  bassGain.connect(masterGain);
  bass.start(now);
  bass.stop(now + 0.4);
  // Восходящий яркий аккорд поверх баса
  [523, 659, 784, 988, 1318, 1568].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.06;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.7);
  });
}

function playUpgradeLoseSoundSynth(){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.6);
  gain.gain.setValueAtTime(0.24, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.65);
}

function playPurchaseSoundSynth(){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [988, 1318].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const start = now + i * 0.05;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

function playSellSoundSynth(){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [392, 294].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const start = now + i * 0.06;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.22);
  });
}

function playPromoSoundSynth(){
  if (soundVolume <= 0) return;
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [523, 659, 784, 1046, 1318].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = now + i * 0.05;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

function openCaseWithScroll(caseObj, cardElement){
  if (balance < caseObj.price) return;

  setBalance(balance - caseObj.price);

  const items = generateCaseItems(caseObj);
  const targetIndex = 35; 
  const droppedItem = items[targetIndex];

  const overlay = el('caseScrollOverlay');
  const track = el('scrollTrack');
  const okBtn = el('scrollOkBtn');
  const title = el('scrollTitle');
  const resultDisplay = el('resultDisplay');
  const resultSw = el('resultSw');
  const resultNm = el('resultNm');
  const resultPr = el('resultPr');

  title.textContent = `Открытие ${caseObj.name}`;

  track.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'scroll-item';
    const sw = document.createElement('div');
    sw.className = 'sw';
    setItemBg(sw, item);
    div.appendChild(sw);
    const nm = document.createElement('span');
    nm.className = 'nm';
    setItemNameHtml(nm, item.name);
    div.appendChild(nm);
    const pr = document.createElement('span');
    pr.className = 'pr';
    pr.textContent = item.price + ' G';
    div.appendChild(pr);
    track.appendChild(div);
  });

  track.querySelectorAll('.scroll-item').forEach(el => el.classList.remove('highlight'));
  resultDisplay.style.display = 'none';

  okBtn.disabled = true;
  okBtn.textContent = 'Ок';
  overlay.classList.add('show');

  const container = el('scrollContainer');
  const firstItemNode = track.querySelector('.scroll-item');
  const itemWidth = firstItemNode ? firstItemNode.getBoundingClientRect().width : 130;
  const containerWidth = container.clientWidth || 420;
  
  const targetCenter = targetIndex * itemWidth + (itemWidth / 2);
  const centerOffset = containerWidth / 2;
  const finalScroll = targetCenter - centerOffset;

  const startTime = performance.now();
  const duration = 3900 + Math.random() * 500;
  let lastTickIndex = -1;

  function easeOutBack(t){
    const c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function easeOutElastic(t){
    const c4 = (2 * Math.PI) / 3;
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
  /* Плавный старт/финиш (нулевая скорость на краях), используется чтобы
     "сшить" фазы прокрутки без рывка на стыке. */
  function smoothstep(t){
    return t * t * (3 - 2 * t);
  }

  /* ==== Случайное поведение остановки барабана ====
     Иногда рулетка перелетает цель и откатывается назад,
     иногда не дотягивает и довозит вперёд, иногда несколько раз
     проскакивает мимо туда-обратно, а иногда попадает почти без отскока. */
  const spinRoll = Math.random();
  let overshootAmount, bounceDuration, easeFn;
  if (spinRoll < 0.32) {
    // Перелёт: проезжает дальше цели и плавно откатывается назад
    overshootAmount = itemWidth * (0.16 + Math.random() * 0.20);
    bounceDuration = 380 + Math.random() * 140;
    easeFn = easeOutBack;
  } else if (spinRoll < 0.58) {
    // Недолёт: тормозит чуть раньше цели и довозит вперёд
    overshootAmount = -itemWidth * (0.10 + Math.random() * 0.18);
    bounceDuration = 320 + Math.random() * 160;
    easeFn = easeOutBack;
  } else if (spinRoll < 0.80) {
    // Сильный перелёт с несколькими доводками туда-обратно
    overshootAmount = itemWidth * (0.30 + Math.random() * 0.28);
    bounceDuration = 620 + Math.random() * 220;
    easeFn = easeOutElastic;
  } else {
    // Почти точное попадание, отскок минимальный
    overshootAmount = itemWidth * (Math.random() < 0.5 ? 1 : -1) * (0.01 + Math.random() * 0.04);
    bounceDuration = 200 + Math.random() * 100;
    easeFn = easeOutBack;
  }
  const overshootTarget = finalScroll + overshootAmount;

  function animateScroll(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Мягкий разгон в начале (без рывка) + плавное затухание к концу фазы,
    // чтобы стык с фазой доводки был без скачка скорости.
    const eased = 1 - Math.pow(1 - smoothstep(progress), 4);
    const currentX = overshootTarget * eased;
    track.style.transform = `translateX(-${currentX}px)`;

    const currentItemIndex = Math.floor((currentX + centerOffset) / itemWidth);
    if (currentItemIndex !== lastTickIndex && progress < 1) {
      lastTickIndex = currentItemIndex;
      const remaining = 1 - progress;
      playTick(0.05 + remaining * 0.1);
    }

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    } else {
      bounceSettle();
    }
  }

  function bounceSettle(){
    const bounceStart = performance.now();
    const startX = overshootTarget;
    function step(time){
      const t = Math.min((time - bounceStart) / bounceDuration, 1);
      // smoothstep(t) даёт нулевую скорость в начале доводки — она подхватывает
      // движение там, где первая фаза плавно остановилась, без рывка.
      const eased = easeFn(smoothstep(t));
      const x = startX + (finalScroll - startX) * eased;
      track.style.transform = `translateX(-${x}px)`;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        track.style.transform = `translateX(-${finalScroll}px)`;
        revealResult();
      }
    }
    requestAnimationFrame(step);
  }

  function spawnConfetti(container, colors, count){
    count = count || 24;
    const rect = container.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (700 + Math.random() * 500) + 'ms';
      piece.style.animationDelay = (Math.random() * 150) + 'ms';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(piece);
      piece.addEventListener('animationend', () => piece.remove());
    }
  }

  function triggerArcaneScreenFlash(color){
    const flashEl = el('arcaneFlash');
    if (!flashEl) return;
    flashEl.style.setProperty('--rc', color);
    flashEl.classList.remove('active');
    void flashEl.offsetWidth;
    flashEl.classList.add('active');
  }

  function revealResult(){
    const itemsNodes = track.querySelectorAll('.scroll-item');
    const targetNode = itemsNodes[targetIndex];
    if (targetNode) targetNode.classList.add('highlight');

    const rarity = getRarity(droppedItem);

    setItemBg(resultSw, droppedItem);
    setItemNameHtml(resultNm, droppedItem.name);
    resultPr.textContent = droppedItem.price + ' G';
    if (el('resultRarity')) {
      el('resultRarity').textContent = rarity.name;
      el('resultRarity').style.color = rarity.color;
    }
    resultDisplay.style.display = 'block';
    resultDisplay.style.borderColor = rarity.color;
    resultDisplay.style.setProperty('--rc', rarity.color);
    resultDisplay.classList.remove('flash');
    void resultDisplay.offsetWidth;
    resultDisplay.classList.add('flash');

    const resultItemEl = el('resultItem');
    if (resultItemEl) {
      resultItemEl.classList.remove('pop');
      void resultItemEl.offsetWidth;
      resultItemEl.classList.add('pop');
    }

    playRevealSound();

    // ==== Усиленные эффекты для редких дропов: интенсивность растёт с редкостью ====
    const scrollBoxEl = resultDisplay.closest('.case-scroll-box');
    resultDisplay.classList.remove('fx-epic', 'fx-legendary', 'fx-arcane');
    if (scrollBoxEl) scrollBoxEl.classList.remove('shake-light', 'shake-strong');

    if (rarity.name === 'Epic') {
      void resultDisplay.offsetWidth;
      resultDisplay.classList.add('fx-epic');
      spawnConfetti(resultDisplay, [rarity.color, '#ffffff'], 10);
    } else if (rarity.name === 'Legendary') {
      void resultDisplay.offsetWidth;
      resultDisplay.classList.add('fx-legendary');
      if (scrollBoxEl) {
        scrollBoxEl.classList.add('shake-light');
      }
      spawnConfetti(resultDisplay, [rarity.color, '#ffffff', 'var(--accent)'], 24);
      playUpgradeWinSound();
    } else if (rarity.name === 'Arcane') {
      void resultDisplay.offsetWidth;
      resultDisplay.classList.add('fx-arcane');
      if (scrollBoxEl) {
        scrollBoxEl.classList.add('shake-strong');
      }
      spawnConfetti(resultDisplay, [rarity.color, '#ffffff', 'var(--accent)'], 42);
      triggerArcaneScreenFlash(rarity.color);
      playArcaneWinSound();
    }

    inventory.push(droppedItem);
    scheduleSupaSync();
    renderInv();

    okBtn.disabled = false;
    okBtn.textContent = 'Забрать';
  }

  track.style.transform = 'translateX(0px)';
  requestAnimationFrame(animateScroll);

  okBtn.onclick = function(){
    overlay.classList.remove('show');
    track.style.transform = '';
    track.querySelectorAll('.scroll-item').forEach(el => el.classList.remove('highlight'));
    resultDisplay.style.display = 'none';
    resultDisplay.classList.remove('flash', 'fx-epic', 'fx-legendary', 'fx-arcane');
    resultDisplay.querySelectorAll('.confetti-piece').forEach(p => p.remove());
    const scrollBoxEl2 = resultDisplay.closest('.case-scroll-box');
    if (scrollBoxEl2) scrollBoxEl2.classList.remove('shake-light', 'shake-strong');
    okBtn.disabled = true;
    okBtn.textContent = 'Ок';
  };
}

const popupOverlay = el('popupOverlay');
const openPopupBtn = el('openPopupBtn');
const popupCloseBtn = el('popupCloseBtn');

const ADMIN_PASSWORD_DIGEST = '46241bc93ab5fbed0a56ad3adf49b6836ea72e8e114f30e4eba22abfe4fe78dc';

async function sha256Hex(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const adminPassOverlay = el('adminPassOverlay');
const adminPassCloseBtn = el('adminPassCloseBtn');
const adminPassInput = el('adminPassInput');
const adminPassSubmitBtn = el('adminPassSubmitBtn');
const adminPassStatus = el('adminPassStatus');

async function tryAdminLogin(){
  const pass = adminPassInput.value;
  const passHash = await sha256Hex(pass);
  if (passHash !== ADMIN_PASSWORD_DIGEST) {
    adminPassStatus.textContent = 'Неверный пароль';
    adminPassStatus.style.color = 'var(--bad)';
    adminPassInput.value = '';
    adminPassInput.focus();
    return;
  }
  adminPassOverlay.classList.remove('show');
  adminPassInput.value = '';
  adminPassStatus.textContent = '';
  popupOverlay.classList.add('show');
  el('adminStatus').textContent = '';
  el('createPromoStatus').textContent = '';
}

openPopupBtn.addEventListener('click', ()=>{
  adminPassStatus.textContent = '';
  adminPassInput.value = '';
  adminPassOverlay.classList.add('show');
  setTimeout(()=>adminPassInput.focus(), 0);
});
adminPassCloseBtn.addEventListener('click', ()=>{
  adminPassOverlay.classList.remove('show');
});
adminPassOverlay.addEventListener('click', (e)=>{
  if (e.target === adminPassOverlay) adminPassOverlay.classList.remove('show');
});
adminPassSubmitBtn.addEventListener('click', tryAdminLogin);
adminPassInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter') tryAdminLogin();
});
popupCloseBtn.addEventListener('click', ()=>{
  popupOverlay.classList.remove('show');
});
popupOverlay.addEventListener('click', (e)=>{
  if (e.target === popupOverlay) popupOverlay.classList.remove('show');
});

// Изменяет баланс пользователя по ID через Firebase (delta может быть отрицательным).
// Если это ID текущего пользователя в этом браузере — обновляем и локальное состояние сразу.
async function adminAdjustBalanceById(targetId, delta, status){
  if (!supa) {
    status.textContent = 'Firebase не настроен — изменение баланса других пользователей недоступно';
    status.style.color = 'var(--bad)';
    return;
  }
  status.textContent = 'Обновляю...';
  status.style.color = 'var(--text-mute)';
  try {
    const userRef = supa.ref('users/' + targetId);
    const snap = await userRef.once('value');
    const userRow = snap.val();
    if (!userRow) {
      status.textContent = `Пользователь с ID ${targetId} не найден`;
      status.style.color = 'var(--bad)';
      return;
    }
    const newBalance = Math.max(0, Math.round((userRow.balance || 0) + delta));
    await userRef.update({
      balance: newBalance,
      updated_at: new Date().toISOString()
    });

    if (targetId === userId) {
      setBalance(newBalance);
    }

    const verb = delta >= 0 ? 'пополнен на' : 'уменьшен на';
    status.textContent = `Баланс пользователя ${targetId} ${verb} ${Math.abs(delta)} G. Новый баланс: ${newBalance} G`;
    status.style.color = 'var(--ok)';
  } catch(e) {
    console.error(e);
    status.textContent = 'Ошибка при обращении к базе данных';
    status.style.color = 'var(--bad)';
  }
}

el('adminAddBtn').addEventListener('click', ()=>{
  const targetId = el('adminTargetUserId').value.trim();
  const amount = parseInt(el('adminAmount').value);
  const status = el('adminStatus');

  if (!targetId || isNaN(amount) || amount <= 0) {
    status.textContent = 'Некорректные данные';
    status.style.color = 'var(--bad)';
    return;
  }
  adminAdjustBalanceById(targetId, amount, status);
});

const adminWithdrawBtnEl = el('adminWithdrawBtn');
if (adminWithdrawBtnEl) {
  adminWithdrawBtnEl.addEventListener('click', ()=>{
    const targetId = el('adminTargetUserId').value.trim();
    const amount = parseInt(el('adminAmount').value);
    const status = el('adminStatus');

    if (!targetId || isNaN(amount) || amount <= 0) {
      status.textContent = 'Некорректные данные';
      status.style.color = 'var(--bad)';
      return;
    }
    adminAdjustBalanceById(targetId, -amount, status);
  });
}

el('downloadUsersLogBtn').addEventListener('click', ()=>{
  const status = el('usersLogStatus');
  const ok = downloadUsersLog();
  if (ok) {
    status.textContent = 'Файл users_log.csv скачан';
    status.style.color = 'var(--ok)';
  } else {
    status.textContent = 'Журнал пуст';
    status.style.color = 'var(--bad)';
  }
});

el('createPromoBtn').addEventListener('click', ()=>{
  const code = el('newPromoCode').value.trim().toUpperCase();
  const reward = parseInt(el('newPromoReward').value);
  const status = el('createPromoStatus');
  
  if (!code || isNaN(reward) || reward <= 0) {
    status.textContent = 'Введите корректные данные';
    status.style.color = 'var(--bad)';
    return;
  }
  if (promoCodes[code]) {
    status.textContent = 'Промокод с таким именем уже существует';
    status.style.color = 'var(--bad)';
    return;
  }
  
  promoCodes[code] = { reward, used: false };
  status.textContent = `Промокод "${code}" успешно создан!`;
  status.style.color = 'var(--ok)';
  el('newPromoCode').value = '';
  el('newPromoReward').value = '50';
});

const promoOverlay = el('promoOverlay');
const promoBtn = el('promoBtn');
const promoCloseBtn = el('promoCloseBtn');
const promoInput = el('promoInput');
const promoActivateBtn = el('promoActivateBtn');
const promoStatus = el('promoStatus');

promoBtn.addEventListener('click', ()=>{
  promoOverlay.classList.add('show');
  promoStatus.textContent = '';
  promoInput.value = '';
});
promoCloseBtn.addEventListener('click', ()=>{
  promoOverlay.classList.remove('show');
});
promoOverlay.addEventListener('click', (e)=>{
  if (e.target === promoOverlay) promoOverlay.classList.remove('show');
});

promoActivateBtn.addEventListener('click', ()=>{
  const code = promoInput.value.trim().toUpperCase();
  if (!code) {
    promoStatus.textContent = 'Введите промокод';
    promoStatus.style.color = 'var(--bad)';
    return;
  }
  const promo = promoCodes[code];
  if (!promo) {
    promoStatus.textContent = 'Промокод не найден';
    promoStatus.style.color = 'var(--bad)';
    return;
  }
  if (promo.used) {
    promoStatus.textContent = 'Этот промокод уже был использован';
    promoStatus.style.color = 'var(--bad)';
    return;
  }
  promo.used = true;
  setBalance(balance + promo.reward);
  playPromoSound();
  promoStatus.textContent = `Промокод активирован! +${promo.reward} G`;
  promoStatus.style.color = 'var(--ok)';
  promoInput.value = '';
});

promoCodes['TEST50'] = { reward: 50, used: false };
promoCodes['BIG100'] = { reward: 100, used: false };

renderInv();
renderShop();
renderSlots();
showSkeleton(el('caseGrid'), cases.length, 'skeleton-case');
setTimeout(renderCases, 500);
updateProgress(0);

document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const closable = [promoOverlay, shopSkinsOverlay, inventoryOverlay, adminPassOverlay, popupOverlay, pickFromOverlay, pickToOverlay];
    const openOverlay = closable.find(ov => ov && ov.classList.contains('show'));
    if (openOverlay) {
      openOverlay.classList.remove('show');
      return;
    }
    const scrollOverlay = el('caseScrollOverlay');
    const scrollOkBtn = el('scrollOkBtn');
    if (scrollOverlay && scrollOverlay.classList.contains('show') && scrollOkBtn && !scrollOkBtn.disabled) {
      scrollOkBtn.click();
    }
  }
});

document.addEventListener('keydown', (e) => {
  const key = e.key ? e.key.toUpperCase() : '';
  const blockedCombo =
    key === 'F12' ||
    (e.ctrlKey && key === 'U') ||
    (e.ctrlKey && key === 'S') ||
    (e.ctrlKey && e.shiftKey && (key === 'I' || key === 'J' || key === 'C')) ||
    (e.metaKey && e.altKey && (key === 'I' || key === 'J' || key === 'C'));
  if (blockedCombo) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

// Particles System Setup
const bgCanvas = document.querySelector('[data-id="bg-canvas"]');
const bgCtx = bgCanvas.getContext('2d');
let particlesArray = [];
let particlesEnabled = true;
let particleSpeedMultiplier = 1.0;

function resizeBgCanvas() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBgCanvas);
resizeBgCanvas();

class BackgroundParticle {
  constructor() {
    this.reset();
    this.y = Math.random() * bgCanvas.height;
  }
  reset() {
    this.x = Math.random() * bgCanvas.width;
    this.y = -20;
    this.size = Math.random() * 4 + 2;
    this.speedX = (Math.random() - 0.5) * 1.2;
    this.speedY = Math.random() * 1.5 + 0.5;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.04;
  }
  update() {
    this.x += this.speedX * particleSpeedMultiplier;
    this.y += this.speedY * particleSpeedMultiplier;
    this.angle += this.spin * particleSpeedMultiplier;
    if (this.y > bgCanvas.height + 20 || this.x < -20 || this.x > bgCanvas.width + 20) {
      this.reset();
    }
  }
  draw() {
    bgCtx.save();
    bgCtx.translate(this.x, this.y);
    bgCtx.rotate(this.angle);
    bgCtx.fillStyle = currentThemeConfig.pColor;
    bgCtx.strokeStyle = currentThemeConfig.pColor;
    bgCtx.lineWidth = 1.5;
    bgCtx.beginPath();
    
    switch (getEffectiveParticleShape()) {
      case 'star':
        for (let i = 0; i < 5; i++) {
          bgCtx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size * 2,
                     -Math.sin((18 + i * 72) * Math.PI / 180) * this.size * 2);
          bgCtx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * this.size,
                     -Math.sin((54 + i * 72) * Math.PI / 180) * this.size);
        }
        bgCtx.fill();
        break;
      case 'snowflake':
        for (let i = 0; i < 6; i++) {
          bgCtx.moveTo(0, 0);
          bgCtx.lineTo(0, this.size * 2);
          bgCtx.moveTo(0, this.size);
          bgCtx.lineTo(this.size / 2, this.size * 1.5);
          bgCtx.moveTo(0, this.size);
          bgCtx.lineTo(-this.size / 2, this.size * 1.5);
          bgCtx.rotate(Math.PI / 3);
        }
        bgCtx.stroke();
        break;
      case 'triangle':
        bgCtx.moveTo(0, -this.size * 1.5);
        bgCtx.lineTo(this.size * 1.5, this.size * 1.5);
        bgCtx.lineTo(-this.size * 1.5, this.size * 1.5);
        bgCtx.fill();
        break;
      case 'diamond':
        bgCtx.moveTo(0, -this.size * 2);
        bgCtx.lineTo(this.size, 0);
        bgCtx.lineTo(0, this.size * 2);
        bgCtx.lineTo(-this.size, 0);
        bgCtx.fill();
        break;
      case 'square':
        bgCtx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
        break;
      case 'circle':
        bgCtx.arc(0, 0, this.size, 0, Math.PI * 2);
        bgCtx.fill();
        break;
      case 'custom':
        if (customParticleImg && customParticleImg.complete && customParticleImg.naturalWidth) {
          const s = this.size * 3.2;
          bgCtx.globalAlpha = 0.85;
          bgCtx.drawImage(customParticleImg, -s / 2, -s / 2, s, s);
          bgCtx.globalAlpha = 1;
        } else {
          bgCtx.arc(0, 0, this.size, 0, Math.PI * 2);
          bgCtx.fill();
        }
        break;
    }
    bgCtx.closePath();
    bgCtx.restore();
  }
}

function setParticleCount(n){
  n = Math.max(0, Math.min(150, n));
  if (particlesArray.length < n) {
    while (particlesArray.length < n) particlesArray.push(new BackgroundParticle());
  } else if (particlesArray.length > n) {
    particlesArray.length = n;
  }
  try { localStorage.setItem('xgrader-particle-count', String(n)); } catch(e) {}
}

function setParticleSpeed(v){
  particleSpeedMultiplier = v / 100;
  try { localStorage.setItem('xgrader-particle-speed', String(v)); } catch(e) {}
}

function setParticlesEnabled(v){
  particlesEnabled = v;
  try { localStorage.setItem('xgrader-particles-enabled', v ? '1' : '0'); } catch(e) {}
  const group = el('particleControlsGroup');
  if (group) group.style.opacity = v ? '1' : '.4';
  const shapePicker = el('shapePicker');
  if (shapePicker) shapePicker.style.opacity = v ? '1' : '.4';
  const countRange = el('particleCountRange');
  const speedRange = el('particleSpeedRange');
  if (countRange) countRange.disabled = !v;
  if (speedRange) speedRange.disabled = !v;
}

// ==== Своё фото для частиц оверлея ====
const CUSTOM_SHAPE_ID = 'custom';
let customParticleImg = null;

function loadCustomParticleImage(dataUrl){
  const img = new Image();
  img.onload = ()=>{ customParticleImg = img; };
  img.src = dataUrl;
}

function addCustomShapeButton(dataUrl){
  const picker = el('shapePicker');
  if (!picker) return;
  let btn = picker.querySelector('.shape-btn[data-shape="custom"]');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'shape-btn';
    btn.dataset.shape = CUSTOM_SHAPE_ID;
    btn.type = 'button';
    btn.title = 'Своё фото';
    btn.addEventListener('click', ()=>applyParticleShape(CUSTOM_SHAPE_ID));
    picker.appendChild(btn);
  }
  btn.style.backgroundImage = `url('${dataUrl}')`;
  btn.style.backgroundSize = 'cover';
  btn.style.backgroundPosition = 'center';
  btn.textContent = '';
}

(function initParticleImageUpload(){
  const btn = el('uploadParticleImageBtn');
  const input = el('particleImageInput');
  const status = el('particleImageStatus');
  if (!btn || !input) return;

  let saved = null;
  try { saved = localStorage.getItem('xgrader-particle-image'); } catch(e) {}
  if (saved) {
    loadCustomParticleImage(saved);
    addCustomShapeButton(saved);
    if (status) status.textContent = 'Фото загружено';
  }

  btn.addEventListener('click', ()=> input.click());
  input.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const dataUrl = reader.result;
      try { localStorage.setItem('xgrader-particle-image', dataUrl); } catch(err) {}
      loadCustomParticleImage(dataUrl);
      addCustomShapeButton(dataUrl);
      applyParticleShape(CUSTOM_SHAPE_ID);
      if (status) status.textContent = 'Фото загружено';
    };
    reader.readAsDataURL(file);
  });
})();

// ==== Экспорт/импорт настроек (тема, звук, частицы, glass ui и т.д.) ====
(function initSettingsIO(){
  const exportBtn = el('exportSettingsBtn');
  const importBtn = el('importSettingsBtn');
  const importInput = el('importSettingsInput');
  const status = el('settingsIOStatus');

  function collectSettings(){
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.indexOf('xgrader-') === 0) {
          data[key] = localStorage.getItem(key);
        }
      }
    } catch(e) {}
    return data;
  }

  if (exportBtn) exportBtn.addEventListener('click', ()=>{
    const data = collectSettings();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xgrader-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (status) status.textContent = 'Настройки сохранены в файл.';
  });

  if (importBtn) importBtn.addEventListener('click', ()=> importInput && importInput.click());
  if (importInput) importInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try {
        const data = JSON.parse(reader.result);
        let count = 0;
        Object.keys(data).forEach(key=>{
          if (key.indexOf('xgrader-') === 0) {
            localStorage.setItem(key, data[key]);
            count++;
          }
        });
        if (status) status.textContent = `Импортировано настроек: ${count}. Обновляю страницу...`;
        setTimeout(()=> location.reload(), 700);
      } catch(err) {
        if (status) status.textContent = 'Не удалось прочитать файл настроек — проверь, что это тот самый экспортированный .json.';
      }
    };
    reader.readAsText(file);
    importInput.value = '';
  });
})();

// ==== Стеклянный интерфейс (Glass UI) ====
function setGlassUi(v){
  document.documentElement.classList.toggle('glass-ui', v);
  try { localStorage.setItem('xgrader-glass-ui', v ? '1' : '0'); } catch(e) {}
}
(function initGlassUi(){
  const toggle = el('glassUiToggle');
  let saved = false;
  try { saved = localStorage.getItem('xgrader-glass-ui') === '1'; } catch(e) {}
  if (toggle) toggle.checked = saved;
  setGlassUi(saved);
  if (toggle) toggle.addEventListener('change', ()=> setGlassUi(toggle.checked));
})();

(function initParticleControls(){
  const toggle = el('particlesEnabledToggle');
  const countRange = el('particleCountRange');
  const countVal = el('particleCountValue');
  const speedRange = el('particleSpeedRange');
  const speedVal = el('particleSpeedValue');

  function fillRange(rangeEl){
    if (!rangeEl) return;
    const min = parseFloat(rangeEl.min) || 0;
    const max = parseFloat(rangeEl.max) || 100;
    const val = parseFloat(rangeEl.value) || 0;
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    rangeEl.style.background =
      `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--bg-2) ${pct}%, var(--bg-2) 100%)`;
  }
  window.fillRange = fillRange;

  let savedEnabled = true;
  try { savedEnabled = localStorage.getItem('xgrader-particles-enabled') !== '0'; } catch(e) {}

  let savedCount = 50;
  try {
    const c = parseInt(localStorage.getItem('xgrader-particle-count'));
    if (!isNaN(c)) savedCount = c;
  } catch(e) {}

  let savedSpeed = 100;
  try {
    const s = parseInt(localStorage.getItem('xgrader-particle-speed'));
    if (!isNaN(s)) savedSpeed = s;
  } catch(e) {}

  if (toggle) toggle.checked = savedEnabled;
  if (countRange) countRange.value = savedCount;
  if (countVal) countVal.textContent = savedCount;
  if (speedRange) speedRange.value = savedSpeed;
  if (speedVal) speedVal.textContent = (savedSpeed / 100).toFixed(1) + 'x';

  setParticleCount(savedCount);
  setParticleSpeed(savedSpeed);
  setParticlesEnabled(savedEnabled);
  fillRange(countRange);
  fillRange(speedRange);

  if (toggle) toggle.addEventListener('change', ()=> setParticlesEnabled(toggle.checked));
  if (countRange) countRange.addEventListener('input', ()=>{
    const v = parseInt(countRange.value);
    if (countVal) countVal.textContent = v;
    setParticleCount(v);
    fillRange(countRange);
  });
  if (speedRange) speedRange.addEventListener('input', ()=>{
    const v = parseInt(speedRange.value);
    if (speedVal) speedVal.textContent = (v / 100).toFixed(1) + 'x';
    setParticleSpeed(v);
    fillRange(speedRange);
  });
})();

function renderParticlesFrame() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  if (particlesEnabled) {
    particlesArray.forEach(p => {
      p.update();
      p.draw();
    });
  }
  requestAnimationFrame(renderParticlesFrame);
}
renderParticlesFrame();

// ==== Дроп-лента ====
(function initDropFeed(){
  const listEl = el('dropFeedList');
  if (!listEl) return;

  const MAX_ROWS = 14;
  const NICK_PARTS1 = ['Dark','Fast','Shadow','Ice','Neon','Toxic','Wild','Ghost','Storm','Nitro','Lucky','Cyber','Prime','Silent','Crazy'];
  const NICK_PARTS2 = ['Wolf','Fox','King','Sniper','Killer','Rider','Blade','Hunter','Reaper','Ninja','Tiger','Beast','Rush','Master','Punk'];

  function fakeNick(){
    return NICK_PARTS1[Math.floor(Math.random()*NICK_PARTS1.length)] +
           NICK_PARTS2[Math.floor(Math.random()*NICK_PARTS2.length)] +
           Math.floor(Math.random()*99);
  }

  function pickItem(){
    return shopSkins[Math.floor(Math.random()*shopSkins.length)];
  }

  function addDropRow(){
    const item = pickItem();
    const row = document.createElement('div');
    row.className = 'drop-row';

    const sw = document.createElement('div');
    sw.className = 'sw';
    setItemBg(sw, item);
    row.appendChild(sw);

    const info = document.createElement('div');
    info.className = 'drop-info';
    const user = document.createElement('div');
    user.className = 'drop-user';
    user.textContent = fakeNick();
    const name = document.createElement('div');
    name.className = 'drop-name';
    setItemNameHtml(name, item.name);
    info.appendChild(user);
    info.appendChild(name);
    row.appendChild(info);

    const price = document.createElement('div');
    price.className = 'drop-price';
    price.textContent = item.price + ' G';
    row.appendChild(price);

    listEl.insertBefore(row, listEl.firstChild);
    while (listEl.children.length > MAX_ROWS) {
      listEl.removeChild(listEl.lastChild);
    }
  }

  function scheduleNext(){
    const delay = 1500 + Math.random() * 2500;
    setTimeout(()=>{
      addDropRow();
      scheduleNext();
    }, delay);
  }

  for (let i = 0; i < 8; i++) addDropRow();
  scheduleNext();
})();

/* ==== Игра «Ракета» (Crash/Aviator) ==== */
(function initRocketGame(){
  const stage = el('rocketStage');
  if (!stage) return;

  const betInput = el('rocketBetInput');
  const playBtn = el('rocketPlayBtn');
  const multEl = el('rocketMultiplier');
  const emojiEl = el('rocketEmoji');
  const trailPathEl = el('rocketTrailPath');
  const crashMsgEl = el('rocketCrashMsg');
  const waitingMsgEl = el('rocketWaitingMsg');
  const historyEl = el('rocketHistory');
  const autoToggle = el('rocketAutoToggle');
  const autoInput = el('rocketAutoInput');
  const pct30Btn = el('rocketPct30');
  const pct50Btn = el('rocketPct50');
  const pctMaxBtn = el('rocketPctMax');
  const betWrap = betInput.closest('.rocket-bet-input-wrap');

  let state = 'idle'; // idle | flying | crashed
  let bet = 0;
  let crashPoint = 1;
  let startTime = 0;
  let animId = null;
  let cashedOut = false;
  let trailPoints = [];
  let history = [];
  const GROWTH_RATE = 0.00013; // экспонента роста множителя, мс^-1

  function rollCrashPoint(){
    const rand = Math.random();
    if (rand < 0.03) return 1.00; // мгновенный краш ~3% случаев
    const houseEdge = 0.96;
    const point = houseEdge / (1 - rand);
    return Math.min(Math.max(1.00, Math.floor(point * 100) / 100), 500);
  }

  function multiplierAt(elapsedMs){
    return Math.pow(Math.E, GROWTH_RATE * elapsedMs);
  }

  function historyClass(m){
    if (m >= 10) return 'huge';
    if (m >= 3) return 'high';
    if (m >= 1.5) return 'mid';
    return 'low';
  }

  function renderHistory(){
    historyEl.innerHTML = '';
    history.slice(0, 14).forEach(m => {
      const chip = document.createElement('div');
      chip.className = 'rocket-history-chip ' + historyClass(m);
      chip.textContent = m.toFixed(2) + 'x';
      historyEl.appendChild(chip);
    });
  }

  function syncPlayLabel(){
    if (state !== 'idle') return;
    const v = Math.max(0, Math.round(Number(betInput.value) || 0));
    playBtn.textContent = 'Играть за ' + v + ' G';
  }
  betInput.addEventListener('input', syncPlayLabel);
  betInput.addEventListener('blur', () => {
    const v = Math.max(10, Math.round(Number(betInput.value) || 10));
    betInput.value = v;
    syncPlayLabel();
  });

  function setBetFromPct(pct){
    if (state !== 'idle') return;
    const amount = Math.max(10, Math.floor((balance * pct) / 10) * 10);
    betInput.value = amount;
    syncPlayLabel();
  }
  pct30Btn.addEventListener('click', () => setBetFromPct(0.3));
  pct50Btn.addEventListener('click', () => setBetFromPct(0.5));
  pctMaxBtn.addEventListener('click', () => setBetFromPct(1));

  autoToggle.addEventListener('change', () => {
    autoInput.disabled = !autoToggle.checked;
  });

  function playRocketStartSoundSynth(){
    if (soundVolume <= 0) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }
  function playRocketStartSound(){ playFileSound('rocket-start.mp3', playRocketStartSoundSynth); }

  function playRocketCashSound(){
    if (soundVolume <= 0) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    [660, 880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = now + i * 0.06;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  function playRocketCrashSound(){
    if (soundVolume <= 0) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  function startRound(){
    const betVal = Math.max(10, Math.round(Number(betInput.value) || 0));
    if (betVal > balance) {
      betWrap.classList.remove('rocket-insufficient');
      void betWrap.offsetWidth;
      betWrap.classList.add('rocket-insufficient');
      setTimeout(() => betWrap.classList.remove('rocket-insufficient'), 350);
      return;
    }
    bet = betVal;
    setBalance(balance - bet);
    crashPoint = rollCrashPoint();
    state = 'flying';
    cashedOut = false;
    startTime = performance.now();
    trailPoints = [];

    betInput.disabled = true;
    pct30Btn.disabled = true; pct50Btn.disabled = true; pctMaxBtn.disabled = true;
    autoToggle.disabled = true; autoInput.disabled = true;

    playBtn.classList.add('flying');
    playBtn.disabled = false;
    playBtn.textContent = 'Забрать ' + bet + ' G';

    waitingMsgEl.classList.add('hide');
    crashMsgEl.classList.remove('show');
    multEl.classList.remove('crashed', 'cashed');
    multEl.textContent = '1.00x';
    emojiEl.classList.remove('crashed');
    emojiEl.style.left = '6%';
    emojiEl.style.top = '94%';
    trailPathEl.setAttribute('d', '');

    playRocketStartSound();
    animId = requestAnimationFrame(frame);
  }

  function frame(time){
    if (state !== 'flying') return;
    const elapsed = time - startTime;
    const multiplier = multiplierAt(elapsed);

    if (multiplier >= crashPoint) {
      crashRound();
      return;
    }

    multEl.textContent = multiplier.toFixed(2) + 'x';
    if (!cashedOut) {
      playBtn.textContent = 'Забрать ' + Math.floor(bet * multiplier) + ' G';
    }

    const growth = Math.log(multiplier);
    const xPct = Math.min(90, 6 + growth * 28);
    const yBottomPct = Math.min(88, 6 + growth * 27);
    const yTopPct = 100 - yBottomPct;
    emojiEl.style.left = xPct + '%';
    emojiEl.style.top = yTopPct + '%';

    trailPoints.push([xPct, yTopPct]);
    if (trailPoints.length > 300) trailPoints.shift();
    if (trailPoints.length > 1) {
      let d = 'M' + trailPoints[0][0].toFixed(1) + ' ' + trailPoints[0][1].toFixed(1);
      for (let i = 1; i < trailPoints.length; i++) {
        d += ' L' + trailPoints[i][0].toFixed(1) + ' ' + trailPoints[i][1].toFixed(1);
      }
      trailPathEl.setAttribute('d', d);
    }

    if (autoToggle.checked && !cashedOut) {
      const target = Math.max(1.01, Number(autoInput.value) || 0);
      if (multiplier >= target) {
        cashOut(target);
      }
    }

    animId = requestAnimationFrame(frame);
  }

  function cashOut(forcedMultiplier){
    if (state !== 'flying' || cashedOut) return;
    cashedOut = true;
    const elapsed = performance.now() - startTime;
    let multiplier = forcedMultiplier || multiplierAt(elapsed);
    multiplier = Math.min(multiplier, crashPoint);
    const payout = Math.floor(bet * multiplier);
    setBalance(balance + payout);
    multEl.classList.add('cashed');
    playBtn.disabled = true;
    playBtn.textContent = 'Забрано ' + payout + ' G ✓';
    playRocketCashSound();
  }

  function crashRound(){
    state = 'crashed';
    multEl.textContent = crashPoint.toFixed(2) + 'x';
    multEl.classList.add('crashed');
    if (!cashedOut) {
      playBtn.textContent = 'Крах!';
      crashMsgEl.textContent = 'Ракета взорвалась на ' + crashPoint.toFixed(2) + 'x';
      crashMsgEl.classList.add('show');
    }
    playBtn.disabled = true;
    playBtn.classList.remove('flying');
    emojiEl.classList.add('crashed');

    stage.classList.remove('shake');
    void stage.offsetWidth;
    stage.classList.add('shake');

    playRocketCrashSound();

    history.unshift(crashPoint);
    if (history.length > 20) history.pop();
    renderHistory();

    setTimeout(resetRound, 1800);
  }

  function resetRound(){
    state = 'idle';
    betInput.disabled = false;
    pct30Btn.disabled = false; pct50Btn.disabled = false; pctMaxBtn.disabled = false;
    autoToggle.disabled = false; autoInput.disabled = !autoToggle.checked;
    playBtn.disabled = false;
    playBtn.classList.remove('flying');
    syncPlayLabel();
    multEl.textContent = '1.00x';
    multEl.classList.remove('crashed', 'cashed');
    emojiEl.classList.remove('crashed');
    emojiEl.style.left = '6%';
    emojiEl.style.top = '94%';
    crashMsgEl.classList.remove('show');
    waitingMsgEl.classList.remove('hide');
  }

  playBtn.addEventListener('click', () => {
    if (state === 'idle') startRound();
    else if (state === 'flying') cashOut();
  });

  syncPlayLabel();
})();
