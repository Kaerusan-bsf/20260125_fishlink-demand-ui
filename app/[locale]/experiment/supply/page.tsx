import Link from 'next/link';

export default function ExperimentSupplyPage({params}: {params: {locale: string}}) {
  return (
    <main>
      <div className="section-title">
        <h2>Supply model (農家出品)</h2>
        <span className="badge">Experiment / UI test only</span>
      </div>

      <div className="card">
        <p>
          This route is a UI-only experiment for the two-way model. It keeps the current farmer listing flow and links
          back to the existing listings page.
        </p>
        <Link href={`/${params.locale}/listings`}>
          <button type="button">Go to existing listings</button>
        </Link>
      </div>
    </main>
  );
}
