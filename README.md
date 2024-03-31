# workers-redis

## A very simple Redis client library for Cloudflare Workers

### Features

- Password authentication
- Lightweight and efficient
- Easy to install and use

### Installation

```bash
npm install workers-redis
```

Ensure that you have Node.js and npm installed on your system.

### Usage

Here's an example of how to use the Redis client library in your Cloudflare Workers script:

```typescript
import { RedisClient } from "workers-redis";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const redis = new RedisClient("hostname", 6379, "password");

    try {
      await redis.connect();

      const key = "mykey";
      const value = await redis.get(key);

      return new Response(value);
    } catch (error) {
      console.error("Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    } finally {
      await redis.disconnect();
    }
  },
};
```
