import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyGitFailure, UPDATE_STARTED } from "./errors.mjs";

describe("classifyGitFailure", () => {
  it("avisa si no hay repositorio", () => {
    assert.equal(
      classifyGitFailure("fatal: not a git repository", "", 128),
      "No hay un repositorio git en el servidor.",
    );
  });

  it("avisa si falla la autenticación", () => {
    const message = classifyGitFailure(
      "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
      "",
      1,
    );
    assert.match(message, /autenticar el repositorio/);
  });

  it("avisa si el pull no es un avance rápido", () => {
    assert.match(
      classifyGitFailure("fatal: Not possible to fast-forward, aborting.", "", 1),
      /avance rápido/,
    );
  });

  it("no devuelve credenciales", () => {
    const message = classifyGitFailure(
      "fatal: unable to access 'https://user:ghp_abc123secret@github.com/org/repo.git/'",
      "",
      1,
    );
    assert.equal(message.includes("ghp_abc123secret"), false);
    assert.equal(message.includes("user:"), false);
  });
});

describe("UPDATE_STARTED", () => {
  it("usa el texto que ve el taller", () => {
    assert.equal(UPDATE_STARTED, "Actualización en marcha");
  });
});
