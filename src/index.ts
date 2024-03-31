import { connect } from "cloudflare:sockets";

export class RedisClient {
  private readonly address: SocketAddress;
  private readonly password: string | undefined;
  private socket: Socket | null = null;

  constructor(host: string, port: number, password?: string) {
    this.address = { hostname: host, port };
    this.password = password;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = connect(this.address);
        this.socket.opened
          .then(() => {
            console.log("Connected to Redis server");
            if (this.password) {
              this.authenticate()
                .then(() => resolve())
                .catch((error) => reject(error));
            }
          })
          .catch((error) => reject(error));
      } catch (error) {
        reject(error);
      }
    });
  }

  public async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.close().then(() => {
          this.socket = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public async get(key: string): Promise<string | null> {
    const command = `GET ${key}\r\n`;
    await this.sendCommand(command);

    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.readResponse()
          .then((response) => {
            if (response.startsWith("$")) {
              const length = Number.parseInt(response.slice(1).trim(), 10);
              if (length === -1) {
                resolve(null);
              } else {
                const value = response
                  .slice(response.indexOf("\r\n") + 2)
                  .trim();
                resolve(value);
              }
            } else {
              reject(new Error(`Error: ${response.trim()}`));
            }
          })
          .catch((error) => reject(error));
      } else {
        reject(new Error("Not connected to Redis server"));
      }
    });
  }

  public async set(key: string, value: string): Promise<void> {
    const command = `SET ${key} ${value}\r\n`;
    await this.sendCommand(command);

    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.readResponse()
          .then((response) => {
            if (response.startsWith("+OK")) {
              resolve();
            } else {
              reject(new Error(`Error: ${response.trim()}`));
            }
          })
          .catch((error) => reject(error));
      } else {
        reject(new Error("Not connected to Redis server"));
      }
    });
  }

  private async authenticate(): Promise<void> {
    const command = `AUTH ${this.password}\r\n`;
    await this.sendCommand(command);

    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.readResponse()
          .then((response) => {
            if (response.startsWith("+OK")) {
              console.log("Authentication successful");
              resolve();
            } else {
              reject(new Error(`Authentication failed: ${response.trim()}`));
            }
          })
          .catch((error) => reject(error));
      } else {
        reject(new Error("Not connected to Redis server"));
      }
    });
  }

  private async sendCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        const writer = this.socket.writable.getWriter();
        writer
          .write(new TextEncoder().encode(command))
          .then(() => {
            writer.releaseLock(); // Release the writer lock
            resolve();
          })
          .catch((error) => {
            writer.releaseLock(); // Release the writer lock in case of an error
            reject(error);
          });
      } else {
        reject(new Error("Not connected to Redis server"));
      }
    });
  }

  private async readResponse(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        const reader = this.socket.readable.getReader();
        reader
          .read()
          .then(({ value, done }) => {
            reader.releaseLock(); // Release the reader lock
            if (done) {
              reject(new Error("Socket closed unexpectedly"));
            } else {
              const response = new TextDecoder().decode(value);
              resolve(response);
            }
          })
          .catch((error) => {
            reader.releaseLock(); // Release the reader lock in case of an error
            reject(error);
          });
      } else {
        reject(new Error("Not connected to Redis server"));
      }
    });
  }
}
