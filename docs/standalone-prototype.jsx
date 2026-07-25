import React, { useState, useEffect, useRef } from "react";
import {
  Flame, Brain, Lightbulb, Check, X, ChevronRight, Mic, Share2, Sparkles,
  RotateCcw, Send, Eye, Trophy, Plus, Target, Layers, ArrowDown, Lock,
} from "lucide-react";

const INK = "#17171F", PAPER = "#F3F5F1", CARD = "#FFFFFF";
const LIME = "#B4E42A", LIME_DK = "#5E7A0E", MUTED = "#6C6C77", LINE = "#E5E7E1";

const MUSCLE = {
  lateral:      { key: "lateral",      label: "Assumptions",  color: "#7C6AE8" },
  spot_flaw:    { key: "spot_flaw",    label: "Arguments",    color: "#2E86C8" },
  fermi:        { key: "fermi",        label: "Estimation",   color: "#2FA36B" },
  deduction:    { key: "deduction",    label: "Logic",        color: "#9B59B6" },
  second_order: { key: "second_order", label: "Consequences", color: "#E08A1E" },
  reframe:      { key: "reframe",      label: "Framing",      color: "#17A2A2" },
};
const TYPE_NAME = {
  lateral: "Lateral", spot_flaw: "Spot the flaw", fermi: "Fermi estimate",
  deduction: "Deduction", second_order: "Second-order", reframe: "Reframe",
};

const PUZZLES = [
  { id:1, type:"lateral", difficulty:1, title:"The keeper's guilt",
    prompt:"One evening a man switched off a light and went to bed. The next morning the news reported many deaths at sea, and he felt responsible — though he broke no law. Why?",
    hints:["His job is the light itself.","The light was a warning to others.","Who relies on a light at night near the coast?"],
    answer:"He is a lighthouse keeper. He switched off the lamp, so ships had no warning and wrecked on the rocks.",
    share:"🔍 Cracked today's lateral puzzle in ⬛ questions. Your turn →",
    lateral:{ suggested:["Is it about his job?","Did people die at sea?","Was the light a warning?","Did he break the law?"],
      yes:["job","work","light","lamp","lighthouse","sea","ocean","ship","boat","wreck","warn","warning","keeper","night","coast","water","dark","responsible","captain","sailor","navig","rock"],
      no:["murder","kill","gun","poison","crime","illegal","law","fire","bomb","steal","rob","bill","blackout","bedroom","home light"],
      solveWords:["lighthouse","keeper"],
      clues:[ {label:"It's tied to his job",kw:["job","work","keeper","lighthouse","duty","employ"]},
        {label:"Others rely on the light",kw:["warn","warning","ship","boat","sea","sailor","captain","navig","rely","others"]},
        {label:"He turned the light off",kw:["off","switch","dark","turn","stop","out"]} ] } },
  { id:2, type:"spot_flaw", difficulty:1, title:"The 90% diet",
    prompt:"“Ninety percent of people who tried our diet lost weight, so the diet works.” What's the flaw?",
    hints:["Who is missing from that 90%?","Is there a group who didn't diet to compare against?","Did the diet cause it, or did motivated people?"],
    answer:"Selection / survivorship bias: only people who stuck with it are counted — dropouts and regainers are invisible — and there's no control group. The 90% proves almost nothing.",
    share:"🧠 Found the hidden flaw today. Can you spot it? →",
    options:["Only people who stuck with it are counted, and there's no control group","90% is simply not a big enough number to matter","Losing weight is not actually healthy","The diet is probably too expensive to be worth it"],
    correct:0 },
  { id:3, type:"fermi", difficulty:1, title:"Balls in a bus",
    prompt:"Roughly how many table-tennis balls would fit inside a standard school bus? Build your estimate step by step.",
    hints:["Estimate the bus's interior volume in cubic centimetres.","A ball is a ~4 cm sphere (~33 cm³).","Spheres only pack to ~65–70% of a space."],
    answer:"~1.2 million. Bus ≈ 2.5 × 2.5 × 10 m = 60 m³ = 60,000,000 cm³; ÷ ~33 cm³ × 0.7 packing ≈ 1.2 million.",
    share:"📏 My estimate landed within an order of magnitude. How close can you get? →",
    target:1200000, unit:"balls",
    seed:[ {label:"bus volume (cm³)",value:"",op:"×"},{label:"packing efficiency",value:"",op:"×"},{label:"÷ volume of one ball (cm³)",value:"",op:"÷"} ],
    steps:["Bus interior ≈ 2.5 m × 2.5 m × 10 m = 60 m³","60 m³ = 60,000,000 cm³","One ball ≈ 33 cm³","Spheres pack to ~70% → 60,000,000 × 0.7 ÷ 33 ≈ 1.2 million"] },
  { id:4, type:"deduction", difficulty:1, title:"Odd to even",
    prompt:"I am an odd number. Take away one letter and I become even. What number am I?",
    hints:["Think in words, not arithmetic.","The letters that remain spell a word.","It's a single digit."],
    answer:"SEVEN — remove the “S” and you're left with EVEN.",
    share:"🧩 Solved today's logic puzzle. Think you can? →", accept:["seven","7","seven (7)"] },
  { id:5, type:"second_order", difficulty:1, title:"Free buses",
    prompt:"A city makes all buses free to cut car traffic. What's a likely unintended effect? Jot your angles — short, no essays.",
    hints:["Who actually switches to the bus — drivers, or walkers and cyclists?","What happens to bus crowding and speed?","Does car traffic really fall?"],
    answer:"Mostly former walkers and cyclists ride, not drivers; buses overcrowd and slow down, while car traffic barely drops. The lever misses its target.",
    share:"🔮 I predicted the twist most people miss. Try it →",
    lenses:["Who actually switches?","What gets worse?","Does it hit the goal?","Who's assuming what?"],
    voiceDemo:"Maybe the people who switch are walkers, not car drivers…",
    keyAngles:[ {label:"Walkers/cyclists switch, not drivers",pct:41,lens:"Who actually switches?",kw:["walk","cycl","pedestrian","not driver","non-driver","already","bike"]},
      {label:"Buses overcrowd and slow down",pct:58,lens:"What gets worse?",kw:["crowd","overcrowd","slow","packed","full","delay","jam"]},
      {label:"Car traffic barely falls",pct:33,lens:"Does it hit the goal?",kw:["car","traffic","barely","won't","doesn't fall","still drive","goal","fail"]} ] },
  { id:6, type:"reframe", difficulty:1, title:"The slow elevator",
    prompt:"Tenants complain the elevator is too slow. Speeding it up costs a fortune. Find a cheaper reframe — jot your angles.",
    hints:["Is the complaint really “slow”, or “the wait is unpleasant”?","Change the experience, not the machine.","Give waiting people something to do."],
    answer:"Reframe from speed to perceived wait: mirrors or screens by the lift make the wait feel shorter, and complaints drop — for almost nothing. (A real building solved it this way.)",
    share:"🔄 Found the real problem behind today's. What's yours? →",
    lenses:["Is 'slow' the real issue?","Machine or experience?","What's cheap?","What do people do while waiting?"],
    voiceDemo:"The problem isn't speed, it's that waiting feels boring…",
    keyAngles:[ {label:"It's perceived wait, not speed",pct:47,lens:"Is 'slow' the real issue?",kw:["perceiv","wait","feel","boring","patience","seem","impatient"]},
      {label:"Distract people (mirrors/screens)",pct:52,lens:"What do people do while waiting?",kw:["mirror","screen","distract","music","phone","entertain","occupy","tv"]},
      {label:"Fix the experience, not the lift",pct:39,lens:"Machine or experience?",kw:["experience","not the lift","not speed","cheap","machine","design"]} ] },
];

