import { InquiryForm } from '../../features/inquiry-form/InquiryForm';

export function InquiryCtaSection() {
  return (
    <section
      id="inquiry"
      className="inquiry-section section-shell"
      aria-labelledby="inquiry-title"
    >
      <p className="eyebrow">다음 장면을 함께 설계해 보세요.</p>
      <h2 id="inquiry-title">좋은 웹사이트는 좋은 질문에서 시작됩니다.</h2>
      <p>
        문의 내용을 남겨주시면 확인 후 선택한 연락 방법으로 상담 안내를
        드립니다.
      </p>
      <a className="button" href="#inquiry-form">
        상담 시작하기 <span aria-hidden="true">↗</span>
      </a>
      <div id="inquiry-form" className="inquiry-form-shell">
        <InquiryForm />
      </div>
    </section>
  );
}
