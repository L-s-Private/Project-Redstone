import { SITE } from '../site.js';
import { Todo } from './Todo.js';

export function Contact() {
  return SITE.contactEmail ? <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> : <Todo>メールアドレス</Todo>;
}
