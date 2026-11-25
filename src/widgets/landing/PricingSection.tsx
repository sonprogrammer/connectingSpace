import { landingSections } from './model/content';

export function PricingSection() {
  const section = landingSections.pricing;

  return (
    <section
      id="pricing"
      className="section-shell pricing-section"
      aria-labelledby="pricing-title"
    >
      <div className="section-heading">
        <p className="eyebrow">{section.eyebrow}</p>
        <h2 id="pricing-title">{section.title}</h2>
        <p>{section.description}</p>
      </div>
      <div className="pricing-grid">
        {section.items.map((item, index) => (
          <article className="pricing-card" key={item.title}>
            <span className="step-number">0{index + 1}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span className="provisional-label">상담 후 범위 확정</span>
          </article>
        ))}
      </div>
    </section>
  );
}
