// Shared booking / TV-quiz / guide-download JS for index.html, used
// identically by the EN, ES, and PL homepages.
//
// Set `window.TVIC_LANG = 'es'` or `'pl'` in an inline <script> BEFORE
// this file loads to localize alerts, the success message, and the TV
// purchase quiz result panel. Defaults to 'en' if unset.
//
// NOT localized here (by design):
//   - Quiz question prompts/button labels: live as static HTML per page.
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
                networkError: 'Network error. Please try again or call us directly at (630) 592-2982.'
            },
            success: {
                thankYou: function (name) { return 'Thank you, ' + name + '. Your booking request is in — we\'ll confirm within hours. Get ready for a perfect install.'; },
                estimate: 'Estimate #', tvs: 'TVs', tv: 'TV', date: 'Date', time: 'Time', email: 'Email', total: 'TOTAL: $'
            },
            quiz: {
                startOver: '↺ Start over',
                badge: { outdoor: 'OUTDOOR SETUP', value: 'GREAT VALUE PICK', premium: 'PREMIUM PICK', mid: 'SOLID MID-RANGE PICK' },
                title: {
                    outdoor: 'You need a weatherproof, outdoor-rated display.',
                    value: 'Costco is probably your best bet.',
                    premium: 'You\'ll likely want to go beyond Costco\'s lineup.',
                    mid: 'Costco first, with LG, Samsung, or Sony as backup.'
                },
                text: {
                    outdoor: 'Standard indoor TVs aren\'t built for sun, humidity, or temperature swings. Costco doesn\'t carry outdoor-rated displays, so we\'ll source the right one for your space and deliver it free of charge to your install in most cases.',
                    value: 'For this size and budget, Costco consistently offers some of the best value on the market, including an extended warranty most retailers don\'t match. If they don\'t have the right size or model, we can supply LG or Samsung instead and deliver it free of charge to your install in most cases.',
                    premium: 'For larger sizes or premium budgets, Costco\'s selection gets thinner. We can source and deliver a premium LG, Samsung, or Sony model matched to your space and budget, delivered free to your install in most cases.',
                    mid: 'Check Costco first for this size and budget, it\'s usually the best value. If they don\'t have the exact size or features you want, we can supply LG, Samsung, or Sony instead and deliver it free of charge to your install in most cases.'
                },
                brands: {
                    outdoor: ['Outdoor-Rated Displays'],
                    value: ['Costco', 'LG', 'Samsung'],
                    premium: ['LG', 'Samsung', 'Sony'],
                    mid: ['Costco', 'LG', 'Samsung', 'Sony']
                }
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
                networkError: 'Error de red. Por favor intenta de nuevo o llámanos directamente al (630) 592-2982.'
            },
            success: {
                thankYou: function (name) { return 'Gracias, ' + name + '. Tu solicitud de reserva está en camino — confirmaremos en unas horas. Prepárate para una instalación perfecta.'; },
                estimate: 'N.º de Estimado', tvs: 'TVs', tv: 'TV', date: 'Fecha', time: 'Hora', email: 'Correo', total: 'TOTAL: $'
            },
            quiz: {
                startOver: '↺ Empezar de nuevo',
                badge: { outdoor: 'INSTALACIÓN EXTERIOR', value: 'EXCELENTE RELACIÓN CALIDAD-PRECIO', premium: 'OPCIÓN PREMIUM', mid: 'BUENA OPCIÓN DE GAMA MEDIA' },
                title: {
                    outdoor: 'Necesitas una pantalla resistente al clima, apta para exteriores.',
                    value: 'Costco probablemente sea tu mejor opción.',
                    premium: 'Probablemente quieras ir más allá de la selección de Costco.',
                    mid: 'Costco primero, con LG, Samsung o Sony como respaldo.'
                },
                text: {
                    outdoor: 'Los televisores estándar para interiores no están hechos para el sol, la humedad o los cambios de temperatura. Costco no tiene pantallas aptas para exteriores, así que conseguiremos la adecuada para tu espacio y la entregaremos sin costo a tu instalación en la mayoría de los casos.',
                    value: 'Para este tamaño y presupuesto, Costco ofrece consistentemente una de las mejores relaciones calidad-precio del mercado, incluyendo una garantía extendida que la mayoría de los minoristas no igualan. Si no tienen el tamaño o modelo correcto, podemos suministrar LG o Samsung en su lugar y entregarlo sin costo a tu instalación en la mayoría de los casos.',
                    premium: 'Para tamaños más grandes o presupuestos premium, la selección de Costco se reduce. Podemos conseguir y entregar un modelo premium de LG, Samsung o Sony ajustado a tu espacio y presupuesto, entregado sin costo a tu instalación en la mayoría de los casos.',
                    mid: 'Revisa Costco primero para este tamaño y presupuesto, generalmente es la mejor opción. Si no tienen el tamaño o características exactas que buscas, podemos suministrar LG, Samsung o Sony en su lugar y entregarlo sin costo a tu instalación en la mayoría de los casos.'
                },
                brands: {
                    outdoor: ['Pantallas Aptas para Exteriores'],
                    value: ['Costco', 'LG', 'Samsung'],
                    premium: ['LG', 'Samsung', 'Sony'],
                    mid: ['Costco', 'LG', 'Samsung', 'Sony']
                }
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
                networkError: 'Błąd sieci. Spróbuj ponownie lub zadzwoń bezpośrednio pod (630) 592-2982.'
            },
            success: {
                thankYou: function (name) { return 'Dziękujemy, ' + name + '. Twoja prośba o rezerwację została przyjęta — potwierdzimy w ciągu kilku godzin. Przygotuj się na idealny montaż.'; },
                estimate: 'Nr wyceny', tvs: 'TV', tv: 'TV', date: 'Data', time: 'Godzina', email: 'E-mail', total: 'SUMA: $'
            },
            quiz: {
                startOver: '↺ Zacznij od nowa',
                badge: { outdoor: 'MONTAŻ ZEWNĘTRZNY', value: 'ŚWIETNY STOSUNEK JAKOŚCI DO CENY', premium: 'WYBÓR PREMIUM', mid: 'SOLIDNY WYBÓR ŚREDNIEJ KLASY' },
                title: {
                    outdoor: 'Potrzebujesz wyświetlacza odpornego na warunki atmosferyczne, przeznaczonego na zewnątrz.',
                    value: 'Costco to prawdopodobnie twój najlepszy wybór.',
                    premium: 'Prawdopodobnie będziesz chciał wyjść poza ofertę Costco.',
                    mid: 'Najpierw Costco, z LG, Samsung lub Sony jako zapasowa opcja.'
                },
                text: {
                    outdoor: 'Standardowe telewizory do wnętrz nie są przystosowane do słońca, wilgoci ani wahań temperatury. Costco nie ma w ofercie wyświetlaczy przeznaczonych na zewnątrz, więc znajdziemy odpowiedni do twojej przestrzeni i w większości przypadków dostarczymy go bezpłatnie na miejsce montażu.',
                    value: 'Dla tego rozmiaru i budżetu Costco konsekwentnie oferuje jedną z najlepszych wartości na rynku, w tym przedłużoną gwarancję, której większość sprzedawców nie oferuje. Jeśli nie mają odpowiedniego rozmiaru lub modelu, możemy zamiast tego dostarczyć LG lub Samsung, w większości przypadków bezpłatnie na miejsce montażu.',
                    premium: 'Dla większych rozmiarów lub budżetów premium wybór Costco się zawęża. Możemy sprowadzić i dostarczyć model premium LG, Samsung lub Sony dopasowany do twojej przestrzeni i budżetu, w większości przypadków bezpłatnie na miejsce montażu.',
                    mid: 'Sprawdź najpierw Costco dla tego rozmiaru i budżetu — zwykle to najlepsza wartość. Jeśli nie mają dokładnego rozmiaru lub funkcji, których szukasz, możemy zamiast tego dostarczyć LG, Samsung lub Sony, w większości przypadków bezpłatnie na miejsce montażu.'
                },
                brands: {
                    outdoor: ['Wyświetlacze na Zewnątrz'],
                    value: ['Costco', 'LG', 'Samsung'],
                    premium: ['LG', 'Samsung', 'Sony'],
                    mid: ['Costco', 'LG', 'Samsung', 'Sony']
                }
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
    // TV purchase advisor quiz
    // Quiz buttons pass stable English codes (not display text) as
    // the tvicQ() argument, so result logic never depends on which
    // language's button labels happen to be showing.
    // ============================================================
    var tvicA = { size: null, location: null, budget: null };
    var tvicStep = 1;

    function tvicShowStep(step) {
        document.querySelectorAll('#tvQuizWrap .quiz-step').forEach(function (el) { el.classList.add('hidden'); });
        document.querySelector('#tvQuizWrap .quiz-step[data-step="' + step + '"]').classList.remove('hidden');
        document.querySelectorAll('.quiz-dot').forEach(function (dot) {
            var n = parseInt(dot.getAttribute('data-dot'), 10);
            dot.style.background = (typeof step === 'number' && n <= step) ? 'var(--gold)' : 'rgba(200,169,74,0.2)';
        });
        if (step === 'result') {
            document.querySelectorAll('.quiz-dot').forEach(function (dot) { dot.style.background = 'var(--gold)'; });
        }
    }

    window.tvicQ = function (key, code) {
        tvicA[key] = code;
        if (tvicStep < 3) { tvicStep++; tvicShowStep(tvicStep); }
        else { tvicResult(); }
    };

    window.tvicBack = function () {
        if (tvicStep > 1) { tvicStep--; tvicShowStep(tvicStep); }
    };

    function tvicResult() {
        var a = tvicA;
        var isOutdoor = (a.location === 'outdoor' || a.location === 'covered');
        var isPremium = (a.size === '75plus' || a.budget === 'premium');
        var isValue = (!isOutdoor && (a.budget === 'value' || a.budget === 'unsure') && a.size !== '75plus');

        var key = isOutdoor ? 'outdoor' : isValue ? 'value' : isPremium ? 'premium' : 'mid';
        var badge = S.quiz.badge[key];
        var title = S.quiz.title[key];
        var text = S.quiz.text[key];
        var brands = S.quiz.brands[key];

        var chips = brands.map(function (b) {
            return '<span style="background:#161616; border:1px solid rgba(200,169,74,0.25); color:var(--paper); padding:6px 14px; border-radius:16px; font-size:12.5px; margin-right:8px; display:inline-block; margin-bottom:8px;">' + b + '</span>';
        }).join('');

        var html = ''
            + '<span class="board-number-badge" style="display:inline-block; margin-bottom:14px;">' + badge + '</span>'
            + '<p class="bebas" style="font-size:26px; color:var(--paper);">' + title + '</p>'
            + '<p style="color:var(--slate-light); font-size:14.5px; line-height:1.7; margin:12px 0 18px;">' + text + '</p>'
            + '<div style="margin-bottom:22px;">' + chips + '</div>'
            + '<div style="display:flex; gap:12px; flex-wrap:wrap;">'
            + '<a href="tel:+16305922982" style="display:inline-flex; align-items:center; gap:8px; background:var(--gold); color:var(--ink); padding:13px 24px; border-radius:3px; font-family:\'Bebas Neue\',sans-serif; font-size:16px; letter-spacing:0.06em; text-decoration:none;">📞 (630) 592-2982</a>'
            + '<button onclick="tvicRestart()" style="background:none; border:1px solid rgba(200,169,74,0.3); color:var(--slate-light); padding:13px 20px; border-radius:3px; font-size:13px; cursor:pointer;">' + S.quiz.startOver + '</button>'
            + '</div>';

        document.getElementById('quizResult').innerHTML = html;
        tvicShowStep('result');
    }

    window.tvicRestart = function () {
        tvicA = { size: null, location: null, budget: null };
        tvicStep = 1;
        tvicShowStep(1);
    };

    // ============================================================
    // Booking form / pricing calculator
    // ============================================================
    document.getElementById('preferredDate').min = new Date().toISOString().split('T')[0];
    var estimateData = {};

    function genEstNum() {
        var n = new Date();
        return 'EST-' + n.getFullYear() + pad(n.getMonth() + 1) + pad(n.getDate()) + '-' + pad(n.getHours()) + pad(n.getMinutes()) + pad(n.getSeconds());
    }
    function pad(v) { return String(v).padStart(2, '0'); }

    // English-only: feeds the PDF estimate (see file header note) and
    // has no bearing on what the customer sees on the page itself.
    function sizeLabel(v) { return { 'up-to-42': 'Up to 42"', '43-55': '43"-55"', '56-70': '56"-70"', '71-85': '71"-85"', '86-plus': '86"+' }[v] || v; }
    function mountLabel(v) { return { 'own': "Customer's Own Mount", 'fixed': 'Fixed Mount', 'tilt': 'Tilting Mount', 'full': 'Full Motion Mount' }[v] || v; }
    function wireLabel(v) { return { 'none': 'No Wire Concealment', 'external': 'External Strip', 'inwall': 'In-Wall Concealment', 'outlet': 'Electrical Outlet Installation' }[v] || v; }

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

    window.calculateTotal = function () {
        var num = parseInt(document.getElementById('numTvs').value);
        var total = num * 100;
        for (var i = 1; i <= num; i++) {
            total += parseInt(document.getElementById('mountType' + i).selectedOptions[0].dataset.price || 0);
            total += parseInt(document.getElementById('wireConcealment' + i).selectedOptions[0].dataset.price || 0);
            total += parseInt(document.getElementById('soundbar' + i).selectedOptions[0].dataset.price || 0);
        }
        var el = document.getElementById('priceTotal');
        el.classList.remove('hidden');
        document.getElementById('totalAmount').textContent = '$' + total;
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

    // Internal record for Lance's own English-language tv-ops dashboard -
    // stays English regardless of site language, same as the PDF.
    function syncBookingToTvOps(name, phone, email, address, date, timeWindow, notes, total, tvs, website, smsConsent) {
        var lineItems = [];
        for (var i = 0; i < tvs.length; i++) {
            var tv = tvs[i];
            lineItems.push({ description: 'TV Mounting — ' + tv.size, price: tv.sizePrice || 0 });
            if (tv.mount && tv.mount !== 'own' && tv.mountPrice) {
                var mLabel = tv.mount === 'fixed' ? 'Fixed Mount' : tv.mount === 'tilt' ? 'Tilting Mount' : tv.mount === 'full' ? 'Full Motion Mount' : tv.mount;
                lineItems.push({ description: mLabel, price: tv.mountPrice });
            }
            if (tv.wire && tv.wire !== 'none' && tv.wirePrice) {
                var wLabel = tv.wire === 'external' ? 'External Cable Strip' : tv.wire === 'inwall' ? 'In-Wall Concealment' : tv.wire === 'outlet' ? 'Electrical Outlet Install' : tv.wire;
                lineItems.push({ description: wLabel, price: tv.wirePrice });
            }
            if (tv.soundbar === 'yes' && tv.soundbarPrice) {
                lineItems.push({ description: 'Soundbar Mounting', price: tv.soundbarPrice });
            }
        }

        var startTime = TIME_WINDOW_START[timeWindow] || '';
        var fullNotes = 'Preferred window: ' + timeWindow + (notes ? ' — ' + notes : '');

        fetch('https://tv-ops-public-api.tvinstallchicago.workers.dev/book', {
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
                notes: fullNotes,
                website: website,
                smsConsent: smsConsent
            })
        }).catch(function () {
            // Silent — this is a best-effort sync. The Formspree submission
            // below is the guaranteed path, so a TV Ops hiccup here shouldn't
            // block or alarm the customer.
        });
    }

    window.submitBooking = function () {
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
                sizePrice: parseInt(document.getElementById('tvSize' + i).selectedOptions[0].dataset.price),
                mountPrice: parseInt(document.getElementById('mountType' + i).selectedOptions[0].dataset.price),
                wirePrice: parseInt(document.getElementById('wireConcealment' + i).selectedOptions[0].dataset.price),
                soundbarPrice: parseInt(document.getElementById('soundbar' + i).selectedOptions[0].dataset.price)
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

        // Sync this lead straight into TV Ops as a scheduled job — best effort,
        // never blocks or breaks the existing Formspree submission below.
        var website = document.getElementById('website').value;
        var smsConsent = document.getElementById('smsConsent').checked;
        syncBookingToTvOps(name, phone, email, address, date, time, notes, total, tvs, website, smsConsent);

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

        fetch('https://formspree.io/f/xeoyyygd', {
            method: 'POST',
            body: fd,
            headers: { 'Accept': 'application/json' }
        }).then(function (res) {
            if (res.ok) {
                showSuccess(name, email, date, time, total, num, estNum);
            } else {
                alert(S.booking.submissionError);
            }
        }).catch(function () {
            alert(S.booking.networkError);
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
    window.downloadEstimate = function () {
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
                ['   TV Installation (' + sizeLabel(tv.size) + ')', '$' + tv.sizePrice],
                ['   Mount: ' + mountLabel(tv.mount), '$' + tv.mountPrice],
                ['   Wire: ' + wireLabel(tv.wire), '$' + tv.wirePrice]
            ];
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
    };

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
