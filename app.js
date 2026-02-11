const $ = (sel) => document.querySelector(sel);

const elQ = $("#q");
const elItems = $("#items");
const elCount = $("#count");
const elEmpty = $("#empty");
const elDetail = $("#detail");
const elDTitle = $("#dTitle");
const elDMeta = $("#dMeta");
const elDLyrics = $("#dLyrics");
const btnClear = $("#btnClear");
const btnCopy = $("#btnCopy");
const btnShare = $("#btnShare");
const elStatus = $("#status");

let hymns = [];
let filtered = [];
let selectedId = null;

function normalize(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function snippet(text, q){
  const t = (text || "").replace(/\s+/g, " ").trim();
  if(!t) return "";
  if(!q) return t.slice(0, 90) + (t.length > 90 ? "…" : "");
  const idx = normalize(t).indexOf(normalize(q));
  if(idx === -1) return t.slice(0, 90) + (t.length > 90 ? "…" : "");
  const start = Math.max(0, idx - 35);
  const end = Math.min(t.length, idx + 55);
  let s = t.slice(start, end);
  if(start > 0) s = "…" + s;
  if(end < t.length) s = s + "…";
  return s;
}

function renderList(){
  elItems.innerHTML = "";
  elCount.textContent = String(filtered.length);

  const q = elQ.value.trim();

  for(const h of filtered){
    const li = document.createElement("li");

    const id = Number(h.id); // garante number
    li.dataset.id = String(id);

    if(id === selectedId) li.classList.add("active");

    const title = document.createElement("div");
    title.className = "t";
    title.textContent = `${h.number} - ${h.title}`;

    const sub = document.createElement("div");
    sub.className = "s";
    sub.textContent = snippet(h.lyrics, q);

    li.appendChild(title);
    li.appendChild(sub);

    // clique sempre passando number
    li.addEventListener("click", () => select(id));

    elItems.appendChild(li);
  }
}

function select(id){
  id = Number(id);
  selectedId = id;

  // find robusto caso venha string no JSON
  const h = hymns.find(x => Number(x.id) === id);
  if(!h) return;

  elEmpty.classList.add("hidden");
  elDetail.classList.remove("hidden");

  elDTitle.textContent = `${h.number} - ${h.title}`;
  elDMeta.textContent = `${(h.lyrics || "").split(/\n+/).filter(Boolean).length} linhas`;
  elDLyrics.textContent = h.lyrics || "";

  // save last opened
  try{ localStorage.setItem("lastId", String(id)); }catch{}
  renderList();
}

function applyFilter(){
  const q = elQ.value.trim();

  if(!q){
    filtered = hymns;
  }else{
    const nq = normalize(q);
    filtered = hymns.filter(h => {
      const t = normalize(h.title);
      const l = normalize(h.lyrics);
      const n = normalize(h.number);
      return t.includes(nq) || l.includes(nq) || n.includes(nq);
    });
  }

  // se o selecionado não estiver no filtro atual, limpa viewer
  if(selectedId !== null && !filtered.some(x => Number(x.id) === selectedId)){
    selectedId = null;
    elDetail.classList.add("hidden");
    elEmpty.classList.remove("hidden");
  }

  renderList();
}

async function load(){
  // dica: em Pages às vezes cache pega pesado, no-cache ajuda
  const res = await fetch("./louvores.json", { cache: "no-cache" });

  // normaliza ids como number já no carregamento
  const data = await res.json();
  hymns = Array.isArray(data)
    ? data.map(h => ({ ...h, id: Number(h.id) }))
    : [];

  filtered = hymns;
  applyFilter();

  const lastRaw = localStorage.getItem("lastId");
  const last = Number(lastRaw);
  if(Number.isFinite(last) && last > 0) select(last);
}

btnClear.addEventListener("click", () => {
  elQ.value = "";
  elQ.focus();
  applyFilter();
});

elQ.addEventListener("input", () => applyFilter());

btnCopy.addEventListener("click", async () => {
  const h = hymns.find(x => Number(x.id) === selectedId);
  if(!h) return;

  const text = `${h.number} - ${h.title}\n\n${h.lyrics || ""}`;

  try{
    await navigator.clipboard.writeText(text);
    elStatus.textContent = "Copiado ✔";
    setTimeout(() => elStatus.textContent = "", 1200);
  }catch{
    elStatus.textContent = "Não foi possível copiar";
    setTimeout(() => elStatus.textContent = "", 1200);
  }
});

btnShare.addEventListener("click", async () => {
  const h = hymns.find(x => Number(x.id) === selectedId);
  if(!h) return;

  const text = `${h.number} - ${h.title}\n\n${h.lyrics || ""}`;

  if(navigator.share){
    try{
      await navigator.share({ title: h.title, text });
    }catch{}
  }else{
    // fallback: copy
    try{ await navigator.clipboard.writeText(text); }catch{}
    elStatus.textContent = "Sem Share API: copiei ✔";
    setTimeout(() => elStatus.textContent = "", 1400);
  }
});

// Service worker
if("serviceWorker" in navigator){
  window.addEventListener("load", async () => {
    try{
      const reg = await navigator.serviceWorker.register("./sw.js");
      reg.update?.();
    }catch{}
  });
}

load();
