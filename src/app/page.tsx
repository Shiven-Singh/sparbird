import { isLive } from "@/lib/calle";
import { loadAllPersonas } from "@/lib/persona";

export const dynamic = "force-dynamic";

export default function Home() {
  const personas = loadAllPersonas();
  const live = isLive();

  return (
    <main>
      <h1>Sparbird</h1>
      <p>
        Rehearse the call before the real one. Pick who you are about to face. Your phone rings,
        they push back, and the scorecard quotes the moment it turned.
      </p>

      <span className="mode">
        <span className={live ? "dot live" : "dot"} />
        {live
          ? "Live mode: a drill will ring your own number after you confirm"
          : "Dry run: drills replay recorded calls, nothing is dialled"}
      </span>

      <h2>Who you can practise against</h2>
      <div className="grid">
        {personas.map((persona) => (
          <article className="card" key={persona.id}>
            <h3>{persona.display_name}</h3>
            <div className="who">{persona.audience ?? "practice persona"}</div>
            <p className="sum">{persona.summary}</p>
            <ul className="rubric">
              {persona.rubric.map((item) => (
                <li key={item.id}>
                  {item.id} · {item.weight}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <h2>Run one</h2>
      <p>
        From the terminal: <code>pnpm drill {personas[0]?.id ?? "persona-id"}</code>. Add{" "}
        <code>--show-task</code> to read exactly what the persona will be told before anything is
        dialled.
      </p>

      <footer>
        Sparbird dials one number: the one in OWNER_E164. Every call opens by saying it is a
        simulation. Scores are reported as items with evidence, never as a bare percentage.
      </footer>
    </main>
  );
}
