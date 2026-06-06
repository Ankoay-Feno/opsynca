import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";

// jsdom does not expose crypto.subtle; polyfill it with Node's WebCrypto
// so tests that use SHA-256 (chatIndex.ts, chatIndex.test.ts) work correctly.
if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}
