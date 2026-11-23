import { landingSections } from './model/content';

export function ProcessSection() {
  const section = landingSections.process;

  return (
    <section
      id="process"
      className="section-shell"
      aria-labelledby="process-title"
    >
      <div className="section-heading">
        <p className="eyebrow">{section.eyebrow}</p>
        <h2 id="process-title">{section.title}</h2>
        <p>{section.description}</p>
      </div>
      <ol className="process-grid">
        {section.steps.map((step, index) => (
          <li key={step}>
            <span className="step-number">0{index + 1}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
