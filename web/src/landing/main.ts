import '@fontsource-variable/fraunces';
import '@fontsource-variable/hanken-grotesk';
import '../styles/landing.css';

// The landing page is static HTML. This file only adds two touches, and loads no Firebase code.

// 1. Hairline under the header once the page scrolls.
const header = document.querySelector('.site-header');
const onScroll = () => header?.classList.toggle('scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// 2. Play the worked example once it's on screen: options are ruled out one by one, then the
//    winner and the summary appear. Reduced-motion users get the final state immediately.
const demo = document.querySelector<HTMLElement>('.demo');
const outs = [...document.querySelectorAll<HTMLElement>('.demo-options [data-out]')];
const win = document.querySelector<HTMLElement>('.demo-options [data-win]');

function finalState() {
  outs.forEach((li) => li.classList.add('is-out'));
  win?.classList.add('is-win');
  demo?.classList.remove('is-playing');
}

if (demo && win) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    finalState();
  } else {
    demo.classList.add('is-playing');
    const io = new IntersectionObserver(
      (seen) => {
        if (!seen.some((e) => e.isIntersecting)) return;
        io.disconnect();
        outs.forEach((li, k) => setTimeout(() => li.classList.add('is-out'), 500 + k * 380));
        setTimeout(finalState, 500 + outs.length * 380 + 250);
      },
      { threshold: 0.5 },
    );
    io.observe(demo);
  }
}
