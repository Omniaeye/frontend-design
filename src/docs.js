import {documentationId} from './documentation/route-id.js';
import {mountBrands} from './brand.js';
mountBrands();
import {pages,groups,order,searchPages} from './documentation/index.js';
import './documentation/jev.css';
import {mountJevInteractions} from './documentation/jev-interactions.js';
const label = id => pages[id]?.title || id;
const navigation=document.getElementById('docs-navigation'),article=document.getElementById('docs-article'),outline=document.getElementById('docs-outline-links');
const sidebar=document.querySelector('.docs-sidebar'),menu=document.querySelector('.docs-menu'),search=document.querySelector('.docs-search'),searchInput=document.getElementById('docs-search-input'),searchResults=document.getElementById('docs-search-results');

navigation.innerHTML=groups.map(group=>`<details class="docs-nav-group" name="docs-category"><summary>${group.label}<span>${group.pages.length}</span></summary><div>${group.pages.map(id=>`<a href="#/${id}" data-page="${id}">${label(id)}</a>`).join('')}</div></details>`).join('');

function currentId(){return documentationId(location.hash,pages);}
function outlineFor(){const headings=[...article.querySelectorAll('h2[id],h3[id]')];outline.innerHTML=headings.map(heading=>`<a href="#/${currentId()}?section=${encodeURIComponent(heading.id)}">${heading.textContent}</a>`).join('');}
function render(focus=false){
  const id=currentId(),page=pages[id],index=order.indexOf(id),previous=order[index-1],next=order[index+1];
  article.dataset.theme=page.theme||'default';
  const body=page.body;document.title=`${page.title} — OMNIA EYE Docs`;
  article.innerHTML=`<header class="doc-hero"><div class="doc-eyebrow">OMNIA DOCUMENTATION <span>/</span> ${groups.find(g=>g.pages.includes(id))?.label||''}</div><h1>${page.title}</h1><p class="doc-lead">${page.lead}</p></header>${body}<nav class="doc-pagination" aria-label="Documentation pages">${previous?`<a href="#/${previous}"><span>Previous</span><strong>← ${label(previous)}</strong></a>`:'<span></span>'}${next?`<a href="#/${next}"><span>Next</span><strong>${label(next)} →</strong></a>`:''}</nav><p class="doc-reviewed">Reviewed ${page.updated}</p>`;
  navigation.querySelectorAll('[data-page]').forEach(link=>{link.classList.toggle('active',link.dataset.page===id);if(link.dataset.page===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  navigation.querySelectorAll('details').forEach(group=>{group.open=!!group.querySelector(`[data-page="${id}"]`);});
  mountJevInteractions(article);
  outlineFor();sidebar.classList.remove('open');menu.setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:'instant'});if(focus)article.focus({preventScroll:true});const section=new URLSearchParams(location.hash.split('?')[1]||'').get('section');if(section)document.getElementById(section)?.scrollIntoView({block:'start'});

}

function openSearch(){if(!search.open)search.showModal();searchInput.value='';updateSearch('');requestAnimationFrame(()=>searchInput.focus());}
function closeSearch(){if(search.open)search.close();}
function updateSearch(query){
  const results=searchPages(query).map(id=>({id,page:pages[id]}));
  searchResults.innerHTML=results.length?results.map(({id,page})=>`<button class="search-result" type="button" data-result="${id}"><strong>${page.title}</strong><span>${page.lead}</span></button>`).join(''):'<div class="search-empty">No documentation page matches this search.</div>';
  searchResults.querySelectorAll('[data-result]').forEach(button=>button.addEventListener('click',()=>{location.hash=`#/${button.dataset.result}`;closeSearch();}));
}

window.addEventListener('hashchange',()=>render(true));
document.querySelector('.docs-search-trigger').addEventListener('click',openSearch);
document.querySelector('.docs-search-head button').addEventListener('click',closeSearch);
searchInput.addEventListener('input',event=>updateSearch(event.target.value));
search.addEventListener('click',event=>{if(event.target===search)closeSearch();});
menu.addEventListener('click',()=>{const open=sidebar.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch();}if(event.key==='Escape'&&sidebar.classList.contains('open')){sidebar.classList.remove('open');menu.setAttribute('aria-expanded','false');}});
render();

const viewer=document.createElement('dialog');
viewer.className='doc-image-viewer';viewer.setAttribute('aria-label','Image preview');
viewer.innerHTML='<button type="button" aria-label="Close image preview">Close</button><div class="doc-image-content"></div>';
document.body.append(viewer);
viewer.querySelector('button').addEventListener('click',()=>viewer.close());
viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close();});
article.addEventListener('click',e=>{const link=e.target.closest('[data-doc-image]');if(!link)return;e.preventDefault();const frame=link.querySelector('.doc-shot-frame').cloneNode(true);frame.querySelector('img').loading='eager';viewer.querySelector('.doc-image-content').replaceChildren(frame);viewer.showModal();});
search.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp'].includes(e.key))return;const buttons=[...searchResults.querySelectorAll('button')];if(!buttons.length)return;e.preventDefault();const current=buttons.indexOf(document.activeElement);buttons[(current+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();});

document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();article.focus();article.scrollIntoView();});
