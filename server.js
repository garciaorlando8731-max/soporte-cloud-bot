const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const MAX_MESSAGE_LENGTH = 500;
const MIN_INTERVAL_MS = 600;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_HISTORY = 30;

// Almacén en memoria aislado por sesión
const sessions = new Map();

app.use(express.json({ limit: '10kb' }));

// Servir archivos estáticos desde public/ (con respaldo en raíz si hiciera falta)
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}
app.use(express.static(__dirname));

// Limpieza periódica de sesiones inactivas para cuidar la RAM en Render
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - (session.lastActive || 0) > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

function getOrCreateSession(rawSessionId) {
  let id = typeof rawSessionId === 'string' && rawSessionId.trim()
    ? rawSessionId.trim().slice(0, 80)
    : null;

  if (!id || !sessions.has(id)) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessions.set(id, {
      id,
      createdAt: Date.now(),
      lastActive: Date.now(),
      lastMessageAt: 0,
      lastCategory: null,
      history: []
    });
  }

  const session = sessions.get(id);
  session.lastActive = Date.now();
  return session;
}

// Excepción permitida: ubicación del departamento de TI / Sistemas
function isItLocationQuestion(text) {
  const normalized = text.toLowerCase();
  const mentionsIt = /\b(sistemas|ti|tecnologias de la informacion|tecnologias de informacion|soporte tecnico|computo|centro de computo|it)\b/.test(normalized);
  const asksLocation = /\b(donde|ubicacion|ubica|queda|esta|estan|edificio|salon|laboratorio|oficina|como llego|ruta)\b/.test(normalized);
  return mentionsIt && asksLocation;
}

// Restricción de dominio: matemáticas y geografía (salvo ubicación de IT)
function isOutOfDomain(text) {
  if (isItLocationQuestion(text)) return false;

  const normalized = text.toLowerCase();

  // Evita falsos positivos con códigos HTTP (ej. 500, 502, 404) o fechas/horas
  const hasMathKeywords = /\b(cuanto es|cuanto da|suma|resta|multiplica|multiplicacion|divide|division|porcentaje|raiz cuadrada|ecuacion|algebra|calcula|calcular|fraccion|potencia)\b/.test(normalized);
  const hasMathExpression = /(?:^|\s)-?\d+(?:\.\d+)?\s*[\+\-\*\/x×÷=]\s*-?\d+(?:\.\d+)?(?:\s|$)/.test(normalized);

  const hasGeoKeywords = /\b(capital de|continente|oceano|pais|paises|frontera|limita con|latitud|longitud|geografia|rio mas largo|montana|cordillera|poblacion de|mapa)\b/.test(normalized);

  return hasMathKeywords || hasMathExpression || hasGeoKeywords;
}

