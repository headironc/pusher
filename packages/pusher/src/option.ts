import { ManagerOptions } from "socket.io-client";

export interface Option extends Partial<ManagerOptions> {
  /**
   * The URI to connect to.
   */
  uri?: string;
}
