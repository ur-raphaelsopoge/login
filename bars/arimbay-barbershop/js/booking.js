(() => {
  const { $, $$, store, uid, toast, formatPeso, formatDate, formatTime, refreshLists } = App;
  const SLOT_TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  const state = { serviceId: '', barber: '', date: '', time: '' };
  let services = [];

  const localIso = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const findService = () => services.find((item) => item.id === state.serviceId);

  const isTaken = (time) => store.bookings().some((item) =>
    item.barber === state.barber && item.date === state.date && item.time === time && item.status !== 'Cancelled'
  );

  const isPast = (time) => {
    if (state.date !== localIso()) return false;
    const now = new Date();
    const current = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    return time <= current;
  };

  const renderSummary = () => {
    const service = findService();
    $('#sum-service').textContent = service ? service.name : 'Not selected';
    $('#sum-barber').textContent = state.barber || 'Not selected';
    $('#sum-date').textContent = state.date ? formatDate(state.date) : 'Not selected';
    $('#sum-time').textContent = state.time ? formatTime(state.time) : 'Not selected';
    $('#sum-duration').textContent = service ? `${service.duration} min` : '-';
    $('#sum-price').textContent = formatPeso(service ? service.price : 0);
  };

  const renderSlots = () => {
    const grid = $('#slot-grid');
    if (!state.barber || !state.date) {
      grid.innerHTML = '<p class="slots-hint">Pick a barber and a date to see open times.</p>';
      return;
    }
    if (state.time && (isTaken(state.time) || isPast(state.time))) state.time = '';

    grid.innerHTML = SLOT_TIMES.map((time) => {
      const disabled = isTaken(time) || isPast(time);
      const selected = state.time === time;
      return `<button type="button" class="slot${selected ? ' is-selected' : ''}" role="radio" aria-checked="${selected}" data-time="${time}"${disabled ? ' disabled' : ''}>${formatTime(time)}</button>`;
    }).join('');
    renderSummary();
  };

  const setService = (id) => {
    state.serviceId = id;
    $('#service-select').value = id;
    renderSummary();
  };

  const showError = (message) => { $('#booking-error').textContent = message || ''; };

  const resetForm = () => {
    state.serviceId = '';
    state.barber = '';
    state.date = '';
    state.time = '';
    $('#booking-form').reset();
    renderSlots();
    renderSummary();
  };

  const submit = (event) => {
    event.preventDefault();
    const session = store.session();
    if (!session || session.role !== 'user') return;

    const service = findService();
    if (!service) return showError('Choose a service.');
    if (!state.barber) return showError('Choose a barber.');
    if (!state.date) return showError('Pick a date.');
    if (!state.time) return showError('Pick an open time.');
    if (isTaken(state.time) || isPast(state.time)) { renderSlots(); return showError('That time is no longer available. Pick another.'); }
    showError('');

    const bookings = store.bookings();
    bookings.push({
      id: uid(),
      userId: session.id,
      clientName: session.name,
      clientEmail: session.email,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      duration: service.duration,
      barber: state.barber,
      date: state.date,
      time: state.time,
      status: 'Pending',
      createdAt: Date.now()
    });
    store.saveBookings(bookings);
    resetForm();
    refreshLists();
    toast('Request sent. The shop will confirm shortly.');
    $('#appointments').scrollIntoView();
  };

  const init = () => {
    services = $$('.service-card').map((card) => ({
      id: card.dataset.service,
      name: card.dataset.name,
      price: Number(card.dataset.price),
      duration: Number(card.dataset.duration)
    }));

    $('#service-select').innerHTML = '<option value="">Choose a service</option>' + services.map((item) =>
      `<option value="${item.id}">${item.name} - ${formatPeso(item.price)} (${item.duration} min)</option>`
    ).join('');

    const dateInput = $('#booking-date');
    dateInput.min = localIso();

    $('#service-select').addEventListener('change', (event) => setService(event.target.value));

    $$('input[name="barber"]').forEach((input) => input.addEventListener('change', () => {
      state.barber = input.value;
      state.time = '';
      renderSlots();
      renderSummary();
    }));

    dateInput.addEventListener('change', () => {
      state.date = dateInput.value && dateInput.value >= localIso() ? dateInput.value : '';
      if (dateInput.value && !state.date) { dateInput.value = ''; showError('Pick today or a future date.'); }
      else showError('');
      state.time = '';
      renderSlots();
      renderSummary();
    });

    $('#slot-grid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-time]');
      if (!button || button.disabled) return;
      state.time = button.dataset.time;
      showError('');
      renderSlots();
    });

    $$('[data-book]').forEach((button) => button.addEventListener('click', () => {
      setService(button.closest('.service-card').dataset.service);
      $('#booking').scrollIntoView();
    }));

    $('#booking-form').addEventListener('submit', submit);
    document.addEventListener('app:bookings-changed', renderSlots);
    document.addEventListener('app:view', () => { dateInput.min = localIso(); });

    renderSlots();
    renderSummary();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