const CHALLENGE = {
  title:"The widening road", estMin:6,
  problem:"A city widens a congested highway from 4 to 6 lanes to fix traffic. A few years later it's just as jammed — sometimes worse. Why does the problem come back?",
  layers:[
    { q:"The new lanes clearly add capacity. What undoes it?",
      options:[ {t:"More people start driving because the road is now easier",deep:true},
        {t:"Construction left the road in bad shape",deep:false,nudge:"Real, but temporary — that fades. Look for something lasting."},
        {t:"The population simply grew",deep:false,nudge:"Some, but the jam returns faster than population grows. Dig deeper."} ],
      insight:"The easier road lowers the 'cost' (time) of driving — so people who avoided it, took transit, or travelled off-peak now drive it too." },
    { q:"Where do all these extra drivers suddenly come from?",
      options:[ {t:"Suppressed demand that was waiting for the road to improve",deep:true},
        {t:"Everyone happened to buy cars that year",deep:false,nudge:"Too much of a coincidence — and it'd happen without the road. Keep digging."},
        {t:"The city cut its bus routes",deep:false,nudge:"Maybe, but the effect appears even when buses stay. Look deeper."} ],
      insight:"Demand for driving isn't fixed — it's elastic. Improve the road and you unlock trips that congestion was quietly suppressing." },
    { q:"What was the whole plan silently assuming?",
      options:[ {t:"That the number of trips is fixed, so more lanes = less congestion",deep:true},
        {t:"That drivers behave irrationally",deep:false,nudge:"They're acting perfectly rationally — that's the point. Try again."},
        {t:"That the old lanes were too narrow",deep:false,nudge:"Width wasn't the issue. This is about demand, not dimensions."} ],
      insight:"It assumed demand was fixed. Once demand responds to supply, adding capacity just invites more driving to fill it — 'induced demand.'" },
    { q:"So — is 'not enough lanes' even the real problem?",
      options:[ {t:"No — driving is underpriced for the demand; capacity can't outrun it",deep:true},
        {t:"Yes, they just need to add even more lanes",deep:false,nudge:"That's the trap — more lanes induce yet more demand. A symptom, not the root."},
        {t:"No, the real problem is bad drivers",deep:false,nudge:"They're rational actors. Zoom out from people to the system."} ],
      insight:"The real lever isn't asphalt at all — it's the price of driving and the quality of the alternatives." },
  ],
  root:{ name:"Induced demand · the Downs–Thomson paradox",
    chain:["Add lanes → driving gets easier","Easier driving → suppressed trips reappear","Demand is elastic, not fixed","New demand fills the new lanes → congestion returns","Root: you can't build your way out — price it, or offer real alternatives"],
    share:"🕳 I dug 4 layers deep into why widening roads backfires. How deep can you go? →" },
};

const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function fmt(n){ if(!isFinite(n))return "—"; if(Math.abs(n)>=1000)return Math.round(n).toLocaleString(); return (Math.round(n*100)/100).toString(); }

