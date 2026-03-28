document.addEventListener('DOMContentLoaded', () => {

    // --- CARGADOR DE COMPONENTES (NAV, FOOTER) ---
    const loadComponent = (url, placeholderId, callback) => {
        const placeholder = document.getElementById(placeholderId);
        if (!placeholder) return;
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
                return response.text();
            })
            .then(data => {
                placeholder.innerHTML = data;
                if (callback) callback();
            })
            .catch(error => console.error(error));
    };

    loadComponent('nav.html', 'navbar-placeholder', initMobileMenu);
    loadComponent('footer.html', 'footer-placeholder', initCookieBanner);

    // --- MENÚ MÓVIL ---
    function initMobileMenu() {
        const menuButton = document.querySelector('[data-collapse-toggle="navbar-sticky"]');
        const navbar = document.getElementById('navbar-sticky');
        if (!menuButton || !navbar) return;

        menuButton.addEventListener('click', () => navbar.classList.toggle('hidden'));

        const currentPage = window.location.pathname.split('/').pop();
        navbar.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    // --- SMOOTH SCROLL PARA ANCLAS ---
    document.body.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // --- CARRUSEL ---
    const initCarousel = () => {
        const track = document.getElementById('carousel-track');
        if (!track) return;

        const items = track.querySelectorAll('.carousel-item');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (items.length === 0 || !prevBtn || !nextBtn) return;

        let currentIndex = 0;
        const totalItems = items.length;

        const updateCarousel = () => {
            const itemWidth = items[0].clientWidth;
            track.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
        };

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % totalItems;
            updateCarousel();
        });

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + totalItems) % totalItems;
            updateCarousel();
        });

        window.addEventListener('resize', updateCarousel);
        updateCarousel();
    };

    // --- LIGHTBOX DE GALERÍA ---
    const initGalleryLightbox = () => {
        const items = [...document.querySelectorAll('.gallery-item')];
        if (items.length === 0) return;

        const lightbox     = document.getElementById('lightbox');
        const lightboxImg  = document.getElementById('lightbox-img');
        const counter      = document.getElementById('lightbox-counter');
        const closeBtn     = document.getElementById('lightbox-close');
        const prevBtn      = document.getElementById('lightbox-prev');
        const nextBtn      = document.getElementById('lightbox-next');
        if (!lightbox || !lightboxImg) return;

        let current = 0;

        const open = (index) => {
            current = ((index % items.length) + items.length) % items.length;
            const src = items[current].dataset.src;
            const alt = items[current].querySelector('img').alt;
            lightboxImg.src = src;
            lightboxImg.alt = alt;
            counter.textContent = `${current + 1} / ${items.length}`;
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        };

        const close = () => {
            lightbox.classList.remove('open');
            document.body.style.overflow = '';
            lightboxImg.src = '';
        };

        items.forEach((item, i) => item.addEventListener('click', () => open(i)));
        closeBtn.addEventListener('click', close);
        prevBtn.addEventListener('click', () => open(current - 1));
        nextBtn.addEventListener('click', () => open(current + 1));
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('open')) return;
            if (e.key === 'Escape')      close();
            if (e.key === 'ArrowLeft')   open(current - 1);
            if (e.key === 'ArrowRight')  open(current + 1);
        });
    };

    // --- DESPLEGABLES (SERVICIOS) ---
    const initServiceAccordions = () => {
        const serviceItems = document.querySelectorAll('.service-item button');
        if (serviceItems.length === 0) return;

        serviceItems.forEach(button => {
            button.addEventListener('click', () => {
                const details = button.nextElementSibling;
                const icon = button.querySelector('svg');
                const isOpen = details.style.maxHeight;

                document.querySelectorAll('.service-item .service-details').forEach(d => {
                    if (d !== details) {
                        d.style.maxHeight = null;
                        const i = d.previousElementSibling.querySelector('svg');
                        if (i) i.style.transform = 'rotate(0deg)';
                    }
                });

                if (isOpen) {
                    details.style.maxHeight = null;
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    details.style.maxHeight = details.scrollHeight + 'px';
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            });
        });
    };

    // =====================================================================
    // --- SISTEMA DE RESERVAS CON GOOGLE CALENDAR ---
    // =====================================================================
    const initBookingSystem = () => {
        // Comprueba que estamos en la página de agenda
        if (!document.getElementById('step-1')) return;

        // ⚠ IMPORTANTE: Pega aquí la URL de tu Google Apps Script desplegado.
        // Instrucciones en el archivo google-apps-script.js
        const APPS_SCRIPT_URL = 'PEGA_AQUI_TU_URL_DE_GOOGLE_APPS_SCRIPT';

        // Días cerrados: 0 = Domingo, 1 = Lunes
        const DIAS_CERRADOS = [0, 1];

        // Estado del formulario
        const state = {
            service: '',
            date: '',
            time: '',
            name: '',
            phone: '',
            email: '',
        };

        // ── Elementos del DOM ──────────────────────────────────────────
        const step1    = document.getElementById('step-1');
        const step2    = document.getElementById('step-2');
        const step3    = document.getElementById('step-3');
        const step4    = document.getElementById('step-4');
        const stepOk   = document.getElementById('step-success');

        const servicesList    = document.getElementById('services-list');
        const servicesLoading = document.getElementById('services-loading');
        const servicesError   = document.getElementById('services-error');

        const datePicker      = document.getElementById('date-picker');
        const dateClosedMsg   = document.getElementById('date-closed-msg');
        const timeSlotsSection = document.getElementById('time-slots-section');
        const timeSlotsGrid   = document.getElementById('time-slots-grid');
        const slotsLoader     = document.getElementById('slots-loader');
        const noSlotsMsg      = document.getElementById('no-slots-msg');

        const bookingForm   = document.getElementById('booking-form');
        const goToStep4Btn  = document.getElementById('go-to-step-4');
        const confirmBtn    = document.getElementById('confirm-booking-btn');
        const bookingResponse = document.getElementById('booking-response');

        // ── Navegación entre pasos ──────────────────────────────────────
        const showStep = (n) => {
            [step1, step2, step3, step4, stepOk].forEach(s => s && s.classList.add('hidden'));
            const steps = { 1: step1, 2: step2, 3: step3, 4: step4, 5: stepOk };
            if (steps[n]) steps[n].classList.remove('hidden');
            updateStepIndicator(n);
        };

        const updateStepIndicator = (current) => {
            for (let i = 1; i <= 4; i++) {
                const ind = document.getElementById(`step-ind-${i}`);
                if (!ind) continue;
                ind.classList.remove('active', 'done');
                if (i < current) ind.classList.add('done');
                else if (i === current) ind.classList.add('active');
            }
            for (let i = 1; i <= 3; i++) {
                const div = document.getElementById(`div-${i}-${i + 1}`);
                if (div) div.classList.toggle('done', i < current);
            }
        };

        document.getElementById('back-to-step-1').addEventListener('click', () => showStep(1));
        document.getElementById('back-to-step-2').addEventListener('click', () => showStep(2));
        document.getElementById('back-to-step-3').addEventListener('click', () => showStep(3));

        // ── Paso 1: Cargar y mostrar servicios ──────────────────────────
        const loadServices = async () => {
            try {
                const res  = await fetch(APPS_SCRIPT_URL + '?action=services');
                const data = await res.json();
                if (!data.success) throw new Error(data.error);

                servicesLoading.classList.add('hidden');
                servicesList.classList.remove('hidden');

                data.services.forEach(svc => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.textContent = svc;
                    btn.className = 'w-full text-left p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-[#C09553] hover:text-[#C09553] transition-all font-medium';
                    btn.addEventListener('click', () => {
                        state.service = svc;
                        document.getElementById('summary-service-name').textContent = svc;
                        document.getElementById('summary-service-2').textContent = svc;
                        // Bloquear fechas pasadas y de hoy en adelante
                        const today = new Date().toISOString().split('T')[0];
                        datePicker.min = today;
                        showStep(2);
                    });
                    servicesList.appendChild(btn);
                });
            } catch (err) {
                servicesLoading.classList.add('hidden');
                servicesError.classList.remove('hidden');
                servicesError.textContent = 'No se pudieron cargar los servicios. Llámanos al 935 88 76 86.';
                console.error(err);
            }
        };

        loadServices();

        // ── Paso 2: Seleccionar fecha ────────────────────────────────────
        datePicker.addEventListener('change', async () => {
            const selectedDate = datePicker.value;
            if (!selectedDate) return;

            // Comprobar si el día está cerrado
            const diaSemana = new Date(selectedDate + 'T12:00:00').getDay();
            dateClosedMsg.classList.toggle('hidden', !DIAS_CERRADOS.includes(diaSemana));
            if (DIAS_CERRADOS.includes(diaSemana)) {
                timeSlotsSection.classList.add('hidden');
                return;
            }

            state.date = selectedDate;

            // Mostrar loader y pedir franjas libres
            timeSlotsSection.classList.remove('hidden');
            slotsLoader.classList.remove('hidden');
            timeSlotsGrid.classList.add('hidden');
            noSlotsMsg.classList.add('hidden');
            timeSlotsGrid.innerHTML = '';

            try {
                const url = `${APPS_SCRIPT_URL}?action=availability&date=${selectedDate}`;
                const res  = await fetch(url);
                const data = await res.json();

                slotsLoader.classList.add('hidden');

                if (!data.success) throw new Error(data.error);

                if (data.closed || !data.slots || data.slots.length === 0) {
                    noSlotsMsg.classList.remove('hidden');
                    return;
                }

                timeSlotsGrid.classList.remove('hidden');

                data.slots.forEach(hora => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.textContent = hora;
                    btn.className = 'time-slot-btn';
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.time-slot-btn.selected').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        state.time = hora;

                        // Actualizar resúmenes y avanzar al paso 3
                        const fechaFormateada = formatearFecha(selectedDate);
                        document.getElementById('summary-datetime').textContent = `${fechaFormateada} a las ${hora}h`;
                        document.getElementById('confirm-datetime').textContent = `${fechaFormateada} a las ${hora}h`;
                        showStep(3);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                    timeSlotsGrid.appendChild(btn);
                });
            } catch (err) {
                slotsLoader.classList.add('hidden');
                noSlotsMsg.textContent = 'Error al cargar la disponibilidad. Inténtalo de nuevo.';
                noSlotsMsg.classList.remove('hidden');
                console.error(err);
            }
        });

        // ── Paso 3 → Paso 4: Revisar datos ──────────────────────────────
        goToStep4Btn.addEventListener('click', () => {
            if (!bookingForm.reportValidity()) return;

            state.name  = document.getElementById('name').value.trim();
            state.phone = document.getElementById('phone').value.trim();
            state.email = document.getElementById('email').value.trim();

            document.getElementById('confirm-service').textContent  = state.service;
            document.getElementById('confirm-name').textContent     = state.name;
            document.getElementById('confirm-phone').textContent    = state.phone;

            const emailLabel = document.getElementById('confirm-email-label');
            const emailVal   = document.getElementById('confirm-email');
            if (state.email) {
                emailLabel.classList.remove('hidden');
                emailVal.classList.remove('hidden');
                emailVal.textContent = state.email;
            } else {
                emailLabel.classList.add('hidden');
                emailVal.classList.add('hidden');
            }

            bookingResponse.classList.add('hidden');
            showStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // ── Paso 4: Confirmar reserva ────────────────────────────────────
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Enviando...';
            bookingResponse.classList.add('hidden');

            try {
                const res = await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' }, // Apps Script acepta text/plain para evitar preflight CORS
                    body: JSON.stringify({
                        action: 'book',
                        date:    state.date,
                        time:    state.time,
                        service: state.service,
                        name:    state.name,
                        phone:   state.phone,
                        email:   state.email,
                    }),
                });

                const data = await res.json();

                if (!data.success) throw new Error(data.error || 'No se pudo confirmar la reserva.');

                document.getElementById('success-message').textContent = data.message;
                showStep(5);
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (err) {
                bookingResponse.textContent = err.message;
                bookingResponse.className = 'mb-4 p-4 rounded-lg text-center font-medium bg-red-50 text-red-600';
                bookingResponse.classList.remove('hidden');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirmar Reserva';
            }
        });
    };

    // --- BANNER DE COOKIES ---
    // Se ejecuta después de cargar el footer (donde está el banner en el HTML)
    function initCookieBanner() {
        const banner = document.getElementById('cookie-banner');
        if (!banner) return;

        // Si ya dio su respuesta, no mostrar
        if (localStorage.getItem('cookieConsent')) return;

        // Mostrar con pequeño retardo para que no aparezca antes de renderizar
        setTimeout(() => banner.classList.add('visible'), 600);

        document.getElementById('cookie-accept').addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'accepted');
            banner.classList.remove('visible');
        });

        document.getElementById('cookie-reject').addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'rejected');
            banner.classList.remove('visible');
        });
    }

    // --- MODAL DE VACACIONES ---
    const initVacationModal = () => {
        const modal = document.getElementById('vacationModal');
        if (!modal) return;

        // Actualiza estas fechas cuando necesites mostrar el aviso
        const startDate = new Date('2025-08-19T00:00:00');
        const endDate   = new Date('2025-09-02T23:59:59');
        const now       = new Date();

        if (now < startDate || now > endDate) return;

        modal.style.display = 'block';

        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
        }
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    };

    // --- UTILIDADES ---
    function formatearFecha(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // --- INICIALIZAR TODO ---
    initCarousel();
    initGalleryLightbox();
    initServiceAccordions();
    initBookingSystem();
    initVacationModal();
});
