const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const btnEnviar = document.getElementById('btnEnviar');
const btnAdjuntar = document.getElementById('btnAdjuntar');
const btnNuevoChat = document.getElementById('btnNuevoChat');
const fileInput = document.getElementById('fileInput');
const archivoPreview = document.getElementById('archivoPreview');
const archivoNombre = document.getElementById('archivoNombre');
const btnQuitarArchivo = document.getElementById('btnQuitarArchivo');
const chipButtons = document.querySelectorAll('.chip-btn');

const REQUEST_TIMEOUT_MS = 35000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const WELCOME_TEXT =
  '👋 Hola. Si la plataforma escolar presenta fallas o caídas imprevistas, escribe tu problema o adjunta una captura/archivo aquí para recibir asistencia automática.';

let sessionId = localStorage.getItem('soporte_session_id') || null;
let estaEnviando = false;
let archivoSeleccionado = null;

function agregarMensaje(texto, tipo = 'bot') {
  if (!chatMessages) return null;

  const div = document.createElement('div');
  div.className = tipo === 'user' ? 'message user-msg mensaje-usuario' : 'message bot-msg mensaje-bot';
  div.textContent = texto;

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function mostrarEscribiendo(texto = 'Escribiendo...') {
  if (!chatMessages) return null;

  let existente = document.getElementById('indicadorEscribiendo');
  if (!existente) {
    existente = document.createElement('div');
    existente.id = 'indicadorEscribiendo';
    existente.className = 'message bot-msg mensaje-bot';
    chatMessages.appendChild(existente);
  }

  existente.textContent = texto;
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return existente;
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
  if (btnAdjuntar) {
    btnAdjuntar.disabled = cargando;
  }
  if (btnQuitarArchivo) {
    btnQuitarArchivo.disabled = cargando;
  }
  if (btnNuevoChat) {
    btnNuevoChat.disabled = cargando;
  }
  if (userInput) {
    userInput.disabled = cargando;
  }
  chipButtons.forEach((btn) => {
    btn.disabled = cargando;
  });
}

function limpiarArchivo() {
  archivoSeleccionado = null;
  if (fileInput) fileInput.value = '';
  if (archivoNombre) archivoNombre.textContent = '';
  if (archivoPreview) archivoPreview.hidden = true;
}

function reiniciarConversacion() {
  if (estaEnviando || !chatMessages) return;
  sessionId = null;
  localStorage.removeItem('soporte_session_id');
  limpiarArchivo();
  chatMessages.innerHTML = '';
  agregarMensaje(WELCOME_TEXT, 'bot');
  if (userInput) {
    userInput.value = '';
    userInput.focus();
  }
}

function leerArchivoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de texto.'));
    reader.readAsText(file);
  });
}

function esArchivoTextoLegible(file) {
  const nombre = (file.name || '').toLowerCase();
  return (
    file.type.startsWith('text/') ||
    /\.(txt|log|csv|md|json)$/.test(nombre)
  );
}

async function leerArchivoAdjunto(file) {
  const esImagen = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name || '');

  if (esImagen) {
    if (typeof window.Tesseract === 'undefined') {
      throw new Error('El lector de imágenes no cargó en la página.');
    }
    mostrarEscribiendo('Leyendo texto de la captura...');
    const { data } = await window.Tesseract.recognize(file, 'spa+eng');
    return String((data && data.text) || '').trim().slice(0, 1500);
  }

  if (esArchivoTextoLegible(file)) {
    const contenido = await leerArchivoTexto(file);
    return contenido.slice(0, 1500);
  }

  return `Archivo adjunto: ${file.name} (documento/ofimática).`;
}

if (btnAdjuntar && fileInput) {
  btnAdjuntar.addEventListener('click', () => {
    if (!estaEnviando) fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      agregarMensaje('El archivo supera el límite de 5 MB. Elige un archivo más ligero.', 'bot');
      limpiarArchivo();
      return;
    }

    archivoSeleccionado = file;
    if (archivoNombre) {
      archivoNombre.textContent = `📎 ${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
    }
    if (archivoPreview) {
      archivoPreview.hidden = false;
    }
  });
}

if (btnQuitarArchivo) {
  btnQuitarArchivo.addEventListener('click', () => {
    if (!estaEnviando) limpiarArchivo();
  });
}

if (btnNuevoChat) {
  btnNuevoChat.addEventListener('click', reiniciarConversacion);
}

chipButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (estaEnviando || !userInput) return;
    const prompt = btn.getAttribute('data-prompt') || '';
    if (!prompt) return;
    userInput.value = prompt;
    enviarMensaje();
  });
});

async function enviarMensaje() {
  if (estaEnviando || !userInput) return;

  const textoUsuario = userInput.value.trim();
  if (!textoUsuario && !archivoSeleccionado) return;

  const archivoActual = archivoSeleccionado;
  const resumenUsuario = archivoActual
    ? `${textoUsuario || 'Revisar archivo adjunto'}\n[Adjunto: ${archivoActual.name}]`
    : textoUsuario;

  agregarMensaje(resumenUsuario, 'user');
  userInput.value = '';
  limpiarArchivo();
  cambiarEstadoCarga(true);
  mostrarEscribiendo(archivoActual ? 'Preparando archivo y enviando...' : 'Escribiendo...');

  let textoExtraido = '';
  if (archivoActual) {
    try {
      textoExtraido = await leerArchivoAdjunto(archivoActual);
    } catch (err) {
      quitarEscribiendo();
      agregarMensaje(
        `No pude leer "${archivoActual.name}". Intenta con otro archivo o describe qué te ocurre.`,
        'bot'
      );
      cambiarEstadoCarga(false);
      userInput.focus();
      return;
    }
  }

  const esOfimatica =
    archivoActual &&
    /\.(doc|docx|ppt|pptx|xls|xlsx|pdf)$/i.test(archivoActual.name || '');

  const mensajeFinal =
    textoExtraido && !esOfimatica
      ? `${textoUsuario || 'Analiza este archivo:'}\n\n[Contenido detectado en ${archivoActual.name}]:\n${textoExtraido}`
      : textoUsuario || `Tengo un problema con el archivo ${archivoActual.name}`;

  mostrarEscribiendo('Escribiendo...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const respuesta = await fetch('/reportar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: mensajeFinal,
        attachmentName: archivoActual ? archivoActual.name : null,
        extractedText: esOfimatica ? null : textoExtraido || null,
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