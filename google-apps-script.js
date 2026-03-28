

// =====================================================
//  CONSTANTES DE CONFIGURACIÓN — 
// =====================================================


const CALENDAR_ID = 'primary';

/** Email del salón donde llegarán las notificaciones de nueva cita. */
const SALON_EMAIL = 'yoselingmagiaycolor@gmail.com';

/** Duración por defecto de cada franja horaria en minutos. */
const SLOT_DURATION_MIN = 30;

/**
 * Horario de apertura por día de la semana.
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado.
 * Un array vacío [] significa que ese día está cerrado.
 * Puedes añadir varios tramos por día (p.ej. mañana y tarde).
 */
const HORARIO = {
  0: [],  // Domingo: cerrado
  1: [],  // Lunes: cerrado
  2: [{ abre: '09:30', cierra: '13:00' }, { abre: '15:30', cierra: '20:00' }],  // Martes
  3: [{ abre: '09:30', cierra: '13:00' }, { abre: '15:30', cierra: '20:00' }],  // Miércoles
  4: [{ abre: '09:30', cierra: '13:00' }, { abre: '15:30', cierra: '20:00' }],  // Jueves
  5: [{ abre: '09:30', cierra: '20:00' }],  // Viernes: jornada continua
  6: [{ abre: '08:30', cierra: '14:00' }],  // Sábado
};

// =====================================================
//  LISTA DE SERVICIOS
//  Añade o quita servicios según necesites.
// =====================================================
const SERVICIOS = [
  'Corte Hombre',
  'Corte Mujer (Pelo Corto)',
  'Corte Mujer (Pelo Medio)',
  'Corte Mujer (Pelo Largo)',
  'Baño de Color (Pelo Corto/Medio)',
  'Baño de Color (Pelo Largo)',
  'Tinte Completo (Pelo Corto)',
  'Tinte Completo (Pelo Medio)',
  'Tinte Completo (Pelo Largo)',
  'Tinte Raíz (Pelo Corto)',
  'Tinte Raíz (Pelo Medio)',
  'Tinte Raíz (Pelo Largo)',
  'Mechas Balayage (Pelo Medio)',
  'Mechas Balayage (Pelo Largo)',
  'Mechas Balayage (Pelo Extra Largo)',
  'Mechas Tradicionales',
  'Mechas Babylight',
  'Matiz',
  'Permanente Rizo',
  'Alisado con Queratina',
  'Hidratación',
  'Cejas',
  'Depilación Facial',
  'Depilación Corporal',
  'Manicura Normal',
  'Manicura Semipermanente',
  'Pedicura Normal',
  'Pedicura Semipermanente',
  'Maquillaje',
  'Peinado para Evento',
];

// =====================================================
//  LÓGICA PRINCIPAL —
// =====================================================

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'services') {
    return jsonResponse({ success: true, services: SERVICIOS });
  }

  if (action === 'availability') {
    const date = e.parameter.date;
    if (!date) return jsonResponse({ success: false, error: 'Falta el parámetro date.' });
    const slots = getAvailableSlots(date);
    return jsonResponse({ success: true, slots, closed: slots === null });
  }

  return jsonResponse({ success: false, error: 'Acción no reconocida.' });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (_) {
    return jsonResponse({ success: false, error: 'JSON inválido.' });
  }

  if (body.action === 'book') {
    return jsonResponse(createBooking(body));
  }

  return jsonResponse({ success: false, error: 'Acción no reconocida.' });
}

// Devuelve las franjas libres para una fecha dada (YYYY-MM-DD),
// o null si el salón está cerrado ese día.
function getAvailableSlots(dateStr) {
  const date = new Date(dateStr + 'T12:00:00'); // Mediodía para evitar problemas de DST
  const diaSemana = date.getDay();
  const tramos = HORARIO[diaSemana];

  if (!tramos || tramos.length === 0) return null; // Día cerrado

  // Todos los huecos del día según el horario
  const todasFranjas = [];
  tramos.forEach(({ abre, cierra }) => {
    todasFranjas.push(...generarFranjas(dateStr, abre, cierra));
  });

  // Eventos ya existentes en el calendario ese día
  const inicioDia = new Date(dateStr + 'T00:00:00');
  const finDia    = new Date(dateStr + 'T23:59:59');
  const calendar  = CalendarApp.getCalendarById(CALENDAR_ID);
  const eventos   = calendar.getEvents(inicioDia, finDia);

  // Filtrar franjas ocupadas
  const ahora = new Date();
  return todasFranjas.filter(franja => {
    const inicio = new Date(dateStr + 'T' + franja + ':00');
    const fin    = new Date(inicio.getTime() + SLOT_DURATION_MIN * 60 * 1000);

    // Ignorar franjas pasadas si es hoy
    if (inicio <= ahora) return false;

    // Ignorar franjas que solapan con eventos del calendario
    return !eventos.some(ev => inicio < ev.getEndTime() && fin > ev.getStartTime());
  });
}

// Genera todas las franjas de SLOT_DURATION_MIN minutos entre `abre` y `cierra`.
function generarFranjas(dateStr, abre, cierra) {
  const franjas = [];
  const [hA, mA] = abre.split(':').map(Number);
  const [hC, mC] = cierra.split(':').map(Number);

  let minutos = hA * 60 + mA;
  const finMinutos = hC * 60 + mC;

  while (minutos + SLOT_DURATION_MIN <= finMinutos) {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0');
    const m = String(minutos % 60).padStart(2, '0');
    franjas.push(h + ':' + m);
    minutos += SLOT_DURATION_MIN;
  }
  return franjas;
}

// Crea un evento en Google Calendar y envía email de confirmación.
function createBooking(data) {
  const { date, time, service, name, phone, email } = data;

  if (!date || !time || !service || !name) {
    return { success: false, error: 'Faltan datos obligatorios (fecha, hora, servicio, nombre).' };
  }

  // Verificar que el hueco sigue libre (evita dobles reservas)
  const franjas = getAvailableSlots(date);
  if (!franjas || !franjas.includes(time)) {
    return { success: false, error: 'Ese horario ya no está disponible. Por favor elige otra hora.' };
  }

  const inicio = new Date(date + 'T' + time + ':00');
  const fin    = new Date(inicio.getTime() + SLOT_DURATION_MIN * 60 * 1000);

  const descripcion = [
    'Servicio: ' + service,
    'Cliente: ' + name,
    phone ? 'Teléfono: ' + phone : '',
    email ? 'Email: ' + email : '',
    '— Reservado online desde yoselinmagiaycolor.es',
  ].filter(Boolean).join('\n');

  // Crear evento en Google Calendar
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  calendar.createEvent(service + ' — ' + name, inicio, fin, {
    description: descripcion,
    guests: email || '',
    sendInvites: !!email,
  });

  // Notificación al salón
  try {
    GmailApp.sendEmail(
      SALON_EMAIL,
      'Nueva cita: ' + service + ' (' + name + ')',
      'Se ha realizado una nueva reserva online:\n\n' + descripcion + '\n\nFecha: ' + date + '\nHora: ' + time
    );
  } catch (_) {
    // Si falla el email al salón, la cita se crea igualmente
  }

  return {
    success: true,
    message: '¡Cita confirmada! Te esperamos el ' + formatearFecha(date) + ' a las ' + time + 'h.',
  };
}

function formatearFecha(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
