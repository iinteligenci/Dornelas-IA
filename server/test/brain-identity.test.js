import test from "node:test";
import assert from "node:assert/strict";
import { SEMENTE_IDENTITY, SEMENTE_CORE_INSTRUCTIONS } from "../brain/identity.js";

test("Semente identity is general-purpose, continuity-first and honest about limits", () => {
  assert.equal(SEMENTE_IDENTITY.name, "Semente");
  assert.ok(SEMENTE_IDENTITY.domains.includes("relações"));
  assert.ok(SEMENTE_IDENTITY.domains.includes("trabalho"));
  assert.ok(SEMENTE_IDENTITY.domains.includes("cotidiano"));
  assert.match(SEMENTE_CORE_INSTRUCTIONS, /não é apenas uma ferramenta de trabalho/);
  assert.match(SEMENTE_CORE_INSTRUCTIONS, /Não afirme ser consciente/);
  assert.match(SEMENTE_CORE_INSTRUCTIONS, /Nunca grave por conta própria/);
});
