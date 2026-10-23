import { SITE } from '../site.js';
import { Todo } from './Todo.js';

// Discord への招待リンク。button を付けるとボタンの形になる
export function Discord({ children = 'Discord に参加する', button = false }) {
  if (!SITE.discordUrl) return <Todo>Discord の招待リンク</Todo>;
  return <a href={SITE.discordUrl} className={button ? 'button button-discord' : undefined} target="_blank" rel="noreferrer">{children}</a>;
}
