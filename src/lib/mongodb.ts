import { MongoClient, Db, Collection, type CollectionOptions } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI .env file e set kora nai");
}

export const mongoClientOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
};

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Checks whether a MongoClient or its topology is in a closed/closing state.
 */
export function isClientClosed(client: MongoClient | undefined): boolean {
  if (!client) return true;
  try {
    const topology = (
      client as unknown as {
        topology?: {
          isClosed?: () => boolean;
          isDestroyed?: () => boolean;
          s?: { state?: string };
        };
      }
    ).topology;
    if (!topology) return false;
    if (typeof topology.isClosed === "function" && topology.isClosed()) {
      return true;
    }
    if (typeof topology.isDestroyed === "function" && topology.isDestroyed()) {
      return true;
    }
    const state = topology.s?.state;
    if (state === "closed" || state === "destroying" || state === "destroyed") {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * Identifies errors indicating that the MongoDB topology is closed, disconnected, or destroyed.
 */
export function isTopologyClosedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  const message = (err as { message?: string }).message;
  return (
    name === "MongoTopologyClosedError" ||
    name === "MongoClientClosedError" ||
    name === "MongoServerClosedError" ||
    name === "MongoNotConnectedError" ||
    (typeof message === "string" && message.includes("Topology is closed")) ||
    (typeof message === "string" && message.includes("Client must be connected")) ||
    (typeof message === "string" && message.includes("topology was destroyed"))
  );
}

/**
 * Safely resets the cached MongoClient and connection promise.
 */
export function resetMongoClient() {
  const oldClient = globalThis._mongoClient;
  globalThis._mongoClient = undefined;
  globalThis._mongoClientPromise = undefined;
  if (oldClient) {
    try {
      oldClient.close().catch(() => {});
    } catch {}
  }
}

/**
 * Returns a cached singleton MongoClient, or creates a new one if not yet initialized
 * or if the previous client's topology has closed.
 */
export function getMongoClient(): MongoClient {
  if (globalThis._mongoClient && !isClientClosed(globalThis._mongoClient)) {
    return globalThis._mongoClient;
  }

  if (globalThis._mongoClient) {
    resetMongoClient();
  }

  const client = new MongoClient(uri as string, mongoClientOptions);

  // Automatically purge cache if topology closes
  client.on("topologyClosed", () => {
    if (globalThis._mongoClient === client) {
      globalThis._mongoClient = undefined;
      globalThis._mongoClientPromise = undefined;
    }
  });

  client.on("close", () => {
    if (globalThis._mongoClient === client) {
      globalThis._mongoClient = undefined;
      globalThis._mongoClientPromise = undefined;
    }
  });

  globalThis._mongoClient = client;
  globalThis._mongoClientPromise = client.connect().catch((err) => {
    if (globalThis._mongoClient === client) {
      globalThis._mongoClient = undefined;
      globalThis._mongoClientPromise = undefined;
    }
    throw err;
  });

  return client;
}

/**
 * Returns the cached connection promise, reconnecting if closed.
 */
export function getMongoClientPromise(): Promise<MongoClient> {
  if (
    globalThis._mongoClient &&
    !isClientClosed(globalThis._mongoClient) &&
    globalThis._mongoClientPromise
  ) {
    return globalThis._mongoClientPromise;
  }
  const client = getMongoClient();
  return globalThis._mongoClientPromise ?? Promise.resolve(client);
}

/**
 * Returns the live database instance for the active client.
 */
export function getLiveDb(): Db {
  const client = getMongoClient();
  return client.db();
}

/**
 * Wraps a collection so that if a query fails due to a closed topology (e.g. idle socket dropped),
 * it resets the client, reconnects, and retries the operation once.
 */
function wrapCollection(getCol: () => Collection): Collection {
  return new Proxy({} as Collection, {
    get(_target, prop, receiver) {
      const col = getCol();
      const orig = Reflect.get(col, prop, receiver);
      if (typeof orig !== "function") {
        return orig;
      }

      return function (...args: unknown[]) {
        let result: unknown;
        try {
          result = orig.apply(getCol(), args);
        } catch (syncErr: unknown) {
          if (isTopologyClosedError(syncErr)) {
            resetMongoClient();
            const freshCol = getCol();
            const freshMethod = Reflect.get(freshCol, prop, receiver);
            return freshMethod.apply(freshCol, args);
          }
          throw syncErr;
        }

        // If returned a cursor (e.g. aggregate, find)
        if (
          result &&
          typeof result === "object" &&
          typeof (result as { toArray?: unknown }).toArray === "function"
        ) {
          const cursor = result as { toArray: (...a: unknown[]) => Promise<unknown> };
          const origToArray = cursor.toArray.bind(cursor);
          cursor.toArray = async function (...a: unknown[]) {
            try {
              return await origToArray(...a);
            } catch (cursorErr: unknown) {
              if (isTopologyClosedError(cursorErr)) {
                resetMongoClient();
                const freshCol = getCol();
                const freshResult = (
                  freshCol as unknown as Record<
                    string,
                    (...b: unknown[]) => { toArray: (...c: unknown[]) => Promise<unknown> }
                  >
                )[prop as string](...args);
                return await freshResult.toArray(...a);
              }
              throw cursorErr;
            }
          };
          return cursor;
        }

        // If returned a Promise (e.g. insertOne, findOne, createIndex, updateOne, deleteOne)
        if (result && typeof (result as Promise<unknown>).then === "function") {
          return (async () => {
            try {
              return await (result as Promise<unknown>);
            } catch (asyncErr: unknown) {
              if (isTopologyClosedError(asyncErr)) {
                resetMongoClient();
                const freshCol = getCol();
                const freshMethod = Reflect.get(freshCol, prop, receiver);
                return await freshMethod.apply(freshCol, args);
              }
              throw asyncErr;
            }
          })();
        }

        return result;
      };
    },
  });
}

/**
 * Resilient Db proxy passed to Better Auth's mongodbAdapter.
 * Delegates dynamically to the currently live, connected MongoClient's db instance.
 */
export const resilientDb: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const liveDb = getLiveDb();
    if (prop === "collection") {
      return (name: string, options?: CollectionOptions) => {
        return wrapCollection(() => getLiveDb().collection(name, options));
      };
    }
    const val = Reflect.get(liveDb, prop, receiver);
    if (typeof val === "function") {
      return val.bind(liveDb);
    }
    return val;
  },
});

/**
 * Resilient MongoClient proxy passed to Better Auth configuration.
 * Delegates dynamically to the currently live, connected MongoClient.
 */
export const resilientClient: MongoClient = new Proxy({} as MongoClient, {
  get(_target, prop, receiver) {
    const liveClient = getMongoClient();
    const val = Reflect.get(liveClient, prop, receiver);
    if (typeof val === "function") {
      return val.bind(liveClient);
    }
    return val;
  },
});
