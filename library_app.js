import {settings} from './manimgx.js';
import {sceneCode,STEP_SECONDS} from './library_scene.js?v=78cc22a36bac';
settings.manimgx='manimgx==0.1.1';
const $=id=>document.getElementById(id);
let library,lessons=[],selected=null,current=0,part='all',player=null,focused=false,savedTime=0,transitionStop=null;
let progress={},notes={};
try{progress=JSON.parse(localStorage.getItem('cs331-reviewed')||'{}');notes=JSON.parse(localStorage.getItem('cs331-notes')||'{}');}catch{}
const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const examNames={midterm1:'Midterm 1',midterm2:'Midterm 2 core',later:'Later material',orientation:'Course orientation (not exam scope)'};
const topicFoundations={
  'Foundations':['dsa_tradeoffs'],'Python':['python_runtime_names'],'Runtime analysis':['input_size_operations'],
  'Lists':['list_adt','arrays_layout'],'Stacks and queues':['stack_lifo','queue_fifo'],
  'Recursion':['python_functions','recursion_components'],'Hash tables':['map_adt','hash_functions'],
  'Heaps and priority queues':['tree_vocabulary','heap_property'],'Binary search trees':['tree_vocabulary','bst_property'],
  'AVL trees':['bst_property','avl_balance'],'Sorting':['sorting_overview','arrays_layout'],'Graphs':['graph_vertices_edges']
};
const prerequisiteOverrides={
  arrays_layout:['list_adt'],queue_fifo:[],direct_address:['map_adt','arrays_layout'],keyspace:['map_adt','direct_address'],
  hash_functions:['map_adt','keyspace'],binary_tree_shapes:['tree_vocabulary'],heap_property:['tree_vocabulary','binary_tree_shapes'],
  bst_property:['tree_vocabulary'],avl_balance:['bst_property','tree_vocabulary'],recursion_components:['python_functions'],
  bfs:['graph_vertices_edges','queue_fifo'],dfs:['graph_vertices_edges','recursion_components'],
  merge_sort:['sorting_overview','recursion_components'],heap_sort:['sorting_overview','heap_property'],
  counting_sort:['sorting_overview','counting_prefix'],radix_sort:['counting_sort','sorting_stability']
};
function renderPrerequisites(l){
  const base=topicFoundations[l.category]||[];
  const ids=prerequisiteOverrides[l.id]||(base.includes(l.id)?[]:base);
  const links=ids.map(id=>lessons.find(x=>x.id===id)).filter(Boolean);
  $('prerequisites').replaceChildren();
  if(links.length){$('prerequisites').append(el('span','Need a refresher first? '));for(const item of links){const a=el('a',item.title);a.href='#'+item.id;$('prerequisites').append(a);}}
}
function codeTokens(text){
  const fragment=document.createDocumentFragment();
  const pattern=/(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(def|class|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|import|from|as|with|assert|raise|yield|break|continue|try|except|lambda|global|del)\b|\b(\d+(?:\.\d+)?)\b/g;
  let end=0;
  for(const match of text.matchAll(pattern)){
    fragment.append(document.createTextNode(text.slice(end,match.index)));
    fragment.append(el('span',match[0],match[1]?'py-comment':match[2]?'py-string':match[3]?'py-keyword':'py-number'));
    end=match.index+match[0].length;
  }
  fragment.append(document.createTextNode(text.slice(end)));return fragment;
}
function renderPython(){
  $('code-title').textContent=selected.code_label||'Python example';
  $('python-code').replaceChildren(...selected.python.split(/\r?\n/).map((text,i)=>{
    const line=el('code',undefined,'code-line');line.dataset.line=String(i+1);
    const number=el('span',String(i+1),'line-number');number.setAttribute('aria-hidden','true');
    const source=el('span',undefined,'line-source');source.append(codeTokens(text||' '));line.append(number,source);return line;
  }));
}
function highlightPython(step){
  const active=new Set(step.code_lines);
  document.querySelectorAll('#python-code .code-line').forEach(line=>{
    const selectedLine=active.has(Number(line.dataset.line));line.classList.toggle('executing',selectedLine);
    if(selectedLine)line.setAttribute('aria-current','step');else line.removeAttribute('aria-current');
  });
  $('code-hint').textContent=`Step ${current+1} → Python ${step.code_lines.length===1?'line':'lines'} ${step.code_lines.join(', ')}`;
  const first=$('python-code').querySelector('.executing');
  if(first){const box=$('python-code');box.scrollTop=Math.max(0,first.offsetTop-box.clientHeight/3);}
}
const visibleLessons=()=>{
  const q=$('search').value.trim().toLowerCase(),exam=$('exam-filter').value,kind=$('kind-filter').value;
  return lessons.filter(l=>(part==='all'||l.part===part)&&(exam==='all'||l.exam===exam)&&(kind==='all'||l.kind===kind)&&(!q||[l.title,l.category,l.takeaway,l.id].join(' ').toLowerCase().includes(q)));
};
function renderNavigation(){
  const visible=visibleLessons();
  $('nav-count').textContent=`${visible.length} lessons · ${lessons.filter(l=>progress[l.id]).length} reviewed`;
  $('lesson-nav').replaceChildren();$('topic-grid').replaceChildren();
  const categories=[...new Set(visible.map(l=>l.category))];
  for(const category of categories){
    const members=visible.filter(l=>l.category===category);
    const group=el('details',undefined,'nav-category');group.open=true;
    group.append(el('summary',`${category} (${members.length})`));
    const card=el('section',undefined,'topic-card');card.append(el('h2',category));
    const list=el('ul');
    for(const l of members){
      const a=el('a',`${progress[l.id]?'✓ ':''}${l.title}`,'lesson-link'+(selected?.id===l.id?' active':''));a.href='#'+l.id;
      if(selected?.id===l.id)a.setAttribute('aria-current','page');group.append(a);
      const li=el('li'),link=el('a',l.title);link.href='#'+l.id;li.append(link);list.append(li);
    }
    card.append(list);$('topic-grid').append(card);$('lesson-nav').append(group);
  }
  if(!visible.length){$('topic-grid').append(el('p','No lessons match these filters. Try another search or choose All.'));}
  $('library-summary').textContent=`${visible.length} matching lessons. Choose a title below, or use the topic navigation.`;
}
function loadScene(lesson,at=1.25,onlyStep=null,playing=false){
  transitionStop=null;
  player?.pause();
  const next=document.createElement('manimgx-player');
  next.setAttribute('aria-label',lesson.title+' animation');
  next.source=sceneCode(lesson,onlyStep);next.currentTime=at;
  playing?next.play():next.pause();
  player=next;$('player-mount').replaceChildren(next);
  $('runtime-status').textContent='Loading the shared ManimGX runtime / preparing scene…';
}
function updateStep(){
  if(!selected)return;
  const s=selected.steps[current];
  $('step-label').textContent=`${focused?'FOCUSED DIAGRAM · ':''}STEP ${current+1} OF ${selected.steps.length}`;
  $('caption').textContent=s.caption;$('why-text').textContent=s.why;
  $('step-bridge').textContent=selected.teaching.bridges[current];
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelector('.step-story').animate([{opacity:.45},{opacity:1}],{duration:260,easing:'ease-out'});
  $('next-bridge').textContent=current<selected.steps.length-1?`Coming next: ${selected.steps[current+1].caption}`:'You have reached the end of the example. Connect it to the applications and recap below, then try the question.';
  $('back').disabled=focused||current===0;$('next').disabled=focused||current===selected.steps.length-1;
  $('focus-step').hidden=focused;$('return').hidden=!focused;
  document.querySelectorAll('#steps button').forEach((b,i)=>b.setAttribute('aria-current',String(i===current)));
  $('variables').replaceChildren(...Object.entries(s.variables||{}).map(([k,v])=>el('span',`${k} = ${typeof v==='object'?JSON.stringify(v):v}`,'variable')));
  highlightPython(s);
  $('question').value=notes[selected.id+':'+current]||'';
  $('context').hidden=true;$('copy-status').textContent='';
}
function go(i,animate=true){
  if(!selected||focused)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)animate=false;
  current=Math.max(0,Math.min(selected.steps.length-1,i));
  player.pause();player.currentTime=current*STEP_SECONDS+(animate?0:1.25);updateStep();
  transitionStop=animate?current*STEP_SECONDS+1.25:null;
  if(animate)player.play();
}
function showLesson(l){
  selected=l;current=0;focused=false;
  $('reader').hidden=false;$('catalog').hidden=true;
  $('lesson-title').textContent=l.title;document.title=l.title+' · CS331';
  $('lesson-meta').textContent=`${l.part==='first'?'First half':'Second half'} / ${examNames[l.exam]} / ${l.kind}`;
  $('takeaway').textContent=l.takeaway;$('invariant').textContent=l.invariant;$('complexity').textContent=l.complexity;
  const teaching=l.teaching;
  $('motivation').textContent=teaching.motivation;$('background').textContent=teaching.background;
  $('objective').textContent=teaching.objective;
  $('applications').replaceChildren(...teaching.applications.map(text=>el('li',text)));
  $('lesson-summary').textContent=teaching.summary;$('builds-toward').textContent=teaching.next;
  renderPrerequisites(l);
  renderPython();
  $('completed').checked=!!progress[l.id];
  $('source').textContent='Course source: '+l.source+(l.kind==='exercise'?' · Worked teaching example; solution derived for this lesson.':'');
  $('steps').replaceChildren(...l.steps.map((s,i)=>{const b=el('button',String(i+1));b.setAttribute('aria-label',`Step ${i+1}: ${s.caption}`);b.onclick=()=>go(i);return b;}));
  $('check-question').textContent=l.check.question;$('check-feedback').textContent='';
  $('check-options').replaceChildren(...l.check.options.map((option,i)=>{
    const b=el('button',option);b.setAttribute('aria-pressed','false');b.onclick=()=>{
      document.querySelectorAll('#check-options button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
      const correct=i===l.check.answer;
      $('check-feedback').textContent=(correct?'Correct. ':'Try again. ')+l.check.explanation;
      $('check-feedback').className=correct?'feedback-correct':'feedback-incorrect';
    };return b;
  }));
  const siblings=lessons.filter(x=>x.category===l.category),index=siblings.indexOf(l);
  $('related').replaceChildren();
  for(const [label,item] of [['Previous topic',siblings[index-1]],['Next topic',siblings[index+1]]]){
    if(item){const link=el('a',`${label}: ${item.title}`);link.href='#'+item.id;$('related').append(link);}
  }
  loadScene(l);updateStep();renderNavigation();
}
function route(){
  const id=decodeURIComponent(location.hash.slice(1).split('/')[0]);
  const l=lessons.find(x=>x.id===id);
  if(l)showLesson(l);
  else{
    player?.pause();$('player-mount').replaceChildren();player=null;selected=null;
    $('reader').hidden=true;$('catalog').hidden=false;document.title='CS331 · Visual study library';renderNavigation();
  }
  $('main').scrollIntoView({behavior:'instant',block:'start'});
}
function renderCoverage(){
  const pages=[...library.coverage,...library.orientation_coverage];
  $('coverage-label').textContent=`Slide coverage: ${library.coverage.length} technical pages + ${library.orientation_coverage.length} introduction pages mapped`;
  const table=el('table'),thead=el('thead'),tr=el('tr');
  for(const title of ['Deck','Page','Lessons'])tr.append(el('th',title));thead.append(tr);table.append(thead);
  const body=el('tbody');
  for(const p of pages){
    const row=el('tr');row.append(el('td',p.deck===0?'Intro':String(p.deck)),el('td',String(p.page)));
    const links=el('td',undefined,'coverage-pages');
    for(const id of p.lesson_ids){const l=lessons.find(x=>x.id===id);if(l){const a=el('a',l.title);a.href='#'+id;links.append(a);}}
    row.append(links);body.append(row);
  }
  table.append(body);$('coverage-detail').append(table);
}
$('search').oninput=renderNavigation;$('exam-filter').onchange=renderNavigation;$('kind-filter').onchange=renderNavigation;
document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{part=b.dataset.part;document.querySelectorAll('[data-part]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderNavigation();});
$('back').onclick=()=>go(current-1);$('next').onclick=()=>go(current+1);
$('play').onclick=()=>{if(player){transitionStop=null;if(player.paused){if(!focused&&player.currentTime>=(current+1)*STEP_SECONDS-.3&&current<selected.steps.length-1)go(current+1,false);player.play();}else player.pause();}};
$('start-walkthrough').onclick=()=>$('walkthrough').scrollIntoView({behavior:'smooth',block:'start'});
document.querySelectorAll('[data-section]').forEach(link=>link.onclick=event=>{event.preventDefault();$(link.dataset.section).scrollIntoView({behavior:'smooth',block:'start'});});
$('replay').onclick=()=>{focused=false;current=0;loadScene(selected,0,null,true);updateStep();};
$('focus-step').onclick=()=>{player.pause();savedTime=player.currentTime;focused=true;loadScene(selected,1.25,current,false);updateStep();};
$('return').onclick=()=>{focused=false;loadScene(selected,savedTime);updateStep();};
$('completed').onchange=()=>{progress[selected.id]=$('completed').checked;store('cs331-reviewed',progress);renderNavigation();};
$('question').oninput=()=>{notes[selected.id+':'+current]=$('question').value;store('cs331-notes',notes);};
$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(selected.python);$('code-hint').textContent='Python code copied.';}catch{$('code-hint').textContent='Clipboard unavailable. Select the Python code to copy it.';}};
$('ask').onclick=async()=>{
  player.pause();const s=selected.steps[current];
  const snippet=s.code_lines.map(i=>`${i}: ${selected.python.split(/\r?\n/)[i-1]}`).join('\n');
  const text=`CS331 lesson: ${selected.title} (${selected.id}), step ${current+1}/${selected.steps.length}${focused?' [focused diagram]':''}.\nCourse group: ${examNames[selected.exam]}.\nLesson goal: ${selected.teaching.objective}\nStep: ${s.caption}\nWalkthrough explanation: ${selected.teaching.bridges[current]}\nReason: ${s.why}\nCorresponding Python:\n${snippet}\nDiagram state: ${JSON.stringify({rows:s.rows,nodes:s.nodes,edges:s.edges,variables:s.variables})}\nSource: ${selected.source}\nMy question: ${$('question').value.trim()||'Please explain this concept with another visual example.'}\nPlease explain here and, if useful, extend this lesson in CS_331/Algorithm_Videos and update the learning-org site.`;
  $('context').value=text;$('context').hidden=false;
  try{await navigator.clipboard.writeText(text);$('copy-status').textContent='Copied. Paste into our Codex chat.';}catch{$('context').select();$('copy-status').textContent='Copy the question below.';}
};
window.addEventListener('hashchange',route);
setInterval(()=>{
  if(!player||!selected)return;
  const failure=player.shadowRoot?.querySelector('p')?.textContent;
  if(failure){$('runtime-status').textContent=failure;return;}
  if(Number.isFinite(player.duration)){
    $('runtime-status').textContent=focused?'Focused diagram. Return to continue the lesson.':'Ready · Space pauses; native timeline lets you seek.';
    if(!focused){
      if(transitionStop!==null&&player.currentTime>=transitionStop){player.pause();transitionStop=null;}
      if($('guided').checked&&!player.paused&&player.currentTime>=(current+1)*STEP_SECONDS-.25&&player.currentTime<(current+1)*STEP_SECONDS+.5){player.pause();player.currentTime=(current+1)*STEP_SECONDS-.3;}
      const i=Math.max(0,Math.min(selected.steps.length-1,Math.floor(player.currentTime/STEP_SECONDS)));if(i!==current){current=i;updateStep();}
    }
  }
},200);
try{
  const response=await fetch('./library.json?v=78cc22a36bac',{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Lesson library could not load. Refresh or try again shortly.');
  library=await response.json();lessons=library.lessons;
  $('loading').hidden=true;renderCoverage();route();
}catch(error){$('loading').textContent=error.message;}
window.lessonQA={get lessons(){return lessons;},get selected(){return selected;},get player(){return player;},get current(){return current;},get library(){return library;}};
