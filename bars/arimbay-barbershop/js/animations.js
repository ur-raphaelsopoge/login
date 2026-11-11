(() => {
  const { $, $$ } = App;

  const initReveal = () => {
    const targets = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    targets.forEach((el, index) => { el.style.transitionDelay = `${(index % 3) * 90}ms`; });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    targets.forEach((el) => observer.observe(el));
  };

  const initNavScroll = () => {
    const navs = ['#nav', '#public-nav'].map((selector) => $(selector)).filter(Boolean);
    const update = () => navs.forEach((nav) => nav.classList.toggle('is-scrolled', window.scrollY > 40));
    window.addEventListener('scroll', update, { passive: true });
    update();
  };

  const initActiveLinks = () => {
    if (!('IntersectionObserver' in window)) return;
    const navSections = [
      { links: '#nav-links', sections: ['home', 'services', 'booking', 'appointments'] },
      { links: '#public-nav-links', sections: ['public-home', 'public-about', 'public-services', 'public-hairstylist'] }
    ];
    navSections.forEach(({ links: linksSelector, sections: sectionIds }) => {
      const links = $$(linksSelector + ' a');
      const sections = sectionIds.map((id) => document.getElementById(id));
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((section) => observer.observe(section));
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initNavScroll();
    initActiveLinks();
  });
})();
