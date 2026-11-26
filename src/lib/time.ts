/** Current time in ms. Server components call this only after a request-time API (cookies/connection). */
export function nowMs(): number {
  return Date.now();
}
