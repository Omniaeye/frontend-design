import {deliveryPages} from './delivery.js';
import {updatePages} from './updates.js';
import {workspacePages} from './workspace.js';
import {presetPages} from './presets.js';
import {sourcePages} from './sources.js';
import {researchPages} from './research.js';
import {accountPages} from './account.js';
import {helpPages} from './help.js';
import {customSourcePages} from './custom-sources.js';
import {holderPages} from './holders.js';
export const pages={...holderPages,...deliveryPages,...updatePages,...workspacePages,...presetPages,...sourcePages,...researchPages,...accountPages,...helpPages,...customSourcePages};
for (const id of ['trackers','reddit','youtube','github','following','settings','windows-alerts','archive']) {
  pages[id]={...pages[id],body:pages[id].body+'<div class="doc-related"><a href="#/custom-sources">Custom sources &amp; source changes →</a></div>'};
}
export const groups=[
{label:'Start here',pages:['overview','product-tour','whats-new']},
{label:'Workspace',pages:['my-feed','live-feed','workspaces','windows-alerts','preset-ranking','tokens','sounds']},
{label:'Presets and filters',pages:['presets','musebook','preset-library','recipes','keyword-rules','search-fields','people-topics','robinhood-coverage','preset-token-links','preset-limits']},
{label:'Sources',pages:['trackers','custom-sources','source-changes','event-types','x','reddit','youtube','website','github','instagram','truthsocial']},
{label:'Research',pages:['companies','company-pages','archive','following','source-records','time-and-evidence','deduplication']},
{label:'Alerts & Integrations',pages:['integrations','discord','telegram-custom','panel-delivery','delivery-status','telegram']},
{label:'Holders',pages:['holders','developer-api','access']},
{label:'Account',pages:['settings']},
{label:'JEV',pages:['jev','jev-news','jev-trading','jev-pipeline','jev-research']},
{label:'Coming next',pages:['roadmap']},
{label:'Help',pages:['troubleshooting','faq','glossary']}];
export const order=groups.flatMap(g=>g.pages);
const plain=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
const index=order.map(id=>({id,title:pages[id].title.toLowerCase(),lead:pages[id].lead.toLowerCase(),text:plain(pages[id].body).toLowerCase()}));
export function searchPages(query){const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return index.filter(x=>terms.every(t=>`${x.title} ${x.lead} ${x.text}`.includes(t))).map(x=>({...x,score:terms.reduce((n,t)=>n+(x.title.includes(t)?5:0)+(x.lead.includes(t)?2:0),0)})).sort((a,b)=>b.score-a.score).slice(0,10).map(x=>x.id);}
