import { ThemeToggle } from '../../features/theme-toggle/ThemeToggle';

const navigation = [
  ['철학', '#philosophy'],
  ['방식', '#process'],
  ['작업', '#portfolio'],
  ['FAQ', '#faq'],
] as const;

export function LandingHeader() {
  return (
    <header className="landing-header" role="banner">
      <a
        className="landing-logo"
        href="#top"
        aria-label="Connecting Space 처음으로"
      >
        Connecting Space
      </a>
      <nav aria-label="주요 메뉴" className="landing-nav">
        {navigation.map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
        <ThemeToggle />
        <a className="button button-small" href="#inquiry">
          견적 요청
        </a>
      </nav>
    </header>
  );
}
