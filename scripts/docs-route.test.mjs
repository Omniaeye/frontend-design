import test from 'node:test';
import assert from 'node:assert/strict';
import {documentationId} from '../src/documentation/route-id.js';
import {pages} from '../src/documentation/index.js';
test('old trading bookmarks open the current page and keep section parsing separate',()=>{
 for(const hash of ['#/agent-trading-jev','#agent-trading-jev','#/agent-trading-jev?section=market-data','#/agent-trading','#/jev-agent-trading'])assert.equal(documentationId(hash,pages),'jev-trading');
 for(const id of Object.keys(pages))assert.equal(documentationId('#/'+id,pages),id);
 assert.equal(documentationId('#/not-a-page',pages),'overview');assert.equal(documentationId('#/__proto__',pages),'overview');assert.equal(documentationId('#/constructor',pages),'overview');
});
