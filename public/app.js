const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const btnEnviar = document.getElementById('btnEnviar');

const REQUEST_TIMEOUT_MS = 25000; // 25s por si Render Free está despertando
let sessionId = localStorage.getItem('soporte_session_id') || null;
let estaEnviando = false;

function agregarMensaje(texto, tipo = 'bot') {
  if (!chatMessages) return null;

  const div = document.createElement('div');
  div.className = tipo === 'user' ? 'message user-msg mensaje-usuario' : 'message bot-msg mensaje-bot';
  div.textContent = texto;

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function mostrarEscribiendo() {
  if (!chatMessages) return null;

  // Evita duplicar el indicador si ya existe
  const existente = document.getElementById('indicadorEscribiendo');
  if (existente) return existente;

  const div = document.createElement('div');
  div.id = 'indicadorEscribiendo';
  div.className = 'message bot-msg mensaje-bot';
  div.textContent = 'Escribiendo...';

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function quitarEscribiendo() {
  const indicador = document.getElementById('indicadorEscribiendo');
  if (indicador) {
    indicador.remove();
  }
}

function cambiarEstadoCarga(cargando) {
  estaEnviando = cargando;
  if (btnEnviar) {
    btnEnviar.disabled = cargando;
    btnEnviar.textContent = cargando ? 'Enviando...' : 'Enviar';
  }
  if (userInput) {
    userInput.disabled = cargando;
  }
}

async function enviarMensaje() {
  if (estaEnviando || !userInput) return;

  const texto = userInput.value.trim();
  if (!texto) return;

  agregarMensaje(texto, 'user');
  userInput.value = '';
  cambiarEstadoCarga(true);
  mostrarEscribiendo();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const respuesta = await fetch('/reportar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: texto,
        sessionId: sessionId
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    quitarEscribiendo();

    let datos = {};
    try {
      datos = await respuesta.json();
    } catch (_) {
      datos = {};
    }

    if (!respuesta.ok) {
      if (respuesta.status === 429) {
        agregarMensaje(
          datos.error || 'Vas muy rápido. Espera un segundo antes de mandar otro mensaje.',
          'bot'
        );
      } else if (respuesta.status >= 500) {
        agregarMensaje(
          'El servidor cloud está tardando o reiniciándose (error ' +
            respuesta.status +
            '). Espera unos segundos e intenta de nuevo.',
          'bot'
        );
      } else {
        agregarMensaje(
          datos.error || 'No se pudo procesar tu mensaje (código ' + respuesta.status + ').',
          'bot'
        );
      }
      return;
    }

    if (datos.sessionId) {
      sessionId = datos.sessionId;
      localStorage.setItem('soporte_session_id', sessionId);
    }

    const textoBot =
      datos.reply ||
      datos.response ||
      datos.message ||
      'No se recibió contenido en la respuesta del servidor.';
    agregarMensaje(textoBot, 'bot');
  } catch (error) {
    clearTimeout(timeoutId);
    quitarEscribiendo();

    if (error && error.name === 'AbortError') {
      agregarMensaje(
        '⏳ El servidor tardó demasiado en responder (posible arranque en frío). Intenta enviar tu mensaje de nuevo.',
        'bot'
      );
    } else {
      agregarMensaje(
        '⚠️ Error de red o conexión con el servidor. Revisa tu internet o intenta en unos momentos.',
        'bot'
      );
    }
  } finally {
    cambiarEstadoCarga(false);
    if (userInput) {
      userInput.focus();
    }
  }
}

if (btnEnviar) {
  btnEnviar.addEventListener('click', enviarMensaje);
}

if (userInput) {
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  });
}