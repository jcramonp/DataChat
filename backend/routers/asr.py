# backend/routers/asr.py
from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile, os, shutil, subprocess
import whisper

router = APIRouter(prefix="/asr", tags=["asr"])

# Carga 1 sola vez (elige "base" / "small")
_model = whisper.load_model("base")

def _find_ffmpeg() -> str:
    """
    Retorna la ruta de ffmpeg. Lanza HTTPException 500 si no existe.
    """
    # 1) PATH
    p = shutil.which("ffmpeg")
    if p:
        return p
    # 2) Intento de rutas comunes en Windows
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

        # Transcribir (auto detección de idioma; fija language="es" si quieres forzar)
        result = _model.transcribe(out_path, language=None)
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
