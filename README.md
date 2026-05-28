# better-auth `useSession` typing repro

Minimal reproduction for a TypeScript typing inconsistency in [better-auth](https://github.com/better-auth/better-auth):

> With `createAuthClient({ fetchOptions: { throw: true } })`, `useSession().value.data` is typed as non-nullable, but the underlying atom emits `null` at init and on 401.

See [ISSUE.md](./ISSUE.md) for the full write-up.

## Run

```sh
pnpm install
pnpm test
```

Expected output:

```
null
null
```

Both `session.value.data` and `session.value.error` are `null` at runtime — but TypeScript only typed one of them as nullable. The contradiction is visible in [repro.ts](./repro.ts) (15 lines).
