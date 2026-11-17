"use strict";
(() => {
  const byId = id => document.getElementById(id);
  const cv = Object.fromEntries(["world","context","readout","phys"].map(k => [k,byId(k)]));
  const ctx = Object.fromEntries(Object.entries(cv).map(([k,v]) => [k,v.getContext("2d",{alpha:false})]));
  const cells = {world:[],context:[],readout:[],phys:[]};
  let model=null,paused=true,loading=false,generation=0;
  const clamp = (v,l=0,h=1) => Math.max(l,Math.min(h,v));
  const mix = (a,b,v) => Math.round(a+(b-a)*clamp(v));
  const color = (v) => {
    const neutral=[46,58,73];
    const target=v>=0?[193,99,83]:[75,156,188];
    const a=clamp(Math.abs(v));
    return "rgb("+neutral.map((x,i)=>mix(x,target[i],a)).join(",")+")";
  };
  const physiologyColor = (a,v) => {
    const amp=clamp(a/1.02),wake=clamp(v/0.50);
    return "rgb("+Math.round(clamp((24+218*amp+62*wake)/255)*255)+","+
      Math.round(clamp((32+136*amp+26*wake)/255)*255)+","+
      Math.round(clamp((49+27*amp+154*wake)/255)*255)+")";
  };
  const paint = (name,values,convert) => {
    const c=cv[name],g=ctx[name],w=model.width,h=model.height;
    const cellW=c.width/w,cellH=c.height/h;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=model.index(x,y);
      g.fillStyle=convert(values[i],i);
      g.fillRect(x*cellW,y*cellH,Math.ceil(cellW),Math.ceil(cellH));
    }
    // Dashed line is the true, externally supplied boundary.
    g.beginPath();
    g.setLineDash([5,5]);g.strokeStyle="rgba(242,247,255,.48)";
    g.lineWidth=1.1;g.moveTo(c.width/2,0);g.lineTo(c.width/2,c.height);
    g.stroke();g.setLineDash([]);
  };
  const render = () => {
    if(!model)return;
    const truth=new Float32Array(model.n),belief=new Float32Array(model.n);
    const available=new Float32Array(model.n),activator=new Float32Array(model.n);
    for(let i=0;i<model.n;i++){
      truth[i]=model.trueRule(i%model.width);
      belief[i]=Math.tanh(model.phi[i]);
      available[i]=model.readoutAt(i);
      activator[i]=model.u[i];
    }
    paint("world",truth,color);
    paint("context",belief,color);
    paint("readout",available,color);
    paint("phys",activator,(a,i)=>physiologyColor(a,model.v[i]));
    const s=model.stats();
    byId("ticks").textContent=s.tick;
    byId("ctxAcc").textContent=(s.contextAccuracy*100).toFixed(1)+"%";
    byId("readErr").textContent=s.readoutMSE.toFixed(3);
    byId("injury").textContent=s.injury.toFixed(3);
  };
  const note=s=>{byId("status").textContent=s;};
  function warmup(){
    loading=true;paused=true;const gen=++generation;
    model=new window.TuftSheetSolCore({
      seed:20261117,samplesPerTick:Number(byId("senses").value),
      coupling:Number(byId("coupling").value)
    });
    byId("play").disabled=true;byId("reset").disabled=true;byId("seed").disabled=true;
    note("Warming up the learned context: 0 / 650 ticks…");
    const work=()=>{
      if(gen!==generation)return;
      for(let k=0;k<20&&model.tick<650;k++)model.advance();
      if(model.tick<650){
        note("Warming up the learned context: "+model.tick+" / 650 ticks…");
        requestAnimationFrame(work);
      } else {
        loading=false;
        byId("play").disabled=false;byId("reset").disabled=false;byId("seed").disabled=false;
        byId("play").textContent="▶ Run";
        note("Ready · No physiological event seeded. Try Senses = 0, then Seed physical wave.");
        render();
      }
    };
    requestAnimationFrame(work);
  }
  byId("play").addEventListener("click",()=>{
    if(loading)return;
    paused=!paused;
    byId("play").textContent=paused?"▶ Run":"Ⅱ Pause";
    note(paused?"Paused.":"Running. Click the excitation panel to seed a physical wave.");
  });
  byId("reset").addEventListener("click",warmup);
  byId("seed").addEventListener("click",()=>{
    if(loading)return;
    model.seedDisturbance(Math.floor(model.width*.25),Math.floor(model.height*.50));
    note("Physical event seeded. The external rules and stored context were not reset.");
    render();
  });
  byId("flipLeft").addEventListener("click",()=>{
    if(loading)return;model.flip("left");note("Left-world rule changed without a cue; observe contextual re-learning.");render();
  });
  byId("flipRight").addEventListener("click",()=>{
    if(loading)return;model.flip("right");note("Right-world rule changed without a cue; observe contextual re-learning.");render();
  });
  byId("senses").addEventListener("input",e=>{
    const n=Number(e.target.value);
    byId("sensesVal").textContent=n+"/tick";
    if(model)model.samplesPerTick=n;
  });
  byId("coupling").addEventListener("input",e=>{
    const n=Number(e.target.value);
    byId("couplingVal").textContent=n.toFixed(1);
    if(model)model.coupling=n;
    if(!loading)render();
  });
  byId("speed").addEventListener("input",e=>{byId("speedVal").textContent=e.target.value+"×";});
  cv.phys.addEventListener("click",e=>{
    if(loading||!model)return;
    const r=cv.phys.getBoundingClientRect();
    const x=Math.floor((e.clientX-r.left)/r.width*model.width);
    const y=Math.floor((e.clientY-r.top)/r.height*model.height);
    model.seedDisturbance(clamp(x,0,model.width-1),clamp(y,0,model.height-1));
    note("Physical event seeded at ("+x+", "+y+"). No external event was added.");
    render();
  });
  setInterval(()=>{
    if(!model||paused||loading)return;
    const speed=Number(byId("speed").value);
    for(let k=0;k<speed;k++)model.advance();
    render();
  },75);
  warmup();
})();
