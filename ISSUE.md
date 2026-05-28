# `useSession().value.data` typed as non-nullable when `fetchOptions.throw = true`

> Filed as [better-auth/better-auth#9781](https://github.com/better-auth/better-auth/issues/9781).

### Reproduction

Minimal repro repo: https://github.com/NinjaKinshasa/better-auth-usesession-typing-repro

```javascript
import { createAuthClient } from "better-auth/vue";

const client = createAuthClient({ fetchOptions: { throw: true } });
const session = client.useSession();

console.log(session.value.data);  // → null
console.log(session.value.error); // → null

// But TS only typed one of them correctly:
//   session.value.error : BetterFetchError | null    ✓
//   session.value.data  : { user; session }          ✗ missing `| null`

// @ts-expect-error — should accept null (data IS null right now)
const _: typeof session.value.data = null;
```

### Current vs. Expected behavior

**Current:** with `fetchOptions: { throw: true }`, `useSession().value.data` is typed as `SessionData` (no `| null`). But the underlying atom (`dist/client/query.mjs`, `useAuthQuery`) initialises with `data: null` and resets to `null` on 401 — runtime is `T | null`.

**Expected:** `data` should always be `SessionData | null`, regardless of `fetchOptions.throw`.

The conditional at `dist/client/vue/index.d.mts:19-31` (and React/Svelte/Solid/vanilla equivalents) drops the `null` branch — see Fix.

### What version of Better Auth are you using?

1.6.11

### System info

```json
{
  "system": {
    "platform": "darwin",
    "arch": "arm64",
    "release": "24.6.0"
  },
  "node": { "version": "v22.15.0" },
  "frameworks": [{ "name": "vue", "version": "^3.5.0" }],
  "betterAuth": { "version": "1.6.11" }
}
```

### Which area(s) are affected?

Client

## Fix

Decouple `useSession`'s `data` type from `getSession`'s return — always union with `null`:

```diff
--- a/dist/client/vue/index.d.mts
+++ b/dist/client/vue/index.d.mts
@@ -16,7 +16,7 @@
 declare function createAuthClient<Option extends BetterAuthClientOptions>(options?: Option | undefined): UnionToIntersection<InferResolvedHooks<Option>> & InferClientAPI<Option> & InferActions<Option> & {
   useSession: {
     (): DeepReadonly<Ref<{
-      data: InferClientAPI<Option> extends {
+      data: (InferClientAPI<Option> extends {
         getSession: () => Promise<infer Res>;
       } ? Res extends {
         data: null;
@@ -28,7 +28,7 @@
       } | {
         data: infer S;
         error: null;
-      } ? S : Res extends Record<string, any> ? Res : never : never;
+      } ? S : Res extends Record<string, any> ? Res : never : never) | null;
       isPending: boolean;
```

Same change applies to the `useFetch` overload below it and to the equivalent files for React/Svelte/Solid/vanilla.
