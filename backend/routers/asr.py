# backend/routers/asr.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile, os, shutil, subprocess

router = APIRouter(prefix="/asr", tags=["asr"])

# ------------------------------
# Config vía variables de entorno
# ------------------------------
WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "tiny")           # tiny | base | small | ...
WHISPER_DOWNLOAD_DIR = os.getenv("WHISPER_DOWNLOAD_DIR", "/data/.models")
WHISPER_DEVICE = "cpu"                                            # Forzamos CPU en Render Free

# Singleton del modelo (lazy load)
_asr_model = None

def _get_asr_model():
    """
    Carga el modelo Whisper una sola vez (lazy) y lo reutiliza.
    """
    global _asr_model
    if _asr_model is None:
        try:
            import whisper  # import aquí para no cargar Torch hasta que sea necesario
            _asr_model = whisper.load_model(
                WHISPER_MODEL_NAME,
                device=WHISPER_DEVICE,
                download_root=WHISPER_DOWNLOAD_DIR
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error cargando Whisper: {e}")
    return _asr_model

def _find_ffmpeg() -> str:
    """
    Retorna la ruta de ffmpeg. Lanza HTTPException 500 si no existe.
    """
    # 1) PATH
    p = shutil.which("ffmpeg")
    if p:
        return p
    # 2) Intento de rutas comunes en Windows (no afecta en Linux/Render)
    common = [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe",
        r"C:\FFmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\WinGet\Links\ffmpeg.exe",
    ]
    for c in common:
        if os.path.isfile(c):
            return c
    raise HTTPException(
        status_code=500,
        detail="ffmpeg no encontrado. Instálalo y/o agrega ffmpeg.exe al PATH."
    )

def _convert_to_wav(in_path: str) -> str:
    """
    Convierte a WAV mono 16 kHz si la extensión no es .wav
    Devuelve la ruta de salida (puede ser igual si ya es .wav)
    """
    # Si ya es WAV, no convertir
    if in_path.lower().endswith(".wav"):
        return in_path

    ffmpeg_bin = _find_ffmpeg()
    out_path = os.path.splitext(in_path)[0] + ".wav"
    # ffmpeg -y -i in -ac 1 -ar 16000 out
    try:
        subprocess.run(
            [ffmpeg_bin, "-y", "-i", in_path, "-ac", "1", "-ar", "16000", out_path],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="ffmpeg falló al convertir el audio")
    return out_path

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Archivo faltante")

    # Guardar archivo temporal con sufijo según extensión subida
    suffix = ".webm"
    if file.filename.lower().endswith((".wav", ".ogg", ".mp3", ".m4a")):
        suffix = os.path.splitext(file.filename)[1].lower()

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        raw = await file.read()
        tmp_in.write(raw)
        in_path = tmp_in.name

    out_path = None
    try:
        # Convertir a WAV mono 16 kHz si hace falta
        out_path = _convert_to_wav(in_path)

        # Cargar el modelo on-demand y transcribir (fp16=False en CPU)
        model = _get_asr_model()
        result = model.transcribe(out_path, language=None, fp16=False)
        text = (result.get("text") or "").strip()
        return {"text": text}
    finally:
        # Limpieza de archivos temporales
        for p in {in_path, out_path}:
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except:
                    pass
