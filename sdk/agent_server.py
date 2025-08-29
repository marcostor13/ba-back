import asyncio
import websockets
import json
import base64
import logging
from pyzkfp import ZKFP2

# --- Configuración ---
HOST = 'localhost'
PORT = 9876
# ¡Importante! Añade aquí la URL de tu aplicación web para permitir la conexión.
ALLOWED_ORIGINS = [
    "http://localhost:4200",  # Para desarrollo local de Angular
    "https://tu-app.com"      # La dirección de tu aplicación en producción
]
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Variables para manejar el escáner (Inicializadas a None/False) ---
zkfp2 = None
is_initialized = False

# --- Funciones para controlar el escáner ---

def initialize_scanner():
    """Inicializa la librería y se conecta al escáner."""
    global zkfp2, is_initialized
    try:
        logging.info("Intentando inicializar la librería ZKFP2...")
        zkfp2 = ZKFP2()
        zkfp2.Init()
        logging.info("Librería inicializada.")
        
        device_count = zkfp2.GetDeviceCount()
        if device_count > 0:
            logging.info(f"Se encontraron {device_count} dispositivos. Conectando al primero...")
            zkfp2.OpenDevice(0)
            is_initialized = True
            logging.info("Escáner conectado y listo para usar.")
            return True
        else:
            logging.warning("No se encontraron escáneres conectados.")
            zkfp2.Terminate() # Liberar recursos si no se encontraron dispositivos
            return False
    except Exception as e:
        # Este es el log más importante para diagnosticar el problema
        logging.error(f"Error detallado al inicializar el escáner: {e}", exc_info=True)
        return False

def capture_fingerprint():
    """Activa el escáner y captura la huella."""
    if not is_initialized:
        return None, "El escáner no está inicializado."

    logging.info("Esperando huella...")
    capture = zkfp2.AcquireFingerprint()
    
    if capture:
        template, image = capture
        template_b64 = base64.b64encode(template).decode('utf-8')
        logging.info("Huella capturada exitosamente.")
        return template_b64, None
    else:
        logging.warning("No se pudo capturar la huella (tiempo de espera agotado o error).")
        return None, "No se pudo capturar la huella."

def shutdown_scanner():
    """Libera los recursos del escáner al cerrar."""
    if is_initialized and zkfp2:
        zkfp2.Terminate()
        logging.info("Conexión con el escáner terminada.")

# --- Lógica del Servidor de Comunicación (WebSocket) ---

async def handler(websocket, path):
    """Maneja las conexiones y mensajes de la aplicación web."""
    origin = websocket.request_headers.get('Origin')
    
    if origin not in ALLOWED_ORIGINS:
        logging.warning(f"Conexión rechazada desde un origen no permitido: {origin}")
        return

    logging.info(f"Cliente web conectado desde {origin}")

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                command = data.get('command')
                logging.info(f"Comando recibido: {command}")

                if command == 'CAPTURE_FINGERPRINT':
                    template, error_msg = capture_fingerprint()
                    if template:
                        response = {"status": "success", "template": template}
                    else:
                        response = {"status": "error", "message": error_msg}
                    await websocket.send(json.dumps(response))
                else:
                    await websocket.send(json.dumps({"status": "error", "message": "Comando no reconocido"}))

            except Exception as e:
                logging.error(f"Error procesando el mensaje: {e}")
                await websocket.send(json.dumps({"status": "error", "message": "Error interno en el agente"}))
    
    except websockets.exceptions.ConnectionClosed:
        logging.info(f"Cliente web desconectado.")
    finally:
        pass

# --- Función Principal para Iniciar Todo ---

async def main():
    """Inicializa el escáner y arranca el servidor."""
    if not initialize_scanner():
        logging.error("El servidor no puede iniciar. Revisa la conexión del escáner y los drivers.")
        return

    async with websockets.serve(handler, HOST, PORT):
        logging.info(f"Agente local iniciado en ws://{HOST}:{PORT}")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Servidor detenido.")
    finally:
        shutdown_scanner()