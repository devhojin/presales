// JSON-LD XSS mitigation.
//
// JSON.stringify does not escape </script>, U+2028, U+2029, or other HTML
// breakout sequences. Injecting raw stringified JSON into a
// <script type="application/ld+json"> tag via dangerouslySetInnerHTML is
// therefore unsafe whenever any field can carry attacker-influenced data
// (RSS feeds, admin-entered titles, product descriptions, etc.).
//
// This helper escapes the characters that matter: <, >, &, and the two
// line/paragraph separators that terminate JavaScript string literals.
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
