import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const clientId = 'subman-mobile';
  const adminEmail = 'admin@vmjam.com';
  const adminPassword = 'Admin123!';

  await prisma.auditLog.deleteMany();
  await prisma.webhookDelivery.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.apiClient.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.create({
    data: { clientId, email: adminEmail, passwordHash, role: 'ADMIN' },
  });

  const rawApiKey = `sm_${crypto.randomBytes(24).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

  await prisma.apiClient.create({
    data: {
      clientId,
      name: 'mobile-app-default',
      apiKeyHash,
      isActive: true,
    },
  });

  const customer = await prisma.customer.create({
    data: {
      clientId,
      fullName: 'Juan Dela Cruz',
      email: 'juan@example.com',
      phone: '+639171234567',
      storeName: 'Juan Mini Mart',
      storeLocation: 'Makati City, Metro Manila, Philippines',
      notes: 'Seed customer',
    },
  });

  const plan = await prisma.plan.create({
    data: {
      clientId,
      name: 'Standard Monthly',
      price: '799.00',
      currency: 'PHP',
      interval: 'MONTHLY',
      intervalCount: 1,
      description: 'Monthly recurring plan',
      isActive: true,
    },
  });

  const now = new Date();
  const next = new Date(now);
  next.setMonth(next.getMonth() + 1);

  await prisma.subscription.create({
    data: {
      clientId,
      customerId: customer.id,
      planId: plan.id,
      startDate: now,
      nextBillingDate: next,
      status: 'ACTIVE',
      autoRenew: true,
    },
  });

  await prisma.webhookEndpoint.create({
    data: {
      clientId,
      url: 'https://example.com/subman/webhook',
      secret: 'seed_webhook_secret',
      events: 'subscription_created,subscription_expired',
      isActive: true,
    },
  });

  console.log('Seed complete');
  console.log(`Admin email: ${admin.email}`);
  console.log(`Admin password: ${adminPassword}`);
  console.log(`API key (save now): ${rawApiKey}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
