import { z } from "zod";

// Sanitiza strings: remove espaços nas pontas. (controle removido no servidor via sanitizeText)
const str = (max = 255) => z.string().trim().max(max);

// --------------------------------------------------------------------------
// Autenticação
// --------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: str(120).min(2, "Nome muito curto"),
    email: z.string().trim().toLowerCase().email("E-mail inválido"),
    phone: str(20).optional().or(z.literal("")),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string(),
    role: z.enum(["CUSTOMER", "OWNER"]).default("CUSTOMER"),
    // Necessário quando role = OWNER
    restaurantName: str(120).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  })
  .refine((d) => d.role !== "OWNER" || (d.restaurantName && d.restaurantName.length >= 2), {
    message: "Informe o nome do restaurante",
    path: ["restaurantName"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

// --------------------------------------------------------------------------
// Restaurante (configuração do dono)
// --------------------------------------------------------------------------
const hourField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (use HH:MM)")
  .or(z.literal(""));

export const openingHoursSchema = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.object({ open: hourField, close: hourField, closed: z.boolean().optional() })
);

export const restaurantSettingsSchema = z.object({
  name: str(120).min(2, "Nome muito curto"),
  description: str(500).optional().or(z.literal("")),
  logoUrl: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  phone: str(20).optional().or(z.literal("")),
  street: str(160).optional().or(z.literal("")),
  number: str(20).optional().or(z.literal("")),
  complement: str(120).optional().or(z.literal("")),
  neighborhood: str(120).optional().or(z.literal("")),
  city: str(120).optional().or(z.literal("")),
  state: str(2).optional().or(z.literal("")),
  zipCode: str(12).optional().or(z.literal("")),
  deliveryFee: z.coerce.number().min(0, "Taxa inválida").max(1000),
  minimumOrder: z.coerce.number().min(0).max(10000).default(0),
  avgPrepTimeMinutes: z.coerce.number().int().min(0).max(600),
  paymentMethods: z.array(z.enum(["CARD", "CASH", "PIX"])).min(1, "Selecione ao menos uma forma de pagamento"),
  isOpen: z.coerce.boolean().default(true),
  openingHours: openingHoursSchema.optional(),
});
export type RestaurantSettingsInput = z.infer<typeof restaurantSettingsSchema>;

// --------------------------------------------------------------------------
// Produto
// --------------------------------------------------------------------------
export const productSchema = z.object({
  name: str(120).min(2, "Nome muito curto"),
  description: str(500).optional().or(z.literal("")),
  imageUrl: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  price: z.coerce.number().positive("Preço deve ser maior que zero").max(100000),
  categoryName: str(60).optional().or(z.literal("")),
  isAvailable: z.coerce.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;

// --------------------------------------------------------------------------
// Endereço de entrega
// --------------------------------------------------------------------------
export const addressSchema = z.object({
  recipient: str(120).min(2, "Informe o nome de quem recebe"),
  phone: str(20).min(8, "Telefone inválido"),
  zipCode: str(12).min(8, "CEP inválido"),
  street: str(160).min(2, "Informe a rua"),
  number: str(20).min(1, "Informe o número"),
  complement: str(120).optional().or(z.literal("")),
  neighborhood: str(120).min(2, "Informe o bairro"),
  city: str(120).min(2, "Informe a cidade"),
  state: str(2).min(2, "UF inválida"),
  reference: str(160).optional().or(z.literal("")),
});
export type AddressInput = z.infer<typeof addressSchema>;

// --------------------------------------------------------------------------
// Checkout
// --------------------------------------------------------------------------
export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(99),
  note: str(160).optional().or(z.literal("")),
});

export const checkoutSchema = z.object({
  restaurantId: z.string().min(1),
  items: z.array(checkoutItemSchema).min(1, "Carrinho vazio"),
  paymentMethod: z.enum(["CARD", "CASH", "PIX"]),
  address: addressSchema,
  customerNote: str(300).optional().or(z.literal("")),
  // Usados apenas no checkout como convidado (sem login)
  guestName: str(120).optional().or(z.literal("")),
  guestEmail: z.string().trim().toLowerCase().email("E-mail inválido").optional().or(z.literal("")),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// --------------------------------------------------------------------------
// Entregador (cadastrado pelo dono)
// --------------------------------------------------------------------------
export const deliveryPersonSchema = z.object({
  name: str(120).min(2, "Nome muito curto"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: str(20).min(8, "Telefone inválido"),
  vehicle: str(60).optional().or(z.literal("")),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
});
export type DeliveryPersonInput = z.infer<typeof deliveryPersonSchema>;

// --------------------------------------------------------------------------
// Mensagem (chat)
// --------------------------------------------------------------------------
export const messageSchema = z.object({
  orderId: z.string().min(1),
  body: str(1000).min(1, "Mensagem vazia"),
});
export type MessageInput = z.infer<typeof messageSchema>;

// --------------------------------------------------------------------------
// Atualização de status / atribuição (validados nas actions)
// --------------------------------------------------------------------------
export const updateStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
});

export const assignDeliverySchema = z.object({
  orderId: z.string().min(1),
  deliveryPersonId: z.string().min(1),
});
