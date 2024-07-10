import { it, expect, describe, beforeAll, afterAll } from "@jest/globals";
import express, { NextFunction, Request, Response } from "express";
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

  it("server is running", async () => {
    const response = await fetch("http://localhost:4000");

    const { message } = await response.json();

    expect(message).toBe("Hello, world!");
  });

  it("can authenticate with the server", async () => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://127.0.0.1:4000",
      authenticate: {
        endpoint: "http://127.0.0.1:4000/api/v1/accounts/authenticate",
      },
    });

    const { token, account } = await pusher.login();

    expect(token).toBe("token");
    expect(account).toBe(JSON.stringify({ id: pusher.socketId }));

    pusher.close();
  });

  /**
   * failed to parse URL from the endpoint
   */
  it("should throw an error if the URL can't be parsed", () => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://127.0.0.1:4000",
      authenticate: {
        endpoint: "/api/v1/accounts/authenticate",
      },
    });

    pusher.login().catch((error) => {
      expect(error.message).toBe(
        "Failed to parse URL from /api/v1/accounts/authenticate",
      );
    });

    pusher.close();
  });

  /**
   * failed to authenticate
   */
  it("should throw an error if failed to authenticate", () => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://127.0.0.1:4000",
      authenticate: {
        endpoint:
          "http://127.0.0.1:4000/api/v1/accounts/unsuccessful-authentication",
      },
    });

    pusher.login().catch((error) => {
      expect(error.message).toBe("Failed to authenticate");
    });

    pusher.close();
  });

  /**
   * test whether if the client has already authenticated
   */
  it("should throw an error if the client has already authenticated", async () => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://127.0.0.1:4000",
      authenticate: {
        endpoint: "http://127.0.0.1:4000/api/v1/accounts/authenticate",
      },
    });

    await pusher.login();

    pusher.login().catch((error) => {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Already authenticated");
    });

    pusher.close();
  });

  it("can't connect to the server", (done) => {
    const pusher = new Pusher("507f191e810c19729de860ea");

    pusher.on("connect_error", (error) => {
      pusher.close();

      done();
    });
  });

  it("can connect to the server", () => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "ws://localhost:4000",
    });

    pusher.on("connection", (message) => {
      expect(message).toBe("connected");
    });

    pusher.close();
  });

  /**
   * emit event
   */
  it("can emit an event to the server", () => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://localhost:4000",
      authenticate: {
        endpoint: "http://localhost:4000/api/v1/accounts/authenticate",
      },
    });

    pusher.on("connection", (message) => {
      pusher.emit("pusher:login", {
        token: "token",
        account: JSON.stringify({ id: pusher.socketId }),
      });

      pusher.on("pusher:login", ({ token, account }) => {
        expect(token).toBe("token");
        expect(account).toBe(JSON.stringify({ id: pusher.socketId }));
      });
    });

    pusher.close();
  });

  it("can disconnect from the server", () => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://localhost:4000",
    });

    pusher.on("connection", (message) => {
      console.log("connected", message);
      pusher.on("disconnect", (reason) => {
        console.log("disconnected", reason);

        expect(reason).toBe("client namespace disconnect");
      });
    });

    pusher.close();
  });

  it("can authenticate with the server", async () => {
    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://127.0.0.1:4000",
      authenticate: {
        endpoint: "http://127.0.0.1:4000/api/v1/accounts/authenticate",
      },
    });

    pusher.on("pusher:login", ({ token, account }) => {
      expect(token).toBe("token");
      expect(account).toBe(JSON.stringify({ id: pusher.socketId }));
    });

    await pusher.login();

    pusher.close();
  });
});

describe("Pusher receiver", () => {
  /**
   * test pusher receiver
   */
  it("can receive an event from the client", () => {
    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      /* options */
    });

    io.of(/^\/dynamic-\d+$/).on("connection", (socket) => {
      socket.on("pusher:login", ({ token, account }) => {
        expect(token).toBe("token");
        expect(account).toBe(JSON.stringify({ id: socket.id }));
      });
    });

    const server = httpServer.listen(4000);

    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://localhost:4000",
    });

    pusher.emit("pusher:login", {
      token: "token",
      account: JSON.stringify({ id: pusher.socketId }),
    });

    pusher.close();
    server.close();
  });

  /**
   * test pusher get socket id
   */
  it("can get the socket id", () => {
    const app = express();
    const httpServer = createServer(app);

    const io = new Server(httpServer, {
      /* options */
    });

    io.of(/^\/dynamic-\d+$/).on("connection", (socket) => {
      socket.on("pusher:socket-id", (socketId) => {
        expect(socketId).toBe(socket.id);
      });
    });

    const server = httpServer.listen(4000);

    const pusher = new Pusher("507f191e810c19729de860ea", {
      uri: "http://localhost:4000",
    });

    pusher.emit("pusher:socket-id", pusher.socketId());

    pusher.close();
    server.close();
  });
});

it("generate coverage report", () => {
  const pusher = new Pusher("507f191e810c19729de860ea");

  expect(pusher.generate()).toBe(
    "This function is used to generate jest coverage report.",
  );

  pusher.close();
});

// 构建一个socket.io的服务端用于测试
export const startServer = () => {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    /* options */
  });

  io.of(/^\/dynamic-\d+$/).on("connection", (socket) => {
    const key = socket.nsp;

    console.log("connected to", key);

    socket.emit("connection", "connected");

    socket.on("pusher:login", ({ token, account }) => {
      console.log("received", token, account);

      socket.emit("pusher:login", {
        token,
        account,
      });
    });
  });

  app.use(
    express.json({
      limit: "100kb",
    }),
  );

  app.get("/", (req, res) => {
    return res.json({
      message: "Hello, world!",
    });
  });

  app.post(
    "/api/v1/accounts/authenticate",
    (req: Request<{}, {}, { id: string }>, res) => {
      return res.json({
        token: "token",
        account: JSON.stringify({
          id: req.body.id,
        }),
      });
    },
  );

  /**
   * failed to authenticate
   */
  app.post("/api/v1/accounts/unsuccessful-authentication", (req, res) => {
    return res.status(401).json({
      message: "Failed to authenticate",
    });
  });

  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(error);

    next(error);
  });

  return httpServer.listen(4000);
};
