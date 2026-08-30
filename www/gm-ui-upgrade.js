(function(){
'use strict';

const API='https://gmessanger-mn0b.onrender.com';
const SKEY='gm_gmessenger_feature_state_v1';
let state={statuses:[],communities:[],calls:[],favorites:[]};
try{state=Object.assign(state,JSON.parse(localStorage.getItem(SKEY)||'{}'));}catch(e){}
function save(){localStorage.setItem(SKEY,JSON.stringify(state))}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function initials(n){return String(n||'G').trim().charAt(0).toUpperCase()||'G'}
function time(v){if(!v)return '';try{return new Date(v).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
function loggedIn(){return !!localStorage.getItem('gmessengerToken') && localStorage.getItem('gmessengerSetup')==='complete'}

async function gmFetch(path,opts={}){
  const headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});
  const t=localStorage.getItem('gmessengerToken')||'';
  if(t)headers.Authorization='Bearer '+t;
  const r=await fetch(API+path,Object.assign({},opts,{headers}));
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||('Request failed ('+r.status+')'));
  return d;
}

function root(){
  let r=document.getElementById('gmUpgradeRoot');
  if(r)return r;
  r=document.createElement('div');
  r.id='gmUpgradeRoot';
  r.innerHTML=`
    <header class="gm-top">
      <div class="gm-brand">G Messenger</div>
      <div class="gm-top-actions">
        <button class="gm-icon" data-act="camera" aria-label="Camera">⌾</button>
        <button class="gm-icon" data-act="search" aria-label="Search">⌕</button>
        <button class="gm-icon" data-act="menu" aria-label="Menu">⋮</button>
      </div>
    </header>
    <div class="gm-content">
      <section class="gm-page gm-active" data-page="chats"></section>
      <section class="gm-page" data-page="updates"></section>
      <section class="gm-page" data-page="communities"></section>
      <section class="gm-page" data-page="calls"></section>
    </div>
    <nav class="gm-bottom">
      <button class="gm-nav active" data-nav="chats"><span class="ico">▤</span>Chats</button>
      <button class="gm-nav" data-nav="updates"><span class="ico">◉</span>Updates</button>
      <button class="gm-nav" data-nav="communities"><span class="ico">♧</span>Communities</button>
      <button class="gm-nav" data-nav="calls"><span class="ico">⌕</span>Calls</button>
    </nav>
    <button class="gm-fab" data-act="new" aria-label="New">＋</button>
    <div class="gm-menu" id="gmMenu">
      <button data-act="profile">Profile</button>
      <button data-act="settings">Settings</button>
      <button data-act="gemma">Gemma</button>
      <button data-act="logout">Log out</button>
    </div>
    <div class="gm-modal" id="gmModal"><div class="gm-sheet" id="gmSheet"></div></div>
    <div class="gm-chat-page" id="gmChatPage">
      <header class="gm-chat-head">
        <button class="gm-icon" data-chat="back">‹</button>
        <div class="gm-avatar" id="gmChatAvatar">G</div>
        <div class="gm-chat-person"><div class="gm-chat-name" id="gmChatName">Chat</div><div class="gm-chat-status" id="gmChatStatus">online</div></div>
        <button class="gm-icon" data-chat="video">▣</button>
        <button class="gm-icon" data-chat="voice">☎</button>
        <button class="gm-icon" data-chat="menu">⋮</button>
      </header>
      <main class="gm-chat-body" id="gmChatBody"></main>
      <div class="gm-composer-wrap">
        <div class="gm-attach-menu" id="gmAttachMenu">
          <button class="gm-attach-item" data-compose="photo">Photo</button>
          <button class="gm-attach-item" data-compose="camera">Camera</button>
          <button class="gm-attach-item" data-compose="document">Document</button>
          <button class="gm-attach-item" data-compose="contact">Contact</button>
          <button class="gm-attach-item" data-compose="location">Location</button>
          <button class="gm-attach-item" data-compose="poll">Poll</button>
        </div>
        <button class="gm-icon" id="gmEmoji">☺</button>
        <textarea class="gm-composer" id="gmComposer" rows="1" placeholder="Message"></textarea>
        <button class="gm-icon" id="gmAttach">＋</button>
        <button class="gm-send" id="gmSend">➤</button>
      </div>
    </div>`;
  document.body.appendChild(r);
  bind(r);
  return r;
}

function page(name){return root().querySelector('[data-page="'+name+'"]')}
function setPage(name){
  if(!loggedIn())return;
  const r=root();
  r.querySelectorAll('.gm-page').forEach(x=>x.classList.toggle('gm-active',x.dataset.page===name));
  r.querySelectorAll('.gm-nav').forEach(x=>x.classList.toggle('active',x.dataset.nav===name));
  render(name);
}
function openRoot(name='chats'){
  if(!loggedIn())return;
  root().classList.add('gm-open');
  setPage(name);
}
function closeRoot(){const r=document.getElementById('gmUpgradeRoot');if(r)r.classList.remove('gm-open')}

async function renderChats(){
  const p=page('chats');
  p.innerHTML=`
    <div class="gm-search-wrap"><span class="gm-search-icon">⌕</span><input class="gm-search" id="gmChatSearch" placeholder="Search G Messenger"></div>
    <div class="gm-chips">
      <button class="gm-chip active" data-filter="all">All</button>
      <button class="gm-chip" data-filter="unread">Unread</button>
      <button class="gm-chip" data-filter="favorites">Favorites</button>
      <button class="gm-chip" data-filter="groups">Groups</button>
      <button class="gm-chip" data-filter="plus">＋</button>
    </div>
    <div class="gm-list" id="gmChatRows"></div>`;
  p.querySelector('#gmChatSearch').oninput=e=>filterRows(e.target.value);
  await loadChatRows();
}
async function loadChatRows(){
  const box=document.getElementById('gmChatRows'); if(!box)return;
  try{
    const d=await gmFetch('/api/conversations');
    const rows=(d.conversations||[]).filter(c=>c.user);
    if(!rows.length){box.innerHTML='<div class="gm-empty"><strong>No chats yet</strong>Start a new chat from your contacts.</div>';return}
    box.innerHTML=rows.map(c=>{
      const n=c.user.name||c.user.username||c.user.phone||'G Messenger User';
      const preview=c.lastMessage?.text||'No messages yet';
      return `<div class="gm-row gm-real-chat" data-name="${esc(n).toLowerCase()}" data-cid="${c.id}">
        <div class="gm-avatar">${esc(initials(n))}</div>
        <div class="gm-row-main"><div class="gm-row-title">${esc(n)}</div><div class="gm-row-preview">${esc(preview)}</div></div>
        <div class="gm-row-meta">${esc(time(c.lastMessage?.created_at))}</div>
      </div>`;
    }).join('');
    box.querySelectorAll('.gm-real-chat').forEach(row=>{
      row.onclick=async()=>{const c=rows.find(x=>String(x.id)===String(row.dataset.cid));if(c)openChat(c)}
    });
  }catch(e){box.innerHTML='<div class="gm-empty"><strong>Could not load chats</strong>'+esc(e.message)+'</div>'}
}
function filterRows(q){q=String(q||'').toLowerCase().trim();document.querySelectorAll('.gm-real-chat').forEach(r=>r.style.display=!q||r.dataset.name.includes(q)?'flex':'none')}

function renderUpdates(){
  const p=page('updates');
  p.innerHTML=`
    <h2 class="gm-section-title">Updates</h2>
    <div class="gm-section-sub">Share status updates and follow channels.</div>
    <div class="gm-status-strip" id="gmStatusStrip">
      <button class="gm-status-card gm-add-status" data-act="status"><span class="plus">＋</span><span>Add status</span></button>
      ${(state.statuses||[]).map(s=>`<button class="gm-status-card"><span class="gm-status-bg"></span><span class="gm-status-label">${esc(s.text)}</span></button>`).join('')}
    </div>
    <div class="gm-card-title">Channels</div>
    <div class="gm-card"><div class="gm-card-head">Explore channels <span style="margin-left:auto">›</span></div></div>
    <div id="gmChannelList"></div>`;
  p.querySelector('[data-act="status"]').onclick=()=>openStatusModal();
  const list=p.querySelector('#gmChannelList');
  list.innerHTML=(state.channels||[]).map(c=>`<div class="gm-channel-preview"><div class="gm-avatar">${esc(initials(c.name))}</div><div class="gm-row-main"><div class="gm-row-title">${esc(c.name)}</div><div class="gm-row-preview">${esc(c.text||'')}</div></div></div>`).join('')||'<div class="gm-empty">No channels yet.</div>';
}

function renderCommunities(){
  const p=page('communities');
  p.innerHTML=`
    <h2 class="gm-section-title">Communities</h2>
    <div class="gm-card"><div class="gm-card-head" data-act="community">＋ New community</div></div>
    <div id="gmCommunityList"></div>`;
  p.querySelector('[data-act="community"]').onclick=openCommunityModal;
  const list=p.querySelector('#gmCommunityList');
  list.innerHTML=(state.communities||[]).map(c=>`<div class="gm-card"><div class="gm-community-head"><div class="gm-community-title">${esc(c.name)}</div><div class="gm-row-preview">${esc(c.description||'')}</div></div><div class="gm-channel-preview">Announcements <span style="margin-left:auto">›</span></div></div>`).join('')||'<div class="gm-empty">No communities yet.<br>Create one to organize groups and announcements.</div>';
}

function renderCalls(){
  const p=page('calls');
  p.innerHTML=`
    <h2 class="gm-section-title">Calls</h2>
    <div class="gm-action-row">
      <button class="gm-action" data-call="voice"><span class="ico">☎</span>Call</button>
      <button class="gm-action" data-call="schedule"><span class="ico">▣</span>Schedule</button>
      <button class="gm-action" data-call="keypad"><span class="ico">⌗</span>Keypad</button>
      <button class="gm-action" data-call="favorites"><span class="ico">♡</span>Favorites</button>
    </div>
    <div class="gm-card-title">Recent</div>
    <div class="gm-list" id="gmCallList"></div>`;
  p.querySelectorAll('[data-call]').forEach(b=>b.onclick=()=>callAction(b.dataset.call));
  const list=p.querySelector('#gmCallList');
  list.innerHTML=(state.calls||[]).map(c=>`<div class="gm-row"><div class="gm-avatar">${esc(initials(c.name))}</div><div class="gm-row-main"><div class="gm-row-title">${esc(c.name)}</div><div class="gm-row-preview gm-call-meta">${esc(c.direction||'Call')} · ${esc(c.time||'')}</div></div><div class="gm-call-icon">☎</div></div>`).join('')||'<div class="gm-empty">No recent calls.</div>';
}

function render(name){if(name==='chats')renderChats();else if(name==='updates')renderUpdates();else if(name==='communities')renderCommunities();else renderCalls()}

function modal(html){const m=root().querySelector('#gmModal');root().querySelector('#gmSheet').innerHTML=html;m.classList.add('gm-show')}
function closeModal(){root().querySelector('#gmModal').classList.remove('gm-show')}

function openStatusModal(){
  modal(`<h3>New status</h3><textarea id="gmStatusText" rows="4" placeholder="Write a status update"></textarea><button class="gm-primary-btn" id="gmStatusSave">Share status</button><button class="gm-secondary-btn" id="gmStatusCancel">Cancel</button>`);
  document.getElementById('gmStatusSave').onclick=()=>{const t=document.getElementById('gmStatusText').value.trim();if(!t)return;state.statuses.unshift({text:t,createdAt:Date.now()});save();closeModal();renderUpdates()};
  document.getElementById('gmStatusCancel').onclick=closeModal;
}
function openCommunityModal(){
  modal(`<h3>Create community</h3><input id="gmCommunityName" placeholder="Community name"><textarea id="gmCommunityDesc" rows="3" placeholder="Description"></textarea><button class="gm-primary-btn" id="gmCommunitySave">Create</button><button class="gm-secondary-btn" id="gmCommunityCancel">Cancel</button>`);
  document.getElementById('gmCommunitySave').onclick=()=>{const n=document.getElementById('gmCommunityName').value.trim();if(!n)return;state.communities.unshift({name:n,description:document.getElementById('gmCommunityDesc').value.trim(),createdAt:Date.now()});save();closeModal();renderCommunities()};
  document.getElementById('gmCommunityCancel').onclick=closeModal;
}
function openNewChat(){if(typeof window.openContacts==='function'){closeRoot();window.openContacts()}else{alert('Contacts are not available yet.')}}

async function openChat(c){
  const r=root();const cp=r.querySelector('#gmChatPage');cp.classList.add('gm-active');
  const n=c.user?.name||c.user?.username||c.user?.phone||'G Messenger User';
  r.querySelector('#gmChatName').textContent=n;
  r.querySelector('#gmChatAvatar').textContent=initials(n);
  const box=r.querySelector('#gmChatBody');box.innerHTML='<div class="gm-empty">Loading messages…</div>';
  try{
    const d=await gmFetch('/api/conversations/'+c.id+'/messages?limit=100');
    box.innerHTML=(d.messages||[]).map(m=>messageHtml(m)).join('')||'<div class="gm-empty">No messages yet.</div>';
    box.scrollTop=box.scrollHeight;
    r.querySelector('#gmSend').onclick=()=>sendChat(c);
    r.querySelector('#gmComposer').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat(c)}};
    r.querySelector('#gmChatStatus').textContent='online';
  }catch(e){box.innerHTML='<div class="gm-empty">'+esc(e.message)+'</div>'}
}
function messageHtml(m){
  const mine=String(m.sender_id)===String(window.currentUser?.id||'');
  return `<div class="gm-msg ${mine?'mine':'theirs'}">${m.deleted?'Message deleted':esc(m.text)} <span class="gm-msg-time">${esc(time(m.created_at))}${mine?'<span class="gm-msg-status">'+(m.status==='read'||m.status==='delivered'?'✓✓':'✓')+'</span>':''}</span></div>`;
}
async function sendChat(c){
  const r=root(),inp=r.querySelector('#gmComposer'),text=inp.value.trim();if(!text)return;
  inp.value='';
  try{
    await gmFetch('/api/conversations/'+c.id+'/messages',{method:'POST',body:JSON.stringify({text})});
    await openChat(c);
  }catch(e){alert(e.message)}
}

