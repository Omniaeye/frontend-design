import {page,p,section as s,table,links} from './helpers.js';
const updated={updated:'2026-09-25'};
export const holderPages={
holders:page('Holders','One workspace. Four levels of access.',
p('OMNIA connects news, social activity and onchain context in one workspace. <strong>100,000 $OMNIA</strong> is the foundation: the complete feed and every released website tool. Higher levels extend capacity, beta priority and developer access.')+
p('Holder access opens with the token launch. The developer API follows in a separate release.')+
s('levels','Choose your level',table(['Minimum holding','Workspace','Capacity & betas','Developer API'],[
['<strong>100,000 $OMNIA</strong>','All released tools','Standard capacity','—'],
['<strong>500,000 $OMNIA</strong>','All released tools','Higher limits · early betas','—'],
['<strong>1,000,000 $OMNIA</strong>','All released tools','Larger limits · earlier betas','Eligible'],
['<strong>5,000,000 $OMNIA</strong>','All released tools','Highest limits · first beta waves','Eligible']]))+
s('workspace','Build your perspective',p('Shape feeds around your companies, people and topics. Trace each signal to its source. Explore the archive, arrange your panels and send the right alerts to your channels. One connected workflow, built around the way you research.')+links([['my-feed','Your feed'],['presets','Your filters'],['archive','Your research'],['integrations','Your alerts']]))+
s('beta','More capacity. Earlier access.',p('The 500,000, 1,000,000 and 5,000,000 levels expand request allowances and beta priority. Each release publishes its quotas and access window. Stable website tools belong to every holder level.'))+
s('eligibility','Access follows your holding',p('Maintain the minimum verified balance for your level. Your holding determines your access and capacity.'))+
links([['developer-api','Developer API'],['access','Account and access'],['jev','JEV']]),updated),
'developer-api':page('Developer API','Your signals. Your applications.',
p('<strong>Coming soon.</strong> Developer access starts at <strong>1,000,000 $OMNIA</strong>. The 5,000,000 level adds greater request capacity.')+
s('build','Build beyond the workspace',p('Connect OMNIA to your own research tools, dashboards and workflows. The developer release brings personal API keys, scoped permissions, revocation and a usage dashboard.'))+
s('launch','One place to build',p('Authentication, endpoints, examples and usage limits will be published here with the developer release.'))+
links([['holders','Holder levels'],['roadmap','The vision']]),updated),
};
