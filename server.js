const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Manejo de contexto por usuario (evita que dos usuarios se pisen el estado al probar juntos)
const sesiones = new Map();

function obtenerSesion(req) {
    const id = req.body.sessionId || req.ip || 'default';
    if (!sesiones.has(id)) {
        sesiones.set(id, { ultimoTema: 'general', matricula: null, intentos: 0 });
    }
    return sesiones.get(id);
}

// Normaliza minúsculas, quita acentos, signos repetidos y espacios extra
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

app.post('/api/reportar', (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje || typeof mensaje !== 'string') {
        return res.status(400).json({ error: 'El mensaje es obligatorio y debe ser texto.' });
    }

    const sesion = obtenerSesion(req);
    const textoCrudo = mensaje.trim();
    const texto = normalizarTexto(mensaje);
    let respuestaBot = "";

    // 1. Detección de ruido, inyecciones básicas, caracteres sueltos o pruebas basura
    const esBasura =
        texto.length < 2 ||
        !/[a-z0-9]/.test(texto) ||
        /^(asdf|qwerty|zxcv|1234|12345|aaaa|eeee|iiii|oooo|uuuu|xxxx|test|prueba|hola123|asd)+$/.test(texto);

    if (esBasura) {
        respuestaBot = "📌 **Asistente Cloud — Validación de Entrada**\n⚠️ **Aviso:** Entrada no reconocida o demasiado corta. Describe el síntoma técnico, código de error HTTP o módulo afectado (ej. *'Error 502 Bad Gateway'*, *'Token de sesión expirado'*, *'ERR_CONNECTION_TIMED_OUT'* o *'No carga el kardex'*).";
    }
    // 2. Saludos iniciales
    else if (/^(hola|buenos dias|buenas tardes|buenas noches|buenos|buenas|hi|hello|hey|que tal|saludos|inicio|empezar)\b/.test(texto)) {
        sesion.ultimoTema = "saludo";
        respuestaBot = "👋 **Nodo de Contingencia Cloud Activo**\nSoy el asistente técnico de respaldo para la plataforma escolar. Puedo diagnosticar errores HTTP (4xx/5xx), fallas de autenticación/sesión, problemas de DNS/SSL/red, caídas de servidor/BD o registrar folios de contingencia para trámites académicos. ¿Qué falla reportas?";
    }
    // 3. Agradecimientos y cierre
    else if (/(gracias|muchas gracias|te agradezco|muy amable|seria todo|adios|hasta luego|nos vemos|bye|listo|todo bien|resuelto|ya quedo|ya funciona)\b/.test(texto)) {
        sesion.ultimoTema = "agradecimiento";
        respuestaBot = "✅ **Cierre de Atención Cloud**\nMe alegra que haya quedado resuelto o registrado. Este nodo de contingencia permanece operativo 24/7 en la nube para garantizar la continuidad del servicio escolar.";
    }
    // 4. Seguimiento contextual estricto (solo si coincide al inicio o como frase de seguimiento real)
    else if (
        sesion.ultimoTema !== "general" &&
        sesion.ultimoTema !== "saludo" &&
        sesion.ultimoTema !== "agradecimiento" &&
        /^(mis datos|si\b|es correcto|ya lo intente|ya lo hice|no funciona|no sirve|sigue igual|persiste|aun no|todavia no|no me dejo|cuanto tarda|tiempo estimado|que hago|y ahora|otro metodo|otra solucion)/.test(texto)
    ) {
        sesion.intentos += 1;
        if (sesion.ultimoTema === "acceso") {
            respuestaBot = "📌 **Seguimiento de Autenticación (Nivel 2)**\n⚠️ **Urgencia:** ALTA\n\n💡 **Diagnóstico Avanzado:** Si las credenciales son válidas y el rechazo persiste, el fallo apunta a desincronización con el servidor **LDAP / Active Directory**, bloqueo preventivo por intentos fallidos o corrupción de cookies de sesión. **Acción:** Espera 15 minutos, prueba desde otro navegador limpio o envía tu matrícula (7-10 dígitos) para registrar incidencia de acceso en bitácora.";
        } else if (sesion.ultimoTema === "servidor") {
            respuestaBot = "📌 **Seguimiento de Infraestructura / Backend (Nivel 2)**\n⚠️ **Urgencia:** CRÍTICA\n\n💡 **Diagnóstico Avanzado:** La indisponibilidad del servidor de origen o del pool de base de datos está confirmada. No ejecutes recargas masivas (F5) para evitar saturar el balanceador de carga. Tu reporte ya está escalado en este nodo cloud; reintenta en 20-30 minutos.";
        } else if (sesion.ultimoTema === "red") {
            respuestaBot = "📌 **Seguimiento de Conectividad / Capa de Red (Nivel 2)**\n⚠️ **Urgencia:** MEDIA\n\n💡 **Diagnóstico Avanzado:** Si tras limpiar caché y usar modo incógnito el error continúa, el bloqueo ocurre en el **firewall perimetral, proxy institucional o resolución DNS**. Cambia de interfaz de red (ej. de Wi-Fi institucional a datos móviles) o ejecuta `ipconfig /flushdns` y verifica.";
        } else if (sesion.ultimoTema === "academico") {
            respuestaBot = "📌 **Seguimiento de Trámite Académico (Nivel 2)**\n⚠️ **Urgencia:** ALTA\n\n💡 **Diagnóstico Avanzado:** Los microservicios académicos dependen del motor transaccional central. Escribe tu **matrícula o número de control (7 a 10 dígitos)** para generar un folio de contingencia con marca de tiempo que respalde tu trámite ante control escolar.";
        }
    }
    // 5. Registro de matrícula / número de control
    else if (/\b\d{7,10}\b/.test(texto)) {
        const matricula = texto.match(/\b\d{7,10}\b/)[0];
        sesion.matricula = matricula;
        respuestaBot = `📌 **Folio de Contingencia Registrado**\n⚠️ **Urgencia:** MEDIA\n\n💡 **Confirmación:** Matrícula **${matricula}** vinculada al tema **${sesion.ultimoTema.toUpperCase()}** con sello de tiempo \`${new Date().toISOString()}\`. Conserva esta evidencia ante cualquier aclaración administrativa o académica.`;
    }
    // 6. Errores específicos de Seguridad, Certificados SSL/TLS y CORS
    else if (/(ssl|tls|certificado|no es seguro|https|mixed content|cors|cross origin|bloqueado por politica|err_cert|net::err_cert|caduco el certificado)/.test(texto)) {
        sesion.ultimoTema = "red";
        respuestaBot = "📌 **Diagnóstico:** Falla de Seguridad / Certificado SSL-TLS o Política CORS\n⚠️ **Urgencia:** ALTA\n\n💡 **Orientación:** El navegador rechazó la conexión por un certificado digital vencido/no confiable o un encabezado CORS mal configurado en el servidor. Verifica que la fecha y hora de tu equipo estén sincronizadas, usa el enlace oficial `https://` y evita redes públicas con portales cautivos que interceptan tráfico TLS.";
    }
    // 7. Errores específicos de Gateway, Proxy Inverso, Timeouts y Caída de Servidor (5xx / Infraestructura)
    else if (/(500|502|503|504|507|508|511|bad gateway|service unavailable|gateway timeout|internal server error|nginx|apache|iis|balanceador|proxy inverso|timeout|tiempo de espera|err_connection_timed_out|err_connection_refused|err_empty_response|caid|cayo|servidor|base de datos|mysql|postgres|sql|mongo|deadlock|pool de conexiones|saturad|colaps|sobrecarg|mantenimiento|fuera de servicio|host|backend|api no responde)/.test(texto)) {
        sesion.ultimoTema = "servidor";
        respuestaBot = "📌 **Diagnóstico:** Caída de Infraestructura / Error 5xx / Saturación de Servidor o BD\n⚠️ **Urgencia:** CRÍTICA\n\n💡 **Orientación:** El servidor de aplicaciones, proxy inverso o motor de base de datos no responde dentro del tiempo límite (*Gateway Timeout / Service Unavailable*). Este nodo cloud independiente permanece activo como respaldo operativo; evita recargar continuamente y deja tu matrícula si necesitas evidencia.";
    }
    // 8. Errores HTTP 4xx de Cliente, Rutas Rotas o Límite de Peticiones
    else if (/(400|404|405|408|429|not found|no encontrado|pagina no existe|ruta rota|enlace roto|bad request|too many requests|muchas peticiones|rate limit|pantalla en blanco|pagina en blanco|no carga el css|no carga la interfaz|script error|json)/.test(texto)) {
        sesion.ultimoTema = "servidor";
        respuestaBot = "📌 **Diagnóstico:** Error de Cliente / Recurso No Encontrado (404/400) o Límite de Peticiones (429)\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Si ves un **404 Not Found** o pantalla en blanco, el frontend o endpoint solicitado no está disponible tras un despliegue o caída parcial. Si ves **429 Too Many Requests**, el sistema bloqueó temporalmente tu IP por exceso de solicitudes; espera 5 minutos y recarga con `Ctrl + F5`.";
    }
    // 9. Autenticación, Permisos (401/403), Tokens y Gestión de Sesiones
    else if (/(401|403|forbidden|unauthorized|acceso denegado|sin permisos|no autorizado|acced|acces|ingres|entr|login|logeo|logueo|sesion|cuenta|contrasena|password|clave|nip|pin|usuario|matricula|bloquead|credencial|rechaz|invalido|token|jwt|expirad|caducad|ldap|active directory|sso|no me deja|rebota)/.test(texto)) {
        sesion.ultimoTema = "acceso";
        respuestaBot = "📌 **Diagnóstico:** Falla de Autenticación (401), Permisos (403) o Sesión Expirada\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Revisa que tu matrícula y contraseña no tengan espacios extra ni bloqueo de mayúsculas. Si el sistema te saca inmediatamente o marca **401/403 / sesión expirada**, borra cookies del dominio para renovar el token de sesión o ingresa desde una ventana privada.";
    }
    // 10. Red, DNS, Caché, Navegadores y Conectividad Local
    else if (/(cach|cache|historial|cooki|limpiar|red|internet|wifi|conex|datos|dns|err_name_not_resolved|no se puede acceder a este sitio|ip|proxy|vpn|firewall|puerto|navegador|chrome|edge|firefox|safari|brave|opera|incognito|latencia|lento|tard|trab|congel|packet loss|paquetes)/.test(texto)) {
        sesion.ultimoTema = "red";
        respuestaBot = "📌 **Diagnóstico:** Falla de Resolución DNS, Caché Corrupta o Conectividad Local\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Presiona `Ctrl + Shift + Supr` para purgar caché/cookies o abre **modo incógnito** (`Ctrl + Shift + N`). Si aparece `ERR_NAME_NOT_RESOLVED`, hay falla de DNS: desactiva VPN/proxy, cambia entre Wi-Fi y datos móviles o limpia caché DNS local.";
    }
    // 11. Módulos Académicos, Control Escolar y Trámites
    else if (/(calificacion|calificaciones|materia|materias|horario|horarios|inscripcion|reinscripcion|carga academica|kardex|constancia|boleta|tramite|residencia|servicio social|titulacion|pago|referencia|ficha|grupo|profesor|acta|evaluacion|plataforma escolar|moodle|sii|sistema integral)/.test(texto)) {
        sesion.ultimoTema = "academico";
        respuestaBot = "📌 **Diagnóstico:** Indisponibilidad en Módulo Académico / Control Escolar\n⚠️ **Urgencia:** ALTA\n\n💡 **Orientación:** Los módulos de gestión escolar (inscripciones, calificaciones, kardex, pagos) dependen de la base de datos institucional central. Si tienes una fecha límite hoy, ingresa tu **matrícula (7 a 10 dígitos)** aquí para registrar folio de respaldo con fecha y hora.";
    }
    // 12. Consultas sobre el propio sistema / Arquitectura (por si el profe pregunta qué hace el bot)
    else if (/(quien eres|que haces|como funcionas|arquitectura|que eres|ayuda|opciones|menu|comandos|que puedes hacer)/.test(texto)) {
        sesion.ultimoTema = "general";
        respuestaBot = "📌 **Arquitectura del Servicio de Contingencia Cloud**\nℹ️ **Capacidades:** Soy un sistema de diagnóstico automatizado desplegado en la nube independiente de la infraestructura escolar. Clasifico incidentes en 4 capas:\n1. **Infraestructura y HTTP 5xx** (500, 502, 503, 504, timeouts, BD).\n2. **Autenticación y Seguridad** (401, 403, JWT/sesiones, SSL/TLS, CORS).\n3. **Red y Cliente** (DNS, caché, 404/429, firewall/VPN).\n4. **Continuidad Académica** (registro de folios por matrícula ante caídas).";
    }
    // 13. Fallback estructurado
    else {
        sesion.ultimoTema = "general";
        respuestaBot = "📌 **Soporte Técnico Cloud — Clasificación Pendiente**\n⚠️ **Urgencia:** BAJA\n\n💡 **Orientación:** No detecté una firma de error específica en tu mensaje. Indícame el código de error (ej. *502, 403, 404, timeout*) o el área afectada (**acceso/contraseña**, **caída de servidor/BD**, **red/DNS/SSL** o **trámite escolar**).";
    }

    res.json({
        status: 'exito',
        reporte: {
            mensajeOriginal: textoCrudo,
            categoriaDetectada: sesion.ultimoTema,
            solucion: respuestaBot
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Cloud ejecutándose en http://localhost:${PORT}`);
});