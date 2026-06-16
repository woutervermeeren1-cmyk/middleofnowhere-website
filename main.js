// ============================================
// Middle of Nowhere — main.js
// ============================================

// ---- Sticky nav ----
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

// ---- Mobile hamburger ----
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  const isOpen = navLinks.classList.contains('open');
  hamburger.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ---- Smooth reveal on scroll ----
const revealEls = document.querySelectorAll(
  '.formule-block, .praktisch-item, .intro-grid, .facts-inner'
);
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
revealEls.forEach(el => {
  el.classList.add('reveal');
  observer.observe(el);
});
const style = document.createElement('style');
style.textContent = `.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.65s ease, transform 0.65s ease; } .revealed { opacity: 1; transform: translateY(0); }`;
document.head.appendChild(style);


// ============================================
// PRIJSCALCULATOR
// ============================================

const WEBHOOK_URL = 'https://naturama.app.n8n.cloud/webhook/mon-aanvraag';

// Prijstabellen
const PRIJZEN = {
  trouw: {
    locatie: { 'tot-75': 5000, '75-100': 6500, '100-125': 7500, '125-150': 8500, '150+': 9500 },
    wijngaard: 1500,
    supervisie: 240,   // raming 8u
    meubilair: 450,
  },
  families: {
    serre:     { 'tot-50': 750,  '50-80': 1000, '80-150': 1720, '150+': 2500 },
    wijngaard: { 'tot-50': 950,  '50-80': 1300, '80-150': 2000, '150+': 3000 },
    supervisie: 150,  // raming 5u
    meubilair: 500,
  },
  bedrijven: {
    dagdeel:   { 'tot-50': 500,  '50-80': 800,  '80-120': 2100, '120+': 3500 },
    volledig:  { 'tot-50': null, '50-80': 1500, '80-120': 2650, '120+': 3500 },
    supervisie: 90,   // raming 3u
  },
};

// Vragen per type
const VRAGEN = {
  trouw: [
    {
      id: 'personen',
      label: 'Aantal gasten',
      opties: [
        { label: 'Tot 75 personen', value: 'tot-75' },
        { label: '75 – 100 personen', value: '75-100' },
        { label: '100 – 125 personen', value: '100-125' },
        { label: '125 – 150 personen', value: '125-150' },
        { label: '150+ personen', value: '150+' },
      ]
    },
    {
      id: 'wijngaard',
      label: 'Lunch of diner in de wijngaard?',
      opties: [
        { label: 'Ja, graag (+€1.500)', value: 'ja' },
        { label: 'Nee, enkel de serre', value: 'nee' },
      ]
    },
  ],
  families: [
    {
      id: 'personen',
      label: 'Aantal gasten',
      opties: [
        { label: 'Tot 50 personen', value: 'tot-50' },
        { label: '50 – 80 personen', value: '50-80' },
        { label: '80 – 150 personen', value: '80-150' },
        { label: '150+ personen', value: '150+' },
      ]
    },
    {
      id: 'ruimte',
      label: 'Welke ruimte?',
      opties: [
        { label: 'Tropische serre', value: 'serre' },
        { label: 'Wijngaard buiten', value: 'wijngaard' },
      ]
    },
  ],
  bedrijven: [
    {
      id: 'personen',
      label: 'Aantal aanwezigen',
      opties: [
        { label: 'Tot 50 personen', value: 'tot-50' },
        { label: '50 – 80 personen', value: '50-80' },
        { label: '80 – 120 personen', value: '80-120' },
        { label: '120+ personen', value: '120+' },
      ]
    },
    {
      id: 'duur',
      label: 'Hoe lang?',
      opties: [
        { label: 'Dagdeel (halve dag)', value: 'dagdeel' },
        { label: 'Volledige dag', value: 'volledig' },
      ]
    },
  ],
};

// State
let state = { type: null, antwoorden: {}, stap: 1 };

function goToStep(n) {
  state.stap = n;
  [1, 2, 3, 4].forEach(i => {
    document.getElementById(`calcStep${i}`)?.classList.add('hidden');
  });
  document.getElementById('calcSuccess')?.classList.add('hidden');
  document.getElementById(`calcStep${n}`)?.classList.remove('hidden');

  // Update stap indicator
  document.querySelectorAll('.calc-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === n) el.classList.add('active');
    if (s < n) el.classList.add('done');
  });
}

// Stap 1: type kiezen
document.querySelectorAll('.calc-type-card').forEach(card => {
  card.addEventListener('click', () => {
    state.type = card.dataset.type;
    state.antwoorden = {};
    renderVragen();
    goToStep(2);
  });
});

