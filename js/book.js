// Shared JS for book.html (live-availability booking flow), used
// identically by the EN, ES, and PL versions.
//
// Set `window.TVIC_LANG = 'es'` or `'pl'` in an inline <script> BEFORE
// this file loads to localize alerts, day/date formatting, and the
// add-on service chip labels. Defaults to 'en' if unset.
//
// Line-item descriptions sent to tv-ops (buildLineItems) stay in
// English regardless of site language — they land on Lance's own
// English-language admin dashboard, not in front of the customer.

(function () {
    var LANG = window.TVIC_LANG || 'en';

    var STRINGS = {
        en: {
            locale: 'en-US',
            addressRequired: 'Please enter your address.',
            addressNotFound: "Couldn't find that address — please check it and try again.",
            looking: 'Looking…',
            findTimes: 'Find Available Times',
            checkingAvailability: 'Checking availability…',
            suggestedTag: '★ Suggested',
            unavailableTag: 'Unavailable',
            addonsTotal: function (total) { return 'Estimated total: $' + total; },
            nameAndPhoneRequired: 'Name and phone are required.',
            pillarLeadNotice: 'Pillar mounts are hand-made and need at least a week of lead time — please go back and pick a date at least 7 days out.',
            booking: 'Booking…',
            confirmBooking: 'Confirm Booking',
            bookingFailed: 'Something went wrong submitting your booking — please call or text us directly.',
            confirmSummary: function (dateStr, timeStr, address) { return dateStr + ' at ' + timeStr + ' — ' + address; },
            services: {
                'Fixed Mount': 'Fixed Mount',
                'Tilting Mount': 'Tilting Mount',
                'Full Motion Mount (37"–80")': 'Full Motion Mount (37"–80")',
                'Mantle Mount': 'Mantle Mount (from $350)',
                'Pillar Mount': 'Pillar Mount (hand-made, 1 week lead time)',
                'External Cable Strip': 'External Cable Strip',
                'In-Wall Concealment': 'In-Wall Concealment',
                'Electrical Outlet Install': 'Electrical Outlet Install',
                'Soundbar Mounting': 'Soundbar Mounting'
            }
        },
        es: {
            locale: 'es-US',
            addressRequired: 'Por favor ingresa tu dirección.',
            addressNotFound: 'No pudimos encontrar esa dirección — por favor verifícala e intenta de nuevo.',
            looking: 'Buscando…',
            findTimes: 'Buscar Horarios Disponibles',
            checkingAvailability: 'Verificando disponibilidad…',
            suggestedTag: '★ Sugerido',
            unavailableTag: 'No disponible',
            addonsTotal: function (total) { return 'Total estimado: $' + total; },
            nameAndPhoneRequired: 'El nombre y el teléfono son obligatorios.',
            pillarLeadNotice: 'Los montajes en columna son hechos a mano y necesitan al menos una semana de anticipación — por favor regresa y elige una fecha con al menos 7 días de anticipación.',
            booking: 'Reservando…',
            confirmBooking: 'Confirmar Reserva',
            bookingFailed: 'Algo salió mal al enviar tu reserva — por favor llámanos o envíanos un mensaje directamente.',
            confirmSummary: function (dateStr, timeStr, address) { return dateStr + ' a las ' + timeStr + ' — ' + address; },
            services: {
                'Fixed Mount': 'Soporte Fijo',
                'Tilting Mount': 'Soporte Inclinable',
                'Full Motion Mount (37"–80")': 'Soporte de Movimiento Completo (37"–80")',
                'Mantle Mount': 'Montaje en Repisa (desde $350)',
                'Pillar Mount': 'Montaje en Columna (hecho a mano, 1 semana de espera)',
                'External Cable Strip': 'Canaleta Externa',
                'In-Wall Concealment': 'Ocultación en la Pared',
                'Electrical Outlet Install': 'Instalación de Toma Eléctrica',
                'Soundbar Mounting': 'Montaje de Barra de Sonido'
            }
        },
        pl: {
            locale: 'pl-PL',
            addressRequired: 'Podaj proszę swój adres.',
            addressNotFound: 'Nie mogliśmy znaleźć tego adresu — sprawdź go i spróbuj ponownie.',
            looking: 'Szukanie…',
            findTimes: 'Znajdź Dostępne Terminy',
            checkingAvailability: 'Sprawdzanie dostępności…',
            suggestedTag: '★ Sugerowane',
            unavailableTag: 'Niedostępne',
            addonsTotal: function (total) { return 'Szacowana suma: $' + total; },
            nameAndPhoneRequired: 'Imię i numer telefonu są wymagane.',
            pillarLeadNotice: 'Montaże kolumnowe są wykonywane ręcznie i wymagają co najmniej tygodnia wyprzedzenia — wróć i wybierz datę co najmniej 7 dni od teraz.',
            booking: 'Rezerwowanie…',
            confirmBooking: 'Potwierdź Rezerwację',
            bookingFailed: 'Coś poszło nie tak podczas wysyłania rezerwacji — zadzwoń lub napisz do nas bezpośrednio.',
            confirmSummary: function (dateStr, timeStr, address) { return dateStr + ' o ' + timeStr + ' — ' + address; },
            services: {
                'Fixed Mount': 'Uchwyt Stały',
                'Tilting Mount': 'Uchwyt Uchylny',
                'Full Motion Mount (37"–80")': 'Uchwyt w Pełni Ruchomy (37"–80")',
                'Mantle Mount': 'Montaż Kominkowy (od $350)',
                'Pillar Mount': 'Montaż Kolumnowy (ręcznie wykonany, 1 tydzień oczekiwania)',
                'External Cable Strip': 'Zewnętrzna Listwa',
                'In-Wall Concealment': 'Ukrycie w Ścianie',
                'Electrical Outlet Install': 'Instalacja Gniazdka Elektrycznego',
                'Soundbar Mounting': 'Montaż Soundbara'
            }
        }
    };

    var S = STRINGS[LANG] || STRINGS.en;

    const OPS_API = 'https://tv-ops-public-api.tvinstallchicago.workers.dev';
    const BASE_PRICE = 100; // flat TV mounting rate, always included

    // Canonical English keys — used for both the backend line-item
    // descriptions (always English, see file header) and as lookup
    // keys into S.services for the customer-facing chip label.
    const SERVICES = [
        { label: 'Fixed Mount', price: 50 },
        { label: 'Tilting Mount', price: 50 },
        { label: 'Full Motion Mount (37"–80")', price: 100 },
        { label: 'Mantle Mount', price: 350 },
        { label: 'Pillar Mount', price: 200 },
        { label: 'External Cable Strip', price: 35 },
        { label: 'In-Wall Concealment', price: 60 },
        { label: 'Electrical Outlet Install', price: 250 },
        { label: 'Soundbar Mounting', price: 60 },
    ];

    // Pillar mounts are hand-made by Lance -- earliest bookable date shifts
    // out a week whenever one is selected, enforced purely client-side by
    // filtering the date picker (no backend availability change needed).
    const PILLAR_MOUNT_LEAD_DAYS = 7;
    function hasPillarMount() {
        return selectedServices.has('Pillar Mount');
    }

    function buildLineItems() {
        const lineItems = [{ description: 'TV Mounting', price: BASE_PRICE }];
        for (const label of selectedServices) {
            const svc = SERVICES.find((s) => s.label === label);
            if (svc) lineItems.push({ description: svc.label, price: svc.price });
        }
        return lineItems;
    }

    function updatePriceSummary() {
        const total = buildLineItems().reduce((sum, li) => sum + li.price, 0);
        $('#priceSummary').textContent = S.addonsTotal(total);
    }

    let selectedAddress = '';
    let selectedLat = null;
    let selectedLng = null;
    let selectedDate = null;
    let selectedTime = null;
    let selectedServices = new Set();
    let daysData = [];

    const $ = (sel) => document.querySelector(sel);

    // ---------- Address autocomplete ----------
    let suggestDebounce = null;
    let suggestionPicked = false;

    $('#addressInput').addEventListener('input', () => {
        suggestionPicked = false;
        const query = $('#addressInput').value.trim();
        clearTimeout(suggestDebounce);

        if (query.length < 3) {
            $('#addressSuggestions').classList.add('hidden');
            return;
        }

        suggestDebounce = setTimeout(async () => {
            try {
                const res = await fetch(`${OPS_API}/suggest?q=${encodeURIComponent(query)}`);
                const suggestions = await res.json();
                renderSuggestions(suggestions);
            } catch (err) {
                $('#addressSuggestions').classList.add('hidden');
            }
        }, 300);
    });

    function renderSuggestions(suggestions) {
        const box = $('#addressSuggestions');
        if (!suggestions || !suggestions.length) {
            box.classList.add('hidden');
            return;
        }

        box.innerHTML = suggestions.map((s, i) => `
    <div class="suggestion-row" data-idx="${i}" style="padding:10px 14px; font-size:13px; cursor:pointer; border-bottom:1px solid rgba(245,240,232,0.08);">
      ${s.placeName}
    </div>
  `).join('');
        box.classList.remove('hidden');

        box.querySelectorAll('.suggestion-row').forEach((row) => {
            row.addEventListener('mouseenter', () => { row.style.background = 'rgba(200,169,74,0.1)'; });
            row.addEventListener('mouseleave', () => { row.style.background = ''; });
            row.addEventListener('click', () => {
                const s = suggestions[Number(row.dataset.idx)];
                $('#addressInput').value = s.placeName;
                selectedAddress = s.placeName;
                selectedLat = s.lat;
                selectedLng = s.lng;
                suggestionPicked = true;
                box.classList.add('hidden');
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (!$('#addressSuggestions').contains(e.target) && e.target !== $('#addressInput')) {
            $('#addressSuggestions').classList.add('hidden');
        }
    });

    // ---------- Step 1: Address ----------
    $('#findTimesBtn').addEventListener('click', async () => {
        const address = $('#addressInput').value.trim();
        $('#addressError').classList.add('hidden');

        if (!address) {
            $('#addressError').textContent = S.addressRequired;
            $('#addressError').classList.remove('hidden');
            return;
        }

        $('#findTimesBtn').disabled = true;
        $('#findTimesBtn').textContent = S.looking;

        try {
            // If they picked a suggestion, we already have exact coordinates —
            // no need to geocode again.
            if (!suggestionPicked || selectedAddress !== address) {
                const geoRes = await fetch(`${OPS_API}/geocode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({ address }),
                });
                if (!geoRes.ok) throw new Error('geocode-failed');
                const geo = await geoRes.json();

                selectedAddress = geo.formattedAddress || address;
                selectedLat = geo.lat;
                selectedLng = geo.lng;
            }

            $('#step1').classList.add('hidden');
            $('#step2').classList.remove('hidden');
            await loadAvailability();
        } catch (err) {
            $('#addressError').textContent = S.addressNotFound;
            $('#addressError').classList.remove('hidden');
        } finally {
            $('#findTimesBtn').disabled = false;
            $('#findTimesBtn').textContent = S.findTimes;
        }
    });

    // ---------- Step 2: Days + slots ----------
    async function loadAvailability() {
        $('#loadingDays').classList.remove('hidden');
        $('#daysResults').classList.add('hidden');

        const res = await fetch(`${OPS_API}/availability?lat=${selectedLat}&lng=${selectedLng}`);
        daysData = await res.json();

        $('#loadingDays').classList.add('hidden');
        $('#daysResults').classList.remove('hidden');
        renderDays();
    }

    function renderDays() {
        const sorted = [...daysData].sort((a, b) => {
            if (a.suggested !== b.suggested) return a.suggested ? -1 : 1;
            return a.date.localeCompare(b.date);
        });

        $('#daysList').innerHTML = sorted.map((day) => {
            const d = new Date(day.date + 'T00:00:00');
            const label = d.toLocaleDateString(S.locale, { weekday: 'short', month: 'short', day: 'numeric' });
            const classes = ['day-card', 'rounded-lg', 'p-3', 'text-center'];
            if (!day.available) classes.push('unavailable');
            if (day.suggested && day.available) classes.push('suggested');
            if (selectedDate === day.date) classes.push('selected');

            return `
      <div class="${classes.join(' ')}" data-date="${day.available ? day.date : ''}">
        <div class="text-sm font-medium">${label}</div>
        ${day.suggested && day.available ? '<div class="text-[10px] mt-1" style="color:var(--gold);">' + S.suggestedTag + '</div>' : ''}
        ${!day.available ? '<div class="text-[10px] mt-1" style="color:rgba(245,240,232,0.4);">' + S.unavailableTag + '</div>' : ''}
      </div>
    `;
        }).join('');

        $('#daysList').querySelectorAll('.day-card[data-date]:not([data-date=""])').forEach((card) => {
            card.addEventListener('click', () => {
                selectedDate = card.dataset.date;
                selectedTime = null;
                renderDays();
                renderSlots();
            });
        });
    }

    function renderSlots() {
        const day = daysData.find((d) => d.date === selectedDate);
        if (!day) return;

        $('#slotsSection').classList.remove('hidden');
        $('#slotsList').innerHTML = day.openSlots.map((t) => {
            const isSelected = t === selectedTime;
            return `<button type="button" class="slot-btn rounded-md py-2 text-xs ${isSelected ? 'selected' : ''}" data-time="${t}">${formatTime(t)}</button>`;
        }).join('');

        $('#slotsList').querySelectorAll('.slot-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                selectedTime = btn.dataset.time;
                renderSlots();
                showStep3();
            });
        });

        $('#slotsSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function formatTime(t) {
        const [h, m] = t.split(':');
        const hour = ((+h + 11) % 12) + 1;
        const ampm = +h < 12 ? 'AM' : 'PM';
        return `${hour}:${m} ${ampm}`;
    }

    // ---------- Step 3: Contact details ----------
    function showStep3() {
        $('#step3').classList.remove('hidden');
        $('#step3').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    $('#serviceChips').innerHTML = SERVICES.map((s) => `
  <button type="button" class="service-chip btn-ghost rounded-full px-3 py-1.5 text-xs" data-service="${s.label}">${S.services[s.label] || s.label} +$${s.price}</button>
`).join('');
    updatePriceSummary();

    $('#serviceChips').querySelectorAll('.service-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const s = chip.dataset.service;
            if (selectedServices.has(s)) {
                selectedServices.delete(s);
                chip.style.background = '';
                chip.style.color = '';
                chip.style.borderColor = '';
            } else {
                selectedServices.add(s);
                chip.style.background = 'var(--gold)';
                chip.style.color = 'var(--ink)';
                chip.style.borderColor = 'var(--gold)';
            }
            updatePriceSummary();
        });
    });

    $('#backBtn').addEventListener('click', () => {
        $('#step3').classList.add('hidden');
        $('#step2').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('#bookBtn').addEventListener('click', async () => {
        const name = $('#custName').value.trim();
        const phone = $('#custPhone').value.trim();
        const email = $('#custEmail').value.trim();
        $('#bookError').classList.add('hidden');

        if (!name || !phone) {
            $('#bookError').textContent = S.nameAndPhoneRequired;
            $('#bookError').classList.remove('hidden');
            return;
        }

        if (hasPillarMount()) {
            const daysOut = Math.round((new Date(selectedDate + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000);
            if (daysOut < PILLAR_MOUNT_LEAD_DAYS) {
                $('#bookError').textContent = S.pillarLeadNotice;
                $('#bookError').classList.remove('hidden');
                return;
            }
        }

        $('#bookBtn').disabled = true;
        $('#bookBtn').textContent = S.booking;

        try {
            const lineItems = buildLineItems();
            const total = lineItems.reduce((sum, li) => sum + li.price, 0);

            const res = await fetch(`${OPS_API}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    customerName: name,
                    phone,
                    email,
                    address: selectedAddress,
                    date: selectedDate,
                    time: selectedTime,
                    serviceType: ['TV Mounting', ...selectedServices].join(', '),
                    price: total,
                    lineItems,
                    notes: $('#notesInput').value.trim(),
                    website: $('#custWebsite').value,
                    smsConsent: $('#smsConsent').checked,
                    language: LANG,
                }),
            });

            if (!res.ok) throw new Error('booking-failed');

            const d = new Date(selectedDate + 'T00:00:00');
            $('#confirmSummary').textContent = S.confirmSummary(
                d.toLocaleDateString(S.locale, { weekday: 'long', month: 'long', day: 'numeric' }),
                formatTime(selectedTime),
                selectedAddress
            );

            $('#step3').classList.add('hidden');
            $('#step4').classList.remove('hidden');
            $('#step4').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            $('#bookError').textContent = S.bookingFailed;
            $('#bookError').classList.remove('hidden');
        } finally {
            $('#bookBtn').disabled = false;
            $('#bookBtn').textContent = S.confirmBooking;
        }
    });
})();