function classifyAndRespond(message, session) {
  const m = message.toLowerCase();

  if (isItLocationQuestion(message)) {
    session.lastCategory = 'it_location';
    return (
      'Ubicación del Departamento de Tecnologías de la Información (TI / Sistemas):\n' +
      'Acude al área de Sistemas / Tecnologías de la Información del plantel en horario laboral ' +
      'o consulta el directorio oficial de tu institución si necesitas atención presencial.'
    );
  }

  if (isOutOfDomain(message)) {
    session.lastCategory = 'out_of_domain';
    return (
      'Alcance del Asistente Cloud:\n' +
      'Solo estoy diseñado para brindarte ayuda de soporte técnico de la plataforma escolar; ' +
      'NO realizo operaciones matemáticas ni respondo temas de geografía ' +
      '(salvo preguntas sobre dónde se encuentra el Departamento de Tecnologías de la Información). ' +
      '¿Presentas alguna falla de acceso, red, error HTTP o trámite?'
    );
  }

  // Módulo 1: Infraestructura / Caídas / Errores 5xx
  if (/\b(caida|caido|cayo|no carga|no abre|500|502|503|504|bad gateway|gateway timeout|servidor|cloud|instancia|saturad|lento|lenta|no jala)\b/.test(m)) {
    session.lastCategory = 'infrastructure';
    return (
      'Módulo de Infraestructura y Disponibilidad:\n' +
      '1. Recarga la página con Ctrl + F5 y prueba en una ventana de incógnito.\n' +
      '2. Si ves errores 502, 503 o 504, suele ser saturación o reinicio temporal del servicio.\n' +
      '3. Espera 1 o 2 minutos y reintenta; si persiste, reporta la hora exacta y el código de error a TI.'
    );
  }

  // Módulo 2: Autenticación / Permisos / 4xx / SSL / CORS
  if (/\b(login|iniciar sesion|sesion|contrasena|password|usuario|matricula|token|401|403|419|unauthorized|forbidden|ssl|certificado|cors|bloquead|acceso)\b/.test(m)) {
    session.lastCategory = 'authentication';
    return (
      'Módulo de Autenticación y Acceso:\n' +
      '1. Verifica tu matrícula/correo institucional y que no tengas Bloq Mayús activo.\n' +
      '2. Borra cookies o datos del sitio para el portal escolar y vuelve a iniciar sesión.\n' +
      '3. Si marca 401/403 o fallo de certificado, es probable que tu sesión haya expirado o requiera validación de cuenta con TI.'
    );
  }

  // Módulo 3: Red / DNS / Conectividad
  if (/\b(red|wifi|internet|dns|nxdomain|timeout|ping|ip|proxy|vpn|sin conexion|desconect)\b/.test(m)) {
    session.lastCategory = 'network';
    return (
      'Módulo de Red y Conectividad:\n' +
      '1. Cambia temporalmente de red (por ejemplo, de Wi-Fi a datos móviles o viceversa) y desactiva VPN/proxy si usas.\n' +
      '2. Si aparece error de DNS, intenta cambiar a DNS públicos (8.8.8.8 o 1.1.1.1) o reiniciar tu adaptador/módem.\n' +
      '3. Si en otra red sí carga, el problema está en tu red local o en la red del campus.'
    );
  }

  // Módulo 4: Académico / Plataforma escolar / Trámites
  if (/\b(materia|materias|calificacion|calificaciones|boleta|horario|inscripcion|reinscripcion|tarea|examen|moodle|plataforma|portal|escolar|404)\b/.test(m)) {
    session.lastCategory = 'academic';
    return (
      'Módulo de Plataforma Escolar y Trámites:\n' +
      '1. Revisa el periodo o ciclo activo seleccionado en la plataforma.\n' +
      '2. Si no ves materias, calificaciones o te marca 404 en un módulo específico, confirma con Control Escolar o coordinación académica.\n' +
      '3. Si el error ocurre al subir archivos o guardar formularios, revisa el formato y peso del archivo.'
    );
  }

  // Respuesta por defecto si no encaja en una regla específica
  session.lastCategory = 'general';
  return (
    'Soporte Técnico Escolar:\n' +
    'Puedo ayudarte con caídas o errores 500/502/503/504, fallas de inicio de sesión o permisos (401/403), ' +
    'problemas de red/DNS, fallas en módulos escolares o la ubicación del Departamento de TI. ' +
    'Cuéntame qué mensaje o falla ves exactamente.'
  );
}

app.post('/api/chat', (req, res) => {
  try {
    const rawMessage = req.body?.message;
    if (typeof rawMessage !== 'string') {
      return res.status(400).json({ error: 'El campo message debe ser texto.' });
    }

    const trimmed = rawMessage.trim();
    if (!trimmed) {
      return res.status(400).json({ error: 'Escribe un mensaje antes de enviar.' });
    }

    const message = trimmed.slice(0, MAX_MESSAGE_LENGTH);
    const session = getOrCreateSession(req.body?.sessionId);

    const now = Date.now();
    if (now - session.lastMessageAt < MIN_INTERVAL_MS) {
      return res.status(429).json({
        error: 'Estás enviando mensajes muy rápido. Espera un momento e intenta de nuevo.'
      });
    }
    session.lastMessageAt = now;

    const reply = classifyAndRespond(message, session);

    session.history.push(
      { role: 'user', text: message, at: now },
      { role: 'bot', text: reply, at: now }
    );
    if (session.history.length > MAX_HISTORY) {
      session.history.splice(0, session.history.length - MAX_HISTORY);
    }

    return res.json({
      sessionId: session.id,
      category: session.lastCategory,
      reply
    });
  } catch (err) {
    console.error('Error en /api/chat:', err);
    return res.status(500).json({ error: 'Ocurrió un error interno al procesar tu mensaje.' });
  }
});

// Ruta principal
app.get('/', (req, res) => {
  const indexInPublic = path.join(__dirname, 'public', 'index.html');
  const indexInRoot = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexInPublic)) {
    return res.sendFile(indexInPublic);
  }
  if (fs.existsSync(indexInRoot)) {
    return res.sendFile(indexInRoot);
  }
  return res.status(404).send('No se encontró index.html');
});

// Manejo global de JSON mal formado o errores de payload
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.parse.failed' || err.type === 'entity.too.large')) {
    return res.status(400).json({ error: 'Petición inválida o demasiado grande.' });
  }
  console.error('Error no controlado:', err);
  return res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});