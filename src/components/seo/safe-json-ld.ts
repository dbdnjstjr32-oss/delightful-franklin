/**
 * Serialize a JSON-LD object for embedding inside a <script> tag.
 *
 * `JSON.stringify` alone does NOT prevent a `</script>` breakout — a value like
 * `</script><script>alert(1)</script>` would be emitted verbatim and execute.
 * Escaping `<`, `>`, `&`, and the JS line separators U+2028/U+2029 to their
 * unicode forms keeps the payload inert while remaining valid JSON.
 */
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g')
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g')

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEPARATOR, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR, '\\u2029')
}