export default function ThinkingGym(){
  const [tab,setTab]=useState("daily");
  const [streak,setStreak]=useState(3);
  const [pulse,setPulse]=useState(false);
  const [profile,setProfile]=useState({ lateral:34, spot_flaw:28, fermi:22, deduction:40, second_order:18, reframe:25 });
  const [solvedIds,setSolvedIds]=useState(()=>new Set());
  const [challengeDone,setChallengeDone]=useState(false);

  function bumpStreak(){ setStreak(s=>s+1); if(!reduce){ setPulse(true); setTimeout(()=>setPulse(false),500);} }
  function trainPuzzle(p){ if(solvedIds.has(p.id))return; setSolvedIds(s=>new Set(s).add(p.id)); bumpStreak(); setProfile(pr=>({...pr,[p.type]:Math.min(100,pr[p.type]+14)})); }
  function trainChallenge(){ if(challengeDone)return; setChallengeDone(true); bumpStreak(); setProfile(pr=>({...pr, reframe:Math.min(100,pr.reframe+18), second_order:Math.min(100,pr.second_order+10)})); }

  const font='"Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
  return (
    <div style={{ background:PAPER, minHeight:"100%", color:INK, fontFamily:font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        .tg-in{animation:${reduce?"none":"tgIn .28s ease both"}}
        @keyframes tgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .tg-bar{transition:width .6s cubic-bezier(.2,.8,.2,1)}
        input:focus,textarea:focus,select:focus{outline:2px solid ${LIME_DK}33;outline-offset:1px}`}</style>

      <div className="mx-auto" style={{ maxWidth:480, minHeight:"100%", display:"flex", flexDirection:"column" }}>
        {/* header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-xl" style={{ width:34, height:34, background:INK }}><Brain size={19} color={LIME}/></div>
            <div>
              <div style={{ fontWeight:700, fontSize:15, letterSpacing:-0.2 }}>Thinking Gym</div>
              <div style={{ fontSize:11, color:MUTED, marginTop:-2 }}>{tab==="daily"?"Day 12 · your daily rep":"Challenge · dig deep"}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background:CARD, border:`1px solid ${LINE}`, transform:pulse?"scale(1.12)":"none", transition:"transform .3s" }}>
            <Flame size={16} color={LIME_DK} fill={LIME}/><span style={{ fontWeight:700, fontSize:14 }}>{streak}</span>
          </div>
        </div>

        <div className="px-4" style={{ flex:1, paddingBottom:8 }}>
          {tab==="daily"
            ? <DailyView profile={profile} solvedIds={solvedIds} trainPuzzle={trainPuzzle}/>
            : <ChallengeView trainChallenge={trainChallenge} done={challengeDone}/>}
        </div>

        {/* bottom tabs */}
        <div className="flex gap-1 px-4 py-2.5" style={{ position:"sticky", bottom:0, background:"rgba(243,245,241,0.92)", backdropFilter:"blur(8px)", borderTop:`1px solid ${LINE}` }}>
          {[["daily","Daily",Sparkles],["challenge","Challenge",Layers]].map(([k,label,Icon])=>{
            const on=tab===k;
            return (
              <button key={k} onClick={()=>setTab(k)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5"
                style={{ background:on?INK:"transparent", color:on?LIME:MUTED, fontWeight:600, fontSize:13, border:on?"none":`1px solid ${LINE}` }}>
                <Icon size={16}/> {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================ DAILY ============================ */
function DailyView({ profile, solvedIds, trainPuzzle }){
  const [idx,setIdx]=useState(0);
  const p=PUZZLES[idx], m=MUSCLE[p.type];
  const [hintLevel,setHintLevel]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [log,setLog]=useState([]); const [q,setQ]=useState("");
  const [chosen,setChosen]=useState(null);
  const [guess,setGuess]=useState(""); const [locked,setLocked]=useState(false);
  const [angles,setAngles]=useState([]); const [listening,setListening]=useState(false);
  const [copied,setCopied]=useState(false);
  const logEnd=useRef(null);

  useEffect(()=>{ setHintLevel(0); setRevealed(false); setLog([]); setQ(""); setChosen(null); setGuess(""); setLocked(false); setAngles([]); setListening(false); setCopied(false); },[idx]);
  useEffect(()=>{ logEnd.current?.scrollIntoView({behavior:"smooth"}); },[log]);

  const isSolved = solvedIds.has(p.id) || revealed || (p.type==="spot_flaw" && chosen===p.correct);
  const train=()=>trainPuzzle(p);

  const cluesFound = p.type==="lateral" ? p.lateral.clues.map(c=>log.some(e=>e.a!=="No"&&e.a!=="Doesn't matter"&&c.kw.some(k=>e.q.toLowerCase().includes(k)))) : [];
  const clueCount = cluesFound.filter(Boolean).length;

  function askOracle(text){ const t=text.toLowerCase().trim(); if(!t)return; const cfg=p.lateral;
    let a="Doesn't matter"; if(cfg.no.some(w=>t.includes(w)))a="No"; else if(cfg.yes.some(w=>t.includes(w)))a="Yes";
    const solved=cfg.solveWords.some(w=>t.includes(w));
    setLog(l=>[...l,{q:text,a:solved?"That's it! 🎯":a,hit:solved}]); setQ("");
    if(solved){ setRevealed(true); train(); } }
  function lockFermi(result){ setGuess(String(result)); setLocked(true); const within=Math.abs(Math.log10(result)-Math.log10(p.target))<=1; setRevealed(true); if(within)train(); }
  function checkDeduction(){ const ok=p.accept.some(a=>guess.toLowerCase().trim()===a); setLocked(true); if(ok){ setRevealed(true); train(); } }
  function addAngle(text){ if(text.trim()) setAngles(a=>[...a,text.trim()].slice(0,6)); }
  function doVoiceDemo(){ setListening(true); setTimeout(()=>{ setListening(false); addAngle(p.voiceDemo); },1200); }
  function copyShare(){ const text=p.share.replace("⬛",String(log.length||1)); try{ navigator.clipboard?.writeText(text+" Thinking Gym"); }catch(e){} setCopied(true); setTimeout(()=>setCopied(false),1600); }

  return (
    <div>
      <div key={p.id} className="tg-in rounded-2xl p-5 mb-3" style={{ background:CARD, border:`1px solid ${LINE}` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="rounded-full px-2.5 py-1" style={{ background:m.color+"18", color:m.color, fontSize:11, fontWeight:600 }}>{TYPE_NAME[p.type]}</span>
          <div className="flex items-center gap-1">{[1,2,3,4,5].map(d=>(<span key={d} style={{ width:6, height:6, borderRadius:6, background:d<=p.difficulty?INK:LINE }}/>))}</div>
        </div>
        <h2 style={{ fontSize:19, fontWeight:700, letterSpacing:-0.4, marginBottom:8 }}>{p.title}</h2>
        <p style={{ fontSize:15, lineHeight:1.55, color:"#2C2C33" }}>{p.prompt}</p>

        <div className="mt-4">
          {p.type==="lateral" && <LateralInput p={p} log={log} q={q} setQ={setQ} ask={askOracle} logEnd={logEnd} revealed={revealed} clues={p.lateral.clues} cluesFound={cluesFound} clueCount={clueCount} onReveal={()=>setRevealed(true)}/>}
          {p.type==="spot_flaw" && (
            <div className="flex flex-col gap-2">
              {p.options.map((opt,i)=>{ const picked=chosen===i, show=chosen!==null, right=i===p.correct;
                let bg=CARD,bd=LINE,ic=null;
                if(show&&picked&&right){bg=LIME+"22";bd=LIME_DK;ic=<Check size={16} color={LIME_DK}/>;}
                else if(show&&picked&&!right){bg="#F8D7DA";bd="#D6456B";ic=<X size={16} color="#D6456B"/>;}
                else if(show&&right){bg=LIME+"14";bd=LIME_DK;ic=<Check size={16} color={LIME_DK}/>;}
                return (<button key={i} disabled={show} onClick={()=>{ setChosen(i); if(i===p.correct)train(); }} className="text-left rounded-xl px-3.5 py-3 flex items-start gap-2" style={{ background:bg, border:`1px solid ${bd}`, fontSize:14, cursor:show?"default":"pointer" }}><span style={{ marginTop:1, minWidth:16 }}>{ic}</span><span>{opt}</span></button>); })}
            </div>
          )}
          {p.type==="fermi" && <FermiScratch p={p} locked={locked} onLock={lockFermi}/>}
          {p.type==="fermi" && locked && (<div className="tg-in mt-2" style={{ fontSize:13, color:MUTED }}>{Math.abs(Math.log10(parseFloat(guess))-Math.log10(p.target))<=1?"Nice — within an order of magnitude. It's the reasoning path that counts:":"Off this time — but here's the path that matters more than the number:"}</div>)}
          {p.type==="deduction" && (
            <div className="flex items-center gap-2">
              <input value={guess} disabled={revealed} onChange={e=>setGuess(e.target.value)} placeholder="one word…" onKeyDown={e=>e.key==="Enter"&&checkDeduction()} className="rounded-xl px-3.5 py-3 flex-1" style={{ border:`1px solid ${locked&&!revealed?"#D6456B":LINE}`, fontSize:15, background:CARD }}/>
              <button onClick={checkDeduction} className="rounded-xl px-4 py-3" style={{ background:INK, color:LIME, fontWeight:600, fontSize:14 }}>Check</button>
            </div>
          )}
          {p.type==="deduction" && locked && !revealed && (<div className="tg-in mt-2" style={{ fontSize:13, color:"#D6456B" }}>Not quite — try a hint, then guess again.</div>)}
          {(p.type==="second_order"||p.type==="reframe") && <OpenWorkspace p={p} angles={angles} addAngle={addAngle} listening={listening} doVoice={doVoiceDemo} revealed={revealed} onReveal={()=>{ setRevealed(true); train(); }}/>}
        </div>

        {!isSolved && p.type!=="lateral" && (
          <div className="mt-3">
            {hintLevel<3 && (<button onClick={()=>setHintLevel(h=>h+1)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ border:`1px solid ${LINE}`, background:PAPER, fontSize:12.5, color:MUTED, fontWeight:500 }}><Lightbulb size={14} color={LIME_DK}/>{hintLevel===0?"Need a nudge?":`Hint ${hintLevel+1} of 3`}</button>)}
            {hintLevel>0 && (<div className="mt-2 flex flex-col gap-1.5">{p.hints.slice(0,hintLevel).map((h,i)=>(<div key={i} className="tg-in rounded-xl px-3 py-2" style={{ background:LIME+"12", fontSize:13.5, color:"#3A3A40" }}><b style={{ color:LIME_DK }}>Hint {i+1}.</b> {h}</div>))}</div>)}
          </div>
        )}
        {!revealed && p.type==="deduction" && (<button onClick={()=>setRevealed(true)} className="mt-3 flex items-center gap-1 text-left" style={{ fontSize:12.5, color:MUTED }}><Eye size={13}/> I give up — reveal</button>)}

        {revealed && (
          <div className="tg-in mt-4 rounded-xl p-3.5" style={{ background:INK }}>
            <div className="flex items-center gap-1.5 mb-1.5"><Sparkles size={14} color={LIME}/><span style={{ color:LIME, fontSize:11, fontWeight:600, letterSpacing:0.3, textTransform:"uppercase" }}>{p.type==="second_order"||p.type==="reframe"?"How experts saw it":"Answer"}</span></div>
            <p style={{ color:"#EDEDEA", fontSize:14, lineHeight:1.5 }}>{p.answer}</p>
            {p.steps && (<div className="mt-2.5 flex flex-col gap-1">{p.steps.map((s,i)=>(<div key={i} style={{ color:"#B9B9C2", fontSize:12.5 }}>· {s}</div>))}</div>)}
            {p.keyAngles && (<div className="mt-3"><div style={{ color:"#8B8B96", fontSize:11, marginBottom:6 }}>Key angles — did you land them?</div><div className="flex flex-col gap-1.5">{p.keyAngles.map((c,i)=>(<div key={i} className="flex items-center gap-2"><div className="flex-1 rounded-full" style={{ height:6, background:"#2B2B36" }}><div className="tg-bar rounded-full" style={{ width:`${c.pct}%`, height:6, background:LIME }}/></div><span style={{ color:"#B9B9C2", fontSize:11, minWidth:150 }}>{c.pct}% · {c.label}</span></div>))}</div></div>)}
          </div>
        )}
      </div>

      {isSolved && (
        <div className="tg-in rounded-2xl p-4 mb-3" style={{ background:CARD, border:`1px solid ${LINE}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="rounded-lg flex items-center justify-center" style={{ width:30, height:30, background:m.color+"18" }}><Trophy size={16} color={m.color}/></div><div><div style={{ fontSize:13, fontWeight:600 }}>Muscle trained</div><div style={{ fontSize:11.5, color:MUTED }}>{m.label}</div></div></div>
            <button onClick={copyShare} className="flex items-center gap-1.5 rounded-full px-3 py-2" style={{ background:LIME, color:INK, fontWeight:600, fontSize:12.5 }}><Share2 size={13}/> {copied?"Copied!":"Share"}</button>
          </div>
        </div>
      )}

      <ProfilePanel profile={profile}/>

      <div className="flex items-center justify-between">
        <button onClick={()=>setIdx(0)} className="flex items-center gap-1.5 rounded-full px-3 py-2" style={{ border:`1px solid ${LINE}`, background:CARD, fontSize:12.5, color:MUTED }}><RotateCcw size={13}/> Restart</button>
        <button onClick={()=>setIdx(i=>(i+1)%PUZZLES.length)} className="flex items-center gap-1.5 rounded-full px-4 py-2.5" style={{ background:INK, color:LIME, fontWeight:600, fontSize:13 }}>Next type <ChevronRight size={15}/></button>
      </div>
      <div style={{ textAlign:"center", fontSize:10.5, color:MUTED, marginTop:12 }}>Demo flips through one puzzle per input model · live app is one a day</div>
    </div>
  );
}

