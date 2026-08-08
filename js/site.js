// Shared booking / TV-quiz / guide-download JS for index.html, used
// identically by the EN, ES, and PL homepages.
//
// Set `window.TVIC_LANG = 'es'` or `'pl'` in an inline <script> BEFORE
// this file loads to localize alerts and the success message.
// Defaults to 'en' if unset.
//
// NOT localized here (by design):
//   - The downloadable PDF estimate: stays in English on every language
//     page. jsPDF's built-in fonts use WinAnsi/CP1252 encoding, which
//     does not include Polish diacritics (ą ć ę ł ń ó ś ź ż) - rendering
//     Polish text would require embedding a custom font. Spanish accents
//     would render fine, but keeping the PDF consistent (English) across
//     all three languages was the simpler, safer call for a secondary,
//     internal-facing artifact.
//   - Line-item descriptions sent to tv-ops (syncBookingToTvOps): these
//     land on Lance's own English-language admin dashboard, not in front
//     of the customer, so they stay English regardless of site language.

(function () {
    var LANG = window.TVIC_LANG || 'en';

    var STRINGS = {
        en: {
            guide: {
                emailRequired: 'Please enter your email address.',
                submissionError: 'Submission error. Please try again or call us at (630) 592-2982.',
                networkError: 'Network error. Please try again or call us at (630) 592-2982.'
            },
            booking: {
                fillRequired: 'Please fill in all required fields marked with *',
                liftingRequired: 'Please confirm the lifting assistance agreement to proceed with the $100 flat rate.',
                fillTvFields: function (i) { return 'Please fill in all fields for TV ' + i; },
                submissionError: 'Submission error. Please try again or call us directly at (630) 592-2982.',
                networkError: 'Network error. Please try again or call us directly at (630) 592-2982.',
                pillarOver65: 'Pillar mounts are hand-made for TVs 65" and under, so that TV was switched to "Customer\'s Own Mount" — please pick a different mount type.',
                dateUnavailable: 'That date and time can\'t be booked — the day may be full or the time already passed. Please choose a different day or time and try again.'
            },
            success: {
                thankYou: function (name) { return 'Thank you, ' + name + '. Your booking request is in — we\'ll confirm within hours. Get ready for a perfect install.'; },
                estimate: 'Estimate #', tvs: 'TVs', tv: 'TV', date: 'Date', time: 'Time', email: 'Email', total: 'TOTAL: $'
            }
        },
        es: {
            guide: {
                emailRequired: 'Por favor ingresa tu correo electrónico.',
                submissionError: 'Error de envío. Por favor intenta de nuevo o llámanos al (630) 592-2982.',
                networkError: 'Error de red. Por favor intenta de nuevo o llámanos al (630) 592-2982.'
            },
            booking: {
                fillRequired: 'Por favor completa todos los campos requeridos marcados con *',
                liftingRequired: 'Por favor confirma el acuerdo de asistencia de levantamiento para continuar con la tarifa fija de $100.',
                fillTvFields: function (i) { return 'Por favor completa todos los campos para el TV ' + i; },
                submissionError: 'Error de envío. Por favor intenta de nuevo o llámanos directamente al (630) 592-2982.',
                networkError: 'Error de red. Por favor intenta de nuevo o llámanos directamente al (630) 592-2982.',
                pillarOver65: 'Los montajes en columna se hacen a mano para TVs de 65" o menos, así que ese TV se cambió a "Soporte Propio del Cliente" — por favor elige otro tipo de soporte.',
                dateUnavailable: 'Esa fecha y hora no se pueden reservar — el día puede estar lleno o la hora ya pasó. Por favor elige otro día u otra hora e intenta de nuevo.'
            },
            success: {
                thankYou: function (name) { return 'Gracias, ' + name + '. Tu solicitud de reserva está en camino — confirmaremos en unas horas. Prepárate para una instalación perfecta.'; },
                estimate: 'N.º de Estimado', tvs: 'TVs', tv: 'TV', date: 'Fecha', time: 'Hora', email: 'Correo', total: 'TOTAL: $'
            }
        },
        pl: {
            guide: {
                emailRequired: 'Podaj proszę swój adres e-mail.',
                submissionError: 'Błąd wysyłania. Spróbuj ponownie lub zadzwoń do nas pod (630) 592-2982.',
                networkError: 'Błąd sieci. Spróbuj ponownie lub zadzwoń do nas pod (630) 592-2982.'
            },
            booking: {
                fillRequired: 'Proszę wypełnić wszystkie wymagane pola oznaczone *',
                liftingRequired: 'Proszę potwierdzić zgodę na pomoc przy podnoszeniu, aby skorzystać ze stałej ceny $100.',
                fillTvFields: function (i) { return 'Proszę wypełnić wszystkie pola dla TV ' + i; },
                submissionError: 'Błąd wysyłania. Spróbuj ponownie lub zadzwoń bezpośrednio pod (630) 592-2982.',
                networkError: 'Błąd sieci. Spróbuj ponownie lub zadzwoń bezpośrednio pod (630) 592-2982.',
                pillarOver65: 'Montaże kolumnowe są wykonywane ręcznie dla telewizorów do 65", więc dla tego telewizora wybrano "Własny Uchwyt Klienta" — wybierz proszę inny typ uchwytu.',
                dateUnavailable: 'Tego terminu nie można zarezerwować — dzień może być zajęty lub godzina już minęła. Wybierz proszę inny dzień lub godzinę i spróbuj ponownie.'
            },
            success: {
                thankYou: function (name) { return 'Dziękujemy, ' + name + '. Twoja prośba o rezerwację została przyjęta — potwierdzimy w ciągu kilku godzin. Przygotuj się na idealny montaż.'; },
                estimate: 'Nr wyceny', tvs: 'TV', tv: 'TV', date: 'Data', time: 'Godzina', email: 'E-mail', total: 'SUMA: $'
            }
        }
    };

    var S = STRINGS[LANG] || STRINGS.en;

    // ============================================================
    // Guide download form
    // ============================================================
    window.submitGuideRequest = function () {
        var name = document.getElementById('guideName').value.trim();
        var email = document.getElementById('guideEmail').value.trim();

        if (!email) {
            alert(S.guide.emailRequired);
            return;
        }

        var fd = new FormData();
        fd.append('formType', 'Free Guide Download');
        fd.append('name', name);
        fd.append('email', email);

        fetch('https://formspree.io/f/mkodqzda', {
            method: 'POST',
            body: fd,
            headers: { 'Accept': 'application/json' }
        }).then(function (res) {
            if (res.ok) {
                document.getElementById('guideFormWrap').classList.add('hidden');
                document.getElementById('guideSuccess').classList.remove('hidden');
            } else {
                alert(S.guide.submissionError);
            }
        }).catch(function () {
            alert(S.guide.networkError);
        });
    };

    // ============================================================
    // Booking form / pricing calculator
    // ============================================================
    // Local calendar date, not toISOString() -- that's UTC, which after
    // ~7pm Chicago rolls to tomorrow and blocks same-day requests. Same
    // bug class already fixed on the tv-ops availability endpoint.
    var _now = new Date();
    document.getElementById('preferredDate').min = _now.getFullYear() + '-' + pad(_now.getMonth() + 1) + '-' + pad(_now.getDate());
    var estimateData = {};

    function genEstNum() {
        var n = new Date();
        return 'EST-' + n.getFullYear() + pad(n.getMonth() + 1) + pad(n.getDate()) + '-' + pad(n.getHours()) + pad(n.getMinutes()) + pad(n.getSeconds());
    }
    function pad(v) { return String(v).padStart(2, '0'); }

    // English-only: feeds the PDF estimate (see file header note) and
    // has no bearing on what the customer sees on the page itself.
    function sizeLabel(v) { return { 'up-to-42': 'Up to 42"', '43-55': '43"-55"', '56-65': '56"-65"', '66-70': '66"-70"', '56-70': '56"-70"', '71-85': '71"-85"', '86-plus': '86"+' }[v] || v; }
    function mountLabel(v) { return { 'own': "Customer's Own Mount", 'fixed': 'Fixed Mount', 'tilt': 'Tilting Mount', 'full': 'Full Motion Mount', 'mantle': 'Mantle Mount', 'pillar': 'Pillar Mount', 'mantle-mm340': 'MantelMount MM340 Standard', 'mantle-mm540': 'MantelMount MM540 Enhanced', 'mantle-mm700': 'MantelMount MM700 Premier', 'mantle-mmmax1': 'MantelMount MM-MAX1 Full Motion', 'mantle-mm815': 'MantelMount MM815 Motorized' }[v] || v; }
    function wireLabel(v) { return { 'none': 'No Wire Concealment', 'external': 'External Strip', 'inwall': 'In-Wall Concealment', 'outlet': 'Electrical Outlet Installation', 'framebox': 'Frame TV Recessed Box (box supplied by us)', 'frameboxdiy': 'Frame TV Recessed Box (box supplied by customer)' }[v] || v; }

    window.updateTvForms = function () {
        var num = parseInt(document.getElementById('numTvs').value);
        for (var i = 2; i <= 5; i++) {
            var sec = document.getElementById('tv' + i + '-section');
            if (i <= num) {
                sec.classList.remove('hidden');
                sec.querySelectorAll('select').forEach(function (s) { s.required = true; });
            } else {
                sec.classList.add('hidden');
                sec.querySelectorAll('select').forEach(function (s) { s.required = false; s.value = ''; });
            }
        }
    };

    // Size buckets that are entirely above 65". MantelMount labor jumps
    // from $350 to $500 there, and we don't do pillar mounts that big at
    // all -- so the 56"-70" bucket was split into 56"-65"/66"-70" to make
    // this line unambiguous.
    var OVER_65_SIZES = ['66-70', '71-85', '86-plus'];
    function isOver65(sizeValue) { return OVER_65_SIZES.indexOf(sizeValue) !== -1; }
    function isMantelMount(mountValue) { return String(mountValue || '').indexOf('mantle-') === 0; }
    window.isOver65 = isOver65;
    window.isMantelMount = isMantelMount;

    // MantelMount option prices are the mount hardware only; our install
    // labor is added here because it depends on the TV's size, not on
    // which mount they picked.
    var MANTELMOUNT_LABOR_UNDER_65 = 350;
    var MANTELMOUNT_LABOR_OVER_65 = 500;
    window.mantelMountLabor = function (sizeValue) {
        return isOver65(sizeValue) ? MANTELMOUNT_LABOR_OVER_65 : MANTELMOUNT_LABOR_UNDER_65;
    };

    // Pillar mounts are hand-made and we don't build them for TVs over
    // 65". Greys the option out rather than letting someone quote and
    // book something we'd have to turn down.
    window.syncMountOptionsToSize = function (i) {
        var sizeSel = document.getElementById('tvSize' + i);
        var mountSel = document.getElementById('mountType' + i);
        if (!sizeSel || !mountSel) return;
        var over65 = isOver65(sizeSel.value);
        var pillar = mountSel.querySelector('option[value="pillar"]');
        if (pillar) {
            pillar.disabled = over65;
            if (over65 && mountSel.value === 'pillar') {
                // Tell the customer, don't just silently drop $200 off
                // their quote -- a total that changes with no explanation
                // reads as a glitch.
                mountSel.value = 'own';
                alert(S.booking.pillarOver65);
            }
        }
    };

    window.calculateTotal = function () {
        var num = parseInt(document.getElementById('numTvs').value);
        var total = num * 100;
        for (var i = 1; i <= num; i++) {
            syncMountOptionsToSize(i);
            var sizeVal = document.getElementById('tvSize' + i).value;
            var mountSel = document.getElementById('mountType' + i);
            var mountVal = mountSel.value;
            total += parseFloat(mountSel.selectedOptions[0].dataset.price || 0);
            if (isMantelMount(mountVal)) total += mantelMountLabor(sizeVal);
            total += parseFloat(document.getElementById('wireConcealment' + i).selectedOptions[0].dataset.price || 0);
            total += parseFloat(document.getElementById('soundbar' + i).selectedOptions[0].dataset.price || 0);
        }
        total = Math.round(total * 100) / 100;
        var el = document.getElementById('priceTotal');
        el.classList.remove('hidden');
        document.getElementById('totalAmount').textContent = '$' + (total % 1 === 0 ? total : total.toFixed(2));
        return total;
    };

    // Option `value`s for this select are stable English strings on every
    // language page (only the visible <option> text is translated), so
    // this lookup works unchanged regardless of site language.
    var TIME_WINDOW_START = {
        '8:00 AM - 10:00 AM': '08:00',
        '10:00 AM - 12:00 PM': '10:00',
        '12:00 PM - 2:00 PM': '12:00',
        '2:00 PM - 4:00 PM': '14:00',
        '4:00 PM - 6:00 PM': '16:00'
    };

    // fetch() with a timeout so a hung TV Ops worker can't strand the
    // customer mid-submit -- a timeout falls through to the Formspree path.
    function fetchWithTimeout(url, opts, ms) {
        if (typeof AbortController === 'undefined') return fetch(url, opts);
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, ms);
        opts.signal = ctrl.signal;
        return fetch(url, opts).then(
            function (res) { clearTimeout(timer); return res; },
            function (err) { clearTimeout(timer); throw err; }
        );
    }

    // Internal record for Lance's own English-language tv-ops dashboard -
    // stays English regardless of site language, same as the PDF.
    //
    // This is a GATE, not a best-effort sync: TV Ops enforces blocked-off
    // dates and slot conflicts, and a 400/409 from it means the customer
    // must pick a different day -- Formspree is never submitted in that
    // case (a booking that only exists in email is how a blocked-off day
    // once got double-booked). Only if TV Ops is unreachable does the
    // submission fall through to Formspree alone, so an outage never
    // loses a lead.
    function syncBookingToTvOps(name, phone, email, address, date, timeWindow, notes, total, tvs, website, smsConsent) {
        var lineItems = [];
        for (var i = 0; i < tvs.length; i++) {
            var tv = tvs[i];
            lineItems.push({ description: 'TV Mounting — ' + tv.size, price: tv.sizePrice || 0 });
            if (tv.mount && tv.mount !== 'own' && tv.mountPrice) {
                // MantelMount is billed as two things: our install labor
                // (which depends on TV size) and the mount hardware we
                // supply. Send both so the job shows exactly which mount
                // to bring and what the labor tier was.
                if (isMantelMount(tv.mount)) {
                    var labor = mantelMountLabor(tv.size);
                    lineItems.push({
                        description: 'MantelMount Installation (' + (isOver65(tv.size) ? 'over 65"' : '65" and under') + ')',
                        price: labor
                    });
                }
                lineItems.push({ description: mountLabel(tv.mount), price: tv.mountPrice });
            }
            if (tv.wire && tv.wire !== 'none' && tv.wirePrice) {
                var wLabel = tv.wire === 'external' ? 'External Cable Strip' : tv.wire === 'inwall' ? 'In-Wall Concealment' : tv.wire === 'outlet' ? 'Electrical Outlet Install' : tv.wire === 'framebox' ? 'Frame TV Recessed Box — box supplied by us' : tv.wire === 'frameboxdiy' ? 'Frame TV Recessed Box — box supplied by customer' : tv.wire;
                lineItems.push({ description: wLabel, price: tv.wirePrice });
            }
            if (tv.soundbar === 'yes' && tv.soundbarPrice) {
                lineItems.push({ description: 'Soundbar Mounting', price: tv.soundbarPrice });
            }
        }

        var startTime = TIME_WINDOW_START[timeWindow] || '';
        var fullNotes = 'Preferred window: ' + timeWindow + (notes ? ' — ' + notes : '');

        // Same duration formula the chat assistant uses, so a multi-TV or
        // wiring-heavy booking blocks a realistic stretch of the calendar
        // instead of the 90-minute default (which invited double-booking).
        var durationMinutes = 90 * tvs.length;
        for (var d = 0; d < tvs.length; d++) {
            if (tvs[d].soundbar === 'yes') durationMinutes += 30;
            if (tvs[d].wire === 'inwall') durationMinutes += 30;
            if (tvs[d].wire === 'outlet') durationMinutes += 60;
            if (tvs[d].wire === 'framebox' || tvs[d].wire === 'frameboxdiy') durationMinutes += 60;
            // Fireplace pull-down installs are the biggest jobs we book --
            // without this, a $600+ MantelMount job blocked the same 90
            // minutes as a basic drywall mount.
            if (isMantelMount(tvs[d].mount)) durationMinutes += 60;
        }

        return fetchWithTimeout('https://tv-ops-public-api.tvinstallchicago.workers.dev/book', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                customerName: name,
                phone: phone,
                email: email,
                address: address,
                date: date,
                time: startTime,
                serviceType: 'Booked via website',
                price: total,
                lineItems: lineItems,
                estimatedDurationMinutes: durationMinutes,
                notes: fullNotes,
                website: website,
                smsConsent: smsConsent,
                language: LANG
            })
        }, 10000).then(function (res) {
            // 400/409 are real refusals (blocked-off day, slot conflict,
            // past date). Anything else -- 201 booked, or 429/5xx where the
            // gate itself is struggling -- lets the submission continue.
            return { rejected: res.status === 400 || res.status === 409 };
        }).catch(function () {
            return { rejected: false };
        });
    }

    // Submitting now waits on the TV Ops gate before Formspree, which opens
    // a short window where a second tap would double-submit.
    var bookingInFlight = false;

    window.submitBooking = function () {
        if (bookingInFlight) return;
        var name = document.getElementById('name').value.trim();
        var phone = document.getElementById('phone').value.trim();
        var email = document.getElementById('email').value.trim();
        var address = document.getElementById('address').value.trim();
        var num = parseInt(document.getElementById('numTvs').value);
        var date = document.getElementById('preferredDate').value;
        var time = document.getElementById('preferredTime').value;
        var notes = document.getElementById('additionalNotes').value.trim();

        if (!name || !phone || !email || !address || !date || !time) {
            alert(S.booking.fillRequired);
            return;
        }
        if (!document.getElementById('liftingConsent').checked) {
            alert(S.booking.liftingRequired);
            document.getElementById('liftingBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        var tvs = [];
        for (var i = 1; i <= num; i++) {
            var sz = document.getElementById('tvSize' + i).value;
            var mt = document.getElementById('mountType' + i).value;
            var wc = document.getElementById('wireConcealment' + i).value;
            var sb = document.getElementById('soundbar' + i).value;
            if (!sz || !mt || !wc) { alert(S.booking.fillTvFields(i)); return; }
            tvs.push({
                size: sz, mount: mt, wire: wc, soundbar: sb,
                // parseFloat, not parseInt -- MantelMount hardware prices
                // carry cents (e.g. 249.95) and parseInt silently truncated
                // them, making the itemized lines disagree with the total.
                sizePrice: parseFloat(document.getElementById('tvSize' + i).selectedOptions[0].dataset.price),
                mountPrice: parseFloat(document.getElementById('mountType' + i).selectedOptions[0].dataset.price),
                wirePrice: parseFloat(document.getElementById('wireConcealment' + i).selectedOptions[0].dataset.price),
                soundbarPrice: parseFloat(document.getElementById('soundbar' + i).selectedOptions[0].dataset.price)
            });
        }

        var total = calculateTotal();
        var estNum = genEstNum();
        var today = new Date();
        var created = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        var valid = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        estimateData = { estimateNumber: estNum, createdDate: created, validUntil: valid, name: name, phone: phone, email: email, address: address, numTvs: num, tvs: tvs, preferredDate: date, preferredTime: time, notes: notes, total: total };

        var tvDetails = '';
        for (var j = 1; j <= num; j++) {
            tvDetails += 'TV' + j + ': Size=' + document.getElementById('tvSize' + j).value + ', Mount=' + document.getElementById('mountType' + j).value + ', Wire=' + document.getElementById('wireConcealment' + j).value + ', Soundbar=' + document.getElementById('soundbar' + j).value + '; ';
        }

        // TV Ops decides first: it enforces blocked-off dates and slot
        // conflicts, and a refusal stops the whole submission (including
        // Formspree) so the customer picks a new day instead of getting a
        // success screen for a day that isn't actually open.
        var website = document.getElementById('website').value;
        var smsConsent = document.getElementById('smsConsent').checked;
        bookingInFlight = true;
        syncBookingToTvOps(name, phone, email, address, date, time, notes, total, tvs, website, smsConsent).then(function (gate) {
            if (gate.rejected) {
                bookingInFlight = false;
                alert(S.booking.dateUnavailable);
                return;
            }

            var fd = new FormData();
            fd.append('estimateNumber', estNum);
            fd.append('name', name);
            fd.append('phone', phone);
            fd.append('email', email);
            fd.append('address', address);
            fd.append('numTvs', num);
            fd.append('tvDetails', tvDetails);
            fd.append('preferredDate', date);
            fd.append('preferredTime', time);
            fd.append('additionalNotes', notes);
            fd.append('total', '$' + total);
            fd.append('liftingAgreement', 'Confirmed — customer will assist with lifting on larger TVs');
            fd.append('language', LANG);

            fetch('https://formspree.io/f/xeoyyygd', {
                method: 'POST',
                body: fd,
                headers: { 'Accept': 'application/json' }
            }).then(function (res) {
                bookingInFlight = false;
                if (res.ok) {
                    showSuccess(name, email, date, time, total, num, estNum);
                } else {
                    alert(S.booking.submissionError);
                }
            }).catch(function () {
                bookingInFlight = false;
                alert(S.booking.networkError);
            });
        });
    };

    function showSuccess(name, email, date, time, total, num, estNum) {
        document.getElementById('successMessage').textContent = S.success.thankYou(name);
        document.getElementById('bookingDetails').innerHTML =
            '<p style="font-size:13px;color:#6B7E94;margin-bottom:8px;"><strong style="color:#F5F0E8;">' + S.success.estimate + '</strong> &nbsp;' + estNum + '</p>' +
            '<p style="font-size:13px;color:#6B7E94;margin-bottom:8px;"><strong style="color:#F5F0E8;">' + S.success.tvs + '</strong> &nbsp;' + num + ' ' + S.success.tv + (num > 1 ? 's' : '') + '</p>' +
            '<p style="font-size:13px;color:#6B7E94;margin-bottom:8px;"><strong style="color:#F5F0E8;">' + S.success.date + '</strong> &nbsp;' + date + '</p>' +
            '<p style="font-size:13px;color:#6B7E94;margin-bottom:8px;"><strong style="color:#F5F0E8;">' + S.success.time + '</strong> &nbsp;' + time + '</p>' +
            '<p style="font-size:13px;color:#6B7E94;margin-bottom:12px;"><strong style="color:#F5F0E8;">' + S.success.email + '</strong> &nbsp;' + email + '</p>' +
            '<p style="font-family:\'Bebas Neue\',sans-serif;font-size:36px;color:#C8A94A;letter-spacing:0.02em;border-top:1px solid rgba(200,169,74,0.2);padding-top:12px;">' + S.success.total + total + '</p>';
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('successScreen').classList.remove('hidden');
    }

    // English-only PDF — see file header note on jsPDF font encoding.
    // jsPDF (~2.5MB) is only needed by this one feature, so it's loaded on
    // first use here instead of unconditionally on every page load.
    window.downloadEstimate = function () {
        if (window.jspdf) { buildAndDownloadEstimate(); return; }
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = buildAndDownloadEstimate;
        script.onerror = function () { alert('Could not load the PDF generator. Please check your connection and try again.'); };
        document.head.appendChild(script);
    };

    function buildAndDownloadEstimate() {
        var jsPDF = window.jspdf.jsPDF;
        var doc = new jsPDF();
        var pw = doc.internal.pageSize.getWidth();
        var y = 20;

        doc.setFillColor(10, 10, 10); doc.rect(0, 0, pw, 50, 'F');
        doc.setTextColor(200, 169, 74); doc.setFontSize(28); doc.setFont('helvetica', 'bold');
        doc.text('TV INSTALL CHICAGO', pw / 2, 20, { align: 'center' });
        doc.setTextColor(200, 200, 200); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
        doc.text('$100 Flat Rate  Any TV  Any Size  Always', pw / 2, 32, { align: 'center' });
        doc.text('(630) 592-2982  tvinstallchicago@gmail.com', pw / 2, 42, { align: 'center' });
        y = 65;

        doc.setTextColor(10, 10, 10); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
        doc.text('SERVICE ESTIMATE', pw / 2, y, { align: 'center' }); y += 15;

        doc.setDrawColor(200, 169, 74); doc.setLineWidth(0.5); doc.rect(15, y, pw - 30, 30);
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text('Estimate #:', 20, y + 8); doc.text('Created:', 20, y + 16); doc.text('Valid Until:', 20, y + 24);
        doc.setFont('helvetica', 'normal');
        doc.text(estimateData.estimateNumber, 55, y + 8);
        doc.text(estimateData.createdDate, 55, y + 16);
        doc.text(estimateData.validUntil, 55, y + 24);
        doc.setFont('helvetica', 'bold');
        doc.text('Preferred Date:', 110, y + 8); doc.text('Preferred Time:', 110, y + 16);
        doc.setFont('helvetica', 'normal');
        doc.text(estimateData.preferredDate, 152, y + 8);
        doc.text(estimateData.preferredTime, 152, y + 16);
        y += 40;

        doc.setFillColor(200, 169, 74); doc.rect(15, y, pw - 30, 9, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(10, 10, 10);
        doc.text('CUSTOMER INFORMATION', 20, y + 6.5); y += 16;

        doc.setTextColor(0, 0, 0); doc.setFontSize(10);
        [['Name:', estimateData.name], ['Phone:', estimateData.phone], ['Email:', estimateData.email], ['Address:', estimateData.address]].forEach(function (p) {
            doc.setFont('helvetica', 'bold'); doc.text(p[0], 20, y);
            doc.setFont('helvetica', 'normal');
            var lines = doc.splitTextToSize(p[1], 130); doc.text(lines, 50, y);
            y += lines.length * 6 + 2;
        });
        y += 8;

        doc.setFillColor(10, 10, 10); doc.rect(15, y, pw - 30, 9, 'F');
        doc.setTextColor(200, 169, 74); doc.setFont('helvetica', 'bold');
        doc.text('SERVICES', 20, y + 6.5); doc.text('PRICE', pw - 20, y + 6.5, { align: 'right' });
        y += 16; doc.setTextColor(0, 0, 0);

        for (var i = 0; i < estimateData.tvs.length; i++) {
            var tv = estimateData.tvs[i];
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
            doc.text('TV ' + (i + 1), 20, y); y += 7;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
            var rows = [
                ['   TV Installation (' + sizeLabel(tv.size) + ')', '$' + tv.sizePrice]
            ];
            // MantelMount jobs bill labor and hardware separately -- both
            // are inside estimateData.total, so both must be itemized here
            // or the rows won't add up to the TOTAL box below.
            if (isMantelMount(tv.mount)) {
                rows.push(['   MantelMount Installation (' + (isOver65(tv.size) ? 'over 65")' : '65" and under)'), '$' + mantelMountLabor(tv.size)]);
            }
            rows.push(['   Mount: ' + mountLabel(tv.mount), '$' + tv.mountPrice]);
            rows.push(['   Wire: ' + wireLabel(tv.wire), '$' + tv.wirePrice]);
            if (tv.soundbar === 'yes') rows.push(['   Soundbar Mounting', '$' + tv.soundbarPrice]);
            rows.forEach(function (r) { doc.text(r[0], 20, y); doc.text(r[1], pw - 20, y, { align: 'right' }); y += 6; });
            y += 4;
            if (y > 250) { doc.addPage(); y = 20; }
        }

        y += 5;
        doc.setDrawColor(200, 200, 200); doc.line(15, y, pw - 15, y); y += 12;
        doc.setFillColor(200, 169, 74); doc.rect(100, y - 6, pw - 115, 12, 'F');
        doc.setTextColor(10, 10, 10); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.text('TOTAL:', 105, y + 2); doc.text('$' + estimateData.total, pw - 20, y + 2, { align: 'right' });
        y += 20;

        if (estimateData.notes && estimateData.notes.trim()) {
            doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.text('Notes:', 20, y); y += 6;
            doc.setFont('helvetica', 'normal');
            var nl = doc.splitTextToSize(estimateData.notes, pw - 40);
            doc.text(nl, 20, y);
        }

        var fy = 270;
        doc.setDrawColor(200, 169, 74); doc.line(15, fy, pw - 15, fy);
        doc.setTextColor(120, 120, 120); doc.setFontSize(9); doc.setFont('helvetica', 'italic');
        doc.text('This is an estimate only. Final pricing may vary based on site conditions.', pw / 2, fy + 8, { align: 'center' });
        doc.text('All installations include level mounting and debris cleanup.', pw / 2, fy + 14, { align: 'center' });
        doc.text('Customer assists with lifting on larger displays. Thank you for choosing TV Install Chicago!', pw / 2, fy + 20, { align: 'center' });

        doc.save('TVInstallChicago_Estimate_' + estimateData.estimateNumber + '.pdf');
    }

    // ============================================================
    // Neighborhood/source query-param handoff
    // ?neighborhood= is used by the neighborhood/suburb pages;
    // ?source= is for anything else (like the mounting guide page)
    // that wants to tag where a lead came from.
    // ============================================================
    (function () {
        var params = new URLSearchParams(window.location.search);
        var hood = params.get('neighborhood');
        var source = params.get('source');
        if (!hood && !source) return;

        document.addEventListener('DOMContentLoaded', function () {
            var notes = document.getElementById('additionalNotes');
            if (notes) {
                var tag = hood ? '[Neighborhood: ' + hood + '] ' : '[Source: ' + source + '] ';
                if (notes.value.indexOf(tag) !== 0) {
                    notes.value = tag + notes.value;
                }
            }
            var form = document.getElementById('bookingForm');
            if (form) {
                setTimeout(function () {
                    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        });
    })();
})();
