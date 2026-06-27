import MyceliumStage from "@/components/MyceliumStage";
import leftTrace from "@/data/left.json";
import rightTrace from "@/data/right.json";

type Ev = { kind: string; name?: string; ok?: boolean };
const tools = (t: { events: Ev[] }) =>
  t.events.filter((e) => e.kind === "tool").map((e) => e.name ?? "");
const fails = (t: { events: Ev[] }) =>
  t.events.filter((e) => e.kind === "result" && e.ok === false).length;

export default function Home() {
  const L = leftTrace as unknown as { title: string; task?: string; events: Ev[] };
  const R = rightTrace as unknown as { title: string; task?: string; events: Ev[] };

  return (
    <main>
      <section className="hero">
        <h1>Mycelium</h1>
        <p className="tagline">
          AIエージェントが問題を解く「思考の過程」を、育つ菌糸として観る実験。ツール呼び出しは糸を伸ばし、
          捨てられた手は<span style={{ color: "#c98a5c" }}>腐って枯れ</span>、答えにたどり着くと
          <span style={{ color: "#88f0b0" }}>発光して胞子が舞う</span>。
          左右は同じ課題に挑む2つの思考スタイルのレース。
        </p>
      </section>

      <div className="stagewrap">
        <MyceliumStage />
      </div>

      <div className="legend">
        <span><b>糸が伸びる</b> ＝ ツール呼び出し・推論</span>
        <span className="rot"><b className="rot">茶色く腐る</b> ＝ 諦めた手・行き止まり</span>
        <span className="bloom"><b className="bloom">発光して開花</b> ＝ 解決</span>
        <span style={{ color: "#6b7686" }}>▶/❚❚・↺・スクラブで操作</span>
      </div>

      <section className="runs">
        <div className="runs-head">
          <span className="badge">● 本物のClaude Agent SDK実行を録画再生（公開後もLLMコスト $0）</span>
        </div>
        <p className="runs-task">
          課題：<code>3ファイルのモジュールから module-level global「count」を除去するリファクタ</code>
        </p>
        <div className="runrow">
          <div className="run">
            <h4 style={{ color: "#88f0b0" }}>{L.title}</h4>
            <div className="pills">
              {tools(L).map((t, i) => (
                <span className="pill" key={i}>{t.toLowerCase()}</span>
              ))}
            </div>
            <p className="runmeta">{tools(L).length}手・つまずき{fails(L)}回</p>
          </div>
          <div className="run">
            <h4 style={{ color: "#8fc6ff" }}>{R.title}</h4>
            <div className="pills">
              {tools(R).map((t, i) => (
                <span className="pill" key={i}>{t.toLowerCase()}</span>
              ))}
            </div>
            <p className="runmeta">{tools(R).length}手・つまずき{fails(R)}回</p>
          </div>
        </div>
      </section>

      <div className="about">
        <div className="card">
          <h3>これは何？</h3>
          <p>
            既存のエージェント可視化はDAGかトークン列。Myceliumは「間違いが腐る」＝
            エージェントが考えを変える様子を、生き物の生死として見せる初めての試み。
          </p>
        </div>
        <div className="card">
          <h3>どう動いてる？</h3>
          <p>
            Claude Agent SDK のツール使用ループ（読み込み・編集・やり直し・完了）を実際に録画し、
            菌糸の分岐・腐敗・開花にマッピング。手描きの演出ではなく実イベント駆動。
          </p>
        </div>
        <div className="card">
          <h3>なぜ2体？</h3>
          <p>
            同じ課題を別戦略で解く2エージェントのレース。慎重な計画型 vs 飛び込む実行型。
            実際に走らせたら——慎重型の方が一度つまずいた。
          </p>
        </div>
      </div>

      <p className="foot">
        Built on the Claude Agent SDK · recorded real runs ·{" "}
        <a href="https://github.com/akagifreeez/mycelium" target="_blank" rel="noreferrer">
          source on GitHub
        </a>
      </p>
    </main>
  );
}
