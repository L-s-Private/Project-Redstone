// 節の境目。下へ行くほど地面を掘り進む（草 → 土 → 石 → 深い層 → 岩盤）。上の節の背景の上に、カクカクの縁と「深さ」の帯を出す
const EDGES = {
  grass: 'M0 24V12h100V4h140v8h180V0h120v12h220V4h160v12h120V6h160v18z',
  dirt: 'M0 24V8h160V0h120v12h200V4h140v8h180V0h160v10h240v14z',
  stone: 'M0 24V10h140V2h160v10h160V0h200v8h160v8h180V4h200v20z',
  deep: 'M0 24V6h120v8h200V0h160v10h140V2h200v12h180V6h200v18z',
  bedrock: 'M0 24V8h180V0h140v12h160V4h200v8h120V0h220v10h180v14z',
};

export function Strata({ layer, above, depth, label }) {
  return (
    <div className={`strata strata-${layer}`} data-above={above}>
      <svg viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true"><path d={EDGES[layer]} /></svg>
      {label && <div className="strata-label"><div className="container">深さ {depth} ／ {label}</div></div>}
    </div>
  );
}
