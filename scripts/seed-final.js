const BASE = "https://vswkrbemigyclgjrpgqt.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd2tyYmVtaWd5Y2xnanJwZ3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2MzkyNiwiZXhwIjoyMDkwODM5OTI2fQ.IhMA-LZMOR3v8bY2kelUzarsHU1lOB9JY4I7HJ0oi2g";

const LAST = ["김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황","안","송","류","홍"];
const FIRST = ["민준","서연","예준","서윤","도윤","지우","시우","하은","주원","하윤","지호","수빈","현우","지민","준서","채원","건우","유나","우진","소율"];
const COMP = ["한국전자통신","대한솔루션","서울IT시스템","부산테크","인천정보통신","대전소프트","광주디지털","수원네트웍스","성남클라우드","고양시스템"];
const STATS = ["paid","paid","paid","paid","paid","pending","pending","cancelled","refunded"];

function pick(a){return a[Math.floor(Math.random()*a.length)]}
function ph(){return`010-${String(Math.floor(Math.random()*9000)+1000)}-${String(Math.floor(Math.random()*9000)+1000)}`}
function rd(d){const t=new Date();t.setDate(t.getDate()-Math.floor(Math.random()*d));t.setHours(Math.floor(Math.random()*14)+8,Math.floor(Math.random()*60));return t.toISOString()}

async function auth(path,opts={}){
  const r=await fetch(BASE+"/auth/v1"+path,{...opts,headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"}});
  return r.json();
}
async function rest(path,opts={}){
  const r=await fetch(BASE+"/rest/v1"+path,{...opts,headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Prefer:"return=representation",...opts.headers}});
  if(!r.ok){const t=await r.text();throw new Error(`${r.status}: ${t.substring(0,200)}`)}
  const text=await r.text();
  return text?JSON.parse(text):null;
}

async function main(){
  console.log("=== 시딩 시작 ===\n");

  // 상품 조회
  const products=await rest("/products?is_published=eq.true&select=id,title,price,is_free&order=id");
  console.log("상품:",products.length+"개\n");

  // 회원 30명
  console.log("회원 30명 생성...");
  const users=[];
  for(let i=1;i<=30;i++){
    const name=pick(LAST)+pick(FIRST);
    const email=`user${String(i).padStart(2,"0")}@test.com`;
    const d=await auth("/admin/users",{method:"POST",body:JSON.stringify({email,password:"Test123!",email_confirm:true,user_metadata:{name}})});
    if(d.id){
      // profile 업데이트 (트리거가 기본 생성)
      try{await rest("/profiles?id=eq."+d.id,{method:"PATCH",body:JSON.stringify({name,phone:ph(),company:pick(COMP)})})}catch{}
      users.push({id:d.id,email,name});
      process.stdout.write("O");
    }else{
      // 이미 존재
      try{
        const ex=await rest("/profiles?email=eq."+encodeURIComponent(email)+"&select=id,email,name");
        if(ex&&ex.length>0){users.push(ex[0]);process.stdout.write(".")}
        else process.stdout.write("x");
      }catch{process.stdout.write("x")}
    }
  }
  console.log("\n회원 "+users.length+"명\n");

  if(!users.length){console.log("실패");return}

  // 주문 40건
  console.log("주문 40건 생성...");
  const paid=products.filter(p=>!p.is_free&&p.price>0);
  let oc=0;
  for(let i=0;i<40;i++){
    const u=pick(users),st=pick(STATS),ca=rd(30);
    const pool=paid.length>0&&Math.random()>0.3?paid:products;
    const sel=[];
    for(let j=0;j<Math.floor(Math.random()*3)+1;j++){const p=pick(pool);if(!sel.find(s=>s.id===p.id))sel.push(p)}
    if(!sel.length)sel.push(pick(products));
    const tot=sel.reduce((s,p)=>s+(p.price||0),0);
    try{
      const o=await rest("/orders",{method:"POST",body:JSON.stringify({user_id:u.id,total_amount:tot,status:st,payment_method:Math.random()>0.2?"card":"bank_transfer",paid_at:st==="paid"?ca:null,created_at:ca})});
      if(o&&o[0]?.id){
        await rest("/order_items",{method:"POST",body:JSON.stringify(sel.map(p=>({order_id:o[0].id,product_id:p.id,price:p.price||0})))});
        if(st==="paid"&&Math.random()>0.5){
          for(const p of sel){
            try{await rest("/download_logs",{method:"POST",body:JSON.stringify({user_id:u.id,product_id:p.id,file_name:p.title+".pdf",downloaded_at:rd(14)})})}catch{}
          }
        }
        oc++;process.stdout.write(".");
      }else process.stdout.write("x");
    }catch(e){process.stdout.write("x")}
  }
  console.log("\n주문 "+oc+"건\n");

  // 리뷰
  console.log("리뷰 생성...");
  const revs=[
    {title:"정말 유용합니다",content:"제안서 작성에 큰 도움이 되었습니다.",rating:5,pros:"체계적 구성",cons:"없음"},
    {title:"괜찮은 템플릿",content:"기본 구조는 좋습니다.",rating:4,pros:"가격 대비 괜찮음",cons:"예시 부족"},
    {title:"실전에서 바로 활용",content:"이번 입찰에서 낙찰 받았습니다!",rating:5,pros:"실전 활용도 높음",cons:"없음"},
    {title:"기대 이상",content:"처음 공공조달 참여하는데 도움됐습니다.",rating:5,pros:"초보자도 이해 가능",cons:"없음"},
    {title:"보통입니다",content:"가격에 비해 내용이 아쉽습니다.",rating:3,pros:"빠른 다운로드",cons:"내용 아쉬움"},
    {title:"추천합니다",content:"동료에게도 추천했습니다.",rating:4,pros:"디자인 깔끔",cons:"업데이트 희망"},
  ];
  let rc=0;
  const done=new Set();
  for(const u of users.slice(0,15)){
    const p=pick(paid.length?paid:products);
    const k=u.id+"_"+p.id;
    if(done.has(k))continue;done.add(k);
    const rv=pick(revs);
    try{
      await rest("/reviews",{method:"POST",body:JSON.stringify({user_id:u.id,product_id:p.id,...rv,is_published:true,is_verified_purchase:true,created_at:rd(20)})});
      rc++;process.stdout.write(".");
    }catch{process.stdout.write("x")}
  }
  console.log("\n리뷰 "+rc+"건\n");

  console.log("=== 완료 ===");
  console.log("회원:"+users.length+" 주문:"+oc+" 리뷰:"+rc);
  console.log("로그인: user01@test.com ~ user30@test.com / Test123!");
}
main().catch(console.error);
