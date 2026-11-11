const App = (() => {
  const KEYS = { users: 'arimbay_users', session: 'arimbay_session', bookings: 'arimbay_bookings' };
  const ADMIN = { id: 'admin-1', name: 'Shop Admin', email: 'admin@arimbay.com', password: 'admin123', role: 'admin' };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return false;
    }
    return true;
  };

  const store = {
    users: () => read(KEYS.users, []),
    saveUsers: (users) => write(KEYS.users, users),
    bookings: () => read(KEYS.bookings, []),
    saveBookings: (bookings) => write(KEYS.bookings, bookings),
    session: () => read(KEYS.session, null),
    setSession: (session) => {
      if (session) write(KEYS.session, session);
      else localStorage.removeItem(KEYS.session);
    }
  };

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));

  const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const formatPeso = (amount) => '₱' + Number(amount).toLocaleString('en-PH');

  const formatDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${suffix}`;
  };

  const statusBadge = (status) => `<span class="badge badge-${status.toLowerCase()}">${escapeHtml(status)}</span>`;

  let toastTimer;
  const toast = (message) => {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3200);
  };

  const confirmDialog = (title, text, yesLabel) => new Promise((resolve) => {
    const modal = $('#modal');
    const yes = $('#modal-yes');
    const no = $('#modal-no');
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    yes.textContent = yesLabel;
    modal.hidden = false;
    yes.focus();

    const finish = (result) => {
      modal.hidden = true;
      yes.removeEventListener('click', onYes);
      no.removeEventListener('click', onNo);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onYes = () => finish(true);
    const onNo = () => finish(false);
    const onBackdrop = (event) => { if (event.target === modal) finish(false); };
    const onKey = (event) => { if (event.key === 'Escape') finish(false); };

    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
  });

  const showView = (name) => {
    ['home', 'auth', 'app', 'admin'].forEach((view) => { $(`#view-${view}`).hidden = view !== name; });
  };

  const setError = (id, message) => {
    const el = $(`[data-error-for="${id}"]`);
    if (el) el.textContent = message || '';
  };

  const clearErrors = (form) => $$('.error', form).forEach((el) => { el.textContent = ''; });

  const switchTab = (tab) => {
    $$('.tab').forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $('#login-form').hidden = tab !== 'login';
    $('#register-form').hidden = tab !== 'register';
  };

  const ensureAdmin = () => {
    const users = store.users();
    if (!users.some((user) => user.role === 'admin')) {
      users.push(ADMIN);
      store.saveUsers(users);
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    clearErrors(form);
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    let valid = true;

    if (!email) { setError('login-email', 'Enter your email.'); valid = false; }
    if (!password) { setError('login-password', 'Enter your password.'); valid = false; }
    if (!valid) return;

    const user = store.users().find((item) => item.email === email && item.password === password);
    if (!user) {
      setError('login-password', 'Email or password is incorrect.');
      return;
    }
    store.setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    form.reset();
    route();
    toast(`Welcome back, ${user.name.split(' ')[0]}.`);
  };

  const handleRegister = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    clearErrors(form);
    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const confirm = form.confirm.value;
    let valid = true;

    if (name.length < 2) { setError('register-name', 'Enter your full name.'); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('register-email', 'Enter a valid email address.'); valid = false; }
    else if (store.users().some((user) => user.email === email)) { setError('register-email', 'This email is already registered. Log in instead.'); valid = false; }
    if (password.length < 6) { setError('register-password', 'Use at least 6 characters.'); valid = false; }
    if (confirm !== password) { setError('register-confirm', 'Passwords do not match.'); valid = false; }
    if (!valid) return;

    const user = { id: 'u' + uid(), name, email, password, role: 'user' };
    const users = store.users();
    users.push(user);
    store.saveUsers(users);
    store.setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    form.reset();
    route();
    toast('Account created. You are logged in.');
  };

  const logout = () => {
    store.setSession(null);
    route();
    window.scrollTo(0, 0);
  };

  const renderUserAppointments = () => {
    const session = store.session();
    const host = $('#user-appointments');
    if (!session || session.role !== 'user') return;

    const items = store.bookings()
      .filter((booking) => booking.userId === session.id)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    if (!items.length) {
      host.innerHTML = '<div class="empty"><h3>No appointments yet</h3><p>Choose a service and a time to book your first visit.</p><a class="btn btn-gold" href="#booking">Book a chair</a></div>';
      return;
    }

    const rows = items.map((item) => {
      const cancellable = item.status === 'Pending' || item.status === 'Approved';
      return `<tr>
        <td>${escapeHtml(item.serviceName)}<span class="cell-sub">${formatPeso(item.price)}</span></td>
        <td>${escapeHtml(item.barber)}</td>
        <td>${formatDate(item.date)}<span class="cell-sub">${formatTime(item.time)}</span></td>
        <td>${statusBadge(item.status)}</td>
        <td>${cancellable ? `<button class="btn btn-danger btn-sm" data-cancel="${item.id}">Cancel</button>` : ''}</td>
      </tr>`;
    }).join('');

    host.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Service</th><th>Barber</th><th>Date and time</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  };

  const updateStatus = (id, status) => {
    const bookings = store.bookings();
    const target = bookings.find((item) => item.id === id);
    if (!target) return;
    target.status = status;
    store.saveBookings(bookings);
    refreshLists();
  };

  const renderAdmin = () => {
    const session = store.session();
    if (!session || session.role !== 'admin') return;

    const all = store.bookings();
    const count = (status) => all.filter((item) => item.status === status).length;
    $('#admin-stats').innerHTML = [
      ['Total', all.length], ['Pending', count('Pending')], ['Approved', count('Approved')], ['Cancelled', count('Cancelled')]
    ].map(([label, value]) => `<div class="card stat"><strong>${value}</strong><span>${label}</span></div>`).join('');

    const filter = $('#admin-filter').value;
    const items = all
      .filter((item) => filter === 'all' || item.status === filter)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const host = $('#admin-table');
    if (!items.length) {
      host.innerHTML = '<div class="empty"><h3>No reservations to show</h3><p>New client bookings will appear here as soon as they are submitted.</p></div>';
      return;
    }

    const rows = items.map((item) => {
      const approve = item.status === 'Pending' ? `<button class="btn btn-ok btn-sm" data-approve="${item.id}">Approve</button>` : '';
      const cancelLabel = item.status === 'Pending' ? 'Reject' : 'Cancel';
      const cancel = item.status !== 'Cancelled' ? `<button class="btn btn-danger btn-sm" data-reject="${item.id}">${cancelLabel}</button>` : '';
      return `<tr>
        <td>${escapeHtml(item.clientName)}<span class="cell-sub">${escapeHtml(item.clientEmail)}</span></td>
        <td>${escapeHtml(item.serviceName)}<span class="cell-sub">${formatPeso(item.price)}</span></td>
        <td>${escapeHtml(item.barber)}</td>
        <td>${formatDate(item.date)}<span class="cell-sub">${formatTime(item.time)}</span></td>
        <td>${statusBadge(item.status)}</td>
        <td><div class="row-actions">${approve}${cancel}</div></td>
      </tr>`;
    }).join('');

    host.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Client</th><th>Service</th><th>Hairstylist</th><th>Date and time</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  };

  const refreshLists = () => {
    renderUserAppointments();
    renderAdmin();
    document.dispatchEvent(new CustomEvent('app:bookings-changed'));
  };

  const route = () => {
    const session = store.session();
    if (!session) {
      showView('home');
    } else if (session.role === 'admin') {
      $('#admin-user').textContent = session.name;
      showView('admin');
      renderAdmin();
    } else {
      $('#nav-user').textContent = session.name;
      showView('app');
      renderUserAppointments();
    }
    document.dispatchEvent(new CustomEvent('app:view', { detail: { session } }));
  };

  const closeMenu = (toggle, links) => {
    links.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const bindMenu = (toggleId, linksId) => {
    const toggle = $(`#${toggleId}`);
    const links = $(`#${linksId}`);
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(toggle, links);
    });
    return () => closeMenu(toggle, links);
  };

  const bindEvents = () => {
    $$('.tab').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    $('#login-form').addEventListener('submit', handleLogin);
    $('#register-form').addEventListener('submit', handleRegister);
    $$('[data-logout]').forEach((button) => button.addEventListener('click', logout));
    $('#admin-filter').addEventListener('change', renderAdmin);

    bindMenu('nav-toggle', 'nav-links');
    const closePublicMenu = bindMenu('public-nav-toggle', 'public-nav-links');
    $$('[data-show-auth]').forEach((button) => button.addEventListener('click', () => {
      closePublicMenu();
      clearErrors($('#login-form'));
      clearErrors($('#register-form'));
      switchTab(button.dataset.authTab || 'login');
      showView('auth');
      window.scrollTo(0, 0);
    }));
    $$('[data-back-home]').forEach((button) => button.addEventListener('click', () => {
      showView('home');
      window.scrollTo(0, 0);
    }));

    $('#user-appointments').addEventListener('click', async (event) => {
      const button = event.target.closest('[data-cancel]');
      if (!button) return;
      const ok = await confirmDialog('Cancel this appointment?', 'Your time slot will be released for other clients.', 'Cancel appointment');
      if (ok) { updateStatus(button.dataset.cancel, 'Cancelled'); toast('Appointment cancelled.'); }
    });

    $('#admin-table').addEventListener('click', async (event) => {
      const approve = event.target.closest('[data-approve]');
      const reject = event.target.closest('[data-reject]');
      if (approve) {
        updateStatus(approve.dataset.approve, 'Approved');
        toast('Reservation approved.');
      } else if (reject) {
        const ok = await confirmDialog('Cancel this reservation?', 'The client will see it as Cancelled and the time slot will open again.', 'Cancel reservation');
        if (ok) { updateStatus(reject.dataset.reject, 'Cancelled'); toast('Reservation cancelled.'); }
      }
    });

    let signature = JSON.stringify(store.bookings());
    const sync = () => {
      const next = JSON.stringify(store.bookings());
      if (next !== signature) { signature = next; refreshLists(); }
    };
    window.addEventListener('storage', sync);
    setInterval(sync, 3000);
  };

  const init = () => {
    ensureAdmin();
    bindEvents();
    route();
  };

  document.addEventListener('DOMContentLoaded', init);

  return { $, $$, store, escapeHtml, uid, formatPeso, formatDate, formatTime, toast, refreshLists };
})();
