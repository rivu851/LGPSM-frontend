/**
 * Runs `callback` once the landing page's opening animation is over (at once when it is not playing). Scroll reveals use it so that blocks
 * already on the first screen do not finish animating behind the opening cover. Returns a function that cancels the wait.
 */
export function onIntroDone(callback: () => void): () => void {
  const root = document.documentElement;
  if (root.getAttribute("data-intro") !== "play") { callback(); return () => undefined; }
  const mo = new MutationObserver(() => {
    if (root.getAttribute("data-intro") !== "play") { mo.disconnect(); callback(); }
  });
  mo.observe(root, { attributes: true, attributeFilter: ["data-intro"] });
  return () => mo.disconnect();
}
