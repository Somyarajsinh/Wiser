(() => {
'use strict';
const LESSONS = window.WISER_LESSONS || [];
const CATEGORIES = {
  Mind:{emoji:'🧠',color:'#c9b2ff',rgb:'201,178,255'},
  Science:{emoji:'⚗️',color:'#8bf0d0',rgb:'139,240,208'},
  Money:{emoji:'💰',color:'#c9fc79',rgb:'201,252,121'},
  Tech:{emoji:'⚡',color:'#8db9ff',rgb:'141,185,255'},
  Space:{emoji:'🌌',color:'#f2a3fd',rgb:'242,163,253'},
  History:{emoji:'🏛️',color:'#ffc594',rgb:'255,197,148'},
  World:{emoji:'🌍',color:'#89e8ed',rgb:'137,232,237'}
};
const TOPICS = Object.keys(CATEGORIES);
const STORAGE_KEY = 'wiser-v1-progress';
let state = loadState();
let activeTopic = 'For You';
let cycleUsed = new Set();
let recent = [];
let activeIndex = 0;
let lastActiveIndex = -1;
let totalRendered = 0;
let scrollTick = false;
let currentModal = '';
let exploreTerm = '';
let exploreTopic = 'All';
let toastTimeout = null;
let focusNudgeShown = false;
let speechPlaying = false;
let duel={items:[],index:0,correct:0,deadline:0,interval:null,answered:false};
const sessionStart = Date.now();
const feed = document.getElementById('reel-feed');
const modalLayer = document.getElementById('modal-layer');
const modalContent = document.getElementById('modal-content');
const toastEl = document.getElementById('toast');
const DAY = localDay();

function loadState(){
  const basic = {xp:0,likes:[],saved:[],revealed:[],attempts:{},days:{},affinity:{},focus:10,bonusDays:[],visited:[]};
  try { const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return basic; const old=JSON.parse(raw); return {...basic,...old,days:old.days||{},attempts:old.attempts||{},affinity:old.affinity||{}}; }
  catch(e){return basic;}
}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}}
function localDay(offset=0){let d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function escaped(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function catVars(topic){const c=CATEGORIES[topic]||CATEGORIES.Mind;return `--accent:${c.color};--accent-rgb:${c.rgb}`;}
function toast(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toastEl.classList.remove('show'),2600);}
function bonusXP(points){state.xp+=points;persist();refreshStats();toast(`⚡ +${points} XP · Keep learning!`);}
function addAffinity(topic,count){state.affinity[topic]=(state.affinity[topic]||0)+count;}
function getDailyIds(){return state.days[DAY]||[];}
function dailyScore(){return Math.min(5,getDailyIds().length);}
function daysStreak(){let s=0; let offset=getDailyIds().length?0:-1;while((state.days[localDay(offset)]||[]).length){s++;offset--;}return s;}
function answeredCount(){return Object.keys(state.attempts).length;}
function refreshStats(){
 const level=Math.floor(state.xp/100)+1;
 document.getElementById('xp-number').textContent=state.xp.toLocaleString();
 document.getElementById('level-label').textContent=`Lv. ${level}`;
 document.getElementById('level-progress').style.width=`${state.xp%100}%`;
 document.getElementById('level-caption').textContent=`${100-state.xp%100} XP until level ${level+1}`;
 document.getElementById('streak-number').textContent=daysStreak();
 document.getElementById('learned-number').textContent=answeredCount();
 document.getElementById('saved-nav-count').textContent=state.saved.length;
 const n=dailyScore();
 document.getElementById('quest-dots').innerHTML=Array.from({length:5},(_,i)=>`<span class="quest-dot ${i<n?'done':''}">${i<n?'✓':i+1}</span>`).join('');
 document.getElementById('quest-caption').textContent=`${n} of 5 completed today${n===5?' · Quest complete!':''}`;
}
function renderTopics(){
 document.getElementById('topic-navigation').innerHTML=TOPICS.map(t=>`<button class="topic-nav-item ${activeTopic===t?'active':''}" data-topic="${t}"><span class="topic-emoji">${CATEGORIES[t].emoji}</span>${t}</button>`).join('');
 document.getElementById('feed-tabs').innerHTML=['For You',...TOPICS].map(t=>`<button class="feed-tab ${activeTopic===t?'active':''}" data-topic="${t}">${t==='For You'?'✦ &nbsp;For You':`${CATEGORIES[t].emoji} ${t}`}</button>`).join('')+'<button class="feed-tab" data-action="challenge">⚡ Brain Duel</button>';
 document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.action==='home'&&currentModal===''));
 document.querySelectorAll('.mobile-nav button').forEach(b=>b.classList.toggle('active',b.dataset.action===(currentModal||'home')));
}
function chooseNext(){
 let pool=LESSONS.filter(l=>activeTopic==='For You'||l.topic===activeTopic);
 if(!pool.length)pool=LESSONS;
 let available=pool.filter(l=>!cycleUsed.has(l.id));
 if(!available.length){cycleUsed.clear();available=pool;}
 const nonrecent=available.filter(l=>!recent.includes(l.id));
 if(nonrecent.length)available=nonrecent;
 const weights=available.map(l=>Math.max(0.5,4+(state.affinity[l.topic]||0)*0.18-(state.attempts[l.id]?1.5:0)));
 let draw=Math.random()*weights.reduce((a,b)=>a+b,0),chosen=available[0];
 for(let i=0;i<available.length;i++){draw-=weights[i];if(draw<=0){chosen=available[i];break;}}
 cycleUsed.add(chosen.id);recent.push(chosen.id);if(recent.length>7)recent.shift();
 return chosen;
}
function lessonCard(lesson){
 const liked=state.likes.includes(lesson.id),saved=state.saved.includes(lesson.id);
 const long=lesson.big.length>4?'long':'';
 return `<section class="reel phase-hook" data-id="${lesson.id}" data-seq="${totalRendered++}" style="${catVars(lesson.topic)}">
 <div class="story-progress"><span class="story-segment"></span><span class="story-segment"></span><span class="story-segment"></span></div>
 <div class="reel-top-meta"><span>WISER ORIGINALS &nbsp;✳</span><span class="meta-right"><i class="meta-dot"></i> 30-SEC WONDER</span></div>
 <div class="reel-scene"><div class="visual-halo"></div><div class="visual-orbit"></div><div class="visual-symbol">${lesson.symbol}</div><div class="visual-number ${long}">${escaped(lesson.big)}</div><div class="visual-micro">${escaped(lesson.micro)}</div><i class="visual-deco a"></i><i class="visual-deco b"></i><i class="visual-deco c"></i></div>
 <div class="reel-content">
 <div class="phase-panel panel-hook"><div class="reel-badge"><i></i>${CATEGORIES[lesson.topic].emoji} ${escaped(lesson.topic)} · ${escaped(lesson.kind)}</div><h2 class="reel-title">${escaped(lesson.title)}</h2><p class="reel-desc">${escaped(lesson.hook)}</p><button class="reel-button" data-action="reveal">Tap to unlock the idea <span class="arrow">↗</span></button></div>
 <div class="phase-panel panel-learn"><div class="reel-badge"><i></i>THE AHA MOMENT</div><h2 class="reel-title">${escaped(lesson.title)}</h2><div class="learn-body"><p>${escaped(lesson.body)}</p><div class="takeaway"><strong>KEEP THIS ONE</strong>${escaped(lesson.takeaway)}</div></div><button class="reel-button" data-action="quiz">Test your brain <span class="arrow">→</span></button></div>
 <div class="phase-panel panel-quiz"><div class="quiz-prefix">✦ &nbsp;QUICK THINK · +20 XP</div><h2 class="quiz-question">${escaped(lesson.question)}</h2><div class="quiz-options">${lesson.choices.map((choice,i)=>`<button class="quiz-option" data-action="answer" data-index="${i}"><span class="quiz-index">${'ABCD'[i]}</span><span>${escaped(choice)}</span></button>`).join('')}</div><div class="quiz-feedback"></div><button class="reel-button quiz-next" data-action="next">Another brain spark &nbsp;↓</button></div>
 </div>
 <div class="reel-actions"><button class="action ${liked?'active':''}" data-action="like" title="Love this lesson" aria-label="Like lesson"><span class="action-icon">${liked?'♥':'♡'}</span><span class="action-label">Like</span></button><button class="action ${saved?'active':''}" data-action="save" title="Save for later" aria-label="Save lesson"><span class="action-icon">${saved?'▣':'▢'}</span><span class="action-label">Save</span></button><button class="action" data-action="share" title="Share lesson" aria-label="Share lesson"><span class="action-icon">↗</span><span class="action-label">Share</span></button><button class="action" data-action="listen" title="Listen to the lesson" aria-label="Listen to lesson"><span class="action-icon">♫</span><span class="action-label">Listen</span></button></div>
 </section>`;
}
function addBatch(n=12,first=null){
 let html='';
 for(let i=0;i<n;i++){const l=i===0&&first?first:chooseNext();html+=lessonCard(l);}
 feed.insertAdjacentHTML('beforeend',html);
}
function resetFeed(first=null){
 window.speechSynthesis?.cancel();speechPlaying=false;
 cycleUsed.clear();recent=[];totalRendered=0;feed.innerHTML='';activeIndex=0;lastActiveIndex=-1;
 if(first){cycleUsed.add(first.id);recent.push(first.id);}
 addBatch(16,first);
 feed.scrollTop=0;
 updateActive(0);
 renderTopics();
}
function updateActive(next){
 const reels=feed.children;if(!reels.length)return;
 const i=Math.max(0,Math.min(next,reels.length-1));
 if(i===lastActiveIndex)return;
 activeIndex=i;lastActiveIndex=i;
 let current=reels[i];
 document.getElementById('stage-counter').textContent=`${String(Number(current.dataset.seq)+1).padStart(2,'0')} / ∞`;
 if(i>0)document.getElementById('feed-hint').classList.add('hidden');
 if(!state.visited.includes(+current.dataset.id)){state.visited.push(+current.dataset.id);persist();}
 if(i>=reels.length-6)addBatch(12);
 // Keep the endlessly growing feed lightweight on long sessions.
 if(feed.children.length>165&&activeIndex>90){
  const drop=65, height=feed.clientHeight;
  feed.style.scrollBehavior='auto';
  for(let j=0;j<drop;j++)feed.firstElementChild?.remove();
  activeIndex-=drop;lastActiveIndex-=drop;
  feed.scrollTop=Math.max(0,feed.scrollTop-drop*height);
  requestAnimationFrame(()=>{feed.style.scrollBehavior='';});
 }
}
function onScroll(){
 if(scrollTick)return;scrollTick=true;
 requestAnimationFrame(()=>{
  scrollTick=false;
  const h=feed.clientHeight||1;
  const idx=Math.round(feed.scrollTop/h);
  updateActive(idx);
 });
}
function scrollToIndex(index){
 let i=Math.max(0,index);
 while(i>=feed.children.length-2)addBatch(12);
 feed.scrollTo({top:i*feed.clientHeight,behavior:'smooth'});
 updateActive(i);
}
function getActiveCard(){return feed.children[activeIndex];}
function getLesson(card){return LESSONS.find(l=>l.id===Number(card?.dataset.id));}
function phaseTo(card,p){card.classList.remove('phase-hook','phase-learn','phase-quiz');card.classList.add('phase-'+p);}
function reveal(card){const l=getLesson(card);if(!l)return;phaseTo(card,'learn');if(!state.revealed.includes(l.id)){state.revealed.push(l.id);bonusXP(5);}}
function showQuiz(card){phaseTo(card,'quiz');}
function makeConfetti(card){for(let i=0;i<22;i++){const el=document.createElement('span');el.className='confetti';el.style.setProperty('--tx',`${(Math.random()-.5)*350}px`);el.style.setProperty('--ty',`${(Math.random()-.6)*320}px`);el.style.setProperty('--rot',`${(Math.random()-.5)*900}deg`);el.style.background=['#c9fc79','#fff','#bdb2ff','#ffd57d'][i%4];card.appendChild(el);setTimeout(()=>el.remove(),1000);}}
function answer(card,index){
 if(card.dataset.answered)return;
 const l=getLesson(card);if(!l)return;
 const correct=Number(index)===l.correct;
 card.dataset.answered='true';
 card.querySelectorAll('.quiz-option').forEach(b=>{b.disabled=true;if(+b.dataset.index===l.correct)b.classList.add('correct');else if(+b.dataset.index===index)b.classList.add('wrong');});
 const feedback=card.querySelector('.quiz-feedback');
 feedback.innerHTML=`<strong>${correct?'✓ Nailed it!':'↗ Close! Now you know.'}</strong>${escaped(l.explain)}`;
 feedback.classList.add('visible');
 card.querySelector('.quiz-next').classList.add('visible');
 if(!state.attempts[l.id]){
  state.attempts[l.id]={correct,date:DAY};
  addAffinity(l.topic,correct?2:1);
  state.days[DAY]=state.days[DAY]||[];
  state.days[DAY].push(l.id);
  let points=correct?20:8;
  if(state.days[DAY].length===5&&!state.bonusDays.includes(DAY)){
   state.bonusDays.push(DAY);points+=100;toast('✦ Daily quest complete! +100 XP bonus');
  }
  bonusXP(points);
 }else{persist();refreshStats();}
 if(correct)makeConfetti(card);
}
function toggleList(prop,id,card,selector,icons){
 const list=state[prop],found=list.indexOf(id),adding=found<0;
 if(adding)list.push(id);else list.splice(found,1);
 document.querySelectorAll(`.reel[data-id="${id}"] ${selector}`).forEach(button=>{button.classList.toggle('active',adding);button.querySelector('.action-icon').textContent=adding?icons[1]:icons[0];});
 if(prop==='likes'&&adding)addAffinity(getLesson(card).topic,3);
 persist();refreshStats();toast(prop==='saved'?(adding?'Saved to your brain bank ♡':'Removed from saved'):(adding?'More like this coming up ♥':'Preference updated'));
}
async function shareLesson(card){
 const l=getLesson(card);
 const text=`🧠 ${l.title}\n\n${l.body}\n\n${l.takeaway}\n\n— Wiser: make every scroll count.`;
 try{
  if(navigator.share)await navigator.share({title:l.title,text});
  else if(navigator.clipboard){await navigator.clipboard.writeText(text);toast('Lesson copied — share the curiosity!');}
  else toast('Sharing is unavailable in this browser.');
 }catch(e){if(e?.name!=='AbortError')toast('Could not share this time.');}
}
function listenTo(card){
 if(!('speechSynthesis' in window)){toast('Audio reading is not supported here.');return;}
 if(speechPlaying){speechSynthesis.cancel();speechPlaying=false;toast('Audio stopped');return;}
 const l=getLesson(card);
 let utterance=new SpeechSynthesisUtterance(`${l.title}. ${l.body} Remember: ${l.takeaway}`);
 utterance.rate=.96;utterance.pitch=1.05;
 utterance.onend=()=>{speechPlaying=false;};utterance.onerror=()=>{speechPlaying=false;};
 speechSynthesis.cancel();speechSynthesis.speak(utterance);speechPlaying=true;toast('♫ Reading the lesson aloud · Tap again to stop');
}
function chooseTopic(topic){
 if(topic!=='For You'&&!TOPICS.includes(topic))return;
 activeTopic=topic;closeModal();resetFeed();toast(topic==='For You'?'✦ Curiosity mode: on':`${CATEGORIES[topic].emoji} Exploring ${topic}`);
}
function openModal(type){
 currentModal=type;modalLayer.hidden=false;
 if(type==='explore'){exploreTerm='';exploreTopic='All';renderExplorer();}
 if(type==='saved')renderSaved();
 if(type==='profile')renderProfile();
 if(type==='settings')renderSettings();
 if(type==='challenge')renderChallengeStart();
 renderTopics();
}
function closeModal(){if(!currentModal)return;if(duel.interval){clearInterval(duel.interval);duel.interval=null;}currentModal='';modalLayer.hidden=true;modalContent.innerHTML='';renderTopics();}
function modalHeader(title,sub){return `<div class="modal-header"><div><h2 class="modal-title">${title}</h2><p class="modal-sub">${sub}</p></div><button class="modal-close" data-action="close-modal" aria-label="Close">×</button></div>`;}
function tile(l){return `<button class="lesson-tile" data-action="open-lesson" data-id="${l.id}" style="${catVars(l.topic)}"><span class="tile-icon">${l.symbol}</span><span class="tile-topic">${escaped(l.topic.toUpperCase())} · ${escaped(l.kind)}</span><span class="tile-title">${escaped(l.title)}</span></button>`;}
function renderExplorer(){
 modalContent.innerHTML=modalHeader('Explore the unexpected.','Find a new rabbit hole worth falling into.')+
 `<input class="modal-search" id="explore-search" placeholder="⌕  Search ideas, topics, wild facts..." autocomplete="off" value="${escaped(exploreTerm)}" aria-label="Search lessons" />
 <div class="modal-topic-chips">${['All',...TOPICS].map(t=>`<button class="modal-chip ${exploreTopic===t?'active':''}" data-action="explore-topic" data-topic="${t}">${t==='All'?'✦ All':CATEGORIES[t].emoji+' '+t}</button>`).join('')}</div>
 <div class="lesson-grid" id="explore-results"></div>`;
 updateExploreResults();
}
function updateExploreResults(){
 const q=exploreTerm.trim().toLowerCase();
 const matches=LESSONS.filter(l=>(exploreTopic==='All'||l.topic===exploreTopic)&&(!q||[l.title,l.hook,l.body,l.topic,l.kind,l.takeaway].join(' ').toLowerCase().includes(q)));
 const results=document.getElementById('explore-results');
 if(results)results.innerHTML=matches.length?matches.map(tile).join(''):`<div class="empty-state"><span class="empty-emoji">🔍</span>Nothing matched that search.<br/>Try a different word or topic.</div>`;
}
function renderSaved(){
 const items=state.saved.map(id=>LESSONS.find(l=>l.id===id)).filter(Boolean);
 modalContent.innerHTML=modalHeader('Your brain bank.','Good ideas deserve a second look.')+
 `<div class="lesson-grid">${items.length?items.map(tile).join(''):`<div class="empty-state"><span class="empty-emoji">♡</span>Nothing saved yet.<br/>Tap the save icon on any lesson to collect it here.</div>`}</div>`;
}
function renderProfile(){
 const a=answeredCount(),correct=Object.values(state.attempts).filter(x=>x.correct).length;
 const badges=[['🌱','First Spark',a>=1],['🧠','Curious Mind',a>=10],['🔥','On a Roll',daysStreak()>=3],['📚','Collector',state.saved.length>=5],['🏆','Knowledge Hunter',a>=30],['✨','Daily Hero',state.bonusDays.length>0]];
 modalContent.innerHTML=modalHeader('Your curious side.','Every correct answer is a new connection.')+
 `<div class="profile-hero"><div class="small-label">TOTAL KNOWLEDGE ENERGY</div><div class="profile-hero-number">${state.xp.toLocaleString()} XP</div><span>Level ${Math.floor(state.xp/100)+1} · You're building momentum.</span></div>
 <div class="profile-grid"><div class="profile-stat"><strong>${a}</strong><span>Quizzes tried</span></div><div class="profile-stat"><strong>${a?Math.round(correct/a*100):0}%</strong><span>Accuracy</span></div><div class="profile-stat"><strong>${daysStreak()} 🔥</strong><span>Day streak</span></div></div>
 <h3 style="font:700 16px Outfit;margin:25px 0 12px">Achievements</h3><div class="badge-row">${badges.map(([emoji,title,earned])=>`<span class="achievement" style="opacity:${earned?1:.35}">${emoji} ${title}${earned?' ✓':' · locked'}</span>`).join('')}</div>
 <p class="modal-sub" style="margin-top:20px">This browser stores your progress locally. A production version would sync progress securely across devices.</p>`;
}
function renderSettings(){
 modalContent.innerHTML=modalHeader('Your scroll, your rules.','A little intention keeps curiosity healthy.')+
 `<div class="settings-line"><div><strong>Gentle focus reminder</strong><span>A quiet nudge after your chosen session length.</span></div><select id="focus-select" aria-label="Focus reminder"><option value="5" ${state.focus===5?'selected':''}>5 min</option><option value="10" ${state.focus===10?'selected':''}>10 min</option><option value="20" ${state.focus===20?'selected':''}>20 min</option><option value="0" ${state.focus===0?'selected':''}>Off</option></select></div>
 <div class="settings-line"><div><strong>Listen instead of reading</strong><span>Tap the ♫ icon on any reel for speech narration, if supported.</span></div><span>♫</span></div>
 <div class="settings-line"><div><strong>Offline starter library</strong><span>${LESSONS.length} original lessons. New lessons require an app update.</span></div><span>✳</span></div>
 <div class="settings-line"><div><strong>Personalization</strong><span>Likes and quiz history influence topic selection. Nothing is uploaded.</span></div><span>✓</span></div>
 <button class="modal-action danger" data-action="reset-data">Reset all local progress</button>`;
}
function renderChallengeStart(){
 if(duel.interval){clearInterval(duel.interval);duel.interval=null;}
 modalContent.innerHTML=modalHeader('Brain Duel ⚡','Five questions. Sixty seconds. Zero doomscrolling.')+
 `<div class="challenge-intro"><span class="challenge-emoji">🧠⚡</span><h3>How fast can your brain go?</h3><p>5 surprise questions from totally different topics. Get all five right to earn the ultimate bragging rights. The first duel each day awards bonus XP.</p><button class="challenge-go" data-action="start-duel">Start the 60-second duel →</button></div>`;
}
function startDuel(){
 let shuffled=[...LESSONS].sort(()=>Math.random()-.5);let topics=new Set();
 duel.items=[];
 for(let l of shuffled){if(!topics.has(l.topic)){duel.items.push(l);topics.add(l.topic);}if(duel.items.length===5)break;}
 duel.index=0;duel.correct=0;duel.answered=false;duel.deadline=Date.now()+60000;
 if(duel.interval)clearInterval(duel.interval);
 duel.interval=setInterval(()=>{
  const el=document.getElementById('duel-time');const remain=Math.max(0,Math.ceil((duel.deadline-Date.now())/1000));
  if(el)el.textContent=remain+'s';
  if(remain===0)finishDuel();
 },250);
 renderDuelQuestion();
}
function renderDuelQuestion(){
 if(duel.index>=5||Date.now()>=duel.deadline){finishDuel();return;}
 duel.answered=false;
 const l=duel.items[duel.index];
 modalContent.innerHTML=modalHeader('Brain Duel ⚡','Every second is a chance to think sharper.')+
 `<div class="duel-meter"><span>QUESTION ${duel.index+1}/5</span><span id="duel-time">${Math.ceil((duel.deadline-Date.now())/1000)}s</span><span>✓ ${duel.correct} correct</span></div><div class="challenge-intro" style="text-align:left"><span class="tile-icon" style="font-size:38px">${l.symbol}</span><p style="font-size:10px;letter-spacing:1px;color:#c9fc79;font-weight:900">${l.topic.toUpperCase()}</p><h3 class="duel-question">${escaped(l.question)}</h3><div class="duel-choices">${l.choices.map((c,i)=>`<button data-action="duel-answer" data-index="${i}" class="duel-choice">${'ABCD'[i]} &nbsp; ${escaped(c)}</button>`).join('')}</div><div id="duel-explanation" class="duel-feedback" hidden></div><button id="duel-next" class="challenge-go" data-action="duel-next" hidden>${duel.index===4?'See my score →':'Next question →'}</button></div>`;
}
function duelAnswer(index){
 if(duel.answered||Date.now()>=duel.deadline)return;
 duel.answered=true;
 let l=duel.items[duel.index];if(index===l.correct)duel.correct++;
 document.querySelectorAll('.duel-choice').forEach(b=>{b.disabled=true;if(+b.dataset.index===l.correct)b.classList.add('correct');else if(+b.dataset.index===index)b.classList.add('wrong');});
 const e=document.getElementById('duel-explanation');e.hidden=false;e.textContent=(index===l.correct?'✓ Correct! ':'Not quite. ')+l.explain;
 document.getElementById('duel-next').hidden=false;
}
function finishDuel(){
 if(duel.interval){clearInterval(duel.interval);duel.interval=null;}
 if(currentModal!=='challenge')return;
 const correct=duel.correct;
 let points=0;
 state.challengeAwardDates=state.challengeAwardDates||[];
 if(!state.challengeAwardDates.includes(DAY)){
  points=correct*10+(correct===5?25:0);
  state.challengeAwardDates.push(DAY);
  state.xp+=points;
 }
 state.challengeBest=Math.max(state.challengeBest||0,correct);
 persist();refreshStats();
 modalContent.innerHTML=modalHeader('Challenge complete.','You showed up for your brain. That counts.')+
 `<div class="duel-result"><span class="challenge-emoji">${correct===5?'🏆':correct>=3?'🔥':'🌱'}</span><div class="duel-result-number">${correct}/5</div><h3 style="font:900 25px Outfit">${correct===5?'Perfect brain run!':correct>=3?'Beautifully done!':'You learned something new.'}</h3><p>${points?`+${points} XP earned from your first duel today.`:'Your daily bonus XP was already collected.'}<br/>Personal best: ${state.challengeBest}/5. Play again and try to beat it.</p><button class="challenge-go" data-action="start-duel">Challenge me again ↗</button></div>`;
}
function openLesson(id){
 const l=LESSONS.find(x=>x.id===id);if(!l)return;
 activeTopic='For You';closeModal();resetFeed(l);
 toast('✦ Here’s your chosen rabbit hole');
}
function maybeFocusReminder(){
 if(focusNudgeShown||!state.focus)return;
 if(Date.now()-sessionStart>=state.focus*60000){focusNudgeShown=true;toast('🌿 Focus check: can you recall your favorite new fact?');}
}
function handleAction(action,source){
 const card=source.closest('.reel')||getActiveCard();
 const lesson=card&&getLesson(card);
 switch(action){
  case 'home':chooseTopic('For You');break;
  case 'explore':openModal('explore');break;
  case 'saved':openModal('saved');break;
  case 'profile':openModal('profile');break;
  case 'settings':openModal('settings');break;
  case 'challenge':openModal('challenge');break;
  case 'start-duel':startDuel();break;
  case 'duel-answer':duelAnswer(+source.dataset.index);break;
  case 'duel-next':duel.index++;renderDuelQuestion();break;
  case 'close-modal':closeModal();break;
  case 'previous':scrollToIndex(activeIndex-1);break;
  case 'next':scrollToIndex(activeIndex+1);break;
  case 'reveal':if(card)reveal(card);break;
  case 'quiz':if(card)showQuiz(card);break;
  case 'answer':if(card)answer(card,+source.dataset.index);break;
  case 'like':if(card&&lesson)toggleList('likes',lesson.id,card,'.action[data-action=like]',['♡','♥']);break;
  case 'save':if(card&&lesson)toggleList('saved',lesson.id,card,'.action[data-action=save]',['▢','▣']);break;
  case 'share':if(card)shareLesson(card);break;
  case 'listen':if(card)listenTo(card);break;
  case 'explore-topic':exploreTopic=source.dataset.topic;renderExplorer();break;
  case 'open-lesson':openLesson(+source.dataset.id);break;
  case 'reset-data':if(confirm('Erase your XP, saved lessons, likes, streaks and quiz history from this browser?')){state={xp:0,likes:[],saved:[],revealed:[],attempts:{},days:{},affinity:{},focus:10,bonusDays:[],visited:[]};persist();refreshStats();resetFeed();closeModal();toast('Your progress has been reset.');}break;
 }
}
function init(){
 if(!LESSONS.length){feed.innerHTML='<p style="padding:40px">Lessons could not load. Refresh the page.</p>';return;}
 renderTopics();refreshStats();resetFeed();
 feed.addEventListener('scroll',onScroll,{passive:true});
 document.addEventListener('click',e=>{
  const topic=e.target.closest('[data-topic]');
  const action=e.target.closest('[data-action]');
  if(action){handleAction(action.dataset.action,action);return;}
  if(topic&&topic.closest('#topic-navigation, #feed-tabs'))chooseTopic(topic.dataset.topic);
 });
 document.addEventListener('input',e=>{if(e.target.id==='explore-search'){exploreTerm=e.target.value;updateExploreResults();}});
 document.addEventListener('change',e=>{if(e.target.id==='focus-select'){state.focus=+e.target.value;persist();toast('Focus reminder updated');}});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal();return;}
  if(e.target.matches('input,textarea,select'))return;
  if(e.key==='/'&&!currentModal){e.preventDefault();openModal('explore');document.getElementById('explore-search')?.focus();return;}
  if(currentModal)return;
  if(e.key==='ArrowDown'||e.key==='PageDown'){e.preventDefault();scrollToIndex(activeIndex+1);}
  if(e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();scrollToIndex(activeIndex-1);}
  if(e.key===' '){e.preventDefault();const card=getActiveCard();if(card?.classList.contains('phase-hook'))reveal(card);else if(card?.classList.contains('phase-learn'))showQuiz(card);}
 });
 setInterval(maybeFocusReminder,30000);
 if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){navigator.serviceWorker.register('./service-worker.js').catch(()=>{});}
}
init();
})();
