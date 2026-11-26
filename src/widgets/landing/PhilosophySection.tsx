import { landingSections } from './model/content';

export function PhilosophySection() {
  const section = landingSections.philosophy;

  return (
    <section
      id="philosophy"
      className="section-shell split-section"
      aria-labelledby="philosophy-title"
    >
      <div>
        <p className="eyebrow">{section.eyebrow}</p>
        <h2 id="philosophy-title">{section.title}</h2>
      </div>
      <p className="section-lead">{section.description}</p>
    </section>
  );
}
