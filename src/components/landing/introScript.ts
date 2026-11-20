// Shared by the landing page (server side), LandingIntro and the sign-in code (client side)
export const INTRO_DONE_KEY = "eqr_intro_done";

// Runs before the first paint: the opening animation plays every time the landing page is opened, until the visitor has signed up or logged
// in (see markIntroDone), and never for people who ask for reduced motion. Anything else leaves the overlay hidden.
export const INTRO_DECIDE_SCRIPT = `try{if(!localStorage.getItem("${INTRO_DONE_KEY}")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute("data-intro","play")}}catch(e){}`;

/** Called once someone has signed up or logged in: the landing page's opening animation is not shown again on this browser. */
export function markIntroDone(): void {
  try { localStorage.setItem(INTRO_DONE_KEY, "1"); } catch { /* storage unavailable: the opening may keep playing */ }
}
