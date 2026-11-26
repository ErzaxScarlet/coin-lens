import test from 'node:test';
import assert from 'node:assert/strict';
import {isAddress,bestPair,concentration} from '../research.mjs';
test('validates address syntax',()=>{assert.equal(isAddress('So11111111111111111111111111111111111111112'),true);assert.equal(isAddress('https://example.com'),false);assert.equal(isAddress('0'.repeat(44)),false);});
test('chooses only requested base mint on Solana and most liquid pool',()=>{const p=(chainId,address,usd)=>({chainId,baseToken:{address},liquidity:{usd}});const best=p('solana','mint',20);assert.equal(bestPair([p('other','mint',99),p('solana','wrong',99),p('solana','mint',2),best],'mint'),best);assert.equal(bestPair([],'mint'),null);});
test('uses precise base-unit supply for percentages',()=>{assert.deepEqual(concentration([{address:'a',amount:'250000000000000000'}],{amount:'1000000000000000000'}),[{address:'a',percent:25}]);assert.equal(concentration(null,null),null);});
