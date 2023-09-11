import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

const fetchChildrenRecursively = async (messageId) => {
  const children = await prisma.message.findMany({
    where: { parentId: messageId },
  });

  for (let i = 0; i < children.length; i++) {
    children[i].children = await fetchChildrenRecursively(children[i].id);
  }

  return children;
};

// Root route
app.get("/", (req, res) => {
  res.send({ success: true, message: "Welcome to Project Spammer!" });
});

// Messages routes
app
  .route("/messages")
  .get(async (req, res, next) => {
    try {
      const topLevelMessages = await prisma.message.findMany({
        where: { parentId: null },
      });

      for (let i = 0; i < topLevelMessages.length; i++) {
        topLevelMessages[i].children = await fetchChildrenRecursively(
          topLevelMessages[i].id
        );
      }

      res.send({ success: true, messages: topLevelMessages });
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    try {
      const { text, parentId } = req.body;

      if (!text) {
        throw new Error("Text is required!");
      }

      if (parentId) {
        const parentMessage = await prisma.message.findUnique({
          where: { id: parentId },
        });

        if (!parentMessage) {
          throw new Error("Parent message not found!");
        }
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
      const { text, likes } = req.body;

      const existingMessage = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          children: true,
        },
      });

      if (!existingMessage) {
        throw new Error(`Message with ID ${messageId} not found.`);
      }

      if (text === undefined && likes === undefined) {
        throw new Error("Text or likes is required!");
      }

      const updateData = {};

      if (text !== undefined) {
        updateData.text = text;
      }

      if (likes !== undefined) {
        if (typeof likes !== "number") {
          throw new Error("Likes must be a number!");
        }
        updateData.likes = likes;
      }

      const message = await prisma.message.update({
        where: { id: messageId },
        data: updateData,
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

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}...`));
