"use strict";

// Add a new data/seasonN.json path here when a season is ready.
const DATA_FILES = [
  "data/season1.json",
  "data/season2.json",
  "data/season3.json",
  "data/season4.json",
];

let PHRASES = [];
let DIALOGUES = [];
let AVAILABLE_SEASONS = [];

async function loadData() {
  const responses = await Promise.all(DATA_FILES.map(async file => {
    const response = await fetch(file);
    if (!response.ok) throw new Error(`Failed to load ${file}: ${response.status}`);
    return response.json();
  }));
  PHRASES = responses.flatMap(data => data.phrases || []);
  DIALOGUES = responses.flatMap(data => data.dialogues || []);
  AVAILABLE_SEASONS = responses
    .map(data => Number(data.season))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .map(number => `Season ${number}`);
}

function updateDataSummary() {
  const numbers = AVAILABLE_SEASONS.map(season => Number(season.match(/\d+/)?.[0])).filter(Number.isFinite);
  const range = numbers.length ? (numbers.length === 1 ? String(numbers[0]) : `${numbers[0]}–${numbers.at(-1)}`) : "—";
  document.getElementById("appSubtitle").textContent = `Season ${range} / ${PHRASES.length} Phrases / ${DIALOGUES.length} Dialogues`;
  document.getElementById("phraseCount").textContent = PHRASES.length;
  document.getElementById("dialogueCount").textContent = DIALOGUES.length;
  document.getElementById("seasonRange").textContent = range;
  renderSeasonSelectors();
}

function renderSeasonSelectors() {
  const phraseSeason = document.getElementById("phraseSeasonButtons");
  const roleSeason = document.getElementById("roleSeasonButtons");
  if (phraseSeason) phraseSeason.innerHTML = ["all", ...AVAILABLE_SEASONS].map(season =>
    `<button class="btn blue" onclick="showPhraseHome('${season}')">${season === "all" ? "All Seasons" : season}</button>`
  ).join("");
  if (roleSeason) roleSeason.innerHTML = ["all", ...AVAILABLE_SEASONS].map(season =>
    `<button class="btn green" onclick="showRoleHome('${season}')">${season === "all" ? "All Seasons" : season}</button>`
  ).join("");
}

function showLoadError(error) {
  console.error(error);
  const home = document.getElementById("home");
  if (home) home.innerHTML = '<div class="title">データを読み込めませんでした</div><div class="meta">GitHub Pagesまたはローカルサーバー経由で開いてください。</div>';
}

