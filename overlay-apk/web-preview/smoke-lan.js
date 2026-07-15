"use strict";

const http = require("http");

const HOST = process.env.HAIL_PREVIEW_SMOKE_HOST || "127.0.0.1";
const PORT = Number(process.env.HAIL_PREVIEW_SMOKE_PORT || 8196);

function get(path) {
  return new Promise(function (resolve, reject) {
    const req = http.get(
      {
        hostname: HOST,
        port: PORT,
        path: path,
        timeout: 5000,
      },
      function (res) {
        let body = "";
        res.on("data", function (chunk) {
          body += chunk;
        });
        res.on("end", function () {
          resolve({ status: res.statusCode, body: body });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", function () {
      req.destroy(new Error("timeout"));
    });
  });
}

async function main() {
  const index = await get("/");
  if (index.status !== 200 || !index.body.includes("Control Alt Hails")) {
    throw new Error("index.html did not load from " + HOST + ":" + PORT);
  }

  const contract = await get("/shared/hail-render-contract.json");
  if (contract.status !== 200 || !contract.body.includes("axiom_dark_cyan")) {
    throw new Error("shared contract JSON did not load");
  }

  console.log(
    "smoke:lan OK — preview reachable at http://" + HOST + ":" + PORT + "/",
  );
}

main().catch(function (err) {
  console.error("smoke:lan failed:", err.message);
  console.error(
    "Start the server first: npm run preview:lan",
  );
  process.exit(1);
});
