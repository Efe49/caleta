import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { openDatabase } from "./db";
import { getCandle, listProducts, registerProduction } from "./queries";

describe("registerProduction", () => {
  it("descuenta solo materiales consumibles", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "alba-"));
    const db = openDatabase(path.join(dir, "alba.db"));
    const candle = getCandle(db, 1);
    assert.ok(candle);
    const before = listProducts(db);
    const result = registerProduction(db, candle.id, 2);
    assert.equal(result.ok, true);
    const after = listProducts(db);

    const ceraBefore = before.find((product) => product.name === "Cera de soja");
    const ceraAfter = after.find((product) => product.name === "Cera de soja");
    const moldeBefore = before.find((product) => product.name === "Molde de vaso 200 ml");
    const moldeAfter = after.find((product) => product.name === "Molde de vaso 200 ml");
    assert.ok(ceraBefore && ceraAfter && moldeBefore && moldeAfter);
    assert.ok(Math.abs(ceraAfter.quantity - (ceraBefore.quantity - 0.4)) < 1e-9);
    assert.equal(moldeAfter.quantity, moldeBefore.quantity);
    db.close();
  });
});
