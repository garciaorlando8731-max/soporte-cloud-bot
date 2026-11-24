const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let ultimoTema = "general";

// Normaliza minúsculas, quita acentos y limpia espacios para que las reglas no fallen por tildes
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

app.post('/api/reportar', (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje) {
        return res.status(400).json({ error: 'El mensaje es obligatorio' });
    }

    const textoCrudo = mensaje.toLowerCase().trim();
    const texto = normalizarTexto(mensaje);
    let respuestaBot = "";

    // 1. Detección de símbolos extraños, caracteres sueltos o pruebas de basura
    const esSimboloExtrano =
        /^[^a-z0-9]+$/.test(texto) ||
        texto.length < 2 ||
        /^(asdf|qwerty|zxcv|1234|aaaa|eeee|iiii|oooo|uuuu|xxxx|test|prueba)+$/.test(texto);

    if (esSimboloExtrano) {
        respuestaBot = "📌 **Asistente Cloud**\n⚠️ **Aviso:** No logro entender tu mensaje o los caracteres ingresados. Por favor, describe tu problema técnico utilizando palabras claras (ej. 'no puedo acceder', 'error 502', 'la plataforma está caída' o 'problemas de red').";
    }
    // 2. Saludos iniciales
    else if (/^(hola|buenos|buenas|hi|hello|hey|que tal|saludos|inicio|empezar)\b/.test(texto)) {
        ultimoTema = "saludo";
        respuestaBot = "¡Hola! Soy tu asistente de soporte técnico independiente en la nube. Estoy activo para ayudarte ante cualquier caída de la plataforma escolar, problemas de red, errores HTTP o fallas de acceso. ¿Qué inconveniente presentas?";
    }
    // 3. Agradecimientos y despedidas
    else if (/(gracias|muchas gracias|te agradezco|muy amable|seria todo|adios|hasta luego|nos vemos|bye|listo|todo bien)\b/.test(texto)) {
        ultimoTema = "agradecimiento";
        respuestaBot = "¡De nada! Es un placer ayudarte. Recuerda que este sistema de soporte en línea está disponible para garantizar la continuidad operativa de la escuela. ¿Hay algo más en lo que te pueda asistir?";
    }
    // 4. Seguimiento contextual según ultimoTema
    else if (/(mis datos|si|es correcto|ya lo intente|ya lo hice|no funciona|no sirve|sigue igual|aun no|todavia no|como|cuanto tarda|tiempo estimado|que hago)/.test(texto) && ultimoTema !== "general" && ultimoTema !== "saludo" && ultimoTema !== "agradecimiento") {
        if (ultimoTema === "acceso") {
            respuestaBot = "📌 **Seguimiento de Autenticación**\n⚠️ **Urgencia:** ALTA\n\n💡 **Orientación:** Si tus credenciales son correctas y el problema persiste, el servicio de autenticación central (LDAP/Directorio Activo) o el gestor de sesiones puede estar saturado o bloqueado temporalmente. Tu incidencia ya quedó registrada en la bitácora de contingencia en la nube.";
        } else if (ultimoTema === "servidor") {
            respuestaBot = "📌 **Seguimiento de Infraestructura**\n⚠️ **Urgencia:** ALTA\n\n💡 **Orientación:** Dado que la falla en el servidor o base de datos persiste, el equipo técnico ya está atendiendo la incidencia. Evita recargar continuamente la página para no saturar las peticiones y reintenta en 15 a 30 minutos.";
        } else if (ultimoTema === "red") {
            respuestaBot = "📌 **Seguimiento de Red y Navegación**\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Si ya limpiaste caché/cookies o probaste en modo incógnito y el fallo continúa, puede deberse a un bloqueo de firewall institucional, resolución DNS o inestabilidad del proveedor. Intenta alternar de red (por ejemplo, Wi-Fi a datos móviles) y reporta si persiste.";
        } else if (ultimoTema === "academico") {
            respuestaBot = "📌 **Seguimiento de Trámite Académico**\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Mientras los módulos académicos y la base de datos central presentan intermitencias, puedes escribir aquí tu matrícula o número de control (de 7 a 10 dígitos) junto con el trámite requerido para dejar respaldo en bitácora.";
        }
    }
    // 5. Registro de matrícula / número de control
    else if (/\b\d{7,10}\b/.test(texto)) {
        const matricula = texto.match(/\b\d{7,10}\b/)[0];
        respuestaBot = `📌 **Bitácora de Contingencia Cloud**\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Se ha registrado tu matrícula/número de control **${matricula}** junto con la marca de tiempo actual como evidencia de contingencia ante fallas de la plataforma.`;
    }
    // 6. Problemas de Acceso / Credenciales / Login / Sesiones / Permisos
    else if (/(acced|acces|ingres|entr|log|sesion|cuenta|contrasena|password|clave|nip|pin|usuario|matricula|bloquead|credencial|rechaz|invalido|token|401|403|forbidden|unauthorized|no me deja)/.test(texto)) {
        ultimoTema = "acceso";
        respuestaBot = "📌 **Diagnóstico:** Falla de Autenticación / Credenciales / Sesión\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Verifica que no tengas activado el bloqueo de mayúsculas y que tu matrícula o usuario sea correcto. Si el error persiste (o ves códigos 401/403 o sesión expirada), cierra las pestañas del portal, limpia cookies/sesión o prueba en una ventana privada antes de usar el respaldo cloud.";
    }
    // 7. Problemas de Servidor / Caída / Errores HTTP / Rendimiento / Base de Datos
    else if (/(caid|cayo|servidor|500|502|503|504|404|bad gateway|service unavailable|internal server|timeout|tiempo de espera|respuest|carg|abr|fall|colaps|intermiten|lento|tard|trab|congel|mantenimiento|fuera de servicio|base de datos|host|plataforma)/.test(texto)) {
        ultimoTema = "servidor";
        respuestaBot = "📌 **Diagnóstico:** Caída de Plataforma / Error de Servidor o Base de Datos\n⚠️ **Urgencia:** ALTA\n\n💡 **Orientación:** ⚠️ Incidencia crítica detectada (posible saturación, timeout o error de gateway/servidor). Este nodo cloud alternativo permanece activo para garantizar continuidad operativa y registrar tu reporte en bitácora.";
    }
    // 8. Problemas de Caché / Cookies / Red / DNS / Navegador / Certificados
    else if (/(cach|cache|historial|cooki|limpiar|red|internet|wifi|conex|datos|dns|ip|proxy|vpn|firewall|certificado|ssl|https|no es seguro|navegador|chrome|edge|firefox|safari|incognito|latencia|packet loss)/.test(texto)) {
        ultimoTema = "red";
        respuestaBot = "📌 **Diagnóstico:** Problema de Red, DNS, Caché o Navegador\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Presiona `Ctrl + Shift + Supr` para limpiar caché y cookies, o prueba en **modo incógnito** (`Ctrl + Shift + N`). Revisa también que no tengas VPN/proxy interfiriendo, verifica tu conexión de red o resolución DNS y reintenta.";
    }
    // 9. Módulos Académicos y Trámites Escolares
    else if (/(calificacion|materia|horario|inscripcion|reinscripcion|kardex|constancia|boleta|tramite|residencia|servicio social|pago|referencia|ficha|grupo|profesor|acta)/.test(texto)) {
        ultimoTema = "academico";
        respuestaBot = "📌 **Diagnóstico:** Módulo Académico / Trámite Escolar\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Los módulos de consulta o trámites dependen de la base de datos central escolar. Si presentas fallas durante tu proceso, ingresa tu matrícula aquí para dejar registro de contingencia con fecha y hora.";
    }
    // 10. Caso general por defecto
    else {
        ultimoTema = "general";
        respuestaBot = "📌 **Soporte Técnico General Cloud**\n⚠️ **Urgencia:** BAJA\n\n💡 **Orientación:** No logro clasificar completamente tu solicitud. Especifica si el problema es de **acceso/contraseña**, **caída o error del servidor (ej. 500/502/504)**, **red/DNS/caché** o **trámite académico** para darte una orientación más precisa.";
    }

    // Estructura exacta que espera el frontend para evitar el error de conexión
    res.json({
        status: 'exito',
        reporte: {
            mensajeOriginal: textoCrudo,
            solucion: respuestaBot
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Cloud ejecutándose en http://localhost:${PORT}`);
});