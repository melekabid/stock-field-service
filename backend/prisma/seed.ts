import { InterventionStatus, PrismaClient, UserCategory, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

type SeedProduct = {
  code: string;
  barcode: string;
  name: string;
  description: string;
  unitPrice: number;
  alertThreshold: number;
  kind: 'MACHINE' | 'CONSUMABLE';
  categoryName: string;
  supplierEmail: string;
  supplierName: string;
  quantity: number;
};

function buildProducts(): SeedProduct[] {
  const categories: Array<{
    name: string;
    kind: 'MACHINE' | 'CONSUMABLE';
    prefix: string;
    barcodePrefix: string;
    supplierEmail: string;
    supplierName: string;
    label: string;
    priceBase: number;
    threshold: number;
    quantityBase: number;
  }> = [
    {
      name: 'Machines Injection',
      kind: 'MACHINE',
      prefix: 'INJ-M',
      barcodePrefix: '310001',
      supplierEmail: 'injection-machines@example.com',
      supplierName: 'Injection Machines Supply',
      label: 'Machine Injection',
      priceBase: 8400,
      threshold: 2,
      quantityBase: 6,
    },
    {
      name: 'Machines Laser',
      kind: 'MACHINE',
      prefix: 'LAS-M',
      barcodePrefix: '310002',
      supplierEmail: 'laser-machines@example.com',
      supplierName: 'Laser Machines Supply',
      label: 'Machine Laser',
      priceBase: 11200,
      threshold: 2,
      quantityBase: 5,
    },
    {
      name: 'Consommables Injection',
      kind: 'CONSUMABLE',
      prefix: 'INJ-C',
      barcodePrefix: '310003',
      supplierEmail: 'injection-consumables@example.com',
      supplierName: 'Injection Consumables Supply',
      label: 'Consommable Injection',
      priceBase: 18,
      threshold: 12,
      quantityBase: 40,
    },
    {
      name: 'Consommables Laser',
      kind: 'CONSUMABLE',
      prefix: 'LAS-C',
      barcodePrefix: '310004',
      supplierEmail: 'laser-consumables@example.com',
      supplierName: 'Laser Consumables Supply',
      label: 'Consommable Laser',
      priceBase: 24,
      threshold: 10,
      quantityBase: 34,
    },
  ];

  const products: SeedProduct[] = [];

  for (const config of categories) {
    for (let index = 1; index <= 15; index += 1) {
      const sequence = index.toString().padStart(3, '0');
      products.push({
        code: `${config.prefix}-${sequence}`,
        barcode: `${config.barcodePrefix}${sequence}`,
        name: `${config.label} ${sequence}`,
        description: `${config.label} categorie ${config.name} pour gestion mobile du stock.`,
        unitPrice: Number((config.priceBase + index * (config.kind === 'MACHINE' ? 145 : 1.8)).toFixed(2)),
        alertThreshold: config.threshold,
        kind: config.kind,
        categoryName: config.name,
        supplierEmail: config.supplierEmail,
        supplierName: config.supplierName,
        quantity: config.quantityBase + index,
      });
    }
  }

  return products;
}

async function main() {
  const passwordHash = await argon2.hash('ChangeMe123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      category: UserCategory.GERANT,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      category: UserCategory.GERANT,
    },
  });

  await prisma.user.upsert({
    where: { email: 'direction@sacoges.com' },
    update: {
      firstName: 'Direction',
      lastName: 'SACOGES',
      role: UserRole.ADMIN,
      category: UserCategory.GERANT,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'direction@sacoges.com',
      passwordHash,
      firstName: 'Direction',
      lastName: 'SACOGES',
      role: UserRole.ADMIN,
      category: UserCategory.GERANT,
    },
  });

  await prisma.user.upsert({
    where: { email: 'commercial@sacoges.com' },
    update: {
      firstName: 'Equipe',
      lastName: 'Commerciale',
      role: UserRole.MANAGER,
      category: UserCategory.COMMERCIAL,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'commercial@sacoges.com',
      passwordHash,
      firstName: 'Equipe',
      lastName: 'Commerciale',
      role: UserRole.MANAGER,
      category: UserCategory.COMMERCIAL,
    },
  });

  const technician = await prisma.user.upsert({
    where: { email: 'tech@example.com' },
    update: {
      firstName: 'Youssef',
      lastName: 'Technician',
      role: UserRole.TECHNICIAN,
      category: UserCategory.TECHNIQUE,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'tech@example.com',
      passwordHash,
      firstName: 'Youssef',
      lastName: 'Technician',
      role: UserRole.TECHNICIAN,
      category: UserCategory.TECHNIQUE,
    },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: { name: 'Main Warehouse', location: 'HQ - Tunis' },
    create: { code: 'MAIN', name: 'Main Warehouse', location: 'HQ - Tunis' },
  });

  const products = buildProducts();

  for (const categoryName of [...new Set(products.map((item) => item.categoryName))]) {
    await prisma.category.upsert({
      where: { name: categoryName },
      update: {
        description: `Categorie mobile pour ${categoryName.toLowerCase()}.`,
      },
      create: {
        name: categoryName,
        description: `Categorie mobile pour ${categoryName.toLowerCase()}.`,
      },
    });
  }

  const suppliers = Object.values(
    products.reduce<Record<string, { email: string; name: string }>>((acc, product) => {
      acc[product.supplierEmail] = { email: product.supplierEmail, name: product.supplierName };
      return acc;
    }, {}),
  );

  for (const supplierSeed of suppliers) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: { email: supplierSeed.email },
    });

    if (existingSupplier) {
      await prisma.supplier.update({
        where: { id: existingSupplier.id },
        data: {
          name: supplierSeed.name,
          phone: '+21670000000',
        },
      });
      continue;
    }

    await prisma.supplier.create({
      data: {
        name: supplierSeed.name,
        email: supplierSeed.email,
        phone: '+21670000000',
        address: 'Tunis',
      },
    });
  }

  for (const productSeed of products) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { name: productSeed.categoryName },
    });
    const supplier = await prisma.supplier.findFirstOrThrow({
      where: { email: productSeed.supplierEmail },
    });

    const product = await prisma.product.upsert({
      where: { code: productSeed.code },
      update: {
        barcode: productSeed.barcode,
        name: productSeed.name,
        description: productSeed.description,
        unitPrice: productSeed.unitPrice,
        alertThreshold: productSeed.alertThreshold,
        kind: productSeed.kind,
        categoryId: category.id,
        supplierId: supplier.id,
      },
      create: {
        code: productSeed.code,
        barcode: productSeed.barcode,
        name: productSeed.name,
        description: productSeed.description,
        unitPrice: productSeed.unitPrice,
        alertThreshold: productSeed.alertThreshold,
        kind: productSeed.kind,
        categoryId: category.id,
        supplierId: supplier.id,
      },
    });

    await prisma.productStock.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse.id,
        },
      },
      update: { quantity: productSeed.quantity },
      create: {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: productSeed.quantity,
      },
    });
  }

  const client = await prisma.client.upsert({
    where: { id: 'seed-client-acme' },
    update: {
      name: 'Clinique El Amal',
      email: 'contact@elamal.example',
      phone: '+21670000000',
    },
    create: {
      id: 'seed-client-acme',
      name: 'Clinique El Amal',
      email: 'contact@elamal.example',
      phone: '+21670000000',
      billingAddress: 'Ariana, Tunis',
    },
  });

  const site = await prisma.site.upsert({
    where: { id: 'seed-site-main' },
    update: {
      name: 'Bloc Operatoire A',
      address: '12 Rue de la Sante, Ariana',
      city: 'Ariana',
      country: 'Tunisie',
      clientId: client.id,
    },
    create: {
      id: 'seed-site-main',
      name: 'Bloc Operatoire A',
      address: '12 Rue de la Sante, Ariana',
      city: 'Ariana',
      country: 'Tunisie',
      clientId: client.id,
    },
  });

  await prisma.intervention.upsert({
    where: { number: 'INT-2026-0001' },
    update: {
      description: "Maintenance preventive et verification generale de l'equipement",
      clientId: client.id,
      siteId: site.id,
      managerId: admin.id,
      technicianId: technician.id,
    },
    create: {
      number: 'INT-2026-0001',
      date: new Date(),
      status: InterventionStatus.OPEN,
      description: "Maintenance preventive et verification generale de l'equipement",
      clientId: client.id,
      siteId: site.id,
      managerId: admin.id,
      technicianId: technician.id,
    },
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
