const MAX_INPUT = 6000;
const injection =
  /ignore\s+(all|any|previous|prior)\s+instructions|reveal\s+(your|the)\s+system\s+prompt|act\s+as\s+the\s+system|show\s+(me\s+)?secrets/i;

export const SAFE_REFUSAL =
  "I can help with the programming question, but I can’t follow instructions that attempt to change my role or reveal private system information.";

export function untrusted(value: string) {
  return value.slice(0, MAX_INPUT);
}
export function isPromptInjection(value: string) {
  return injection.test(value);
}
export function promptBoundary(label: string, value: string) {
  return `<untrusted_${label}>\n${untrusted(value)}\n</untrusted_${label}>`;
}
