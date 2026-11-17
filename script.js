// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Navbar: background on scroll
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuBtn.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', false);
  })
);

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObserver.observe(el));

// Active nav link highlight
const sections = document.querySelectorAll('main section[id]');
const linkMap = {};
navLinks.querySelectorAll('a').forEach(a => (linkMap[a.getAttribute('href').slice(1)] = a));
const spy = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      Object.values(linkMap).forEach(l => l.classList.remove('active'));
      const link = linkMap[entry.target.id];
      if (link) link.classList.add('active');
    }
  });
}, { rootMargin: '-50% 0px -50% 0px' });
sections.forEach(s => spy.observe(s));

// Count-up stat
const counter = document.querySelector('[data-count]');
if (counter) {
  const target = +counter.dataset.count;
  const countObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    let n = 0;
    const timer = setInterval(() => {
      n++;
      counter.textContent = n + (n === target ? '+' : '');
      if (n >= target) clearInterval(timer);
    }, 80);
    countObserver.disconnect();
  }, { threshold: 0.6 });
  countObserver.observe(counter);
}

// Contact form -> Web3Forms (message is emailed to the owner)
// 1. Go to https://web3forms.com, enter anshportfolio007@gmail.com
// 2. Copy the Access Key they email you and paste it below
const WEB3FORMS_KEY = 'PASTE_YOUR_ACCESS_KEY_HERE';
const OWNER_EMAIL = 'anshportfolio007@gmail.com'; // fallback if the service is unreachable

const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = 'form-status ' + (type || '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();

  if (!name || !email || !message) {
    setStatus('Please fill in all fields.', 'error');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus('Please enter a valid email address.', 'error');
    return;
  }
  if (form.botcheck.checked) return; // bot detected, silently ignore

  if (WEB3FORMS_KEY === 'PASTE_YOUR_ACCESS_KEY_HERE') {
    setStatus('Form is not set up yet: add your Web3Forms access key in script.js.', 'error');
    return;
  }

  submitBtn.disabled = true;
  setStatus('Sending...', 'sending');

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: 'New portfolio message from ' + name,
        from_name: 'Portfolio Website',
        name,
        email,
        message,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setStatus('Thanks, ' + name + '! Your message was sent.', 'success');
      form.reset();
    } else {
      throw new Error(data.message || 'Request failed');
    }
  } catch (err) {
    setStatus('Could not send. Please email me at ' + OWNER_EMAIL + ' instead.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});
