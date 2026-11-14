const primary = "hsl(var(--primary))";
const primaryFg = "hsl(var(--primary-foreground))";
const card = "hsl(var(--card))";
const border = "hsl(var(--border))";
const success = "hsl(var(--success))";
const muted = "hsl(var(--muted-foreground))";

export function HeroIllustration() {
  return (
    <svg viewBox="0 0 480 176" width="100%" role="img" aria-label="Illustration: a document moves securely to your lender" className="block">
      <circle className="lp-drift" cx="58" cy="150" r="46" fill="hsl(var(--primary) / 0.08)" />
      <circle className="lp-drift" cx="436" cy="34" r="34" fill="hsl(var(--primary) / 0.1)" style={{ animationDelay: "-4s" }} />
      <g transform="rotate(-7 96 92)">
        <rect x="56" y="34" width="88" height="108" rx="10" fill={card} stroke={border} strokeWidth="1.5" />
      </g>
      <g className="lp-float" style={{ animationDelay: "-1.2s" }}>
        <rect x="72" y="28" width="88" height="112" rx="10" fill={card} stroke="hsl(var(--input) / 0.5)" strokeWidth="1.5" />
        <rect x="86" y="44" width="40" height="8" rx="4" fill={primary} />
        <rect x="86" y="62" width="60" height="6" rx="3" fill={border} />
        <rect x="86" y="76" width="50" height="6" rx="3" fill={border} />
        <rect x="86" y="90" width="60" height="6" rx="3" fill={border} />
        <rect x="86" y="104" width="34" height="6" rx="3" fill={border} />
        <circle className="lp-pop" cx="148" cy="124" r="12" fill={success} style={{ animationDelay: "0.9s" }} />
        <path d="m142 124 4 4 8-8" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path className="lp-flow" d="M172 88 H200" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
      <path className="lp-flow" d="M282 88 H330" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" style={{ animationDelay: "-0.6s" }} />
      <g className="lp-float">
        <g transform="translate(190 38) scale(4.2)">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill={primary} />
          <path d="m9 12 2 2 4-4" fill="none" stroke={primaryFg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <g className="lp-float" style={{ animationDelay: "-2.4s" }}>
        <rect x="340" y="28" width="76" height="120" rx="14" fill={card} stroke="hsl(var(--input) / 0.5)" strokeWidth="1.5" />
        <rect x="352" y="46" width="52" height="30" rx="6" fill="hsl(var(--primary-soft))" />
        <circle cx="378" cy="61" r="9" fill={success} />
        <path d="m374 61 3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="352" y="86" width="40" height="6" rx="3" fill={border} />
        <rect x="352" y="100" width="52" height="6" rx="3" fill={border} />
        <rect x="352" y="118" width="52" height="16" rx="8" fill={primary} />
      </g>
    </svg>
  );
}

export function VersionsIllustration() {
  return (
    <svg viewBox="0 0 400 136" width="100%" role="img" aria-label="Illustration: three saved versions of a profile, with the latest highlighted" className="block">
      <path className="lp-flow" d="M128 96 C 136 96, 142 92, 150 86" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" />
      <path className="lp-flow" d="M258 80 C 266 80, 272 74, 280 68" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" style={{ animationDelay: "-0.6s" }} />
      <g>
        <rect x="20" y="56" width="104" height="64" rx="10" fill={card} stroke={border} strokeWidth="1.5" />
        <text x="34" y="78" fill={muted} style={{ fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>v1</text>
        <rect x="34" y="88" width="72" height="6" rx="3" fill={border} />
        <rect x="34" y="102" width="48" height="6" rx="3" fill={border} />
      </g>
      <g className="lp-float" style={{ animationDelay: "-1s" }}>
        <rect x="150" y="38" width="104" height="82" rx="10" fill={card} stroke={border} strokeWidth="1.5" />
        <text x="164" y="60" fill={muted} style={{ fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>v2</text>
        <rect x="164" y="70" width="72" height="6" rx="3" fill={border} />
        <rect x="164" y="84" width="56" height="6" rx="3" fill={border} />
        <rect x="164" y="98" width="40" height="6" rx="3" fill="hsl(var(--primary) / 0.45)" />
      </g>
      <g className="lp-float" style={{ animationDelay: "-2.2s" }}>
        <rect x="280" y="16" width="104" height="104" rx="10" fill={primary} />
        <text x="294" y="38" fill={primaryFg} style={{ fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>v3</text>
        <rect x="294" y="48" width="72" height="6" rx="3" fill="hsl(var(--primary-foreground) / 0.45)" />
        <rect x="294" y="62" width="60" height="6" rx="3" fill="hsl(var(--primary-foreground) / 0.45)" />
        <rect x="294" y="76" width="44" height="6" rx="3" fill="hsl(var(--primary-foreground) / 0.45)" />
        <rect x="294" y="94" width="44" height="14" rx="7" fill={primaryFg} />
        <circle className="lp-pop" cx="372" cy="28" r="9" fill={success} style={{ animationDelay: "0.4s" }} />
        <path d="m368 28 3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function ShareIllustration() {
  return (
    <svg viewBox="0 0 400 136" width="100%" role="img" aria-label="Illustration: a document shared through a private link that expires, opened by your lender" className="block">
      <g className="lp-float" style={{ animationDelay: "-1.4s" }}>
        <rect x="22" y="26" width="72" height="92" rx="10" fill={card} stroke="hsl(var(--input) / 0.5)" strokeWidth="1.5" />
        <rect x="34" y="40" width="32" height="7" rx="3.5" fill={primary} />
        <rect x="34" y="58" width="48" height="6" rx="3" fill={border} />
        <rect x="34" y="72" width="40" height="6" rx="3" fill={border} />
        <rect x="34" y="86" width="48" height="6" rx="3" fill={border} />
      </g>
      <path className="lp-flow" d="M100 72 H136" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
      <g>
        <rect x="142" y="50" width="120" height="44" rx="22" fill={card} stroke="hsl(var(--input) / 0.5)" strokeWidth="1.5" />
        <g transform="translate(156 61)">
          <rect x="0" y="9" width="18" height="12" rx="3" fill={primary} />
          <path d="M4 9V6a5 5 0 0 1 10 0v3" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="190" cy="72" r="3.2" fill={primary} />
        <circle cx="202" cy="72" r="3.2" fill={primary} />
        <circle cx="214" cy="72" r="3.2" fill={primary} />
        <circle cx="226" cy="72" r="3.2" fill="hsl(var(--primary) / 0.35)" />
        <circle cx="238" cy="72" r="3.2" fill="hsl(var(--primary) / 0.35)" />
      </g>
      <g>
        <circle cx="262" cy="46" r="15" fill={card} stroke={border} strokeWidth="3" />
        <circle className="lp-ring" cx="262" cy="46" r="15" pathLength={100} transform="rotate(-90 262 46)" fill="none" stroke={primary} strokeWidth="3" strokeLinecap="round" />
        <path d="M262 38v8l5 3" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path className="lp-flow" d="M268 72 H306" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" style={{ animationDelay: "-0.6s" }} />
      <g className="lp-float" style={{ animationDelay: "-2.6s" }}>
        <circle cx="338" cy="72" r="30" fill={card} stroke="hsl(var(--input) / 0.5)" strokeWidth="1.5" />
        <circle cx="338" cy="64" r="9" fill={primary} />
        <path d="M320 90a18 15 0 0 1 36 0" fill={primary} />
        <circle className="lp-pop" cx="360" cy="48" r="9" fill={success} style={{ animationDelay: "0.5s" }} />
        <path d="m356 48 3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function FaqIllustration() {
  return (
    <svg viewBox="0 0 300 160" width="100%" role="img" aria-label="Illustration: a question answered in a chat" className="block">
      <circle className="lp-drift" cx="40" cy="132" r="26" fill="hsl(var(--primary) / 0.1)" />
      <g className="lp-float">
        <rect x="16" y="14" width="156" height="74" rx="18" fill={card} stroke="hsl(var(--input) / 0.5)" strokeWidth="1.5" />
        <path d="M44 88 L36 106 L64 88" fill={card} stroke="hsl(var(--input) / 0.5)" strokeWidth="1.5" strokeLinejoin="round" />
        <text x="94" y="68" textAnchor="middle" fill={primary} style={{ fontSize: 44, fontWeight: 650, fontFamily: "Inter, sans-serif" }}>?</text>
      </g>
      <g className="lp-float" style={{ animationDelay: "-2.5s" }}>
        <rect x="118" y="84" width="160" height="62" rx="18" fill={primary} />
        <path d="M252 146 L262 160 L238 146" fill={primary} />
        <rect x="138" y="102" width="92" height="6" rx="3" fill="hsl(var(--primary-foreground) / 0.55)" />
        <rect x="138" y="116" width="64" height="6" rx="3" fill="hsl(var(--primary-foreground) / 0.55)" />
        <circle className="lp-pop" cx="254" cy="112" r="11" fill={primaryFg} />
        <path d="m249 112 4 4 7-8" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
