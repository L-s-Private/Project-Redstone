// まだ決まっていないところの印。公開前にすべて消す（src/site.js を埋めるか、文を直す）
export function Todo({ children }) {
  return <mark className="todo">未定：{children}</mark>;
}