function ProfilePanel({ profile }){
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background:CARD, border:`1px solid ${LINE}` }}>
      <div className="flex items-center justify-between mb-3"><span style={{ fontSize:13, fontWeight:600 }}>Your thinking profile</span><span style={{ fontSize:11, color:MUTED }}>one score · puzzles + challenges</span></div>
      <div className="flex flex-col gap-2">{Object.values(MUSCLE).map(mm=>(<div key={mm.key} className="flex items-center gap-2"><span style={{ fontSize:11.5, color:"#4A4A52", minWidth:96 }}>{mm.label}</span><div className="flex-1 rounded-full" style={{ height:7, background:PAPER }}><div className="tg-bar rounded-full" style={{ width:`${profile[mm.key]}%`, height:7, background:mm.color }}/></div><span style={{ fontSize:11, color:MUTED, minWidth:22, textAlign:"right", fontVariantNumeric:"tabular-nums" }}>{profile[mm.key]}</span></div>))}</div>
    </div>
  );
}

function LateralInput({ p, log, q, setQ, ask, logEnd, revealed, clues, cluesFound, clueCount, onReveal }){
  const allFound=clueCount===clues.length;
  return (
    <div>
      <div style={{ fontSize:12, color:MUTED, marginBottom:8 }}>Ask yes/no questions to crack it — the thinking is in the asking.</div>
      <div className="rounded-xl px-3 py-2.5 mb-2" style={{ background:PAPER }}>
        <div className="flex items-center justify-between mb-1.5"><span style={{ fontSize:11, fontWeight:600, color:"#4A4A52" }}>Key facts uncovered</span><span style={{ fontSize:11, fontWeight:700, color:allFound?LIME_DK:MUTED }}>{clueCount} / {clues.length}</span></div>
        <div className="flex flex-col gap-1">{clues.map((c,i)=>(<div key={i} className="flex items-center gap-1.5" style={{ fontSize:12, color:cluesFound[i]?INK:"#B7B7BE" }}>{cluesFound[i]?<Check size={13} color={LIME_DK}/>:<div style={{ width:13, height:13, borderRadius:8, border:`1.5px solid ${LINE}` }}/>}{cluesFound[i]?c.label:"· · · · ·"}</div>))}</div>
        {allFound && !revealed && (<div style={{ fontSize:11.5, color:LIME_DK, marginTop:6, fontWeight:600 }}>You've got the key facts — try naming it below.</div>)}
      </div>
      {log.length>0 && (<div className="rounded-xl p-2.5 mb-2 flex flex-col gap-2" style={{ background:PAPER, maxHeight:150, overflowY:"auto" }}>{log.map((e,i)=>(<div key={i} className="tg-in"><div style={{ fontSize:13, fontWeight:500 }}>{e.q}</div><div style={{ fontSize:13, fontWeight:700, color:e.hit?LIME_DK:e.a==="Yes"?"#2FA36B":e.a==="No"?"#D6456B":MUTED }}>→ {e.a}</div></div>))}<div ref={logEnd}/></div>)}
      {!revealed && (<>
        <div className="flex flex-wrap gap-1.5 mb-2">{p.lateral.suggested.map((s,i)=>(<button key={i} onClick={()=>ask(s)} className="rounded-full px-2.5 py-1.5" style={{ border:`1px solid ${LINE}`, background:CARD, fontSize:12, color:"#3A3A40" }}>{s}</button>))}</div>
        <div className="flex items-center gap-2"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask(q)} placeholder="ask your own yes/no question…" className="rounded-xl px-3.5 py-2.5 flex-1" style={{ border:`1px solid ${LINE}`, fontSize:14, background:CARD }}/><button onClick={()=>ask(q)} className="rounded-xl p-2.5" style={{ background:INK }}><Send size={16} color={LIME}/></button></div>
        <button onClick={onReveal} className="mt-2 flex items-center gap-1" style={{ fontSize:12, color:MUTED }}><Eye size={13}/> I've got it — reveal</button>
      </>)}
    </div>
  );
}

function FermiScratch({ p, locked, onLock }){
  const [rows,setRows]=useState(()=> p.seed ? p.seed.map(r=>({...r})) : [{label:"",value:"",op:"×"},{label:"",value:"",op:"×"}]);
  const filled=rows.filter(r=>r.value!==""&&!isNaN(parseFloat(r.value)));
  let result=null;
  if(filled.length){ result=parseFloat(filled[0].value); for(let i=1;i<filled.length;i++){ const v=parseFloat(filled[i].value), op=filled[i].op; result= op==="×"?result*v: op==="÷"?result/v: op==="+"?result+v: result-v; } }
  function upd(i,k,val){ setRows(rs=>rs.map((r,j)=>j===i?{...r,[k]:val}:r)); }
  return (
    <div>
      <div style={{ fontSize:12, color:MUTED, marginBottom:8 }}>Your scratchpad — break it into steps. You supply the reasoning; the app does the maths.</div>
      <div className="rounded-xl p-2.5" style={{ background:PAPER }}>
        {rows.map((r,i)=>(
          <div key={i} className="flex items-center gap-1.5 mb-1.5">
            {i>0 && !p.seed && (<select value={r.op} disabled={locked} onChange={e=>upd(i,"op",e.target.value)} className="rounded-lg px-1 py-2" style={{ border:`1px solid ${LINE}`, background:CARD, fontSize:14, width:40 }}><option>×</option><option>÷</option><option>+</option><option>−</option></select>)}
            {(i===0||p.seed) && <span style={{ width:40, textAlign:"center", fontSize:14, color:MUTED }}>{p.seed&&i>0?r.op:""}</span>}
            <input value={r.label} disabled={locked} onChange={e=>upd(i,"label",e.target.value)} placeholder="what is this?" className="rounded-lg px-2.5 py-2 flex-1" style={{ border:`1px solid ${LINE}`, background:CARD, fontSize:13 }}/>
            <input inputMode="numeric" value={r.value} disabled={locked} onChange={e=>upd(i,"value",e.target.value)} placeholder="0" className="rounded-lg px-2.5 py-2" style={{ border:`1px solid ${LINE}`, background:CARD, fontSize:13, width:92, fontVariantNumeric:"tabular-nums" }}/>
          </div>
        ))}
        {!locked && rows.length<6 && (<button onClick={()=>setRows(rs=>[...rs,{label:"",value:"",op:"×"}])} className="flex items-center gap-1 mt-1" style={{ fontSize:12, color:LIME_DK, fontWeight:600 }}><Plus size={13}/> add step</button>)}
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop:`1px solid ${LINE}` }}><span style={{ fontSize:12, color:MUTED }}>Running estimate</span><span style={{ fontSize:17, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{result===null?"—":fmt(result)}</span></div>
      </div>
      {!locked && (<button onClick={()=>result!==null&&onLock(result)} disabled={result===null} className="rounded-xl px-4 py-2.5 mt-2 flex items-center gap-1.5" style={{ background:result===null?LINE:INK, color:result===null?MUTED:LIME, fontWeight:600, fontSize:14 }}><Target size={15}/> Lock in estimate</button>)}
    </div>
  );
}

function OpenWorkspace({ p, angles, addAngle, listening, doVoice, revealed, onReveal }){
  const [draft,setDraft]=useState("");
  function matchIdx(text){ const t=text.toLowerCase(); return p.keyAngles.findIndex(ka=>t===ka.lens.toLowerCase()||ka.kw.some(k=>t.includes(k))); }
  const found=new Set(); angles.forEach(a=>{ const mi=matchIdx(a); if(mi>=0)found.add(mi); });
  const total=p.keyAngles.length, covered=found.size, done=covered>=total;
  return (
    <div>
      <div style={{ fontSize:12, color:MUTED, marginBottom:6 }}>Tap a lens or add your own. Short jots, go for breadth — strong thinkers find ~{total} angles.</div>
      <div className="rounded-xl px-3 py-2 mb-2 flex items-center justify-between" style={{ background:PAPER }}>
        <span style={{ fontSize:11.5, fontWeight:600, color:"#4A4A52" }}>Angles uncovered</span>
        <div className="flex items-center gap-1.5">{p.keyAngles.map((_,i)=>(<div key={i} style={{ width:22, height:6, borderRadius:6, background:found.has(i)?LIME:LINE, transition:"background .3s" }}/>))}<span style={{ fontSize:11.5, fontWeight:700, color:done?LIME_DK:MUTED, marginLeft:4 }}>{covered}/{total}</span></div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">{p.lenses.map((l,i)=>(<button key={i} onClick={()=>addAngle(l)} disabled={revealed} className="flex items-center gap-1 rounded-full px-2.5 py-1.5" style={{ border:`1px dashed ${MUTED}66`, background:CARD, fontSize:12, color:"#3A3A40" }}><Plus size={12}/> {l}</button>))}</div>
      {angles.length>0 && (<div className="flex flex-col gap-1.5 mb-2">{angles.map((a,i)=>{ const hit=matchIdx(a)>=0; return (<div key={i} className="tg-in rounded-xl px-3 py-2 flex items-center gap-2" style={{ background:hit?LIME+"18":PAPER, fontSize:13, border:hit?`1px solid ${LIME}`:"1px solid transparent" }}>{hit?<Target size={14} color={LIME_DK}/>:<span style={{ color:MUSCLE[p.type].color, fontWeight:700 }}>{i+1}</span>}<span className="flex-1">{a}</span>{hit&&<span style={{ fontSize:10.5, color:LIME_DK, fontWeight:700 }}>key angle</span>}</div>); })}</div>)}
      {!revealed && (<>
        <div className="flex items-center gap-2"><input value={listening?"":draft} disabled={listening} onChange={e=>setDraft(e.target.value.slice(0,90))} onKeyDown={e=>{ if(e.key==="Enter"){ addAngle(draft); setDraft(""); } }} placeholder={listening?"listening…":"one short angle…"} className="rounded-xl px-3.5 py-2.5 flex-1" style={{ border:`1px solid ${LINE}`, fontSize:14, background:listening?LIME+"14":CARD }}/><button onClick={doVoice} className="rounded-xl p-2.5" title="voice (demo)" style={{ background:listening?LIME:CARD, border:`1px solid ${listening?LIME:LINE}` }}><Mic size={16} color={listening?INK:MUTED}/></button></div>
        <div className="flex items-center justify-between mt-2"><span style={{ fontSize:10.5, color:MUTED }}>{draft.length}/90 · mic is a demo</span><button onClick={onReveal} disabled={angles.length===0} className="rounded-full px-3.5 py-2" style={{ background:angles.length?INK:LINE, color:angles.length?LIME:MUTED, fontWeight:600, fontSize:12.5 }}>{done?"You've got them — see how others thought →":"See how others thought →"}</button></div>
      </>)}
    </div>
  );
}

/* ============================ CHALLENGE ============================ */
function ChallengeView({ trainChallenge, done }){
  const C=CHALLENGE;
  const [started,setStarted]=useState(false);
  const [layerIdx,setLayerIdx]=useState(0);
  const [trail,setTrail]=useState([]);
  const [tried,setTried]=useState({});
  const [nudge,setNudge]=useState("");
  const [hunch,setHunch]=useState("");
  const [copied,setCopied]=useState(false);
  const finished=layerIdx>=C.layers.length;

  function pick(oi){
    const layer=C.layers[layerIdx], opt=layer.options[oi];
    if(opt.deep){
      setTrail(t=>[...t,{q:layer.q,insight:layer.insight}]);
      setNudge(""); setTried({}); setHunch("");
      const next=layerIdx+1; setLayerIdx(next);
      if(next>=C.layers.length) trainChallenge();
    } else { setTried(x=>({...x,[oi]:true})); setNudge(opt.nudge||"That's a symptom — dig deeper."); }
  }
  function copyShare(){ try{ navigator.clipboard?.writeText(C.root.share+" Thinking Gym"); }catch(e){} setCopied(true); setTimeout(()=>setCopied(false),1600); }

  if(!started){
    return (
      <div className="tg-in rounded-2xl p-5 mb-3" style={{ background:CARD, border:`1px solid ${LINE}` }}>
        <div className="flex items-center gap-2 mb-3"><span className="rounded-full px-2.5 py-1" style={{ background:"#17A2A218", color:"#17A2A2", fontSize:11, fontWeight:600 }}>Challenge</span><span style={{ fontSize:11, color:MUTED }}>~{C.estMin} min · one sitting</span></div>
        <h2 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.4, marginBottom:6 }}>{C.title}</h2>
        <p style={{ fontSize:15, lineHeight:1.55, color:"#2C2C33" }}>{C.problem}</p>
        <div className="rounded-xl px-3 py-2.5 mt-4 mb-4 flex items-start gap-2" style={{ background:PAPER }}>
          <ArrowDown size={15} color={LIME_DK} style={{ marginTop:1 }}/>
          <span style={{ fontSize:12.5, color:"#3A3A40" }}>Don't stop at the first answer. You'll dig through <b>4 layers of “why”</b> to reach the root cause most people miss.</span>
        </div>
        <button onClick={()=>setStarted(true)} className="w-full rounded-xl py-3 flex items-center justify-center gap-1.5" style={{ background:INK, color:LIME, fontWeight:600, fontSize:15 }}>Start digging <ArrowDown size={16}/></button>
        <div className="flex items-center justify-center gap-1 mt-3" style={{ fontSize:11, color:MUTED }}><Lock size={11}/> Today's challenge is free · the full archive is Pro</div>
      </div>
    );
  }

  return (
    <div>
      <div className="tg-in rounded-2xl p-4 mb-3" style={{ background:CARD, border:`1px solid ${LINE}` }}>
        <div className="flex items-center justify-between mb-1.5"><span style={{ fontSize:12, fontWeight:700, color:"#17A2A2" }}>{C.title}</span><span style={{ fontSize:11, fontWeight:700, color:finished?LIME_DK:MUTED }}>Layer {Math.min(layerIdx+ (finished?0:1), C.layers.length)} / {C.layers.length}</span></div>
        <p style={{ fontSize:13.5, lineHeight:1.5, color:"#4A4A52" }}>{C.problem}</p>
      </div>

      {/* dig trail */}
      {trail.length>0 && (
        <div className="mb-3">
          {trail.map((t,i)=>(
            <div key={i} className="flex gap-2.5 mb-2">
              <div className="flex flex-col items-center" style={{ paddingTop:2 }}>
                <div className="rounded-full flex items-center justify-center" style={{ width:22, height:22, background:LIME, fontSize:11, fontWeight:700, color:INK }}>{i+1}</div>
                <div style={{ width:2, flex:1, background:LINE, marginTop:2 }}/>
              </div>
              <div className="tg-in rounded-xl px-3 py-2.5 flex-1" style={{ background:CARD, border:`1px solid ${LINE}` }}>
                <div style={{ fontSize:11.5, color:MUTED, marginBottom:2 }}>{t.q}</div>
                <div style={{ fontSize:13, color:INK, lineHeight:1.45 }}>{t.insight}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* current layer */}
      {!finished && (
        <div className="tg-in rounded-2xl p-4 mb-3" style={{ background:INK }}>
          <div className="flex items-center gap-1.5 mb-2"><ArrowDown size={14} color={LIME}/><span style={{ color:LIME, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:0.3 }}>Dig deeper</span></div>
          <p style={{ color:"#EDEDEA", fontSize:15, fontWeight:600, lineHeight:1.45, marginBottom:12 }}>{C.layers[layerIdx].q}</p>
          <input value={hunch} onChange={e=>setHunch(e.target.value.slice(0,90))} placeholder="your hunch first (optional)…" className="rounded-lg px-3 py-2 mb-3 w-full" style={{ background:"#24242E", border:"1px solid #33333E", color:"#EDEDEA", fontSize:13 }}/>
          <div className="flex flex-col gap-2">
            {C.layers[layerIdx].options.map((o,i)=>{ const off=tried[i];
              return (<button key={i} onClick={()=>pick(i)} disabled={off} className="text-left rounded-xl px-3.5 py-2.5" style={{ background:off?"#20202A":"#2A2A35", border:`1px solid ${off?"#33333E":"#3A3A46"}`, color:off?"#6B6B78":"#EDEDEA", fontSize:13.5, cursor:off?"default":"pointer" }}>{o.t}</button>); })}
          </div>
          {nudge && (<div className="tg-in mt-3 rounded-lg px-3 py-2" style={{ background:"#3A2E12", color:"#E5B65A", fontSize:12.5 }}>↳ {nudge}</div>)}
        </div>
      )}

      {/* root reveal */}
      {finished && (
        <>
          <div className="tg-in rounded-2xl p-4 mb-3" style={{ background:LIME }}>
            <div className="flex items-center gap-1.5 mb-1.5"><Trophy size={15} color={INK}/><span style={{ color:INK, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.3 }}>Root cause reached</span></div>
            <div style={{ color:INK, fontSize:17, fontWeight:700, marginBottom:8 }}>{C.root.name}</div>
            <div className="flex flex-col gap-1">{C.root.chain.map((s,i)=>(<div key={i} style={{ color:"#2A3410", fontSize:12.5, fontWeight:i===C.root.chain.length-1?700:500 }}>{i===C.root.chain.length-1?"◆":"→"} {s}</div>))}</div>
          </div>
          <div className="tg-in rounded-2xl p-4 mb-3" style={{ background:CARD, border:`1px solid ${LINE}` }}>
            <div className="flex items-center justify-between">
              <div><div style={{ fontSize:13, fontWeight:600 }}>You dug all 4 layers</div><div style={{ fontSize:11.5, color:MUTED }}>Most people stop at layer 1–2 · Framing +18</div></div>
              <button onClick={copyShare} className="flex items-center gap-1.5 rounded-full px-3 py-2" style={{ background:INK, color:LIME, fontWeight:600, fontSize:12.5 }}><Share2 size={13}/> {copied?"Copied!":"Share"}</button>
            </div>
          </div>
          <button onClick={()=>{ setStarted(false); setLayerIdx(0); setTrail([]); setTried({}); setNudge(""); setHunch(""); }} className="flex items-center gap-1.5 rounded-full px-3 py-2 mx-auto" style={{ border:`1px solid ${LINE}`, background:CARD, fontSize:12.5, color:MUTED }}><RotateCcw size={13}/> Replay challenge</button>
        </>
      )}
    </div>
  );
}
