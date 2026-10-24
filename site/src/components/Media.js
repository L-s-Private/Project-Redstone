import { MEDIA } from '../media.js';
import { hasPublicFile } from '../publicFile.js';
import { LoopVideo } from './LoopVideo.js';

// 画像・動画の枠。ファイルがあればそれを出し、無ければ「何を入れるか」を書いた PH の枠を出す。
// id は src/media.js の MEDIA の名前。一覧に無いもの（妨害の写真など）は item で直接渡す
export function Media({ id, item: given, alt = '', className = '' }) {
  const item = given ?? MEDIA[id];
  const style = { aspectRatio: item.ratio };
  if (hasPublicFile(item.file)) {
    if (item.file.endsWith('.mp4')) {
      const poster = hasPublicFile(item.poster) ? item.poster : undefined;
      return <LoopVideo className={`media ${className}`} style={style} src={item.file} poster={poster} aria-label={alt || item.label} />;
    }
    return <img className={`media ${className}`} style={style} src={item.file} alt={alt || item.label} loading="lazy" />;
  }
  return (
    <div className={`media media-ph ${className}`} style={style} role="img" aria-label={`ここに${item.label}が入ります`}>
      <b>PH：{item.label}</b>
      <span>{item.spec}</span>
    </div>
  );
}
