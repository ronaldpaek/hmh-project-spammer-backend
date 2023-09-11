import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Root route
app.get("/", (req, res) => {
  res.send({ success: true, message: "Hello world!" });
});

// Messages routes
app
  .route("/messages")
  .get(async (req, res, next) => {
    try {
      const messages = await prisma.message.findMany();
      res.send({ success: true, messages });
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    try {
      const { text, parentId } = req.body;
      if (!text) throw new Error("Text is required!");
      if (parentId) {
        const parentMessage = await prisma.message.findUnique({
          where: { id: parentId },
        });
        if (!parentMessage) throw new Error("Parent message not found!");
      }
      const message = await prisma.message.create({
        data: { text, parentId },
      });
      res.send({ success: true, message });
    } catch (err) {
      next(err);
    }
  });

app
  .route("/messages/:messageId")
  .put(async (req, res, next) => {
    try {
      const { messageId } = req.params;
      const { text } = req.body;
      if (!text) throw new Error("Text is required!");
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { text },
      });
      res.send({ success: true, message });
    } catch (err) {
      next(err);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const { messageId } = req.params;
      const message = await prisma.message.delete({
        where: { id: messageId },
      });
      res.send({ success: true, message });
    } catch (err) {
      next(err);
    }
  });

// Error handler
app.use((err, req, res, next) => {
  res.send({ success: false, message: err.message });
});

// Catch-all handler
app.use((req, res) => {
  res.send({ success: false, message: "Route not found!" });
});

const port = 4000;

app.listen(port, () => console.log(`Listening on port ${port}...`));
