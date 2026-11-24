const inputField = document.getElementById('userInput');
const btnEnviar = document.getElementById('btnEnviar');
const chatMessages = document.getElementById('chatMessages');

const API_URL = '/api/reportar';

function agregarMensaje(texto, clase) {
  const div = document.createElement('div');
  div.className = `message ${clase}`;
  div.textContent = texto;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function enviarReporte() {
  const texto = inputField.value.trim();
  if (!texto) return;

  agregarMensaje(texto, 'user-msg');
  inputField.value = '';

  try {
    const response = await fetch('/api/reportar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: texto })
    });

    const data = await response.json();

    if (data.status === 'exito') {
      agregarMensaje(data.reporte.solucion, 'bot-msg');
    } else {
      agregarMensaje('⚠️ Ocurrió un error al procesar el reporte.', 'bot-msg');
    }
  } catch (err) {
    agregarMensaje('⚠️ Error de conexión con el servidor cloud.', 'bot-msg');
  }
}

btnEnviar.addEventListener('click', enviarReporte);

inputField.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    enviarReporte();
  }
});
