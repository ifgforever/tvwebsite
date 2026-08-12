// Callback-request widget, shared by every page that discusses a
// specialty install (Frame TV recessed box, MantelMount, pillar mount).
//
// Drop <div class="callback-request" data-service="frame-tv"></div>
// anywhere and include this file once. Renders a "would you like us to
// reach out?" question with a button; the button expands into a
// name + phone mini-form. Localized from <html lang> (en/es/pl).
//
// Submits to the same Formspree form as bookings so all leads land in
// one inbox stream. This is a callback request, NOT a booking — no
// date is claimed, so it does not (and must not) touch the TV Ops
// booking gate. The `service` field and email subject stay English:
// they land on Lance's admin side, never in front of the customer.

(function () {
    var ENDPOINT = 'https://formspree.io/f/xeoyyygd';
    var PHONE_DISPLAY = '(630) 592-2982';

    var LANG = (document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
    if (LANG !== 'es' && LANG !== 'pl') LANG = 'en';

    // Always English — this is what the lead email says.
    var SERVICE_EN = {
        'frame-tv': 'Frame TV installation (recessed box)',
        'mantelmount': 'MantelMount installation',
        'mantel-pillar': 'MantelMount / pillar mount installation',
        'specialty': 'Specialty install (Frame TV / MantelMount / pillar mount)'
    };

    var STRINGS = {
        en: {
            ask: {
                'frame-tv': 'Would you like someone to reach out and set up your Frame TV installation?',
                'mantelmount': 'Would you like someone to reach out and set up your MantelMount installation?',
                'mantel-pillar': 'Would you like someone to reach out about a MantelMount or pillar mount install?',
                'specialty': 'Planning a Frame TV, MantelMount, or pillar mount install? We’ll reach out and set it up with you.'
            },
            open: 'Yes — have us reach out',
            namePh: 'Your name',
            phonePh: 'Phone number',
            send: 'Request my callback',
            sending: 'Sending…',
            note: 'We’ll call or text you from ' + PHONE_DISPLAY + ', usually the same day.',
            needBoth: 'Please enter your name and a phone number we can reach you at.',
            success: 'Got it — we’ll reach out shortly, usually the same day. Can’t wait? Call ' + PHONE_DISPLAY + '.',
            error: 'That didn’t go through. Please try again, or just call ' + PHONE_DISPLAY + '.'
        },
        es: {
            ask: {
                'frame-tv': '¿Quiere que le contactemos para organizar la instalación de su Frame TV?',
                'mantelmount': '¿Quiere que le contactemos para organizar su instalación de MantelMount?',
                'mantel-pillar': '¿Quiere que le contactemos sobre una instalación de MantelMount o montaje en columna?',
                'specialty': '¿Planea un Frame TV, un MantelMount o un montaje en columna? Le contactamos y lo organizamos juntos.'
            },
            open: 'Sí — contáctenme',
            namePh: 'Su nombre',
            phonePh: 'Número de teléfono',
            send: 'Solicitar llamada',
            sending: 'Enviando…',
            note: 'Le llamaremos o escribiremos desde el ' + PHONE_DISPLAY + ', normalmente el mismo día.',
            needBoth: 'Por favor escriba su nombre y un teléfono donde podamos contactarle.',
            success: 'Listo — le contactaremos pronto, normalmente el mismo día. ¿No puede esperar? Llame al ' + PHONE_DISPLAY + '.',
            error: 'No se pudo enviar. Intente de nuevo o llámenos al ' + PHONE_DISPLAY + '.'
        },
        pl: {
            ask: {
                'frame-tv': 'Chcesz, żebyśmy się odezwali i umówili montaż Twojego Frame TV?',
                'mantelmount': 'Chcesz, żebyśmy się odezwali i umówili montaż MantelMount?',
                'mantel-pillar': 'Chcesz, żebyśmy się odezwali w sprawie montażu MantelMount albo montażu kolumnowego?',
                'specialty': 'Planujesz Frame TV, MantelMount albo montaż kolumnowy? Odezwiemy się i wszystko umówimy.'
            },
            open: 'Tak — proszę o kontakt',
            namePh: 'Twoje imię',
            phonePh: 'Numer telefonu',
            send: 'Wyślij prośbę o kontakt',
            sending: 'Wysyłanie…',
            note: 'Zadzwonimy lub napiszemy z numeru ' + PHONE_DISPLAY + ', zwykle tego samego dnia.',
            needBoth: 'Podaj proszę imię i numer telefonu, pod którym Cię złapiemy.',
            success: 'Gotowe — odezwiemy się wkrótce, zwykle tego samego dnia. Nie chcesz czekać? Zadzwoń: ' + PHONE_DISPLAY + '.',
            error: 'Nie udało się wysłać. Spróbuj ponownie lub zadzwoń: ' + PHONE_DISPLAY + '.'
        }
    };

    var S = STRINGS[LANG];

    // One shared stylesheet. Fallback values mirror the site's existing
    // var(--x, fallback) convention so theme.js light/dark both work.
    function injectStyles() {
        if (document.getElementById('cbwStyles')) return;
        var css = '' +
            '.callback-request{margin-top:16px;}' +
            '.cbw-inner{background:rgba(var(--gold-rgb,200,169,74),0.07);border:1px solid rgba(var(--gold-rgb,200,169,74),0.25);border-radius:6px;padding:16px 18px;text-align:left;}' +
            '.cbw-ask{margin:0;color:var(--paper,#F5F0E8);font-size:15px;font-weight:600;line-height:1.55;}' +
            '.cbw-actions{margin-top:12px;}' +
            '.cbw-btn{display:inline-block;background:transparent;border:2px solid var(--gold,#C8A94A);color:var(--gold-text,#C8A94A);font-family:\'Bebas Neue\',sans-serif;font-size:17px;letter-spacing:0.08em;padding:11px 22px;border-radius:3px;cursor:pointer;}' +
            '.cbw-btn:hover{background:var(--gold,#C8A94A);color:var(--on-gold,#0A0A0A);}' +
            '.cbw-btn[disabled]{opacity:0.6;cursor:default;}' +
            '.cbw-form{display:none;flex-wrap:wrap;gap:10px;margin-top:12px;}' +
            '.cbw-form.cbw-openform{display:flex;}' +
            '.cbw-in{flex:1 1 180px;min-width:0;background:rgba(127,127,127,0.14);border:1px solid rgba(var(--gold-rgb,200,169,74),0.35);border-radius:4px;padding:12px 14px;color:var(--paper,#F5F0E8);font-size:16px;font-family:inherit;}' +
            '.cbw-in::placeholder{color:var(--slate-light,#6B7E94);}' +
            '.cbw-in:focus{outline:2px solid var(--gold,#C8A94A);outline-offset:1px;}' +
            '.cbw-submit{flex:1 0 auto;}' +
            '.cbw-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0;}' +
            '.cbw-note{display:none;margin:10px 0 0;font-size:12.5px;color:var(--slate-light,#6B7E94);line-height:1.5;}' +
            '.cbw-note.cbw-shownote{display:block;}' +
            '.cbw-msg{margin:12px 0 0;font-size:15px;font-weight:600;line-height:1.55;color:var(--gold-text,#C8A94A);}' +
            '.cbw-msg.cbw-err{color:var(--rust,#C0603F);}' +
            // The homepage price board is a paper-colored panel in both
            // themes, so text there must always be ink, not --paper.
            '.cbw-light .cbw-ask{color:var(--ink,#0A0A0A);}' +
            '.cbw-light .cbw-in{color:var(--ink,#0A0A0A);background:rgba(0,0,0,0.06);}' +
            '.cbw-light .cbw-in::placeholder{color:var(--slate,#3A4A5C);}' +
            '.cbw-light .cbw-btn{color:var(--gold-dim,#8C7736);border-color:var(--gold-dim,#8C7736);}' +
            '.cbw-light .cbw-btn:hover{background:var(--gold,#C8A94A);color:#0A0A0A;}' +
            '.cbw-light .cbw-msg{color:var(--gold-dim,#8C7736);}' +
            '.cbw-light .cbw-msg.cbw-err{color:var(--rust,#A8471F);}' +
            '.cbw-light .cbw-note{color:var(--slate,#3A4A5C);}';
        var tag = document.createElement('style');
        tag.id = 'cbwStyles';
        tag.textContent = css;
        document.head.appendChild(tag);
    }

    function digits(v) { return (v || '').replace(/\D/g, ''); }

    function buildWidget(root) {
        var key = root.getAttribute('data-service');
        if (!SERVICE_EN[key]) key = 'specialty';

        var inner = document.createElement('div');
        inner.className = 'cbw-inner';

        var ask = document.createElement('p');
        ask.className = 'cbw-ask';
        ask.textContent = S.ask[key];

        var actions = document.createElement('div');
        actions.className = 'cbw-actions';
        var openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'cbw-btn';
        openBtn.textContent = S.open;
        openBtn.setAttribute('aria-expanded', 'false');
        actions.appendChild(openBtn);

        var form = document.createElement('form');
        form.className = 'cbw-form';
        form.setAttribute('novalidate', '');

        var nameIn = document.createElement('input');
        nameIn.type = 'text';
        nameIn.className = 'cbw-in';
        nameIn.placeholder = S.namePh;
        nameIn.setAttribute('aria-label', S.namePh);
        nameIn.autocomplete = 'name';

        var phoneIn = document.createElement('input');
        phoneIn.type = 'tel';
        phoneIn.className = 'cbw-in';
        phoneIn.placeholder = S.phonePh;
        phoneIn.setAttribute('aria-label', S.phonePh);
        phoneIn.autocomplete = 'tel';

        // Formspree's reserved honeypot: submissions with it filled are
        // silently discarded server-side.
        var hp = document.createElement('input');
        hp.type = 'text';
        hp.name = '_gotcha';
        hp.className = 'cbw-hp';
        hp.tabIndex = -1;
        hp.autocomplete = 'off';
        hp.setAttribute('aria-hidden', 'true');

        var sendBtn = document.createElement('button');
        sendBtn.type = 'submit';
        sendBtn.className = 'cbw-btn cbw-submit';
        sendBtn.textContent = S.send;

        form.appendChild(nameIn);
        form.appendChild(phoneIn);
        form.appendChild(hp);
        form.appendChild(sendBtn);

        var note = document.createElement('p');
        note.className = 'cbw-note';
        note.textContent = S.note;

        var msg = document.createElement('p');
        msg.className = 'cbw-msg';
        msg.hidden = true;

        inner.appendChild(ask);
        inner.appendChild(actions);
        inner.appendChild(form);
        inner.appendChild(note);
        inner.appendChild(msg);
        root.appendChild(inner);

        openBtn.addEventListener('click', function () {
            actions.style.display = 'none';
            openBtn.setAttribute('aria-expanded', 'true');
            form.classList.add('cbw-openform');
            note.classList.add('cbw-shownote');
            nameIn.focus();
        });

        var inFlight = false;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (inFlight) return;

            var name = nameIn.value.trim();
            var phone = phoneIn.value.trim();
            if (!name || digits(phone).length < 7) {
                msg.hidden = false;
                msg.classList.add('cbw-err');
                msg.textContent = S.needBoth;
                return;
            }

            inFlight = true;
            sendBtn.disabled = true;
            sendBtn.textContent = S.sending;
            msg.hidden = true;
            msg.classList.remove('cbw-err');

            var fd = new FormData();
            fd.append('formType', 'Callback Request');
            fd.append('service', SERVICE_EN[key]);
            fd.append('name', name);
            fd.append('phone', phone);
            fd.append('page', window.location.pathname);
            fd.append('language', LANG);
            fd.append('_gotcha', hp.value);
            fd.append('_subject', 'Callback request — ' + SERVICE_EN[key]);

            fetch(ENDPOINT, {
                method: 'POST',
                body: fd,
                headers: { 'Accept': 'application/json' }
            }).then(function (res) {
                inFlight = false;
                if (res.ok) {
                    form.classList.remove('cbw-openform');
                    note.classList.remove('cbw-shownote');
                    msg.hidden = false;
                    msg.textContent = S.success;
                } else {
                    sendBtn.disabled = false;
                    sendBtn.textContent = S.send;
                    msg.hidden = false;
                    msg.classList.add('cbw-err');
                    msg.textContent = S.error;
                }
            }).catch(function () {
                inFlight = false;
                sendBtn.disabled = false;
                sendBtn.textContent = S.send;
                msg.hidden = false;
                msg.classList.add('cbw-err');
                msg.textContent = S.error;
            });
        });
    }

    function init() {
        var roots = document.querySelectorAll('.callback-request');
        if (!roots.length) return;
        injectStyles();
        for (var i = 0; i < roots.length; i++) buildWidget(roots[i]);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
