import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
  console.log('--- Users ---');
  console.log(users);

  const websites = await prisma.website.findMany({
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      authorId: true,
    },
  });
  console.log('--- Websites ---');
  console.log(websites);

  const wallets = await prisma.userCreditWallet.findMany();
  console.log('--- User Wallets ---');
  console.log(wallets);

  const websiteWallets = await prisma.websiteCreditWallet.findMany();
  console.log('--- Website Wallets ---');
  console.log(websiteWallets);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
