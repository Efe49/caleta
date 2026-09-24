"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExampleBadge } from "@/components/example-badge";
import { Field } from "@/components/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NamedSelectValue } from "@/components/named-select-value";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  deleteProductAction,
  updateCategoryAction,
  updateProductAction,
  updateStockAndPriceAction,
} from "@/app/actions";
import { formatEuro, formatQty, parseDecimal } from "@/lib/format";
import { KIND_LABEL, UNITS, type Category, type CategoryKind, type Product } from "@/lib/types";

const KIND_OPTIONS: Record<CategoryKind, string> = {
  fijo: "Activo fijo (se amortiza)",
  consumible: "Consumible (cera, mecha, envase…)",
};

export function StockManager({
  categories,
  products,
}: {
  categories: Category[];
  products: Product[];
}) {
  const [categoryDialog, setCategoryDialog] = useState<Category | "new" | null>(null);
  const [productDialog, setProductDialog] = useState<Product | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { type: "category"; id: number; name: string }
    | { type: "product"; id: number; name: string }
    | null
  >(null);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Material y equipo</p>
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Almacén</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="h-10" onClick={() => setCategoryDialog("new")}>
            Nueva categoría
          </Button>
          <Button className="h-10" onClick={() => setProductDialog("new")} disabled={categories.length === 0}>
            Nuevo producto
          </Button>
        </div>
      </div>

      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Categorías</h2>
        {categories.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Todavía no hay categorías</CardTitle>
              <CardDescription>
                Crea una para clasificar moldes, cera, mechas, vasos o lo que uses en el taller.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-2">
            {categories.map((category) => (
              <Card key={category.id} size="sm">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{category.name}</p>
                      <Badge variant="secondary">{KIND_LABEL[category.kind]}</Badge>
                      {category.isExample ? <ExampleBadge /> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.productCount === 0
                        ? "Sin productos"
                        : `${category.productCount} ${category.productCount === 1 ? "producto" : "productos"}`}
                      {category.kind === "fijo"
                        ? " · el equipo se amortiza y no se descuenta al fabricar"
                        : " · se consume en cada vela"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCategoryDialog(category)}>
                      Editar
                    </Button>
                    <Button variant="destructive" onClick={() => setPendingDelete({ type: "category", id: category.id, name: category.name })}>
                      Borrar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-heading text-2xl">Productos</h2>
        {products.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>El almacén está vacío</CardTitle>
              <CardDescription>
                Añade cera, mechas, vasos o moldes. El precio y la cantidad se usan para el coste de cada vela.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3">
            {products.map((product) => (
              <ProductRow
                key={`${product.id}-${product.quantity}-${product.unitPrice}`}
                product={product}
                onEdit={() => setProductDialog(product)}
                onDelete={() => setPendingDelete({ type: "product", id: product.id, name: product.name })}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={categoryDialog !== null} onOpenChange={(open) => !open && setCategoryDialog(null)}>
        <DialogContent className="sm:max-w-md">
          {categoryDialog ? (
            <CategoryForm
              key={categoryDialog === "new" ? "new" : categoryDialog.id}
              category={categoryDialog === "new" ? null : categoryDialog}
              onClose={() => setCategoryDialog(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={productDialog !== null} onOpenChange={(open) => !open && setProductDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          {productDialog ? (
            <ProductForm
              key={productDialog === "new" ? "new" : productDialog.id}
              categories={categories}
              product={productDialog === "new" ? null : productDialog}
              onClose={() => setProductDialog(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteDialog
        target={pendingDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(String(product.quantity));
  const [price, setPrice] = useState(String(product.unitPrice));
  const [error, setError] = useState<string | null>(null);

  function save() {
    const nextQuantity = parseDecimal(quantity);
    const nextPrice = parseDecimal(price);
    if (nextQuantity == null || nextPrice == null) {
      setError("Escribe la cantidad y el precio con números.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateStockAndPriceAction(product.id, nextQuantity, nextPrice);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Stock y precio de ${product.name} actualizados.`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{product.name}</CardTitle>
          <Badge variant="secondary">{product.categoryName}</Badge>
          {product.isExample ? <ExampleBadge /> : null}
        </div>
        <CardDescription>
          {KIND_LABEL[product.kind]}
          {product.kind === "fijo" && product.estimatedUses
            ? ` · ${product.estimatedUses} usos estimados · amortización ${formatEuro(product.unitPrice / product.estimatedUses)} por vela`
            : null}
          {" · ahora "}
          {formatQty(product.quantity, product.unit)} a {formatEuro(product.unitPrice)} / {product.unit}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>No se ha guardado</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cantidad en almacén" htmlFor={`qty-${product.id}`}>
            <Input
              id={`qty-${product.id}`}
              inputMode="decimal"
              className="h-10"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label={`Precio por ${product.unit} (€)`} htmlFor={`price-${product.id}`}>
            <Input
              id={`price-${product.id}`}
              inputMode="decimal"
              className="h-10"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-10" onClick={save} disabled={pending}>
            {pending ? "Guardando…" : "Guardar stock y precio"}
          </Button>
          <Button variant="outline" className="h-10" onClick={onEdit}>
            Editar ficha
          </Button>
          <Button variant="destructive" className="h-10" onClick={onDelete}>
            Borrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryForm({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "consumible");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = category
        ? await updateCategoryAction(category.id, { name, kind })
        : await createCategoryAction({ name, kind });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(category ? "Categoría actualizada." : "Categoría creada.");
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        <DialogDescription>
          Los activos fijos son equipo: moldes y herramientas. El resto se gasta al fabricar.
        </DialogDescription>
      </DialogHeader>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se ha guardado</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Field label="Nombre" htmlFor="category-name">
        <Input id="category-name" className="h-10" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Tipo" htmlFor="category-kind">
        <Select
          value={kind}
          onValueChange={(value) => value && setKind(value as CategoryKind)}
          items={KIND_OPTIONS}
          itemToStringLabel={(value) => KIND_OPTIONS[value as CategoryKind] ?? "Tipo"}
        >
          <SelectTrigger id="category-kind" className="h-10 w-full">
            <NamedSelectValue
              placeholder="Elige un tipo"
              labelFor={(value) => KIND_OPTIONS[value as CategoryKind]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fijo">{KIND_OPTIONS.fijo}</SelectItem>
            <SelectItem value="consumible">{KIND_OPTIONS.consumible}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </>
  );
}

function ProductForm({
  categories,
  product,
  onClose,
}: {
  categories: Category[];
  product: Product | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(String(product?.categoryId ?? categories[0]?.id ?? ""));
  const [unit, setUnit] = useState(product?.unit ?? "unidad");
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : "0");
  const [price, setPrice] = useState(product ? String(product.unitPrice) : "");
  const [uses, setUses] = useState(product?.estimatedUses ? String(product.estimatedUses) : "100");
  const [error, setError] = useState<string | null>(null);
  const kind = categories.find((category) => String(category.id) === categoryId)?.kind;

  function save() {
    const nextQuantity = parseDecimal(quantity);
    const nextPrice = parseDecimal(price);
    const nextUses = parseDecimal(uses);
    if (nextQuantity == null || nextPrice == null) {
      setError("Escribe cantidad y precio con números.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const input = {
        name,
        categoryId: Number(categoryId),
        unit,
        quantity: nextQuantity,
        unitPrice: nextPrice,
        estimatedUses: kind === "fijo" ? nextUses : null,
      };
      const result = product
        ? await updateProductAction(product.id, input)
        : await createProductAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(product ? "Producto actualizado." : "Producto añadido al almacén.");
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        <DialogDescription>
          La unidad y el precio sirven para el coste. En los activos fijos, los usos estimados reparten el precio entre las velas.
        </DialogDescription>
      </DialogHeader>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se ha guardado</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3">
        <Field label="Nombre" htmlFor="product-name">
          <Input id="product-name" className="h-10" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Categoría" htmlFor="product-category">
          <Select
            value={categoryId}
            onValueChange={(value) => value && setCategoryId(value)}
            items={Object.fromEntries(categories.map((category) => [String(category.id), category.name]))}
            itemToStringLabel={(value) =>
              categories.find((category) => String(category.id) === String(value))?.name ?? "Categoría"
            }
          >
            <SelectTrigger id="product-category" className="h-10 w-full">
              <NamedSelectValue
                placeholder="Elige una categoría"
                labelFor={(value) => categories.find((category) => String(category.id) === value)?.name}
              />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={String(category.id)}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Unidad" htmlFor="product-unit">
            <Select
              value={unit}
              onValueChange={(value) => value && setUnit(value)}
              items={Object.fromEntries(UNITS.map((item) => [item, item]))}
              itemToStringLabel={(value) => (UNITS.includes(value as (typeof UNITS)[number]) ? String(value) : "Unidad")}
            >
              <SelectTrigger id="product-unit" className="h-10 w-full">
                <NamedSelectValue
                  placeholder="Elige una unidad"
                  labelFor={(value) => (UNITS.includes(value as (typeof UNITS)[number]) ? value : null)}
                />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cantidad" htmlFor="product-qty">
            <Input id="product-qty" inputMode="decimal" className="h-10" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </Field>
        </div>
        <Field label="Precio por unidad (€)" htmlFor="product-price">
          <Input id="product-price" inputMode="decimal" className="h-10" value={price} onChange={(event) => setPrice(event.target.value)} />
        </Field>
        {kind === "fijo" ? (
          <Field label="Usos estimados" htmlFor="product-uses" hint="El coste por vela es el precio dividido entre estos usos.">
            <Input id="product-uses" inputMode="decimal" className="h-10" value={uses} onChange={(event) => setUses(event.target.value)} />
          </Field>
        ) : null}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </>
  );
}

function DeleteDialog({
  target,
  onClose,
}: {
  target: { type: "category" | "product"; id: number; name: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const result =
        target.type === "category"
          ? await deleteCategoryAction(target.id)
          : await deleteProductAction(target.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(target.type === "category" ? "Categoría borrada." : "Producto borrado.");
      router.refresh();
      onClose();
    });
  }

  return (
    <AlertDialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Borrar {target?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.type === "product"
              ? "También se quitará de las recetas que lo usen. Esta acción no se puede deshacer."
              : "Solo se puede borrar una categoría vacía."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? "Borrando…" : "Borrar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
