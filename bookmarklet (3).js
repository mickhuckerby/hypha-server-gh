// HYPHÆLIUM Bookmarklet v2.0
// Loaded dynamically to avoid Chrome length limits
(function(){
'use strict';
if(window._hyphaRunning)return;
window._hyphaRunning=true;
setTimeout(()=>{window._hyphaRunning=false;},5000);

const STORAGE_URL='hypha-url';
const STORAGE_KEY='hypha-key';
const PLATFORMS={'claude.ai':'Claude','chat.openai.com':'ChatGPT','chatgpt.com':'ChatGPT','gemini.google.com':'Gemini','copilot.microsoft.com':'Copilot','perplexity.ai':'Perplexity'};
const hostname=location.hostname;
const matchKey=Object.keys(PLATFORMS).find(k=>hostname.includes(k));
let PLATFORM=matchKey?PLATFORMS[matchKey]:null;

if(!PLATFORM){
  const tl=document.title.toLowerCase();
  if(tl.includes('chat')||tl.includes('ai')){
    PLATFORM=hostname.replace('www.','').split('.')[0];
    PLATFORM=PLATFORM.charAt(0).toUpperCase()+PLATFORM.slice(1);
  }
}

if(!PLATFORM){showToast('\u26a0 Not an AI platform','warn');return;}

const token=localStorage.getItem('hypha-token');
if(!token){showSetup();return;}

const title=document.title.replace(/\s*[-|]\s*(Claude|ChatGPT|Gemini|Copilot|Perplexity).*/i,'').trim()||'conversation';
const topic=classifyTopic(title);
const depth=snapshotDepth();
const boundary=snapshotBoundary();

showToast('\ud83c\udf3f Saving...','saving');
save({captured_at:new Date().toISOString(),platform:PLATFORM,route_path:location.href,identity_tag:title.toLowerCase().replace(/[^\w\s'-]/g,'').trim().slice(0,60)||'untitled',topic,depth,boundary_count:boundary?1:0,boundary_flag:boundary});

function classifyTopic(t){
  t=t.toLowerCase();
  if(['javascript','python','code','sql','api'].some(k=>t.includes(k)))return'code';
  if(['write','draft','essay','email','report'].some(k=>t.includes(k)))return'writing';
  if(['legal','policy','regulation','law'].some(k=>t.includes(k)))return'legal';
  if(['plan','strategy','project','roadmap'].some(k=>t.includes(k)))return'planning';
  if(['budget','cost','revenue','financial'].some(k=>t.includes(k)))return'finance';
  return'general';
}

function snapshotDepth(){
  const sels=['[data-testid="user-message"]','[data-message-author-role="user"]','.user-query-text'];
  for(const s of sels){try{const e=document.querySelectorAll(s);if(e.length)return e.length;}catch(e){}}
  return 0;
}

function snapshotBoundary(){
  const phrases=['my knowledge cutoff','as of my last update','you may want to verify','cannot access real-time'];
  const sels=['[data-testid="assistant-message"]','[data-message-author-role="assistant"]','.prose'];
  for(const s of sels){try{const e=document.querySelectorAll(s);if(!e.length)continue;const t=(e[e.length-1].innerText||'').toLowerCase();if(phrases.some(p=>t.includes(p)))return true;break;}catch(e){}}
  return false;
}

async function save(record){
  try{
    const r=await fetch(supaUrl.replace(/\/+$/,'')+'/rest/v1/hyphaelium_captures',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':supaKey,'Authorization':'Bearer '+supaKey,'Prefer':'return=minimal'},
      body:JSON.stringify(record)
    });
    if(r.ok||r.status===201){
      showToast('\ud83c\udf3f Saved \u00b7 '+PLATFORM+(record.depth>1?' \u00b7 depth '+record.depth:'')+(record.boundary_flag?' \u00b7 boundary':''),'ok');
    } else if(r.status===401){
      queue(record);showToast('\ud83c\udf3f Saved locally','queued');
    } else {
      queue(record);showToast('\ud83c\udf3f Saved locally','queued');
    }
  }catch(e){queue(record);showToast('\ud83c\udf3f Saved locally \u00b7 offline','queued');}
}

function queue(r){try{const q=JSON.parse(localStorage.getItem('hypha-queue')||'[]');q.push(r);localStorage.setItem('hypha-queue',JSON.stringify(q));}catch(e){}}

function showSetup(){
  const o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:rgba(14,11,6,0.88);z-index:2147483647;display:flex;align-items:center;justify-content:center;';
  o.innerHTML='<div style="background:#1a1208;border:1px solid #2e7d52;border-radius:10px;padding:32px;max-width:380px;width:90%;color:#f4efe2;font-family:sans-serif;"><div style="font-size:1.1rem;margin-bottom:8px;font-style:italic;">Welcome to Hyphælium</div><div style="font-size:0.82rem;color:#9a8e7a;margin-bottom:20px;">Sign in with your Hyphælium account.</div><div style="margin-bottom:10px;"><div style="font-size:0.65rem;text-transform:uppercase;color:#5a7a5a;margin-bottom:4px;">Email address</div><input id="hypha-email-in" type="email" placeholder="you@example.com" style="width:100%;background:#0e0b06;border:1px solid #2e7d52;border-radius:4px;padding:8px;color:#f4efe2;font-size:0.82rem;box-sizing:border-box;outline:none;"></div><div style="margin-bottom:18px;"><div style="font-size:0.65rem;text-transform:uppercase;color:#5a7a5a;margin-bottom:4px;">Password</div><input id="hypha-pass-in" type="password" placeholder="Your Hyphælium password" style="width:100%;background:#0e0b06;border:1px solid #2e7d52;border-radius:4px;padding:8px;color:#f4efe2;font-size:0.82rem;box-sizing:border-box;outline:none;"></div><div id="hypha-setup-msg" style="font-size:0.75rem;color:#c8892a;margin-bottom:10px;display:none;"></div><div style="display:flex;gap:8px;"><button id="hypha-save-btn" style="flex:1;background:#2e7d52;color:#fff;border:none;border-radius:4px;padding:10px;cursor:pointer;">Sign in →</button><button id="hypha-cancel-btn" style="background:transparent;border:1px solid #2e7d52;color:#4caf80;border-radius:4px;padding:10px 14px;cursor:pointer;">Cancel</button></div></div>';
  document.body.appendChild(o);
  document.getElementById('hypha-email-in').focus();
  document.getElementById('hypha-save-btn').onclick=async()=>{
    const email=document.getElementById('hypha-email-in').value.trim().toLowerCase();
    const pass=document.getElementById('hypha-pass-in').value;
    const msg=document.getElementById('hypha-setup-msg');
    if(!email||!pass){msg.textContent='Please fill in both fields.';msg.style.display='block';return;}
    document.getElementById('hypha-save-btn').textContent='Signing in…';
    try{
      const r=await fetch('https://hypha-server.onrender.com/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password:pass})
      });
      const data=await r.json();
      if(!r.ok){msg.textContent=data.error||'Sign in failed.';msg.style.display='block';document.getElementById('hypha-save-btn').textContent='Sign in →';return;}
      localStorage.setItem('hypha-token',data.token);
      localStorage.setItem('hypha-email',email);
      o.remove();
      showToast('✓ Connected — click bookmark again','ok');
    }catch(e){msg.textContent='Cannot reach server. Try again.';msg.style.display='block';document.getElementById('hypha-save-btn').textContent='Sign in →';}
  };
  document.getElementById('hypha-cancel-btn').onclick=()=>o.remove();
}

function showToast(msg,type){
  const ex=document.getElementById('hypha-bm-toast');if(ex)ex.remove();
  const c={ok:'#1a2e1a|#2e7d52|#c8e6c9',warn:'#1a1200|#c8892a|#e8c878',queued:'#1a1a10|#c8892a|#c8e690',saving:'#1a2e1a|#2e7d52|#6a8e6a'}[type]||'#1a2e1a|#2e7d52|#c8e6c9';
  const[bg,border,color]=c.split('|');
  const t=document.createElement('div');
  t.id='hypha-bm-toast';
  t.textContent=msg;
  t.style.cssText=`position:fixed;bottom:28px;right:28px;z-index:2147483647;background:${bg};border:1px solid ${border};color:${color};padding:10px 18px;border-radius:8px;font-family:monospace;font-size:12px;box-shadow:0 4px 20px rgba(0,0,0,0.4);opacity:0;transform:translateY(8px);transition:opacity 0.2s,transform 0.2s;pointer-events:none;white-space:nowrap;max-width:320px;`;
  document.body.appendChild(t);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{t.style.opacity='1';t.style.transform='translateY(0)';}));
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(8px)';setTimeout(()=>t.remove(),250);},type==='saving'?30000:3500);
}
})();
