// Fire an activation callback for keyboard users (Enter / Space) on a
// role="button" element.
export function activateOnKey(e, fn) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}
