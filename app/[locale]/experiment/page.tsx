import Link from 'next/link';

export default function ExperimentIndexPage({params}: {params: {locale: string}}) {
  return (
    <main>
      <div className="section-title">
        <h2>Two-way model experiment</h2>
        <span className="badge">Experiment / UI test only</span>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>農家出品 (Supply)</h3>
          <p className="muted">Existing listing flow with a lightweight experiment entry.</p>
          <Link href={`/${params.locale}/experiment/supply`}>
            <button type="button">Open Supply</button>
          </Link>
        </div>

        <div className="card">
          <h3>レストラン投稿 (Demand)</h3>
          <p className="muted">Client-side request to offer matching demo.</p>
          <Link href={`/${params.locale}/experiment/demand`}>
            <button type="button">Open Demand</button>
          </Link>
        </div>
      </div>
    </main>
  );
}