function callAction(type){
  if(type==='keypad'){modal('<h3>Keypad</h3><input id="gmDial" inputmode="tel" placeholder="Phone number"><button class="gm-primary-btn" id="gmDialBtn">Call</button>');document.getElementById('gmDialBtn').onclick=()=>{const n=document.getElementById('gmDial').value.trim();if(n)location.href='tel:'+encodeURIComponent(n)};return}
  if(type==='schedule'){modal('<h3>Schedule call</h3><input id="gmCallWhen" type="datetime-local"><button class="gm-primary-btn" id="gmCallSave">Save</button>');document.getElementById('gmCallSave').onclick=()=>{state.calls.unshift({name:'Scheduled call',direction:'Scheduled',time:document.getElementById('gmCallWhen').value});save();closeModal();renderCalls()};return}
  if(type==='favorites'){modal('<h3>Favorites</h3><div class="gm-empty">Your favorite contacts will appear here.</div>');return}
  modal('<h3>Start a call</h3><div class="gm-empty">Choose a contact from New chat to start a voice or video call.</div>');
}

function bind(r){
  r.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>setPage(b.dataset.nav));
  r.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    if(a==='new')openNewChat();
    else if(a==='menu')r.querySelector('#gmMenu').classList.toggle('gm-show');
    else if(a==='logout'){closeRoot();if(typeof window.logout==='function')window.logout()}
    else if(a==='profile')modal('<h3>Your profile</h3><div class="gm-empty">Profile controls stay connected to your existing G Messenger account.</div>');
    else if(a==='settings')modal('<h3>Settings</h3><div class="gm-row"><div class="gm-row-main"><div class="gm-row-title">Privacy</div><div class="gm-row-preview">Control who can contact you and see your updates.</div></div></div><div class="gm-row"><div class="gm-row-main"><div class="gm-row-title">Notifications</div><div class="gm-row-preview">Message and call notification controls.</div></div></div>');
    else if(a==='gemma'){closeRoot();if(typeof window.openGemma==='function')window.openGemma()}
    else if(a==='status')openStatusModal();
  });
  r.querySelector('#gmModal').onclick=e=>{if(e.target.id==='gmModal')closeModal()};
  r.querySelector('#gmChatPage [data-chat="back"]').onclick=()=>r.querySelector('#gmChatPage').classList.remove('gm-active');
  r.querySelector('#gmAttach').onclick=()=>r.querySelector('#gmAttachMenu').classList.toggle('gm-show');
  r.querySelector('#gmEmoji').onclick=()=>{const i=r.querySelector('#gmComposer');i.value+='🙂';i.focus()};
  r.querySelectorAll('[data-compose]').forEach(b=>b.onclick=()=>alert(b.textContent+' is ready in the G Messenger UI. Media upload endpoints can be connected without changing the chat layout.'));
}

function install(){
  root();
  const observer=new MutationObserver(()=>{
    const app=document.getElementById('appScreen');
    if(app?.classList.contains('active') && loggedIn())openRoot('chats');
    const loggedOut=!loggedIn();
    if(loggedOut)closeRoot();
  });
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  setInterval(()=>{if(loggedIn()&&document.getElementById('gmUpgradeRoot')?.classList.contains('gm-open')){const active=document.querySelector('.gm-page.gm-active')?.dataset.page;if(active==='chats')loadChatRows()}},12000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
