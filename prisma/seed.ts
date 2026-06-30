import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("senha12345", 10);

  // ---- Usuários ----
  const owner = await prisma.user.upsert({
    where: { email: "dono@demo.com" },
    update: {},
    create: { name: "Zé do Burguer", email: "dono@demo.com", phone: "11999990000", role: "OWNER", passwordHash },
  });

  const customer = await prisma.user.upsert({
    where: { email: "cliente@demo.com" },
    update: {},
    create: { name: "Maria Cliente", email: "cliente@demo.com", phone: "11988887777", role: "CUSTOMER", passwordHash },
  });

  const courier = await prisma.user.upsert({
    where: { email: "entregador@demo.com" },
    update: {},
    create: { name: "João Entregador", email: "entregador@demo.com", phone: "11977776666", role: "DELIVERY", passwordHash },
  });

  // ---- Restaurante ----
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "burguer-do-ze" },
    update: {},
    create: {
      ownerId: owner.id,
      name: "Burguer do Zé",
      slug: "burguer-do-ze",
      description: "Os melhores hambúrgueres artesanais da cidade.",
      logoUrl: "https://placehold.co/120x120/f97316/ffffff?text=Z%C3%A9",
      phone: "1133334444",
      street: "Rua das Palmeiras",
      number: "100",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01000-000",
      deliveryFee: 6.9,
      minimumOrder: 20,
      avgPrepTimeMinutes: 35,
      paymentMethods: ["CARD", "CASH"],
      isOpen: true,
      openingHours: {
        mon: { open: "18:00", close: "23:00", closed: false },
        tue: { open: "18:00", close: "23:00", closed: false },
        wed: { open: "18:00", close: "23:00", closed: false },
        thu: { open: "18:00", close: "23:00", closed: false },
        fri: { open: "18:00", close: "23:59", closed: false },
        sat: { open: "18:00", close: "23:59", closed: false },
        sun: { open: "18:00", close: "22:00", closed: false },
      },
    },
  });

  // ---- Perfil de entregador ----
  await prisma.deliveryPerson.upsert({
    where: { userId: courier.id },
    update: { restaurantId: restaurant.id },
    create: { userId: courier.id, restaurantId: restaurant.id, vehicle: "Moto Honda CG", status: "AVAILABLE" },
  });

  // ---- Reseta cardápio e recria ----
  await prisma.product.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.category.deleteMany({ where: { restaurantId: restaurant.id } });

  const lanches = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Lanches", sortOrder: 0 },
  });
  const bebidas = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Bebidas", sortOrder: 1 },
  });
  const sobremesas = await prisma.category.create({
    data: { restaurantId: restaurant.id, name: "Sobremesas", sortOrder: 2 },
  });

  await prisma.product.createMany({
    data: [
      { restaurantId: restaurant.id, categoryId: lanches.id, name: "X-Burguer", description: "Pão, hambúrguer 150g, queijo, alface e tomate.", price: 24.9, imageUrl: "https://placehold.co/300x300?text=X-Burguer", isAvailable: true },
      { restaurantId: restaurant.id, categoryId: lanches.id, name: "X-Bacon", description: "Hambúrguer 150g, bacon crocante e cheddar.", price: 29.9, imageUrl: "https://placehold.co/300x300?text=X-Bacon", isAvailable: true },
      { restaurantId: restaurant.id, categoryId: lanches.id, name: "X-Salada", description: "Hambúrguer 150g, queijo e salada fresca.", price: 26.9, imageUrl: "https://placehold.co/300x300?text=X-Salada", isAvailable: true },
      { restaurantId: restaurant.id, categoryId: bebidas.id, name: "Refrigerante lata", description: "Coca-Cola, Guaraná ou Fanta (350ml).", price: 6.5, imageUrl: "https://placehold.co/300x300?text=Refri", isAvailable: true },
      { restaurantId: restaurant.id, categoryId: bebidas.id, name: "Suco natural", description: "Laranja ou maracujá (400ml).", price: 9.0, imageUrl: "https://placehold.co/300x300?text=Suco", isAvailable: true },
      { restaurantId: restaurant.id, categoryId: sobremesas.id, name: "Pudim", description: "Pudim de leite condensado.", price: 12.0, imageUrl: "https://placehold.co/300x300?text=Pudim", isAvailable: true },
    ],
  });

  console.log("Seed concluído.");
  console.log("Contas de teste (senha: senha12345):");
  console.log("  Dono:        dono@demo.com");
  console.log("  Cliente:     cliente@demo.com");
  console.log("  Entregador:  entregador@demo.com");
  console.log(`Loja pública: /r/${restaurant.slug}`);
  void customer;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
