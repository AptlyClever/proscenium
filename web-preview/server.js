"use strict";

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const SHARED_ROOT =
  process.env.HAIL_PREVIEW_SHARED_ROOT || path.join(__dirname, "..", "shared");
const HOST = process.env.HAIL_PREVIEW_HOST || "127.0.0.1";
const PORT = Number(process.env.HAIL_PREVIEW_PORT || 8766);
const DEV = process.env.HAIL_PREVIEW_DEV === "1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

const DEV_RELOAD_SNIPPET =
  '<script>(function(){var s=new EventSource("/__dev/reload");s.onmessage=function(){location.reload()};s.onerror=function(){s.close()}})();</script>';

const reloadClients = new Set();
let reloadTimer = null;

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  if (decoded === "/shared/hail-render-contract.json") {
    return path.join(SHARED_ROOT, "hail-render-contract.json");
  }
  if (DEV && decoded === "/__dev/reload") {
    return "__dev_reload__";
  }
  const relative = decoded.replace(/^\/+/, "") || "index.html";
  const resolved = path.normalize(path.join(ROOT, relative));
  if (!resolved.startsWith(ROOT) && !resolved.startsWith(SHARED_ROOT)) {
    return null;
  }
  return resolved;
}

function listLanAddresses() {
  const addresses = [];
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(function (name) {
    interfaces[name].forEach(function (iface) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    });
  });
  return addresses;
}

function scheduleReload() {
  if (reloadTimer) {
    clearTimeout(reloadTimer);
  }
  reloadTimer = setTimeout(function () {
    reloadTimer = null;
    reloadClients.forEach(function (res) {
      res.write("data: reload\n\n");
    });
  }, 120);
}

function watchTree(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  try {
    fs.watch(dir, { recursive: true }, function (_event, filename) {
      if (!filename) {
        scheduleReload();
        return;
      }
      const base = path.basename(filename);
      if (base === "node_modules" || filename.includes("node_modules" + path.sep)) {
        return;
      }
      scheduleReload();
    });
    console.log("Dev watch: " + dir);
  } catch (err) {
    console.warn("Dev watch unavailable for " + dir + ": " + err.message);
  }
}

function startDevWatch() {
  watchTree(ROOT);
  watchTree(SHARED_ROOT);
}

const server = http.createServer(function (req, res) {
  const filePath = safePath(req.url || "/");
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (filePath === "__dev_reload__") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    reloadClients.add(res);
    req.on("close", function () {
      reloadClients.delete(res);
    });
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    if (DEV) {
      headers["Cache-Control"] = "no-store";
    }
    if (DEV && ext === ".html" && data.includes("</body>")) {
      data = Buffer.from(
        data.toString("utf8").replace("</body>", DEV_RELOAD_SNIPPET + "</body>"),
      );
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, HOST, function () {
  const bindLabel = HOST === "0.0.0.0" ? "all interfaces" : HOST;
  console.log("Control Alt Hails web preview listening on " + bindLabel + ":" + PORT);
  if (DEV) {
    console.log("Dev mode: file watch + auto-reload enabled");
    startDevWatch();
  }
  console.log("Local:    http://127.0.0.1:" + PORT + "/");

  if (HOST === "0.0.0.0") {
    const lanAddresses = listLanAddresses();
    if (lanAddresses.length) {
      console.log("LAN URLs (open from Aurora or another desktop on the network):");
      lanAddresses.forEach(function (address) {
        console.log("  http://" + address + ":" + PORT + "/");
      });
    } else {
      console.log("LAN: no non-loopback IPv4 address detected on this host");
    }
  }

  console.log("Contract: /shared/hail-render-contract.json");
  console.log("Stop with Ctrl+C");
});
