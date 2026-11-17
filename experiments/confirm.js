"use strict";
/**
 * Exploratory 32-seed paired control, fixed before running this batch.
 * There is no training or calibration from confirmation outcomes.
 * Run: node experiments/confirm.js
 */
const Model=require("../model.js");
const fs=require("node:fs");
const SIZE=32, NTRAIN=650, NEVENT=160;
const fixedCriteria={
  contextSign:0.95, contextMSE:0.25, perturbationDeltaMSE:0.10,
  minFrontRadius:13, recoveryExcessMSE:0.08, required:28
};
function run(seed){
  const mk=(coupling=1)=>new Model({width:40,height:20,seed,samplesPerTick:32,coupling});
  const affected=mk(1),uncoupled=mk(0),sham=mk(1);
  for(let t=0;t<NTRAIN;t++){
    affected.advance();uncoupled.advance();sham.advance();
  }
  const before=affected.stats();
  // Observation blackout isolates physical READOUT from sensory relearning.
  affected.samplesPerTick=0;
  uncoupled.samplesPerTick=0;
  sham.samplesPerTick=0;
  affected.seedDisturbance(9,10,2);
  uncoupled.seedDisturbance(9,10,2);
  let snapshot=null,frontRadius=0;
  for(let t=0;t<NEVENT;t++){
    affected.advance();uncoupled.advance();sham.advance();
    if(t===49){
      snapshot={coupled:affected.stats(),uncoupled:uncoupled.stats(),sham:sham.stats()};
      for(let y=0;y<affected.height;y++)for(let x=0;x<affected.width;x++){
        if(affected.u[affected.index(x,y)]>0.18)
          frontRadius=Math.max(frontRadius,Math.hypot(x-9,y-10));
      }
    }
  }
  const after=affected.stats(),endSham=sham.stats();
  const outcome={
    seed,before,at50:snapshot,frontRadius,after,
    deltaReadoutMSE:snapshot.coupled.readoutMSE-snapshot.uncoupled.readoutMSE,
    contextDifference:Math.abs(snapshot.coupled.contextMSE-snapshot.uncoupled.contextMSE),
    recoveryExcessMSE:after.readoutMSE-endSham.readoutMSE
  };
  outcome.passes={
    context:before.contextAccuracy>fixedCriteria.contextSign&&before.contextMSE<fixedCriteria.contextMSE,
    disturbance:outcome.deltaReadoutMSE>fixedCriteria.perturbationDeltaMSE,
    spatial:outcome.frontRadius>fixedCriteria.minFrontRadius,
    decoupled:Math.abs(snapshot.uncoupled.readoutMSE-snapshot.uncoupled.contextMSE)<1e-12,
    unchangedContext:outcome.contextDifference<1e-12,
    recovery:outcome.recoveryExcessMSE<fixedCriteria.recoveryExcessMSE
  };
  return outcome;
}
const runs=Array.from({length:SIZE},(_,i)=>run(90001+i));
const keys=Object.keys(runs[0].passes);
const passed=Object.fromEntries(keys.map(k=>[k,runs.filter(r=>r.passes[k]).length]));
const summary={
  about:"Synthetic reaction-diffusion disruption of a local predictive field: NOT a biological CSD model",
  type:"Held-seed numerical confirmation under developer-chosen toy settings",
  pilot_seed:17, seeds:"90001..90032",
  nBodies:SIZE, trainingTicks:NTRAIN, blackoutTicks:NEVENT,
  criteria:fixedCriteria,passed,
  allCriteriaPass:keys.every(k=>passed[k]>=fixedCriteria.required),
  means:Object.fromEntries([
    ["contextAccuracy",r=>r.before.contextAccuracy],
    ["deltaReadoutMSE",r=>r.deltaReadoutMSE],
    ["frontRadius",r=>r.frontRadius],
    ["recoveryExcessMSE",r=>r.recoveryExcessMSE]
  ].map(([k,fun])=>[k,runs.reduce((s,r)=>s+fun(r),0)/runs.length])),
  perSeed:runs.map(({seed,before,frontRadius,deltaReadoutMSE,contextDifference,recoveryExcessMSE,passes})=>
    ({seed,contextAccuracy:before.contextAccuracy,frontRadius,deltaReadoutMSE,contextDifference,recoveryExcessMSE,passes}))
};
const dest=process.argv[2]??"";
if(dest)fs.writeFileSync(dest,JSON.stringify(summary,null,2)+"\n");
process.stdout.write(JSON.stringify(summary,null,2)+"\n");
if(!summary.allCriteriaPass)process.exitCode=1;
