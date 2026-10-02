import {actions,trackers} from './jev-model.js';
import {escape} from './helpers.js';

// The examples are editorial data, not model outputs. No fetch, wallet or trading dependencies.
export function mountJevInteractions(root){
 const actionHost=root.querySelector('[data-jev-actions]');
 if(actionHost){
  const show=id=>{
   const a=actions.find(item=>item.id===id);if(!a)return;
   actionHost.querySelectorAll('[data-jev-action]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.jevAction===id)));
   const panel=actionHost.querySelector('[data-jev-action-detail]');
   panel.style.setProperty('--action-color',a.color);
   panel.innerHTML=`<div class="jev-action-title"><span>${a.label}</span><strong>${a.title}</strong></div><p>${a.detail}</p><dl><dt>INPUTS</dt><dd>${a.inputs}</dd><dt>NEXT STEP</dt><dd>${a.transition}</dd></dl>${a.id==='tp'?'<div class="jev-tp-stages" aria-label="Take-profit stages"><span>TP1</span><span>TP2</span><span>TP3</span><span>TP4</span><span>TP5</span></div>':''}`;
  };
  actionHost.addEventListener('click',event=>{const button=event.target.closest('[data-jev-action]');if(button)show(button.dataset.jevAction);});
  show('skip');
 }
 const sourceHost=root.querySelector('[data-jev-trackers]');
 if(sourceHost){
  const show=id=>{
   const t=trackers.find(item=>item.id===id);if(!t)return;
   sourceHost.querySelectorAll('[data-jev-source]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.jevSource===id)));
   sourceHost.querySelector('[data-jev-source-detail]').innerHTML=`<div class="jev-source-intro"><span>${escape(t.name)} / ENRICHMENT PATH</span><strong>${escape(t.event)}</strong></div><dl><dt>Source metadata</dt><dd>${escape(t.native)}</dd><dt>JEV analysis</dt><dd>${escape(t.extraction)}</dd><dt>Back to OMNIA</dt><dd>${escape(t.destination)}</dd></dl><p class="jev-source-example"><b>Example</b> ${escape(t.example)}</p>`;
  };
  sourceHost.addEventListener('click',event=>{const button=event.target.closest('[data-jev-source]');if(button)show(button.dataset.jevSource);});
  show('x');
 }
}
