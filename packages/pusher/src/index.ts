import { Socket, io } from "socket.io-client";
import { ObjectId } from "bson";

import { Option } from "~/option";
import { URL } from "url";

class Pusher {
  private option: Option;
  private socket: Socket;

  constructor(key: string, option?: Option) {
    if (!ObjectId.isValid(key)) {
      throw new Error("Invalid key");
    }

    if (option?.uri) {
      try {
        new URL(option.uri);
      } catch (error) {
        throw new Error("Invalid URL");
      }
    }

    this.option = option || {};
    this.socket = this.option.uri ? io(this.option.uri, option) : io(option);
  }

  on(event: string, listener: (...args: any[]) => void) {
    this.socket.on(event, listener);

    return this;
  }

  close() {
    this.socket.close();
  }
}

export default Pusher;
