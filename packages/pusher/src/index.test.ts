import { it, expect, describe, beforeAll, afterAll } from "@jest/globals";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import Pusher from ".";

it("should throw an error if the key is invalid", () => {
  const instantiate = () => new Pusher("123");

  expect(instantiate).toThrowError("Invalid key");
});

it("should create a new instance of Pusher", () => {
  const pusher = new Pusher("507f191e810c19729de860ea");

  expect(pusher).toBeInstanceOf(Pusher);

  // Clean up
  pusher.close();
});

it("should throw an error if the URI is invalid", () => {
  const instantiate = () =>
    new Pusher("507f191e810c19729de860ea", {
      uri: "invalid",
    });

  expect(instantiate).toThrowError("Invalid URL");
});

describe("connect to the server", () => {
  let server: ReturnType<typeof startServer>;

  beforeAll(() => {
    server = startServer();
  });

  afterAll(() => {
    server.close();
  });

  it("can't connect to the server", (done) => {
    const pusher = new Pusher("507f191e810c19729de860ea");

    pusher.on("connect_error", (error) => {
      pusher.close();

      done();
    });
  });

  it("can connect to the server", (done) => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://localhost:4000",
    });

    pusher.on("connection", (message) => {
      pusher.close();

      expect(message).toBe("connected");

      done();
    });
  });
});

// 构建一个socket.io的服务端用于测试
export const startServer = () => {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    /* options */
  });

  io.on("connection", (socket) => {
    socket.emit("connection", "connected");
  });

  return httpServer.listen(4000);
};
