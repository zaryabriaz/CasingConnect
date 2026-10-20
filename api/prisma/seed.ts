import { BusinessActivity, LocationKind, MemberRole, PartnerRole, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { provisionBusiness } from '../src/businesses/provision';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const adminEmail = 'admin@casingconnect.demo';
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    await prisma.user.create({
      data: {
        name: 'CasingConnect Admin',
        email: adminEmail,
        passwordHash,
        isSuperAdmin: true,
      },
    });
  } else if (!admin.isSuperAdmin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { isSuperAdmin: true },
    });
  }

  const email = 'owner@casingconnect.demo';
  if (await prisma.user.findUnique({ where: { email } })) return;

  await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: { name: 'Al-Noor Owner', email, passwordHash },
    });
    const accountant = await tx.user.create({
      data: { name: 'Sana Accountant', email: 'accountant@casingconnect.demo', passwordHash },
    });
    const business = await tx.business.create({
      data: {
        name: 'Al-Noor Casings',
        legalName: 'Al-Noor Natural Casings',
        slug: 'al-noor-casings',
        activities: [BusinessActivity.PROCESSOR, BusinessActivity.EXPORTER],
        city: 'Sialkot',
        country: 'Pakistan',
        phone: '+92 300 0000000',
        description: 'Sheep casing processor and exporter.',
      },
    });
    await tx.membership.create({
      data: { businessId: business.id, userId: owner.id, role: MemberRole.OWNER },
    });
    await tx.membership.create({
      data: { businessId: business.id, userId: accountant.id, role: MemberRole.ACCOUNTANT, title: 'Accounts' },
    });
    await provisionBusiness(tx, business.id);
    await tx.location.createMany({
      data: [
        {
          businessId: business.id,
          name: 'Main processing yard',
          kind: LocationKind.PROCESSING,
          city: 'Sialkot',
          country: 'Pakistan',
        },
        {
          businessId: business.id,
          name: 'City warehouse',
          kind: LocationKind.WAREHOUSE,
          city: 'Sialkot',
          country: 'Pakistan',
        },
      ],
    });
    await tx.partner.create({
      data: {
        businessId: business.id,
        name: 'Haji Bashir',
        roles: [PartnerRole.SUPPLIER],
        phone: '+92 321 0000000',
        country: 'Pakistan',
        address: 'Sialkot',
        currency: 'PKR',
        paymentTerms: 'Partial cash, balance on account',
      },
    });
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
