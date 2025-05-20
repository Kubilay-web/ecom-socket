const express = require("express");
const { createServer } = require("http");
const next = require("next");
const WebSocket = require("ws");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

const server = express();
const httpServer = createServer(server);

const wss = new WebSocket.Server({ server: httpServer });

const watchers = new Map();

wss.on("connection", (ws, req) => {
  const productId = req.url && req.url.split("/").pop();
  if (!productId) return;

  const currentCount = (watchers.get(productId) || 0) + 1;
  watchers.set(productId, currentCount);

  console.log(
    `Yeni bağlantı: Ürün ${productId} için izleyici sayısı: ${currentCount}`
  );

  // Tüm istemcilere güncel izleyici sayısını gönder
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ productId, count: currentCount }));
    }
  });

  ws.on("close", () => {
    const updatedCount = Math.max((watchers.get(productId) || 0) - 1, 0);

    if (updatedCount === 0) {
      watchers.delete(productId);
    } else {
      watchers.set(productId, updatedCount);
    }

    console.log(
      `Bağlantı kapandı: Ürün ${productId} için izleyici sayısı: ${updatedCount}`
    );

    // Tüm istemcilere güncel izleyici sayısını tekrar gönder
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ productId, count: updatedCount }));
      }
    });
  });

  // Yeni bağlanan istemciye hoş geldin mesajı
  ws.send(
    JSON.stringify({
      message: "WebSocket sunucusuna bağlandınız",
      productId,
      count: currentCount,
    })
  );
});

// Tüm diğer istekleri Next.js'e yönlendir
server.all("*", (req, res) => {
  return handler(req, res);
});

httpServer.listen(4000, (err) => {
  if (err) throw err;
  console.log("Sunucu 4000 portunda dinleniyor");
});
