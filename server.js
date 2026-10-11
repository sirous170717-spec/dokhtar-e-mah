const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
  console.error('Set ADMIN_PASSWORD and SESSION_SECRET in the hosting environment.');
  process.exit(1);
}
app.use(express.json({limit:'20kb'}));
app.use(session({secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:1000*60*60*8}}));
const DATA_FILE=process.env.DATA_FILE || path.join(__dirname,'data.json');
function readData(){try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));}catch{return [];}}
function writeData(data){fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2));}
function admin(req,res,next){if(req.session && req.session.admin)return next();res.status(401).json({error:'ورود مدیر لازم است'});}
app.get('/api/health',(req,res)=>res.json({ok:true}));
app.post('/api/insights',(req,res)=>{
 const b=req.body||{}; if(b.consent!==true)return res.status(400).json({error:'رضایت لازم است'});
 const item={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),createdAt:new Date().toISOString(),nickname:String(b.nickname||'دوست ماه').slice(0,32),favorite_color:String(b.favorite_color||'نامشخص').slice(0,40),action:String(b.action||'').slice(0,80),fantasy_title:String(b.fantasy_title||'').slice(0,80),wish:String(b.wish||'').slice(0,300),consent:true};
 const data=readData();data.unshift(item);writeData(data);res.json({ok:true});
});
app.get('/admin',(req,res)=>res.type('html').send(loginPage()));
app.post('/admin/login',(req,res)=>{if(String(req.body.password||'')!==process.env.ADMIN_PASSWORD)return res.status(401).json({error:'رمز عبور اشتباه است'});req.session.admin=true;res.json({ok:true});});
app.post('/admin/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/admin/data',admin,(req,res)=>res.json(readData()));
app.delete('/admin/data/:id',admin,(req,res)=>{const d=readData().filter(x=>x.id!==req.params.id);writeData(d);res.json({ok:true});});
app.get('/admin/dashboard',admin,(req,res)=>res.type('html').send(dashboardPage()));
app.use(express.static(__dirname,{index:'index.html'}));
function loginPage(){return `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ورود مدیر | دختر ماه</title><style>body{margin:0;background:linear-gradient(145deg,#100925,#462064);color:#fff;font-family:Tahoma,Arial;display:grid;place-items:center;min-height:100vh}.box{width:min(90%,420px);padding:28px;border:1px solid #ffd98a66;border-radius:24px;background:#ffffff10;text-align:center}input,button{font:inherit;padding:14px;border-radius:12px;border:0;margin:8px;width:90%}button{background:linear-gradient(90deg,#ffb8e7,#ffd98a);font-weight:bold}small{color:#e6d4f1}</style><div class="box"><h1>🌙 پنل مدیر دخترِ ماه</h1><p>ورود فقط برای صاحب سایت</p><form id="f"><input id="pw" type="password" autocomplete="current-password" placeholder="رمز عبور مدیر" required><button>ورود به داشبورد</button></form><p id="msg"></p><small>رمز را با هیچ‌کس به اشتراک نگذار.</small></div><script>f.onsubmit=async e=>{e.preventDefault();let r=await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw.value})});if(r.ok)location.href='/admin/dashboard';else msg.textContent='رمز اشتباه است یا سرور تنظیم نشده.'}</script></html>`;}
function dashboardPage(){return `<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>داشبورد | دختر ماه</title><style>body{margin:0;background:#100925;color:#fff8ff;font-family:Tahoma,Arial;padding:18px}.top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.stats{display:flex;gap:12px;flex-wrap:wrap}.stat,.panel{background:#ffffff10;border:1px solid #ffe0f055;border-radius:18px;padding:16px;margin:12px 0}.stat{min-width:130px}button{font:inherit;padding:10px 14px;border-radius:10px;border:0;background:#ffd98a;color:#241044}table{width:100%;border-collapse:collapse;min-width:750px}th,td{padding:10px;border-bottom:1px solid #ffffff22;text-align:right}th{color:#ffd98a}.scroll{overflow:auto}.muted{color:#d8c5e8;font-size:.85rem;line-height:1.8}</style><div class="top"><h1>🌙 داشبورد دخترِ ماه</h1><button id="logout">خروج امن</button></div><p class="muted">این اطلاعات فقط از کاربرانی است که تیک رضایت را فعال کرده‌اند. نام/لقب، رنگ، فعالیت‌ها و آرزوهای اختیاری که وارد کرده‌اند؛ هویت واقعی آن‌ها به‌طور خودکار شناسایی نمی‌شود.</p><div class="stats"><div class="stat">ثبت‌ها <h2 id="total">—</h2></div><div class="stat">آرزوهای ثبت‌شده <h2 id="wishes">—</h2></div></div><div class="panel"><div class="top"><h2>ثبت‌های بازدیدکننده‌ها</h2><button onclick="load()">به‌روزرسانی</button></div><div class="scroll"><table><thead><tr><th>زمان</th><th>اسم/لقب</th><th>رنگ</th><th>عنوان فانتزی</th><th>فعالیت</th><th>آرزو</th><th>حذف</th></tr></thead><tbody id="rows"></tbody></table></div><p class="muted">یادآوری: میزبانی رایگان ممکن است فایل دادهٔ محلی را پس از راه‌اندازی مجدد پاک کند. برای نگهداری دائمی باید دیتابیس یا دیسک پایدار تنظیم شود.</p></div><script>async function load(){let r=await fetch('/admin/data');if(r.status===401){location.href='/admin';return}let d=await r.json();total.textContent=d.length;wishes.textContent=d.filter(x=>x.wish).length;rows.innerHTML=d.map(x=>'<tr><td>'+esc(new Date(x.createdAt).toLocaleString())+'</td><td>'+esc(x.nickname)+'</td><td>'+esc(x.favorite_color)+'</td><td>'+esc(x.fantasy_title)+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.wish||'—')+'</td><td><button onclick="del(\''+x.id+'\')">حذف</button></td></tr>').join('')||'<tr><td colspan="7">هنوز داده‌ای ثبت نشده است.</td></tr>'}function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}async function del(id){if(confirm('این ثبت حذف شود؟')){await fetch('/admin/data/'+encodeURIComponent(id),{method:'DELETE'});load()}}logout.onclick=async()=>{await fetch('/admin/logout',{method:'POST'});location.href='/admin'};load();</script></html>`;}
app.listen(PORT,()=>console.log('Dokhtar-e Mah running on '+PORT));
