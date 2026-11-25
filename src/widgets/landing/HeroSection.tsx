export function HeroSection() {
  return (
    <section
      className="hero-section section-shell"
      aria-labelledby="hero-title"
    >
      <div className="hero-copy">
        <p className="eyebrow">Connecting Space</p>
        <h1 id="hero-title">브랜드와 고객을 연결하는 웹사이트</h1>
        <p className="hero-description">
          고객의 이야기를 이해하기 쉬운 웹 경험으로 정리합니다. 작은 브랜드의
          다음 장면을 함께 설계합니다.
        </p>
        <div className="hero-actions">
          <a className="button" href="#inquiry">
            견적 요청
          </a>
          <a className="text-link" href="#process">
            제작 방식 보기 <span aria-hidden="true">↘</span>
          </a>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="hero-orbit hero-orbit-one" />
        <span className="hero-orbit hero-orbit-two" />
        <span className="hero-orbit hero-orbit-three" />
        <span className="hero-core">CS</span>
      </div>
    </section>
  );
}
