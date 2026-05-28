import { createAuthClient } from "better-auth/vue";

const client = createAuthClient({ fetchOptions: { throw: true } });
const session = client.useSession();

// Both fields hold `null` at runtime (atom initial value):
console.log(session.value.data);  // → null
console.log(session.value.error); // → null

// But TypeScript only typed one of them correctly:
//   session.value.error : BetterFetchError | null    ✓
//   session.value.data  : { user; session }          ✗ missing `| null`

// Proof — assigning the value we just printed to data's type is rejected:
// @ts-expect-error — should accept null (data IS null right now)
const _: typeof session.value.data = null;