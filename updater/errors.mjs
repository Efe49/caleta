export const UPDATE_STARTED = "Actualización en marcha";

export function classifyGitFailure(stderr = "", stdout = "", code = 1) {
  const raw = `${stderr}\n${stdout}`;
  const text = raw.toLowerCase();

  if (text.includes("not a git repository") || text.includes("no es un repositorio git")) {
    return "No hay un repositorio git en el servidor.";
  }

  if (
    text.includes("authentication failed") ||
    text.includes("could not read username") ||
    text.includes("could not read password") ||
    text.includes("permission denied (publickey)") ||
    text.includes("terminal prompts disabled") ||
    text.includes("invalid username or token") ||
    text.includes("support for password authentication was removed") ||
    /\b401\b/.test(text) ||
    /\b403\b/.test(text)
  ) {
    return "No se ha podido autenticar el repositorio. Las credenciales se quedan en el checkout del servidor, no en la imagen.";
  }

  if (
    text.includes("not possible to fast-forward") ||
    text.includes("divergent branches") ||
    text.includes("no se puede avanzar")
  ) {
    return "La actualización no es un avance rápido. Hay cambios locales que impiden git pull --ff-only.";
  }

  const detail = scrub(raw).replace(/\s+/g, " ").trim();
  if (!detail) return `No se ha podido actualizar (código ${code}).`;
  return `No se ha podido actualizar: ${detail.slice(0, 400)}`;
}

function scrub(text) {
  return text
    .replace(/https?:\/\/[^/\s@]+@/gi, "https://")
    .replace(/\b(ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]+/g, "[credencial]")
    .replace(/\bglpat-[A-Za-z0-9_-]+/g, "[credencial]");
}
