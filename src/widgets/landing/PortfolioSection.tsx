import { landingSections } from './model/content';

export function PortfolioSection() {
  const section = landingSections.portfolio;

  return (
    <section
      id="portfolio"
      className="section-shell"
      aria-labelledby="portfolio-title"
    >
      <div className="section-heading section-heading-row">
        <div>
          <p className="eyebrow">{section.eyebrow}</p>
          <h2 id="portfolio-title">{section.title}</h2>
        </div>
        <p>{section.notice}</p>
      </div>
      <div className="portfolio-grid">
        {section.cards.map((card, index) => (
          <article
            className={`portfolio-card portfolio-card-${index + 1}`}
            key={card.name}
          >
            <div className="portfolio-card-art" aria-hidden="true">
              <span>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <p className="card-kicker">{card.type}</p>
            <h3>{card.name}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}
