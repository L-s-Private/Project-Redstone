import { SITE } from '../site.js';
import { Discord } from './Discord.js';

// 問い合わせ先。メールアドレスを決めるまでは Discord に案内する（site.js の contactEmail）
export function Contact() {
  return SITE.contactEmail ? <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> : <Discord>Discord</Discord>;
}
