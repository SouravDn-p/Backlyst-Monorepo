import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting taxonomy backfill...');

  // Create default marketplace categories from existing WebsiteCategoryKey
  const oldCategories: any[] =
    await prisma.$queryRaw`SELECT * FROM "WebsiteCategoryKey"`;
  for (const oldCat of oldCategories) {
    const slug = oldCat.key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await prisma.marketplaceCategory.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: oldCat.key,
        enabled: true,
      },
    });
  }

  // Create default marketplace tags from existing WebsiteMargetPlaceTag
  const oldTags: any[] =
    await prisma.$queryRaw`SELECT * FROM "WebsiteMargetPlaceTag"`;
  for (const oldTag of oldTags) {
    const slug = oldTag.tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await prisma.marketplaceTag.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: oldTag.tag,
        enabled: true,
      },
    });
  }

  // Fetch all websites
  const websites: any[] = await prisma.$queryRaw`SELECT * FROM "Website"`;

  for (const website of websites) {
    if (website.primaryCategoryKey) {
      const oldCats: any[] =
        await prisma.$queryRaw`SELECT * FROM "WebsiteCategoryKey" WHERE "id" = ${website.primaryCategoryKey}`;
      const oldCat = oldCats[0];
      if (oldCat) {
        const slug = oldCat.key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newCat = await prisma.marketplaceCategory.findUnique({
          where: { slug },
        });
        if (newCat) {
          await prisma.websiteMarketplaceCategory.upsert({
            where: {
              websiteId_categoryId: {
                websiteId: website.id,
                categoryId: newCat.id,
              },
            },
            update: { role: 'PRIMARY' as any },
            create: {
              websiteId: website.id,
              categoryId: newCat.id,
              role: 'PRIMARY' as any,
            },
          });
        }
      } else {
        console.warn(
          `Ambiguous mapping: Primary legacy category ${website.primaryCategoryKey} not found for website ${website.id}`,
        );
      }
    }

    if (website.secondaryCategoryKey) {
      const oldCats: any[] =
        await prisma.$queryRaw`SELECT * FROM "WebsiteCategoryKey" WHERE "id" = ${website.secondaryCategoryKey}`;
      const oldCat = oldCats[0];
      if (oldCat) {
        const slug = oldCat.key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newCat = await prisma.marketplaceCategory.findUnique({
          where: { slug },
        });
        if (newCat) {
          // If a category was mapped as PRIMARY, do not mark it SECONDARY too
          if (newCat.id === website.primaryCategoryKey) {
            console.warn(
              `Ambiguous mapping: Category ${newCat.slug} is both primary and secondary for website ${website.id}. Ignoring secondary.`,
            );
          } else {
            await prisma.websiteMarketplaceCategory.upsert({
              where: {
                websiteId_categoryId: {
                  websiteId: website.id,
                  categoryId: newCat.id,
                },
              },
              update: { role: 'SECONDARY' as any },
              create: {
                websiteId: website.id,
                categoryId: newCat.id,
                role: 'SECONDARY' as any,
              },
            });
          }
        }
      }
    }

    const websiteTags: any[] =
      await prisma.$queryRaw`SELECT * FROM "_WebsiteToWebsiteMargetPlaceTag" WHERE "A" = ${website.id}`;
    for (const link of websiteTags) {
      const tags: any[] =
        await prisma.$queryRaw`SELECT * FROM "WebsiteMargetPlaceTag" WHERE "id" = ${link.B}`;
      const tag = tags[0];
      if (tag) {
        const slug = tag.tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const newTag = await prisma.marketplaceTag.findUnique({
          where: { slug },
        });
        if (newTag) {
          const existing = await prisma.websiteMarketplaceTag.findFirst({
            where: { websiteId: website.id, tagId: newTag.id },
          });
          if (!existing) {
            await prisma.websiteMarketplaceTag.create({
              data: { websiteId: website.id, tagId: newTag.id },
            });
          }
        }
      }
    }
  }

  console.log('Taxonomy backfill completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
