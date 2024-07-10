import { Socket, io } from "socket.io-client";
import { ObjectId } from "bson";
import { URL } from "url";

import { Option } from "~/option";

class Pusher {
  private key: string;
  private option: Option;
  private socket: Socket;
  /**
   * Whether there is an promise to authenticate.
   */
  private authenticating: Promise<Response> | null = null;
  /**
   * Whether the client is authenticated.
   */
  private authenticated: boolean = false;

  constructor(key: string, option?: Option) {
    if (!ObjectId.isValid(key)) {
      throw new Error("Invalid key");
    }

    this.key = key;

    const { uri, authenticate, ...rest } = option || {};

    if (uri) {
      try {
        new URL(uri);
      } catch (error) {
        throw new Error("Invalid URL");
      }
    }

    this.option = option || {};
    this.socket = uri ? io(uri + `/${this.key}`, rest) : io(this.key, rest);
  }

  socketId() {
    return this.socket.id;
  }

  async login() {
    let endpoint = "/api/v1/accounts/authenticate";

    if (this.authenticated) {
      throw new Error("Already authenticated");
    }

    if (this.option.authenticate) {
      endpoint = this.option.authenticate.endpoint;
    }

    try {
      if (!this.authenticating) {
        this.authenticating = fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: this.socket.id,
          }),
        });
      }

      const response = await this.authenticating;

      if (!response.ok) {
        const { message }: { message: string } = await response.json();

        throw new Error(message);
      }

      const {
        token,
        account,
      }: {
        token: string;
        account: string;
      } = await response.json();

      this.socket.emit("pusher:login", {
        token,
        account,
      });

      this.authenticated = true;

      return { token, account };
    } catch (error) {
      throw error;
    }
  }

  on(event: string, listener: (...args: any[]) => void) {
    this.socket.on(event, listener);

    return this;
  }

  emit(event: string, ...args: any[]) {
    this.socket.emit(event, ...args);

    return this;
  }

  close() {
    this.socket.close();
  }
}

export default Pusher;
