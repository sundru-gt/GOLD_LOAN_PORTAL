# AI Development Log – Gold Loan Portal

## Tools Used

| Tool | Purpose |
|------|---------|
| **Google Gemini 3.5 Flash** | Powers AI-driven chatbot interactions and the intelligent Loan Assistant, enabling natural-language conversations, contextual responses, and function calling for loan-related queries and workflows. |
---

## Prompts Used

### Prompt 1 – Validation Schema

> **Task**: Generate Zod validation schemas for all API inputs. The schema must enforce:
> - Name: 2-60 chars, letters and spaces only
> - Mobile: 10-digit starting with 6-9, regex `^[6-9]\d{9}$`
> - Weight: 0 < net <= gross <= 1000
> - Karat: union of literals 18, 22, 24 only
>
> All error messages must be user-friendly strings (no "Invalid union" messages).
> Cross-field validation: net weight must not exceed gross weight.
> Return field path in errors using `.path` array.

**Result**: The generated schema correctly handles the cross-field validation via `.refine()` and uses `z.union([z.literal(18), z.literal(22), z.literal(24)])` for karat instead of `z.enum([18, 22, 24])` (which would use strings), preventing a subtle type mismatch bug.

---

### Prompt 2 – AI Agent Tool Definitions

> **Task**: Define function calling tools for a Gemini-powered gold loan assistant.
> The agent must:
> 1. NEVER perform arithmetic itself – always call `calculate_quote` tool
> 2. Call `submit_application` ONLY after showing summary and getting explicit confirmation
> 3. Decline off-topic questions politely
> 4. Never promise loan approval (say "eligible amount" instead)
>
> Tools needed:
> - `get_loan_schemes()` – returns available plans
> - `calculate_quote(net, gross, karat)` – calls /quotes endpoint
> - `submit_application(payload)` – calls /leads endpoint
>
> Implement an agentic loop that handles multi-turn function calling.

**Result**: Generated a complete agentic loop that handles Gemini's function call / function response cycle, with proper error handling when tools fail (e.g., 409 conflict from the API).

---

## AI Mistake Spotted & Fixed

### Bug: `Math.round()` used instead of `Math.floor()` for loan calculation

**When**: During initial generation of `computeEligibleLoanRupees`.

**What happened**: The AI initially generated:
```typescript
// ❌ WRONG – AI initial version
return Math.round(goldValueRupees * effectiveLtv);
```

**Why it's wrong**: Using `Math.round()` means we could lend MORE than the LTV allows.
For example: `64167 × 0.65 = 41708.55 → Math.round() = 41709` (over-lends by ₹1).
In financial lending, we must always `floor()` to ensure we never exceed the LTV limit.

**How it was spotted**: The test written to explicitly check this:
```typescript
test("uses floor() – NEVER rounds up (AI bug caught by this test)", () => {
  // 64167 * 0.65 = 41708.55 → should be 41708 (floor), NOT 41709 (round)
  const result = computeEligibleLoanRupees(64167, 0.65);
  expect(result).toBe(41708); // floor, not round
});
```

**Fix applied**: Changed to `Math.floor()`:
```typescript
// ✅ CORRECT – after fix
return Math.floor(goldValueRupees * effectiveLtv);
```

**Test written to catch this regression**: `src/__tests__/mathUtils.test.ts` – test "uses floor() – NEVER rounds up"

---

## Mobile Number Masking Policy

All mobile numbers in this codebase are handled as follows:

| Location | Treatment |
|----------|-----------|
| Database (MongoDB) | Stored raw (encrypted in production) |
| API responses | Always masked using `maskMobile()` → `9876XXXX10` |
| Logs | Always masked using `maskMobile()` |
| Frontend display | Receives pre-masked values from API |

**Masking function**:
```typescript
export function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 10) return "XXXXXXXXXX";
  return `${mobile.slice(0, 4)}XXXX${mobile.slice(-2)}`;
}
```

Examples: `9876543210` → `9876XXXX10`, `6543219870` → `6543XXXX70`

---

## Testing Summary

### Math Unit Tests (`mathUtils.test.ts`)
- 25 tests covering all calculation functions and edge cases
- Includes the AI-bug regression test (floor vs round)

### API Integration Tests (`api.test.ts`)
- Uses `mongodb-memory-server` – no external DB needed
- Tests: 400 validation (name, mobile, weight, karat), 409 duplicate detection
- Verifies mobile masking in all GET/POST responses
- Verifies exact error shape `{ error: { code, message, fields[] } }`


