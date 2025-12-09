// test/cf-preview.test.ts
import { test, expect } from "bun:test";
import { spawn } from "child_process";
import { generateTestWranglerConfig } from "../scripts/generate-test-wrangler";

const PORT = 8790;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function assertPortFree(port: number, url = `http://127.0.0.1:${port}`) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(750) });
    // Any reachable response means something is already bound to the port.
    throw new Error(
      `Port ${port} already serving (${url}); status ${res.status}. Stop it before running preview test.`
    );
  } catch (err) {
    // Network errors/timeouts imply port is free; rethrow everything else.
    if (err instanceof Error) {
      const msg = err.message || "";
      if (
        err.name === "AbortError" ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("fetch failed") ||
        msg.includes("Unable to connect") ||
        msg.includes("network timeout")
      ) {
        return;
      }
    }
    throw err;
  }
}

function waitForServer(url: string, timeoutMs = 120000) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (res.ok) return resolve();
      } catch {
        // ignore
      }

      if (Date.now() - start > timeoutMs) {
        reject(new Error(`CF preview server didn't become ready at ${url}`));
      } else {
        setTimeout(tick, 500);
      }
    };
    tick();
  });
}

test("Cloudflare preview runs and serves /docs/dashboard", async () => {
  // Ensure wrangler.jsonc exists (auto-generate if missing)
  generateTestWranglerConfig();
  await assertPortFree(PORT, BASE_URL);
  
  // Quick sanity: require built artifacts so we fail fast with a clear message.
  const workerExists = await Bun.file(".open-next/worker.js").exists();
  if (!workerExists) {
    throw new Error("Missing .open-next/worker.js. Run `bun run build:cf` before this test.");
  }
  
  // Assumes `bun run build:cf` has already run in CI
  const server = spawn(
    "bunx",
    ["opennextjs-cloudflare", "preview", "--port", String(PORT)],
    {
      // Ignore stdin so Wrangler isn't attached to the TTY; keeps shutdown quiet
      stdio: ["ignore", "inherit", "inherit"],
      env: {
        ...process.env,
        WRANGLER_LOG: process.env.WRANGLER_LOG ?? "none",
        HOME: process.env.HOME ?? process.cwd(),
      },
    }
  );
  const serverExit = new Promise<void>((resolve) => {
    server.once("exit", () => resolve());
  });

  try {
    // Give the process a moment to bind before polling.
    await Bun.sleep(500);
    await waitForServer(`${BASE_URL}/docs/dashboard`, 120000);
    const res = await fetch(`${BASE_URL}/docs/dashboard`);
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain("Superwall");
    expect(html).toContain("Welcome");
  } finally {
    // SIGINT is usually enough to bring down wrangler/preview
    server.kill("SIGINT");
    // Force-kill if it doesn't exit promptly to avoid hanging the test
    await Promise.race([
      serverExit,
      new Promise<void>((resolve) =>
        setTimeout(() => {
          server.kill("SIGKILL");
          resolve();
        }, 10_000),
      ),
    ]);
  }
}, { timeout: 90_000 });
