# `useSession().value.data` typed as non-nullable when `fetchOptions.throw = true`

With `createAuthClient({ fetchOptions: { throw: true } })`, `useSession().value.data` is typed as `SessionData` (the `null` branch is stripped). The atom backing `useSession` still emits `null` at runtime — initial value and on 401 — so consumers either get false-positive `no-unnecessary-condition` lint on legitimate null checks, or crash with `Cannot read properties of null` if they trust the type.

Same conditional is used for React/Svelte/Solid/vanilla, so it should reproduce on all clients.

## Reproduction

<!-- TODO: replace with the GitHub URL once pushed -->
https://github.com/<your-username>/repro-better-auth

```ts
import { createAuthClient } from "better-auth/vue";

const client = createAuthClient({ fetchOptions: { throw: true } });
const session = client.useSession();

// Both fields hold `null` at runtime (atom initial value):
console.log(session.value.data);  // → null
console.log(session.value.error); // → null

// But TypeScript only typed one of them correctly:
//   session.value.error : BetterFetchError | null    ✓
//   session.value.data  : { user; session }          ✗ missing `| null`

// @ts-expect-error — should accept null (data IS null right now)
const _: typeof session.value.data = null;
```

`pnpm test` prints `null` twice and `tsc` is silent — because `@ts-expect-error` is consumed on the last line. Remove it and `tsc` reports `TS2322: Type 'null' is not assignable to type '{ user; session }'`.

## Root cause

The atom (`dist/client/query.mjs`, `useAuthQuery`) initialises with `data: null` and re-sets `data: null` on 401, independent of `fetchOptions.throw`:

```js
const value = atom({ data: null, error: null, isPending: true, ... });
// ...
value.set({ error: context.error, data: isUnauthorized ? null : value.get().data, ... });
```

But `useSession`'s declared `data` type in `dist/client/vue/index.d.mts` is derived from `InferClientAPI<Option>['getSession']`'s return. With `throw: true`, `getSession()` returns `T` directly (not `{ data, error }`), so the conditional falls through to `Res extends Record<string, any> ? Res : never` and drops the `null` branch.

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

## Versions

`better-auth` 1.6.11 · `typescript` 5.9.3 (strict) · `vue` 3.5.35 · Node 22 · macOS
