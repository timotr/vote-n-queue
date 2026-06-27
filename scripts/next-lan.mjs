import { spawn } from "node:child_process";
import os from "node:os";

const mode = process.argv[2] === "start" ? "start" : "dev";

function getLanIp() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal && address.address.startsWith("192.168.")) {
        return address.address;
      }
    }
  }

  return undefined;
}

const lanIp = getLanIp();
const env = {
  ...process.env,
  ...(lanIp ? { NEXT_PUBLIC_API_BASE_URL: `http://${lanIp}:3000` } : {}),
};
const args = mode === "start" ? ["next", "start", "-H", "0.0.0.0"] : ["next", "dev", "-H", "0.0.0.0"];

if (lanIp) {
  console.log(`Using LAN API base URL: ${env.NEXT_PUBLIC_API_BASE_URL}`);
} else {
  console.log("No 192.168.* adapter found; using same-origin API requests.");
}

const child = spawn("npx", args, {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