let currentDialogue=null,previousScreen="roleHome",userRole="A",index=0,answerShown=false,currentPhraseList=[],currentDialogueList=[],phraseReturnTarget=null,currentPhraseSeason="all",currentRoleSeason="all",currentPhraseFilter="all",currentRoleFilter="all",quizItems=[],quizIndex=0,quizCorrect=0,quizMode="random",quizAnswered=false,currentBookmarkTab="phrase";
const $=id=>document.getElementById(id);
function showOnly(id){["home","phraseSeason","phraseHome","phraseDetail","roleSeason","roleHome","roleMenu","memorize","drill","search","bookmarks","quizHome","quizPlay","quizResult"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden");window.scrollTo(0,0);}
function goHome(){cancelSpeech();showOnly("home")}
function cancelSpeech(){if("speechSynthesis" in window) speechSynthesis.cancel();}
function seasonCode(season){const n=Number(String(season).match(/\d+/)?.[0]);return n?`S${String(n).padStart(2,"0")}`:"";}
function normalize(s){return String(s||"").toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9ぁ-んァ-ン一-龥ー]+/g," ").replace(/\s+/g," ").trim();}
function fuzzyMatch(text,q){const t=normalize(text),qq=normalize(q);if(!qq)return true;if(t.includes(qq))return true;const ws=qq.split(" ").filter(Boolean);if(ws.length<=1)return false;let pos=0;for(const w of ws){const f=t.indexOf(w,pos);if(f===-1)return false;pos=f+w.length}return true;}
function highlight(text,q){let out=String(text||"");normalize(q).split(" ").filter(Boolean).forEach(w=>{if(/[ぁ-んァ-ン一-龥ー]/.test(w))return;const re=new RegExp("("+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig");out=out.replace(re,"<mark>$1</mark>")});return out;}

let cachedVoices = [];
function loadVoices(){
  if(!("speechSynthesis" in window)) return [];
  cachedVoices = speechSynthesis.getVoices() || [];
  return cachedVoices;
}
if("speechSynthesis" in window){
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
function pickEnglishVoice(){
  const voices = cachedVoices.length ? cachedVoices : loadVoices();
  return voices.find(v => /en-US/i.test(v.lang)) ||
         voices.find(v => /^en/i.test(v.lang)) ||
         voices[0] || null;
}
function speakLine(text){
  if(!("speechSynthesis" in window)){
    alert("このブラウザでは音声再生に対応していません。");
    return;
  }
  const clean = String(text || "").replace(/[~〜]/g, "").trim();
  if(!clean) return;

  try{
    speechSynthesis.cancel();
    // Android Chrome / WebView 対策：少し待ってから発話
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "en-US";
      u.rate = 0.9;
      u.pitch = 1.0;
      u.volume = 1.0;
      const voice = pickEnglishVoice();
      if(voice) u.voice = voice;
      speechSynthesis.speak(u);
    }, 80);
  }catch(e){
    console.log(e);
    alert("音声再生に失敗しました。Chromeで開くと動く可能性があります。");
  }
}
function testVoice(){
  speakLine("Can I run something by you?");
}

function toggleEl(id){const el=$(id);if(el)el.style.display=el.style.display==="none"?"block":"none";}
function toggleRoleHint(){
  const hint = $("hint");
  const box = $("hintBox");
  if(!hint || !box) return;
  hint.classList.toggle("hidden");
  const label = box.querySelector(".hintHidden");
  if(label) label.textContent = hint.classList.contains("hidden") ? "ヒントを見る" : "ヒントを隠す";
}
function resetRoleHint(){
  const hint = $("hint");
  const box = $("hintBox");
  if(hint) hint.classList.add("hidden");
  const label = box ? box.querySelector(".hintHidden") : null;
  if(label) label.textContent = "ヒントを見る";
}

function toggleLocalSearch(kind){
  const box = kind==="phrase" ? $("phraseLocalSearch") : $("roleLocalSearch");
  const input = kind==="phrase" ? $("phraseFilter") : $("roleFilter");
  if(!box || !input) return;
  const willOpen = box.classList.contains("hidden");
  box.classList.toggle("hidden");
  if(willOpen){
    setTimeout(()=>input.focus(),50);
  }else{
    input.value="";
    if(kind==="phrase") renderPhraseList(currentPhraseList,"");
    if(kind==="role") renderDialogueList(currentDialogueList,"");
  }
}
function resetLocalSearch(kind){
  const box = kind==="phrase" ? $("phraseLocalSearch") : $("roleLocalSearch");
  const input = kind==="phrase" ? $("phraseFilter") : $("roleFilter");
  if(box) box.classList.add("hidden");
  if(input) input.value="";
}

function escapeAttr(s){
  return String(s||"")
    .replace(/&/g,"&amp;")
    .replace(/"/g,"&quot;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}
function bindSpeakerButtons(root=document){
  root.querySelectorAll(".speaker").forEach(btn=>{
    if(btn.dataset.bound==="1") return;
    btn.dataset.bound="1";
    btn.addEventListener("click", e=>{
      e.preventDefault();
      e.stopPropagation();
      speakLine(btn.getAttribute("data-speak") || "");
    });
  });
}


function seasonLabel(season){return season==="all"?"All":season.replace("Season ","S");}
function renderSeasonTabs(active,handler){
  return `<div class="tabs">`+["all",...AVAILABLE_SEASONS].map(s=>`<button class="tab ${s===active?'active':''}" onclick="${handler}('${s}')">${seasonLabel(s)}</button>`).join("")+`</div>`;
}
function renderModeTabs(mode,season){
  return `<div class="modeTabs"><button class="modeTab ${mode==='phrase'?'active':''}" onclick="showPhraseHome('${season}')">📘 フレーズ</button><button class="modeTab ${mode==='role'?'active':''}" onclick="showRoleHome('${season}')">🎭 ロールプレイ</button></div>`;
}
function getStore(key){try{return JSON.parse(localStorage.getItem(key)||"[]")}catch(e){return []}}
function setStore(key,val){localStorage.setItem(key,JSON.stringify(val))}
function isBookmarked(type,id){return getStore("friendsBookmarks_"+type).includes(id)}
function toggleBookmark(type,id,ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  const key="friendsBookmarks_"+type;
  const arr=getStore(key);
  const next=arr.includes(id)?arr.filter(x=>x!==id):arr.concat(id);
  setStore(key,next);
  refreshCurrentScreen();
}
function starButton(type,id){
  return `<button class="starBtn ${isBookmarked(type,id)?'on':''}" onclick="toggleBookmark('${type}','${id}',event)">${isBookmarked(type,id)?'★':'☆'}</button>`;
}
function refreshCurrentScreen(){
  if(!$("phraseHome").classList.contains("hidden")) renderPhraseList(currentPhraseList,$("phraseFilter").value);
  if(!$("roleHome").classList.contains("hidden")){$("roleFilterBar").innerHTML=renderRoleFilters();renderDialogueList(currentDialogueList,$("roleFilter").value);}
  if(!$("phraseDetail").classList.contains("hidden")){
    const m=$("phraseDetailBody").querySelector("[data-phrase-id]");
    if(m) showPhraseDetail(m.getAttribute("data-phrase-id"));
  }
  if(!$("roleMenu").classList.contains("hidden") && currentDialogue) showRoleMenu();
  if(!$("memorize").classList.contains("hidden") && currentDialogue) showMemorize();
  if(!$("bookmarks").classList.contains("hidden")) showBookmarks();
}
function setPhraseFilter(kind){
  currentPhraseFilter=kind;
  $("phraseFilterBar").innerHTML=renderPhraseFilters();
  renderPhraseList(currentPhraseList,$("phraseFilter").value);
}
function phrasePassFilter(p){
  if(currentPhraseFilter==="star3") return Number(p.priority)===3;
  if(currentPhraseFilter==="idiom") return p.type==="idiom";
  if(currentPhraseFilter==="word") return p.type==="word";
  if(currentPhraseFilter==="bookmarked") return isBookmarked("phrase",p.id);
  return true;
}
function renderPhraseFilters(){
  const filters=[["all","ALL"],["star3","★★★"],["idiom","idiom"],["word","word"],["bookmarked","⭐保存"]];
  return `<div class="guide">★＝実用重要度。★★★は特に会話で優先して覚えたい表現です。</div><div class="filterRow">`+
    filters.map(f=>`<button class="filterBtn ${currentPhraseFilter===f[0]?'active':''}" onclick="setPhraseFilter('${f[0]}')">${f[1]}</button>`).join("")+
  `</div>`;
}

function dialogueCategory(d){
  const t=String(d.title||"");
  if(t.includes("恋愛")) return "romance";
  if(t.includes("ケンカ") || t.includes("言い合い") || t.includes("皮肉") || t.includes("衝突") || t.includes("裏切り")) return "fight";
  if(t.includes("仕事") || t.includes("相談") || t.includes("会話操作") || t.includes("判断") || t.includes("行動")) return "work";
  if(t.includes("日常") || t.includes("雑談") || t.includes("ノリ") || t.includes("軽い")) return "daily";
  if(t.includes("メンタル") || t.includes("励まし") || t.includes("優しめ") || t.includes("人生") || t.includes("前向き")) return "mental";
  return "other";
}
function setRoleFilter(kind){
  currentRoleFilter=kind;
  $("roleFilterBar").innerHTML=renderRoleFilters();
  renderDialogueList(currentDialogueList,$("roleFilter").value);
}
function dialoguePassFilter(d){
  if(currentRoleFilter==="bookmarked") return isBookmarked("dialogue",d.id);
  if(currentRoleFilter==="all") return true;
  return dialogueCategory(d)===currentRoleFilter;
}
function renderRoleFilters(){
  const filters=[["all","ALL"],["romance","恋愛"],["fight","ケンカ"],["work","仕事"],["daily","日常"],["mental","メンタル"],["bookmarked","⭐保存"]];
  return `<div class="filterRow">`+
    filters.map(f=>`<button class="filterBtn ${currentRoleFilter===f[0]?'active':''}" onclick="setRoleFilter('${f[0]}')">${f[1]}</button>`).join("")+
  `</div>`;
}

function phraseText(p){return [p.phrase,p.meaning,p.scene,p.example1,p.example2,p.type,p.episode].join(" ")}
function dialogueText(d){return [d.season,d.title,...d.lines.flatMap(l=>[l[1],l[2]])].join(" ")}
function showPhraseSeason(){showOnly("phraseSeason")}
function showPhraseHome(season="all"){
  currentPhraseSeason=season;
  currentPhraseFilter="all";
  currentPhraseList=season==="all"?PHRASES:PHRASES.filter(p=>(p.episode||"").startsWith(seasonCode(season)));
  $("phraseSeasonTitle").innerHTML=renderSeasonTabs(season,"showPhraseHome")+renderModeTabs("phrase",season);
  resetLocalSearch("phrase");
  $("phraseFilterBar").innerHTML=renderPhraseFilters();
  renderPhraseList(currentPhraseList,"");
  showOnly("phraseHome");
}
function renderPhraseList(list,q=""){
  $("phraseList").innerHTML="";
  const filtered=list.filter(p=>phrasePassFilter(p)).filter(p=>fuzzyMatch(phraseText(p),q));
  filtered.forEach(p=>{
    const d=document.createElement("div");
    d.className="item";
    d.innerHTML=`<div class="itemHead"><div><div class="phrase">${highlight(p.phrase,q)}</div><div class="meaning">${highlight(p.meaning,q)}</div><div class="scene">${p.scene}</div></div>${starButton("phrase",p.id)}</div><div><span class="tag">${p.type}</span><span class="tag">${p.priorityText}</span><span class="tag">${p.episode}</span></div>`;
    d.onclick=()=>{phraseReturnTarget=null;showPhraseDetail(p.id)};
    $("phraseList").appendChild(d)
  });
  if(!filtered.length)$("phraseList").innerHTML="<div class='empty'>該当なし</div>";
}
function showPhraseDetail(id){
  const p=PHRASES.find(x=>x.id===id);
  const related=findRelatedDialogsForPhrase(p);
  $("phraseDetailBody").innerHTML=`<div data-phrase-id="${p.id}"></div><div class="top"><button class="small" onclick="backFromPhraseDetail()">← 戻る</button><div class="topActions"><button class="small" onclick="showSearch()">🔍 検索</button><button class="small" onclick="goHome()">🏠 ホーム</button></div></div><div class="itemHead"><div><div class="phrase">${p.phrase}</div><div class="meaning">${p.meaning}</div><div class="scene">${p.scene}</div></div>${starButton("phrase",p.id)}</div><div style="margin:10px 0"><span class="tag">${p.type}</span><span class="tag">${p.priorityText}</span><span class="tag">${p.episode}</span></div><div class="guide">★＝実用重要度。例文をタップすると日本語表示。🔈で音声再生。</div>${exampleBox(p.example1,"", "ex1")}${exampleBox(p.example2,"", "ex2")}<div class="title" style="margin-top:18px">🎭 この表現を使うダイアログ</div>${related.slice(0,8).map(d=>`<button class="btn white" onclick="openDialogueFromPhrase('${d.id}')">${d.season} / ${d.title}</button>`).join("")||"<div class='meta'>関連ダイアログなし</div>"}`;
  showOnly("phraseDetail");
}
function exampleBox(en,jp,id){return `<div class="box"><div style="display:flex;gap:10px;justify-content:space-between;align-items:flex-start"><div onclick="toggleEl('${id}')" style="flex:1;cursor:pointer"><b>${id==="ex1"?"例文1":"例文2"}</b><br>${en}<div id="${id}" class="jp" style="display:none">${jp||"日本語訳は未登録"}</div></div><button class="speaker" data-speak="${escapeAttr(en)}">🔈</button></div></div>`}
function backFromPhraseDetail(){
  if(phraseReturnTarget&&phraseReturnTarget.type==="memorize"){
    const d=DIALOGUES.find(x=>x.id===phraseReturnTarget.dialogueId);
    if(d){currentDialogue=d;showMemorize();return}
  }
  if(phraseReturnTarget&&phraseReturnTarget.type==="search"){showOnly("search");return}
  if(phraseReturnTarget&&phraseReturnTarget.type==="bookmarks"){showBookmarks();return}
  if(phraseReturnTarget&&phraseReturnTarget.type==="graduated"){showQuizHome();showGraduated();return}
  showOnly("phraseHome");
}
function openDialogueFromPhrase(id){currentDialogue=DIALOGUES.find(d=>d.id===id);previousScreen="phraseDetail";showRoleMenu();}

function showRoleSeason(){showOnly("roleSeason")}
function showRoleHome(season="all"){
  currentRoleSeason=season;
  currentDialogueList=season==="all"?DIALOGUES:DIALOGUES.filter(d=>d.season===season);
  currentRoleFilter="all";
  $("roleSeasonTitle").innerHTML=renderSeasonTabs(season,"showRoleHome")+renderModeTabs("role",season);
  resetLocalSearch("role");
  $("roleFilterBar").innerHTML=renderRoleFilters();
  renderDialogueList(currentDialogueList,"");
  showOnly("roleHome");
}
function renderDialogueList(list,q=""){
  $("dialogueList").innerHTML="";
  const filtered=list.filter(d=>dialoguePassFilter(d)).filter(d=>fuzzyMatch(dialogueText(d),q));
  filtered.forEach(d=>{
    const div=document.createElement("div");
    div.className="item";
    div.innerHTML=`<div class="itemHead"><div><div class="meta">${d.season} / ${d.lines.length} turns</div><div class="title">${highlight(d.title,q)}</div></div>${starButton("dialogue",d.id)}</div>`;
    div.onclick=()=>{currentDialogue=d;previousScreen="roleHome";showRoleMenu()};
    $("dialogueList").appendChild(div)
  });
  if(!filtered.length)$("dialogueList").innerHTML="<div class='empty'>該当なし</div>";
}
function showRoleMenu(){
  $("chosenTitle").innerHTML=`<div class="itemHead"><span>${currentDialogue.title}</span>${starButton("dialogue",currentDialogue.id)}</div>`;
  $("chosenMeta").textContent=`${currentDialogue.season} / ${currentDialogue.lines.length} turns`;
  showOnly("roleMenu");
}
function backToRoleSource(){if(previousScreen==="phraseDetail")showOnly("phraseDetail");else if(previousScreen==="search")showOnly("search");else if(previousScreen==="bookmarks")showBookmarks();else showOnly("roleHome");}

const PLACEHOLDER_WORDS=new Set(["someone","somebody","something","somewhere","one","ones","someones","somebodys","somethings"]);
const GENERIC_WORDS=new Set(["what","whats","how","why","when","where","who","which","with","your","you","me","my","him","her","his","it","that","this","the","a","an","to","of","for","at","is","are","be","been","being","do","does","did","have","has","had","can","could","would","should","will","just","really","very","so","not","no"]);
function cleanPhraseVariant(s){
  return normalize(String(s||"")
    .replace(/\([^)]*\)/g," ")
    .replace(/[~〜]/g," ")
    .replace(/someone|somebody|something|somewhere/gi," ")
  ).trim();
}
function phraseVariants(p){
  const raw = String(p.phrase||"");
  let parts = raw.split("/").map(x=>x.trim()).filter(Boolean);
  if(!parts.length) parts=[raw];
  return parts.map(cleanPhraseVariant).filter(v=>v && v.length>=4);
}
function orderedTokensMatch(text,tokens){
  let pos=0;
  for(const t of tokens){
    const found=text.indexOf(t,pos);
    if(found===-1) return false;
    pos=found+t.length;
  }
  return true;
}
function phraseMatchesDialogue(p,d){
  const text = normalize(d.lines.map(l=>l[1]).join(" "));
  const variants = phraseVariants(p);

  for(const v of variants){
    if(v.length>=4 && text.includes(v)) return true;

    const tokens = v.split(" ").filter(w=>w.length>1 && !PLACEHOLDER_WORDS.has(w) && !GENERIC_WORDS.has(w));
    if(tokens.length>=2 && orderedTokensMatch(text,tokens)) return true;

    // 1語だけのフレーズは誤爆しやすいので、基本は完全一致に近い形だけ許可
    if(tokens.length===1){
      const re = new RegExp("(^| )"+tokens[0].replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"( |$)");
      if(v===tokens[0] && re.test(text)) return true;
    }
  }
  return false;
}
function findRelatedDialogsForPhrase(p){
  return DIALOGUES.filter(d=>{
    if(d.phraseLinks && d.phraseLinks.length) return d.phraseLinks.includes(p.id);
    return phraseMatchesDialogue(p,d);
  });
}
function getLinkedPhrases(d){
  if(d.phraseLinks && d.phraseLinks.length){
    const set = new Set(d.phraseLinks);
    return PHRASES.filter(p=>set.has(p.id));
  }
  return PHRASES
    .filter(p=>phraseMatchesDialogue(p,d))
    .sort((a,b)=>String(b.phrase).length-String(a.phrase).length)
    .slice(0,12);
}

function showMemorize(){let h=`<div class="itemHead"><div class="title">${currentDialogue.title}</div>${starButton("dialogue",currentDialogue.id)}</div><div class="meta">${currentDialogue.season}</div><div class="hintText">英文をタップすると日本語表示。🔈で音声再生。</div>`;currentDialogue.lines.forEach((l,i)=>{h+=`<div class="box" style="background:#eff6ff"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div onclick="toggleEl('jp-${i}')" style="flex:1;cursor:pointer"><div class="en">${l[0]}: ${l[1]}</div><div id="jp-${i}" class="jp" style="display:none">${l[2]}</div></div><button class="speaker" data-speak="${escapeAttr(l[1])}">🔈</button></div></div>`});const linked=getLinkedPhrases(currentDialogue);if(linked.length){h+=`<div class="title" style="margin-top:18px">📘 このダイアログで使うフレーズ</div>`;linked.forEach(p=>h+=`<button class="btn white" onclick="phraseReturnTarget={type:'memorize',dialogueId:'${currentDialogue.id}'};showPhraseDetail('${p.id}')">${p.phrase}</button>`);}$("memorizeBody").innerHTML=h;bindSpeakerButtons($("memorizeBody"));showOnly("memorize");}

function startRole(role){userRole=role;index=0;answerShown=false;$("total").textContent=currentDialogue.lines.length;showOnly("drill");renderLine();}
function renderLine(){const l=currentDialogue.lines[index],isUser=l[0]===userRole;answerShown=false;$("progress").textContent=index+1;$("roleBadge").textContent=`${l[0]} のセリフ`;$("drillTitle").textContent=`${currentDialogue.season} / ${currentDialogue.title}`;$("hint").textContent=l[2];resetRoleHint();$("line").textContent=l[1];$("answer").textContent=l[1];$("lineBlock").classList.toggle("hidden",isUser);$("answerBlock").classList.add("hidden");$("showBtn").classList.toggle("hidden",!isUser);$("nextBtn").classList.toggle("hidden",isUser);if(!isUser) setTimeout(()=>speakLine(l[1]),250);}
function showAnswer(){answerShown=true;$("answerBlock").classList.remove("hidden");$("showBtn").classList.add("hidden");$("nextBtn").classList.remove("hidden");}
function nextLine(){if(currentDialogue.lines[index][0]===userRole&&!answerShown)return;index++;if(index>=currentDialogue.lines.length){showRoleMenu();return}renderLine();}




let pendingConfirmAction=null;
function openConfirm(message,action){
  pendingConfirmAction=action;
  $("confirmText").textContent=message;
  $("confirmOverlay").classList.remove("hidden");
}
function closeConfirm(){
  pendingConfirmAction=null;
  $("confirmOverlay").classList.add("hidden");
}
function runConfirm(){
  const action=pendingConfirmAction;
  closeConfirm();
  if(typeof action==="function") action();
}

function getWeakStats(){
  try{return JSON.parse(localStorage.getItem("friendsWeakStats")||"{}")}catch(e){return {}}
}
function setWeakStats(obj){
  localStorage.setItem("friendsWeakStats",JSON.stringify(obj));
}
function isWeakPhrase(id){
  const s=getWeakStats();
  return !!(s[id] && !s[id].graduated);
}
function isGraduatedPhrase(id){
  const s=getWeakStats();
  return !!(s[id] && s[id].graduated);
}
function weakCount(){
  const s=getWeakStats();
  return Object.keys(s).filter(id=>s[id] && !s[id].graduated).length;
}
function graduatedCount(){
  const s=getWeakStats();
  return Object.keys(s).filter(id=>s[id] && s[id].graduated).length;
}
function markMiss(id){
  const s=getWeakStats();
  if(!s[id]) s[id]={miss:0,streak:0,graduated:false};
  s[id].miss=(s[id].miss||0)+1;
  s[id].streak=0;
  s[id].graduated=false;
  setWeakStats(s);
}
function markWeakCorrect(id){
  const s=getWeakStats();
  if(!s[id]) s[id]={miss:0,streak:0,graduated:false};
  s[id].streak=(s[id].streak||0)+1;
  let graduated=false;
  if(s[id].streak>=2){
    s[id].graduated=true;
    graduated=true;
  }
  setWeakStats(s);
  return graduated;
}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function quizPool(mode){
  if(mode==="star3") return PHRASES.filter(p=>Number(p.priority)===3);
  if(mode==="bookmarked") return PHRASES.filter(p=>isBookmarked("phrase",p.id));
  if(mode==="weak") return PHRASES.filter(p=>isWeakPhrase(p.id));
  return PHRASES;
}
function makeQuizItem(answer,pool){
  const choices=shuffle(pool.filter(p=>p.id!==answer.id)).slice(0,3).concat(answer);
  return {answer,choices:shuffle(choices)};
}
function showQuizHome(){
  const w=weakCount(), g=graduatedCount();
  $("quizSummary").innerHTML=`<div class="quizStats"><div class="quizStat"><small>苦手</small><b>${w}</b></div><div class="quizStat"><small>卒業</small><b>${g}</b></div><div class="quizStat"><small>出題</small><b>4択</b></div></div>`;
  showOnly("quizHome");
}
function startQuiz(mode){
  quizMode=mode;
  const pool=quizPool(mode);
  const minNeeded = (mode==="weak" || mode==="bookmarked") ? 1 : 4;
  if(pool.length<minNeeded || PHRASES.length<4){
    if(mode==="weak"){
      showQuizHome();
      $("quizSummary").innerHTML+=`<div class="empty" style="margin-top:12px">まだ苦手フレーズはありません。<br>通常クイズで間違えると、ここで復習できます。</div>`;
    }else if(mode==="bookmarked"){
      showQuizHome();
      $("quizSummary").innerHTML+=`<div class="empty" style="margin-top:12px">保存フレーズはまだありません。<br>フレーズに⭐を付けると、ここで復習できます。</div>`;
    }else{
      showQuizHome();
      $("quizSummary").innerHTML+=`<div class="empty" style="margin-top:12px">この条件では4択を作れるだけのフレーズが足りません。</div>`;
    }
    return;
  }
  const count=Math.min(10,pool.length);
  quizItems=shuffle(pool).slice(0,count).map(p=>makeQuizItem(p,PHRASES));
  quizIndex=0;
  quizCorrect=0;
  quizAnswered=false;
  $("quizTotal").textContent=quizItems.length;
  $("quizModeLabel").textContent=mode==="random"?"ランダム":mode==="star3"?"★★★":mode==="bookmarked"?"⭐保存":"🔥苦手";
  showOnly("quizPlay");
  renderQuiz();
}
function quizQuestionText(p){
  const scene = p.scene ? `\n場面: ${p.scene}` : "";
  return `${p.meaning}${scene}`;
}
function renderQuiz(){
  quizAnswered=false;
  const item=quizItems[quizIndex];
  $("quizProgress").textContent=quizIndex+1;
  const weak = isWeakPhrase(item.answer.id);
  $("quizBody").innerHTML=`<div class="quizQuestion">Q. 次の意味・場面に合う英語フレーズは？<br><br>${quizQuestionText(item.answer).replace(/\n/g,"<br>")}${weak?'<div style="margin-top:8px"><span class="tag">🔥苦手</span></div>':''}</div><div id="quizChoices">${item.choices.map(c=>`<button class="quizChoice" onclick="answerQuiz('${c.id}')">${c.phrase}</button>`).join("")}</div><div id="quizFeedback"></div>`;
}
function answerQuiz(choiceId){
  if(quizAnswered) return;
  quizAnswered=true;
  const item=quizItems[quizIndex];
  const ok=choiceId===item.answer.id;
  if(ok) quizCorrect++;
  document.querySelectorAll(".quizChoice").forEach(btn=>{
    const isCorrect = btn.textContent===item.answer.phrase;
    if(isCorrect) btn.classList.add("correct");
    if(!isCorrect && btn.textContent===PHRASES.find(p=>p.id===choiceId)?.phrase) btn.classList.add("wrong");
    btn.disabled=true;
  });
  let msg="";
  let cls=ok?"good":"bad";
  if(ok){
    if(quizMode==="weak" || isWeakPhrase(item.answer.id)){
      const grad=markWeakCorrect(item.answer.id);
      if(grad){
        msg=`🎓 卒業！「${item.answer.phrase}」は苦手リストから外れました。`;
        cls="grad";
      }else{
        const s=getWeakStats()[item.answer.id];
        msg=`正解！苦手卒業まであと ${Math.max(0,2-(s.streak||0))} 回連続正解。`;
      }
    }else{
      msg="正解！";
    }
  }else{
    markMiss(item.answer.id);
    msg=`不正解。正解は「${item.answer.phrase}」。🔥苦手に追加しました。`;
  }
  $("quizFeedback").innerHTML=`<div class="quizFeedback ${cls}">${msg}</div><div class="box"><div class="itemHead"><div><div class="phrase">${item.answer.phrase}</div><div class="meaning">${item.answer.meaning}</div><div class="scene">${item.answer.scene}</div></div><button class="speaker" onclick="speakLine('${item.answer.phrase.replace(/'/g,"\\'")}')">🔈</button></div></div><button class="btn blue" onclick="nextQuiz()">${quizIndex+1>=quizItems.length?'結果を見る':'次へ'}</button>`;
}
function nextQuiz(){
  quizIndex++;
  if(quizIndex>=quizItems.length){
    showQuizResult();
    return;
  }
  renderQuiz();
}
function showQuizResult(){
  $("quizResultBody").innerHTML=`<div class="quizStats"><div class="quizStat"><small>正解</small><b>${quizCorrect}</b></div><div class="quizStat"><small>出題</small><b>${quizItems.length}</b></div><div class="quizStat"><small>苦手</small><b>${weakCount()}</b></div></div><button class="btn blue" onclick="startQuiz('${quizMode}')">同じ条件でもう一度</button><button class="btn white" onclick="startQuiz('weak')">🔥苦手だけ復習</button><button class="btn soft" onclick="showQuizHome()">クイズメニューへ</button>`;
  showOnly("quizResult");
}

function resetGraduatedPhrase(id){
  openConfirm("このフレーズを卒業済みから外しますか？",()=>{
    const s=getWeakStats();
    if(s[id]) delete s[id];
    setWeakStats(s);
    showGraduated();
  });
}
function resetAllGraduated(){
  openConfirm("卒業済みフレーズをすべてリセットしますか？",()=>{
    const s=getWeakStats();
    Object.keys(s).forEach(id=>{
      if(s[id] && s[id].graduated) delete s[id];
    });
    setWeakStats(s);
    showGraduated();
  });
}

function showGraduated(){
  const s=getWeakStats();
  const ps=PHRASES.filter(p=>s[p.id]&&s[p.id].graduated);
  let h=`<div class="title">🎓 卒業済み</div>`;
  if(ps.length){
    h+=`<div class="resetRow"><button class="miniDanger" onclick="resetAllGraduated()">卒業済みを全リセット</button></div>`;
  }
  h+=ps.map(p=>`<div class="item"><div class="itemHead"><div onclick="phraseReturnTarget={type:'graduated'};showPhraseDetail('${p.id}')" style="flex:1"><div class="phrase">${p.phrase}</div><div class="meaning">${p.meaning}</div><div class="scene">${p.scene}</div></div><button class="miniDanger" onclick="resetGraduatedPhrase('${p.id}')">リセット</button></div></div>`).join("")||"<div class='empty'>まだ卒業済みフレーズはありません</div>";
  $("quizSummary").innerHTML=h;
}


function setBookmarkTab(tab){
  currentBookmarkTab=tab;
  showBookmarks();
}
function renderBookmarkTabs(){
  return `<div class="modeTabs"><button class="modeTab ${currentBookmarkTab==='phrase'?'active':''}" onclick="setBookmarkTab('phrase')">📘 フレーズ</button><button class="modeTab ${currentBookmarkTab==='dialogue'?'active':''}" onclick="setBookmarkTab('dialogue')">🎭 ダイアログ</button></div>`;
}

function showBookmarks(){
  const phraseIds=getStore("friendsBookmarks_phrase");
  const dialogueIds=getStore("friendsBookmarks_dialogue");
  const ps=PHRASES.filter(p=>phraseIds.includes(p.id));
  const ds=DIALOGUES.filter(d=>dialogueIds.includes(d.id));
  let h=renderBookmarkTabs();
  if(currentBookmarkTab==="phrase"){
    h+=`<div class="title">📘 保存したフレーズ</div>`;
    h+=ps.map(p=>`<div class="item" onclick="phraseReturnTarget={type:'bookmarks'};showPhraseDetail('${p.id}')"><div class="itemHead"><div><div class="phrase">${p.phrase}</div><div class="meaning">${p.meaning}</div><div class="scene">${p.scene}</div><div><span class="tag">${p.type}</span><span class="tag">${p.priorityText}</span><span class="tag">${p.episode}</span></div></div>${starButton("phrase",p.id)}</div></div>`).join("") || `<div class="empty">保存したフレーズはまだありません</div>`;
  }else{
    h+=`<div class="title">🎭 保存したダイアログ</div>`;
    h+=ds.map(d=>`<div class="item" onclick="currentDialogue=DIALOGUES.find(x=>x.id==='${d.id}');previousScreen='bookmarks';showRoleMenu()"><div class="itemHead"><div><div class="meta">${d.season} / ${d.lines.length} turns</div><div class="title">${d.title}</div></div>${starButton("dialogue",d.id)}</div></div>`).join("") || `<div class="empty">保存したダイアログはまだありません</div>`;
  }
  $("bookmarkBody").innerHTML=h;
  showOnly("bookmarks");
}

function showSearch(){$("searchInput").value="";renderSearch("");showOnly("search");}
function renderSearch(q){const ph=PHRASES.filter(p=>fuzzyMatch(phraseText(p),q)).slice(0,30);const dh=DIALOGUES.map(d=>{const lines=d.lines.map((l,i)=>({i,l})).filter(x=>fuzzyMatch(x.l[1]+" "+x.l[2],q));return {d,lines,titleHit:fuzzyMatch(d.season+" "+d.title,q)}}).filter(x=>!q||x.lines.length||x.titleHit).slice(0,20);$("searchResults").innerHTML=`<div class="title">📘 フレーズ</div>${ph.map(p=>`<div class="item" onclick="phraseReturnTarget={type:'search'};showPhraseDetail('${p.id}')"><div class="phrase">${highlight(p.phrase,q)}</div><div class="meaning">${highlight(p.meaning,q)}</div><div class="scene">${p.scene}</div></div>`).join("")||"<div class='meta'>該当なし</div>"}<div class="title" style="margin-top:18px">🎭 ダイアログ</div>${dh.map(x=>`<div class="item"><div class="meta">${x.d.season} / ${x.d.lines.length} turns</div><div class="title">${highlight(x.d.title,q)}</div>${x.lines.slice(0,3).map(h=>`<div class="box"><div class="meta">ヒット行 ${h.i+1}</div><div class="en">${h.l[0]}: ${highlight(h.l[1],q)}</div><div class="jp">${highlight(h.l[2],q)}</div></div>`).join("")}<button class="btn blue" onclick="currentDialogue=DIALOGUES.find(d=>d.id==='${x.d.id}');previousScreen='search';showRoleMenu()">▶ このダイアログを開く</button></div>`).join("")||"<div class='meta'>該当なし</div>"}`;}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
    updateDataSummary();
    bindSpeakerButtons();
  } catch (error) {
    showLoadError(error);
  }
});
