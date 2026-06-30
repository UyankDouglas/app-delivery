"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createProductAction,
  deleteProductAction,
  toggleProductAvailabilityAction,
  updateProductAction,
} from "@/server/actions/products";
import type { ActionState } from "@/server/actions/auth";
import {
  Badge,
  Button,
  Card,
  CardContent,
  FieldError,
  Input,
  Label,
  SubmitButton,
  Textarea,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { ImageUpload } from "@/components/image-upload";

export type ProductRow = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  isAvailable: boolean;
  categoryName: string;
};

function ProductForm({ product, onDone }: { product?: ProductRow; onDone: () => void }) {
  const router = useRouter();
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) {
      onDone();
      router.refresh();
    }
  }, [state.success, onDone, router]);

  return (
    <Card className="border-brand-200">
      <CardContent>
        <form action={formAction} className="space-y-3">
          {product && <input type="hidden" name="id" value={product.id} />}
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={product?.name} required />
              <FieldError messages={fe.name} />
            </div>
            <div>
              <Label htmlFor="categoryName">Categoria</Label>
              <Input
                id="categoryName"
                name="categoryName"
                defaultValue={product?.categoryName}
                placeholder="Ex.: Lanches"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={product?.description} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product?.price}
                required
              />
              <FieldError messages={fe.price} />
            </div>
            <div>
              <Label>Foto do produto</Label>
              <ImageUpload name="imageUrl" defaultValue={product?.imageUrl ?? ""} />
              <FieldError messages={fe.imageUrl} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="isAvailable"
              defaultChecked={product ? product.isAvailable : true}
            />
            Disponível
          </label>

          <div className="flex gap-2">
            <SubmitButton>{product ? "Salvar alterações" : "Criar produto"}</SubmitButton>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <form
      action={async (fd) => {
        await deleteProductAction(fd);
        router.refresh();
      }}
      onSubmit={(e) => {
        if (!confirm("Excluir este produto?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Excluir"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

function ToggleButton({ id, isAvailable }: { id: string; isAvailable: boolean }) {
  const router = useRouter();
  return (
    <form
      action={async (fd) => {
        await toggleProductAvailabilityAction(fd);
        router.refresh();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit">
        {isAvailable ? (
          <Badge className="cursor-pointer bg-green-100 text-green-700">Disponível</Badge>
        ) : (
          <Badge className="cursor-pointer bg-gray-200 text-gray-600">Indisponível</Badge>
        )}
      </button>
    </form>
  );
}

export function ProductsManager({ products }: { products: ProductRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        )}
      </div>

      {creating && <ProductForm onDone={() => setCreating(false)} />}

      {products.length === 0 && !creating ? (
        <p className="text-sm text-gray-500">Nenhum produto cadastrado. Crie o primeiro!</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) =>
            editingId === p.id ? (
              <ProductForm key={p.id} product={p} onDone={() => setEditingId(null)} />
            ) : (
              <Card key={p.id} className="flex items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl || "https://placehold.co/64x64?text=Prato"}
                  alt={p.name}
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(p.price)}
                    {p.categoryName && ` · ${p.categoryName}`}
                  </p>
                </div>
                <ToggleButton id={p.id} isAvailable={p.isAvailable} />
                <button
                  onClick={() => setEditingId(p.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <DeleteButton id={p.id} />
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
