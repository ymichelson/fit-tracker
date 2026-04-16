import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = "0.0.0.0";
const startPort = 8000;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appName = "fit-tracker";
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function resolveFilePath(urlPath) {
  const requestPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = requestPath === "/" ? "/index.html" : requestPath;
  const normalized = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  return path.join(projectRoot, normalized);
}

function sendNotFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
}

function sendFile(filePath, response) {
  const extension = path.extname(filePath);
  const contentType = contentTypes[extension] ?? "application/octet-stream";

  response.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  createReadStream(filePath).pipe(response);
}

function createStaticServer() {
  return createServer((request, response) => {
    try {
      const filePath = resolveFilePath(request.url ?? "/");

      if (!filePath.startsWith(projectRoot)) {
        sendNotFound(response);
        return;
      }

      if (!existsSync(filePath)) {
        sendNotFound(response);
        return;
      }

      const stats = statSync(filePath);
      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, "index.html");
        if (!existsSync(indexPath)) {
          sendNotFound(response);
          return;
        }

        sendFile(indexPath, response);
        return;
      }

      sendFile(filePath, response);
    } catch {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Server error");
    }
  });
}

function getLocalAddresses() {
  const networks = networkInterfaces();
  const names = Object.keys(networks);
  const addresses = [];

  for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
    const entries = networks[names[nameIndex]] || [];

    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries[entryIndex];

      if (entry && entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }

  return addresses;
}

function listen(port) {
  const server = createStaticServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(port, host, () => {
    const addresses = getLocalAddresses();

    console.log("");
    console.log(`${appName} is running`);
    console.log(`Open on this Mac: http://127.0.0.1:${port}`);

    for (let index = 0; index < addresses.length; index += 1) {
      console.log(`Open on your phone: http://${addresses[index]}:${port}`);
    }

    console.log("Press Ctrl+C to stop");
  });
}

listen(startPort);
