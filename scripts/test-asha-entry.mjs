import assert from 'node:assert/strict';
import { START, apply, cashTier, reputationLabel, CALCULATION_VERSION } from '../app/js/engine.js';
// Durable check for Asha entry compat shim — keeps portal's CALCULATION_VERSION
// while allowing the 10-15 min phone-first stall game to run via START/apply.
assert.equal(CALCULATION_VERSION, 2, 'portal CALCULATION_VERSION must remain 2');
assert.equal(typeof START.cash, 'number');
assert.equal(START.cash, 45000);
assert.equal(cashTier(10000),'low'); assert.equal(cashTier(20000),'mid'); assert.equal(cashTier(60000),'high');
assert.equal(reputationLabel(30),'needs care'); assert.equal(reputationLabel(60),'good'); assert.equal(reputationLabel(90),'loved');
let s = {...START};
s = apply(s, {cash:4000, reputation:4});
assert.equal(s.cash, 49000);
assert.equal(s.reputation,66);
s = apply(s, {cash:-100000}); assert.equal(s.cash,0,'clamp cash low');
s = apply(s, {reputation:100}); assert.equal(s.reputation,100,'clamp rep high');
s = apply(s, {stock:10}); assert.equal(s.stock,4,'clamp stock high');
s = apply(s, {stock:-10}); assert.equal(s.stock,0,'clamp stock low');
// No composite score — completion is gate
assert.equal(typeof START.stock, 'number');
console.log('asha entry compat: ok');
