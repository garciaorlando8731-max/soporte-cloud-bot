const chatBox = document.getElementById('chat') || document.getElementById('mensajes') || document.querySelector('.chat-messages');
const input = document.getElementById('mensaje') || document.getElementById('input') || document.querySelector('input[type="text"]');
const form = document.querySelector('form');
const sendBtn = document.getElementById('enviar') || document.querySelector('button[type="submit"]') || document.querySelector('button');

let sessionId = localStorage.getItem('soporte_session_id') || null;

function agregarMensaje(texto, quien) {
  if (!chatBox) return;

  const div = document.createElement('div');
  div.className = quien === 'user' ? 'mensaje-usuario' : 'mensaje-bot';
  div.style.whiteSpace = 'pre-line';
  div.textContent = texto;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function enviarMensaje(evento) {
  if (evento) evento.preventDefault();
  if (!input) return;

  const texto = input.value.trim();
  if (!texto) return;

  agregarMensaje(texto, 'user');
  input.value = '';
  input.focus();

  if (sendBtn) sendBtn.disabled = true;

  try {
    const respuesta = await fetch('/reportar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: texto,
        sessionId: sessionId
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      agregarMensaje(datos.error || 'Error al procesar el mensaje.', 'bot');
      return;
    }

    if (datos.sessionId) {
      sessionId = datos.sessionId;
      localStorage.setItem('soporte_session_id', sessionId);
    }

    const textoBot = datos.reply || datos.response || datos.message || 'Sin respuesta del servidor.';
    agregarMensaje(textoBot, 'bot');
  } catch (error) {
    agregarMensaje('⚠️ Error de conexión con el servidor cloud.', 'bot');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

if (form) {
  form.addEventListener('submit', enviarMensaje);
} else if (sendBtn) {
  sendBtn.addEventListener('click', enviarMensaje);
}

if (input) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje(e);
    }
  });
}