function renderVragen() {
  const container = document.getElementById('calcQuestions');
  container.innerHTML = '';
  VRAGEN[state.type].forEach(vraag => {
    const div = document.createElement('div');
    div.className = 'calc-question';
    div.innerHTML = `<label>${vraag.label}</label><div class="calc-option-group" data-id="${vraag.id}"></div>`;
    const group = div.querySelector('.calc-option-group');
    vraag.opties.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'calc-option' + (state.antwoorden[vraag.id] === opt.value ? ' selected' : '');
      btn.textContent = opt.label;
      btn.dataset.value = opt.value;
      btn.addEventListener('click', () => {
        group.querySelectorAll('.calc-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.antwoorden[vraag.id] = opt.value;
      });
      group.appendChild(btn);
    });
    container.appendChild(div);
  });
}

function berekenPrijs() {
  const { type, antwoorden } = state;
  let totaal = 0;
  const items = [];

  if (type === 'trouw') {
    const p = antwoorden.personen || 'tot-75';
    const base = PRIJZEN.trouw.locatie[p];
    totaal += base;
    items.push({ label: 'Huur locatie', bedrag: base });
    if (antwoorden.wijngaard === 'ja') {
      totaal += PRIJZEN.trouw.wijngaard;
      items.push({ label: 'Diner/lunch wijngaard', bedrag: PRIJZEN.trouw.wijngaard });
    }
    totaal += PRIJZEN.trouw.supervisie;
    items.push({ label: 'Supervisie (raming)', bedrag: PRIJZEN.trouw.supervisie });
    totaal += PRIJZEN.trouw.meubilair;
    items.push({ label: 'Meubilair & logistiek', bedrag: PRIJZEN.trouw.meubilair });
  }

  if (type === 'families') {
    const p = antwoorden.personen || 'tot-50';
    const ruimte = antwoorden.ruimte || 'serre';
    const base = PRIJZEN.families[ruimte][p];
    totaal += base;
    items.push({ label: `Huur ${ruimte}`, bedrag: base });
    totaal += PRIJZEN.families.supervisie;
    items.push({ label: 'Supervisie (raming)', bedrag: PRIJZEN.families.supervisie });
    totaal += PRIJZEN.families.meubilair;
    items.push({ label: 'Meubilair & logistiek', bedrag: PRIJZEN.families.meubilair });
  }

  if (type === 'bedrijven') {
    const p = antwoorden.personen || 'tot-50';
    const duur = antwoorden.duur || 'dagdeel';
    const base = PRIJZEN.bedrijven[duur][p] || PRIJZEN.bedrijven.dagdeel[p];
    totaal += base;
    items.push({ label: `Huur serre (${duur})`, bedrag: base });
    totaal += PRIJZEN.bedrijven.supervisie;
    items.push({ label: 'Supervisie (raming)', bedrag: PRIJZEN.bedrijven.supervisie });
  }

  return { totaal, items };
}

document.getElementById('calcNext2').addEventListener('click', () => {
  const vragen = VRAGEN[state.type];
  const ontbrekend = vragen.find(v => !state.antwoorden[v.id]);
  if (ontbrekend) {
    alert(`Gelieve nog een keuze te maken bij: ${ontbrekend.label}`);
    return;
  }
  const { totaal, items } = berekenPrijs();

  document.getElementById('calcPrice').textContent =
    '€ ' + totaal.toLocaleString('nl-BE');

  const breakdown = document.getElementById('calcBreakdown');
  breakdown.innerHTML = items.map(item =>
    `<div class="calc-breakdown-item"><span>${item.label}</span><strong>€ ${item.bedrag.toLocaleString('nl-BE')}</strong></div>`
  ).join('');

  goToStep(3);
});

document.getElementById('calcBack2').addEventListener('click', () => goToStep(1));
document.getElementById('calcBack3').addEventListener('click', () => goToStep(2));
document.getElementById('calcNext3').addEventListener('click', () => goToStep(4));
document.getElementById('calcBack4').addEventListener('click', () => goToStep(3));

// Stap 4: versturen
document.getElementById('calcForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loading').style.display = '';
  btn.disabled = true;

  const formData = Object.fromEntries(new FormData(e.target));
  const { totaal, items } = berekenPrijs();

  const payload = {
    ...formData,
    type: state.type,
    antwoorden: state.antwoorden,
    geraamde_prijs: totaal,
    breakdown: items,
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });
  } catch (err) {
    console.error(err);
  }

  // Toon success
  document.getElementById('calcStep4').classList.add('hidden');
  document.getElementById('calcSuccess').classList.remove('hidden');
  document.querySelectorAll('.calc-step').forEach(el => el.classList.add('done'));
});
