import { landingSections } from './model/content';

export function FaqSection() {
  const section = landingSections.faq;

  return (
    <section
      id="faq"
      className="section-shell faq-section"
      aria-labelledby="faq-title"
    >
      <div className="section-heading">
        <p className="eyebrow">{section.eyebrow}</p>
        <h2 id="faq-title">{section.title}</h2>
        <p>{section.description}</p>
      </div>
      <div className="faq-list">
        {section.items.map((item) => (
          <details key={item.question}>
            <summary>
              <span>{item.question}</span>
              <span aria-hidden="true">+</span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
