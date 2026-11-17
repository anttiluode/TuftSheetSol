"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Model = require("../model.js");

const train = (seed=17) => {
  const m = new Model({width:40,height:20,seed,samplesPerTick:32});
  for(let i=0;i<650;i++)m.advance();
  return m;
};
const mseDiff=(a,b)=>Math.abs(a-b);

test("undisturbed physiological field remains quiescent",()=>{
  const m=train();
  assert.equal(m.stats().excitation,0);
  assert.equal(m.stats().injury,0);
  assert.equal(m.stats().contextMSE,m.stats().readoutMSE);
});

test("local shared context retains opposing hidden rules in two areas",()=>{
  const m=train(17);
  const s=m.stats();
  assert.ok(s.contextAccuracy>0.95,JSON.stringify(s));
  assert.ok(s.contextMSE<0.25,JSON.stringify(s));
  assert.equal(m.trueRule(2),1);
  assert.equal(m.trueRule(32),-1);
});

test("a seeded excitability disturbance spreads beyond its insertion patch",()=>{
  const m=train(17);
  m.samplesPerTick=0;
  m.seedDisturbance(9,10,2);
  for(let t=0;t<45;t++)m.advance();
  let distant=false;
  for(let y=0;y<m.height;y++)for(let x=0;x<m.width;x++){
    if(Math.hypot(x-9,y-10)>13 && m.u[m.index(x,y)]>0.18)distant=true;
  }
  assert.ok(distant,"excitation front must propagate >13 grid sites");
});

test("readout fails transiently while stored prediction is causally unchanged",()=>{
  const m=train(17),uncoupled=train(17),sham=train(17);
  uncoupled.coupling=0;
  for(const x of [m,uncoupled,sham])x.samplesPerTick=0;
  m.seedDisturbance(9,10,2);
  uncoupled.seedDisturbance(9,10,2);
  for(let t=0;t<50;t++){
    m.advance();uncoupled.advance();sham.advance();
  }
  const a=m.stats(),b=uncoupled.stats(),c=sham.stats();
  assert.ok(mseDiff(a.contextMSE,b.contextMSE)<1e-12);
  assert.ok(mseDiff(b.readoutMSE,b.contextMSE)<1e-12);
  assert.ok(a.readoutMSE>b.readoutMSE+0.1,
    "a travelling physical fault must impair readout");
  assert.ok(mseDiff(c.contextMSE,c.readoutMSE)<1e-12);
  assert.equal(m.leftRule,sham.leftRule);
  assert.equal(m.rightRule,sham.rightRule);
});

test("readout can recover when physical excitation/recovery subside",()=>{
  const m=train(17),sham=train(17);
  m.samplesPerTick=sham.samplesPerTick=0;
  m.seedDisturbance(9,10,2);
  for(let t=0;t<160;t++){m.advance();sham.advance();}
  assert.ok(m.stats().readoutMSE<sham.stats().readoutMSE+0.08);
});
