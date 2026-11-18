const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let ultimoTema = "general";

app.post('/api/reportar', (req, res) => {
    const { mensaje } = req.body;
    if (!mensaje) {
        return res.status(400).json({ error: 'El mensaje es obligatorio' });
    }

    const texto = mensaje.toLowerCase().trim();
    let respuestaBot = "";

    // 1. Detección de símbolos extraños o caracteres sueltos
    const esSimboloExtrano = /^[^a-záéíóúñ0-9]+$/.test(texto) || texto.length < 2;

    if (esSimboloExtrano) {
        respuestaBot = "📌 **Asistente Cloud**\n⚠️ **Aviso:** No logro entender tu mensaje o los caracteres ingresados. Por favor, describe tu problema técnico utilizando palabras claras (ej. 'no puedo acceder', 'la plataforma está caída', 'problemas de red').";
    }
    // 2. Saludos iniciales (EXCLUSIVO para saludos)
    else if (/^(hola|buenos|buenas|hi|hello|hey|que tal)/.test(texto)) {
        ultimoTema = "saludo";
        respuestaBot = "¡Hola! Soy tu asistente de soporte técnico independiente en la nube. Estoy activo para ayudarte ante cualquier caída de la plataforma escolar, problemas de red o accesos. ¿Qué inconveniente presentas?";
    } 
    // 3. Agradecimientos (EXCLUSIVO para cuando te dan las gracias)
    else if (/^(gracias|muchas gracias|te agradezco|muy amable)/.test(texto)) {
        ultimoTema = "agradecimiento";
        respuestaBot = "¡De nada! Es un placer ayudarte. Recuerda que este sistema de soporte en línea está disponible para garantizar la continuidad operativa de la escuela. ¿Hay algo más en lo que te pueda asistir?";
    }
    // 4. Preguntas de seguimiento vinculadas al contexto anterior
    else if (/^(mis datos|si|sí|es correcto|ya lo intenté|no funciona|como|cómo)/.test(texto) && ultimoTema === "acceso") {
        respuestaBot = "Entendido. Si tus credenciales son correctas y aun así no puedes ingresar, significa que el servidor de autenticación principal (LDAP) o el servicio de base de datos escolar están caídos. Ya registré esta incidencia en la bitácora de contingencia en la nube.";
    }
    // 5. Problemas de Acceso / Credenciales / Login
    else if (/(acced|acces|ingres|entr|log|sesión|sesion|cuenta|contraseña|password|clave|usuario)/.test(texto)) {
        ultimoTema = "acceso";
        respuestaBot = "📌 **Diagnóstico:** Falla de Autenticación / Credenciales\n⚠️ **Urgencia:** MEDIA\n\n💡 **Orientación:** Si el servidor de autenticación principal no responde, verifica que tus datos institucionales sean correctos o utiliza el módulo de validación alterna en este nodo cloud.";
    }
    // 6. Problemas de Servidor / Caída / Carga / Apertura
    else if (/(caid|cayo|cayó|servidor|500|respuest|carg|abr|fall|colaps|intermiten|lento|funciona|no puedo)/.test(texto)) {
        ultimoTema = "servidor";
        respuestaBot = "📌 **Diagnóstico:** Caída de Plataforma / Servidor Escolar\n⚠️ **Urgencia:** ALTA\n\n💡 **Orientación:** ⚠️ Incidencia crítica detectada. Al estar la plataforma oficial comprometida, este nodo cloud alternativo garantiza la continuidad operativa y el registro de tu bitácora de emergencia.";
    } 
    // 7. Problemas de Caché / Red
    else if (/(cach|cache|historial|cooki|limpiar|red|internet|wifi|conex)/.test(texto)) {
        ultimoTema = "red";
        respuestaBot = "📌 **Diagnóstico:** Problema de Red o Caché del Navegador\n⚠️ **Urgencia:** BAJA\n\n💡 **Orientación:** Para solucionar errores de carga: Presiona `Ctrl + Shift + Supr` para limpiar el caché de tu navegador y eliminar archivos temporales corrompidos.";
    } 
    // 8. Caso general por defecto
    else {
        respuestaBot = "📌 **Soporte Técnico General Cloud**\n⚠️ **Urgencia:** BAJA\n\n💡 **Orientación:** No logro comprender completamente tu solicitud. Intenta especificar si tu problema es de red, acceso o caída de servidor para darte una solución exacta.";
    }

    // Estructura exacta que espera el frontend para evitar el error de conexión
    res.json({
        status: 'exito',
        reporte: {
            mensajeOriginal: mensaje,
            solucion: respuestaBot
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Cloud ejecutándose en http://localhost:${PORT}`);
});