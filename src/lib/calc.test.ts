import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateCandle, describeStockPressure, floorDivision, type CalcProduct } from "./calc";

const products: CalcProduct[] = [
  {
    id: 1,
    name: "Molde de vaso 200 ml",
    unit: "unidad",
    quantity: 2,
    unitPrice: 18,
    estimatedUses: 500,
    kind: "fijo",
  },
  {
    id: 2,
    name: "Cera de soja",
    unit: "kg",
    quantity: 5,
    unitPrice: 8.5,
    estimatedUses: null,
    kind: "consumible",
  },
  {
    id: 3,
    name: "Mecha de algodón",
    unit: "m",
    quantity: 20,
    unitPrice: 0.4,
    estimatedUses: null,
    kind: "consumible",
  },
  {
    id: 4,
    name: "Vaso de cristal 200 ml",
    unit: "unidad",
    quantity: 40,
    unitPrice: 0.85,
    estimatedUses: null,
    kind: "consumible",
  },
  {
    id: 5,
    name: "Bolsa de papel kraft",
    unit: "unidad",
    quantity: 30,
    unitPrice: 0.25,
    estimatedUses: null,
    kind: "consumible",
  },
];

const lines = [
  { productId: 2, quantity: 0.2 },
  { productId: 3, quantity: 0.15 },
  { productId: 4, quantity: 1 },
  { productId: 5, quantity: 1 },
  { productId: 1, quantity: 0 },
];

function quote(batchQuantity = 0, overrides: Partial<CalcProduct>[] = []) {
  const next = products.map((product) => {
    const override = overrides.find((item) => item.id === product.id);
    return override ? { ...product, ...override } : product;
  });
  return calculateCandle({
    products: next,
    lines,
    marginPercent: 40,
    marginFixed: 1.5,
    batchQuantity,
  });
}

describe("calculateCandle", () => {
  it("suma materiales consumidos y amortiza el equipo", () => {
    const result = quote();
    assert.ok(Math.abs(result.unitCost - 2.896) < 1e-9);
    assert.ok(Math.abs(result.percentMarginAmount - 1.1584) < 1e-9);
    assert.equal(result.marginFixed, 1.5);
    assert.ok(Math.abs(result.sellPrice - 5.5544) < 1e-9);
    assert.equal(result.maxCandles, 25);
    assert.equal(result.limitingProductName, "Cera de soja");
  });

  it("deja la producción a cero si falta un activo fijo", () => {
    const result = quote(0, [{ id: 1, quantity: 0 }]);
    assert.equal(result.maxCandles, 0);
    assert.equal(result.blockedByEquipment, true);
    assert.ok(result.unitCost > 0);
  });

  it("calcula el lote y el stock que quedaría sin tocar el equipo", () => {
    const result = quote(10);
    assert.equal(result.batchQuantity, 10);
    assert.ok(Math.abs(result.batchCost - 28.96) < 1e-9);
    assert.ok(Math.abs(result.batchRevenue - 55.544) < 1e-8);
    const cera = result.lines.find((line) => line.productId === 2);
    const molde = result.lines.find((line) => line.productId === 1);
    assert.ok(cera);
    assert.ok(molde);
    assert.ok(Math.abs(cera.remainingAfterBatch - 3) < 1e-9);
    assert.equal(molde.consumedInBatch, 0);
    assert.equal(molde.remainingAfterBatch, 2);
  });

  it("no deja pedir más velas de las que permite el stock", () => {
    const result = quote(80);
    assert.equal(result.batchQuantity, 25);
  });

  it("no calcula capacidad si la receta no consume material", () => {
    const result = calculateCandle({
      products,
      lines: [{ productId: 1, quantity: 0 }],
      marginPercent: 10,
      marginFixed: 0,
    });
    assert.equal(result.maxCandles, 0);
    assert.equal(result.missingConsumables, true);
  });
});

describe("floorDivision", () => {
  it("redondea hacia abajo cantidades justas", () => {
    assert.equal(floorDivision(1.2, 0.2), 6);
    assert.equal(floorDivision(0, 1), 0);
  });
});

describe("describeStockPressure", () => {
  it("marca bajo el material que no llega a diez velas", () => {
    const status = describeStockPressure(
      { ...products[1], quantity: 1.2 },
      [{ name: "Vela de soja 200 ml", lines }],
    );
    assert.equal(status.status, "bajo");
    assert.match(status.detail, /6 velas/);
  });

  it("avisa de poca cantidad aunque no esté en una receta", () => {
    const status = describeStockPressure(
      {
        id: 9,
        name: "Lacre",
        unit: "unidad",
        quantity: 2,
        unitPrice: 0.15,
        estimatedUses: null,
        kind: "consumible",
      },
      [],
    );
    assert.equal(status.status, "bajo");
  });
});
