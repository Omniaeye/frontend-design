const imageSizes={"workspace": [2545, 1380], "panel-controls": [2545, 1380], "feed-views": [2545, 1380], "workspaces": [2545, 1380], "preset-library": [2545, 1380], "keyword-rules": [2545, 1380], "tokens": [2545, 1380], "companies": [2545, 1380], "following": [2545, 1380], "archive": [2545, 1380], "panel-settings": [2545, 1380]};
const imageCrops={"workspace": [415, 192, 2128, 1188], "panel-controls": [1131, 503, 695, 111], "feed-views": [415, 192, 2128, 108], "workspaces": [415, 380, 1455, 205], "preset-library": [80, 473, 972, 775], "keyword-rules": [85, 339, 965, 886], "tokens": [1847, 503, 696, 661], "companies": [411, 190, 1240, 1070], "following": [411, 190, 2132, 1070], "archive": [612, 348, 1320, 996], "panel-settings": [45, 59, 2498, 1321]};
export const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const p = text => `<p>${text}</p>`;
export const section = (id,title,body) => `<section aria-labelledby="${id}"><h2 id="${id}">${title}</h2>${body}</section>`;
export const steps = items => `<ol class="doc-steps">${items.map(text=>`<li><div>${text}</div></li>`).join('')}</ol>`;
export const table = (head,rows) => `<div class="doc-table-wrap" tabindex="0" aria-label="Scrollable comparison table"><table class="doc-table"><thead><tr>${head.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const shot = (name,alt) => {
 const [iw,ih]=imageSizes[name], [x,y,w,h]=imageCrops[name]||[0,0,iw,ih];
 return `<figure class="doc-shot"><a href="/assets/docs/${name}-hd.jpg" data-doc-image aria-label="Enlarge: ${escape(alt)}"><span class="doc-shot-frame" style="width:${name==='panel-controls'?w/1.5:w/2}px;--shot-native-width:${w}px;aspect-ratio:${w}/${h}"><img src="/assets/docs/${name}-hd.jpg" alt="${escape(alt)}" loading="lazy" decoding="async" width="${iw}" height="${ih}" style="width:${iw/w*100}%;transform:translate(-${x/iw*100}%,-${y/ih*100}%)"></span></a></figure>`;
};
export const links = items => `<div class="doc-related">${items.map(([id,title])=>`<a href="#/${id}">${title} <span aria-hidden="true">→</span></a>`).join('')}</div>`;
export const page = (title,lead,body,extra={}) => ({title,lead,body,updated:'2026-09-21',...extra});
