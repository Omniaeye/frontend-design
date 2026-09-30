import './theme.css';
import './brand.css';

// OMNIA Signal is the custom wordmark lettering, not a body-text font.
export const brandMarkup = `<span class="omnia-brand" role="img" aria-label="OMNIA EYE"><span class="omnia-brand-eye" aria-hidden="true"><img class="brand-eye-open" src="/assets/eye-master.png" alt=""><img class="brand-eye-half" src="/assets/eye-blink-half.png" alt=""><img class="brand-eye-closed" src="/assets/eye-blink-closed.png" alt=""></span><img class="omnia-brand-word" src="/assets/eye/omnia-signal.svg?v=2" alt="" aria-hidden="true"></span>`;
export function mountBrands(){document.querySelectorAll('[data-omnia-brand]').forEach(node=>{node.innerHTML=brandMarkup;});}
