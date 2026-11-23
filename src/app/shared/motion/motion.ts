/** True when the reader asked the OS for less motion. Checked live, so changing the setting applies at once. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True for a mouse or trackpad: hover-only effects (tilt, spotlight) are skipped on touch screens. */
export function hasFinePointer(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Runs `fn` at most once per animation frame with the latest arguments. */
export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void): ((...args: A) => void) & { cancel(): void } {
  let frame = 0;
  let last: A;
  const run = (...args: A) => {
    last = args;
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      fn(...last);
    });
  };
  run.cancel = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  return run;
}
