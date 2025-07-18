document.addEventListener('DOMContentLoaded', () => {

    // --- CARGADOR DE COMPONENTES (NAV, FOOTER, CHAT) ---
    const loadComponent = (url, placeholderId) => {
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) {
            fetch(url)
                .then(response => response.text())
                .then(data => {
                    placeholder.innerHTML = data;
                    // Re-ejecutar scripts específicos después de cargar componentes
                    if (placeholderId === 'navbar-placeholder') initMobileMenu();
                    if (placeholderId === 'chat-placeholder') initChat();
                })
                .catch(error => console.error(`Error loading ${url}:`, error));
        }
    };
    
    loadComponent('nav.html', 'navbar-placeholder');
    loadComponent('footer.html', 'footer-placeholder');
    loadComponent('chat.html', 'chat-placeholder');

    // --- INICIALIZADOR DEL MENÚ MÓVIL ---
    const initMobileMenu = () => {
        const menuButton = document.querySelector('[data-collapse-toggle="navbar-sticky"]');
        const navbar = document.getElementById('navbar-sticky');
        if (menuButton && navbar) {
            menuButton.addEventListener('click', () => navbar.classList.toggle('hidden'));
            
            // Marcar el enlace activo
            const navLinks = navbar.querySelectorAll('.nav-link');
            const currentPage = window.location.pathname.split('/').pop();
            navLinks.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.setAttribute('aria-current', 'page');
                }
            });
        }
    };

    // --- SMOOTH SCROLL PARA ANCLAS ---
    document.body.addEventListener('click', (e) => {
        if (e.target.matches('a[href^="#"]')) {
            e.preventDefault();
            const targetId = e.target.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // --- LÓGICA DEL CARRUSEL (PÁGINA DE INICIO) ---
    const initCarousel = () => {
        const track = document.getElementById('carousel-track');
        if (!track) return;

        const items = track.querySelectorAll('.carousel-item');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (items.length === 0) return;

        let currentIndex = 0;
        const totalItems = items.length;

        const updateCarousel = () => {
            const itemWidth = track.querySelector('.carousel-item').clientWidth;
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
        updateCarousel(); // initial call
    };
    
    // --- LÓGICA DEL MODAL "ANTES Y DESPUÉS" (PÁGINA DE GALERÍA) ---
    const initImageModal = () => {
        const openModalBtn = document.getElementById('openModalBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const imageModal = document.getElementById('imageModal');
        
        if (!openModalBtn || !closeModalBtn || !imageModal) return;

        const openModal = () => imageModal.classList.remove('hidden');
        const closeModal = () => imageModal.classList.add('hidden');

        openModalBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        imageModal.addEventListener('click', (event) => {
            if (event.target === imageModal) closeModal();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !imageModal.classList.contains('hidden')) closeModal();
        });
    };
    
    // --- LÓGICA DE DESPLEGABLES (PÁGINA DE SERVICIOS) ---
    const initServiceAccordions = () => {
        const serviceItems = document.querySelectorAll('.service-item button');
        if (serviceItems.length === 0) return;

        serviceItems.forEach(button => {
            button.addEventListener('click', () => {
                const details = button.nextElementSibling;
                const icon = button.querySelector('svg');
                const isCurrentlyOpen = details.style.maxHeight;

                // Cierra todos los demás
                document.querySelectorAll('.service-item .service-details').forEach(d => {
                    if (d !== details) {
                        d.style.maxHeight = null;
                        const i = d.previousElementSibling.querySelector('svg');
                        if (i) i.style.transform = 'rotate(0deg)';
                    }
                });

                // Abre/cierra el actual
                if (isCurrentlyOpen) {
                    details.style.maxHeight = null;
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    details.style.maxHeight = details.scrollHeight + "px";
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            });
        });
    };

    // --- LÓGICA DEL SISTEMA DE RESERVAS (PÁGINA DE AGENDA) ---
const initBookingSystem = () => {
    const datePicker = document.getElementById('date-picker');
    if (!datePicker) return;

    // URLs de tus webhooks de n8n
    const GET_SERVICES_URL = 'https://nexmaia.app.n8n.cloud/webhook/18d65326-e3c6-4d33-8354-b813b6f2d8d4';
    const GET_AVAILABILITY_URL = 'https://nexmaia.app.n8n.cloud/webhook/04ea4a45-848b-423b-b332-4190a61e9313';
    const CREATE_BOOKING_URL = 'https://nexmaia.app.n8n.cloud/webhook/d4f6ad0b-b8c9-47a7-949d-08ca79bac86c';

    const serviceSelect = document.getElementById('service');
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const timeSlotsGrid = document.getElementById('time-slots-grid');
    const loader = document.getElementById('loader');
    const bookingFormContainer = document.getElementById('booking-form-container');
    const bookingForm = document.getElementById('booking-form');
    const responseMessage = document.getElementById('response-message');
    
    let selectedTime = null;

    // Se define la función que carga los servicios
    const loadServices = async () => {
        try {
            const response = await fetch(GET_SERVICES_URL);
            if (!response.ok) throw new Error('No se pudieron cargar los servicios.');

            const data = await response.json();
            const services = data.services || [];

            serviceSelect.innerHTML = '<option value="">-- Elige un servicio --</option>';

            services.forEach(serviceName => {
                const option = document.createElement('option');
                option.value = serviceName;
                option.textContent = serviceName;
                serviceSelect.appendChild(option);
            });
            
            // La llamada incorrecta ha sido eliminada de aquí

        } catch (error) {
            serviceSelect.innerHTML = '<option value="">Error al cargar servicios</option>';
            console.error(error);
        }
    };

    loadServices();
    
    datePicker.addEventListener('change', async () => {
        const selectedDate = datePicker.value;
        if (!selectedDate) return;

        timeSlotsGrid.innerHTML = '';
        bookingFormContainer.classList.add('hidden');
        responseMessage.innerHTML = '';
        timeSlotsContainer.classList.remove('hidden');
        loader.classList.remove('hidden');

        try {
            const response = await fetch(GET_AVAILABILITY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: selectedDate })
            });
            if (!response.ok) throw new Error('Error al cargar la disponibilidad.');
            
            const data = await response.json();
            const availableTimes = data.availableSlots || data;
            
            loader.classList.add('hidden');
            
            if (!availableTimes || availableTimes.length === 0) {
                timeSlotsGrid.innerHTML = '<p class="col-span-full text-center">No hay horas disponibles. Elige otra fecha.</p>';
                return;
            }

            availableTimes.forEach(time => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = time;
                btn.className = 'p-3 border rounded-lg time-slot-btn hover:bg-gray-200';
                btn.dataset.time = time;
                btn.addEventListener('click', () => {
                    const prevSelected = document.querySelector('.time-slot-btn.selected');
                    if (prevSelected) prevSelected.classList.remove('selected');
                    btn.classList.add('selected');
                    selectedTime = btn.dataset.time;
                    bookingFormContainer.classList.remove('hidden');
                });
                timeSlotsGrid.appendChild(btn);
            });

        } catch (error) {
            loader.classList.add('hidden');
            timeSlotsGrid.innerHTML = `<p class="col-span-full text-center text-red-500">${error.message}</p>`;
        }
    });

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        responseMessage.innerHTML = '<p>Procesando tu reserva...</p>';

        const formData = new FormData(bookingForm);
        const bookingData = {
            date: datePicker.value,
            time: selectedTime,
            service: formData.get('service'),
            name: formData.get('name'),
            email: formData.get('email')
        };

        try {
            const response = await fetch(CREATE_BOOKING_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            if (!response.ok) throw new Error('No se pudo completar la reserva.');

            const result = await response.json();
            bookingForm.style.display = 'none';
            timeSlotsContainer.style.display = 'none';
            datePicker.style.display = 'none';
            
            document.querySelector('#booking-system').innerHTML = `
                <div class="text-center bg-green-50 p-8 rounded-lg">
                    <h2 class="text-2xl font-bold text-green-700">¡Reserva Confirmada!</h2>
                    <p class="mt-2 text-green-600">${result.message || 'Recibirás un email con los detalles.'}</p>
                    <a href="index.html" class="mt-6 inline-block btn-accent">Volver al Inicio</a>
                </div>`;

        } catch (error) {
            responseMessage.innerHTML = `<p class="text-red-500 font-bold">${error.message}</p>`;
        }
    });
};
    // --- LÓGICA DEL CHAT ---
    const initChat = () => {
        const webhookUrl = 'https://nexmaia.app.n8n.cloud/webhook/8210fd58-2cd2-49b3-9a56-d9534c292ca5';
        const chatContainer = document.getElementById('chat-container');
        const chatToggleButton = document.getElementById('chat-toggle-button');
        const closeChatBtn = document.getElementById('close-chat-btn');
        const chatMessages = document.getElementById('chat-messages-container');
        const userInput = document.getElementById('user-chat-input');
        const sendButton = document.getElementById('send-chat-button');
        const pedirCitaButtons = document.querySelectorAll('.js-pedir-cita');

        if (!chatContainer) return; // Si el chat no está cargado, no hacer nada

        let sessionId = localStorage.getItem('chatSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('chatSessionId', sessionId);
        }

        const openChat = () => {
            chatContainer.classList.add('visible');
            chatToggleButton.style.opacity = '0';
            userInput.focus();
        };

        const closeChat = () => {
            chatContainer.classList.remove('visible');
            chatToggleButton.style.opacity = '1';
        };

        const addMessage = (text, className) => {
            const msgEl = document.createElement('div');
            msgEl.classList.add('message', className);
            msgEl.textContent = text;
            chatMessages.appendChild(msgEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            return msgEl;
        };

        const handleSendMessage = async () => {
            const messageText = userInput.value.trim();
            if (!messageText) return;

            addMessage(messageText, 'user-message');
            userInput.value = '';
            const typingIndicator = addMessage('Asistente está escribiendo...', 'typing-indicator');

            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatInput: messageText, sessionId: sessionId })
                });
                const data = await response.json();
                chatMessages.removeChild(typingIndicator);
                addMessage(data.text || 'No he podido procesar tu solicitud.', 'bot-message');
            } catch (error) {
                chatMessages.removeChild(typingIndicator);
                addMessage('Hay un problema de conexión. Inténtalo de nuevo.', 'bot-message');
            }
        };

        chatToggleButton.addEventListener('click', openChat);
        closeChatBtn.addEventListener('click', closeChat);
        sendButton.addEventListener('click', handleSendMessage);
        userInput.addEventListener('keypress', e => e.key === 'Enter' && handleSendMessage());

        // Manejar botones "Pedir Cita" que abren el chat
        document.body.addEventListener('click', (e) => {
            if (e.target.matches('.js-pedir-cita')) {
                e.preventDefault();
                openChat();
                setTimeout(() => {
                    userInput.value = 'Hola, me gustaría pedir una cita.';
                    userInput.focus();
                }, 300);
            }
        });
    };
    
    // --- EJECUTAR LOS INICIALIZADORES ---
    initCarousel();
    initImageModal();
    initServiceAccordions();
    initBookingSystem();
    // initChat y initMobileMenu son llamados desde el cargador de componentes
});