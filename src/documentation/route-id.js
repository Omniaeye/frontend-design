const aliases=Object.freeze({'agent-trading-jev':'jev-trading','agent-trading':'jev-trading','jev-agent-trading':'jev-trading'});
export function documentationId(hash,pages){const raw=String(hash??'').replace(/^#\/?/,'').split('?')[0],id=aliases[raw]??raw;return Object.hasOwn(pages,id)?id:'overview';}
