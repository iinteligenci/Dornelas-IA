import { runSalesCycle } from "./agent/cycle.js";

const port = Number(process.env.PORT || 8787);

const demoContext = {
  autonomyLevel: 2,
  products: [
    { name: "Bacon", stock: 10, margin: 0.4, minMargin: 0.3 },
    { name: "Kit Feijoada", stock: 8, margin: 0.45, minMargin: 0.3 }
  ],
  permissions: {
    campaignDraft: { allowed: true, approvalRequired: false }
  }
};

const server = await import("node:http").then(({ createServer }) =>
  createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method === "GET" && req.url === "/health") {
      res.end(JSON.stringify({ ok: true, service: "dornelas-ia-agent" }));
      return;
    }

    if (req.method === "POST" && req.url === "/agent/cycle") {
      const result = await runSalesCycle(demoContext);
      res.end(JSON.stringify(result));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not_found" }));
  })
);

server.listen(port, () => {
  console.log(`Dornelas IA backend listening on :${port}`);
});
