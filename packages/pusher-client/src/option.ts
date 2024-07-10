import { ManagerOptions } from "socket.io-client";

export interface Option extends Partial<ManagerOptions> {
  /**
   * The URI to connect to.
   */
  uri?: string;
  authenticate?: {
    /**
     * The endpoint to authenticate with.
     */
    endpoint: string;
  };
}
