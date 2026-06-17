import tempfile
from pathlib import Path

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False


VOICES_CACHE = None


async def list_voices() -> list[dict]:
    global VOICES_CACHE
    if VOICES_CACHE is not None:
        return VOICES_CACHE
    if not HAS_EDGE_TTS:
        VOICES_CACHE = [{"name": "en-US-AriaNeural", "locale": "en-US", "gender": "Female"}]
        return VOICES_CACHE
    voices = await edge_tts.list_voices()
    VOICES_CACHE = [
        {"name": v["Name"], "locale": v["Locale"], "gender": v["Gender"]}
        for v in voices
    ]
    return VOICES_CACHE


async def speak(text: str, voice: str = "en-US-AriaNeural", rate: int = 0) -> Path:
    rate_str = f"+{rate}%" if rate >= 0 else f"{rate}%"
    if not HAS_EDGE_TTS:
        return _fallback_tts(text)

    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    communicate = edge_tts.Communicate(text, voice=voice, rate=rate_str)
    await communicate.save(tmp.name)
    return Path(tmp.name)


def _fallback_tts(text: str) -> Path:
    import wave
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    with wave.open(tmp.name, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(22050)
        wf.writeframes(b"")
    return Path(tmp.name)
