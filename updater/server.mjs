import { spawn } from "node:child_process";
import http from "node:http";
import { classifyGitFailure, UPDATE_STARTED } from "./errors.mjs";

const PORT = Number(process.env.PORT || 8091);
const CHECKOUT = process.env.CHECKOUT || "/checkout";

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: CHECKOUT,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function send(res, status, payload, afterFinish) {
  const body = JSON.stringify(payload);
  if (afterFinish) res.on("finish", afterFinish);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function rebuildAlba() {
  const child = spawn("docker", ["compose", "up", "-d", "--build", "alba"], {
    cwd: CHECKOUT,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.on("error", () => {});
  child.unref();
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  if (req.method !== "POST" || path !== "/update") {
    send(res, 404, { ok: false, error: "Ruta no disponible." });
    return;
  }

  for await (const chunk of req) {
    void chunk;
  }

  const inside = await run("git", [
    "-c",
    `safe.directory=${CHECKOUT}`,
    "rev-parse",
    "--is-inside-work-tree",
  ]);
  if (inside.code !== 0 || !inside.stdout.includes("true")) {
    send(res, 400, { ok: false, error: "No hay un repositorio git en el servidor." });
    return;
  }

  const pull = await run("git", ["-c", `safe.directory=${CHECKOUT}`, "pull", "--ff-only"]);
  if (pull.code !== 0) {
    send(res, 400, { ok: false, error: classifyGitFailure(pull.stderr, pull.stdout, pull.code) });
    return;
  }

  send(res, 200, { ok: true, message: UPDATE_STARTED }, rebuildAlba);
});

server.listen(PORT, "0.0.0.0");
