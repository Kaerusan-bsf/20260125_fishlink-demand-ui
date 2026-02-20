import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 共通パスワード（β用）
  const passwordHash = await bcrypt.hash('password', 10);

  // =========================
  // Restaurant user
  // =========================

  const restaurant = await prisma.user.upsert({
    where: { userId: 'restaurant1' },
    update: {
      profile: {
        upsert: {
          create: {
            name: 'レストラン担当',
            entityName: 'Phnom Kitchen',
            phone: '+855-12-345-678',
            googleMapUrl: 'https://maps.google.com/?q=Phnom+Kitchen',
            province: 'Phnom Penh',
            district: 'Chamkarmon'
          },
          update: {
            province: 'Phnom Penh',
            district: 'Chamkarmon'
          }
        }
      }
    },
    create: {
      userId: 'restaurant1',
      password: passwordHash,
      role: 'RESTAURANT',
      profile: {
        create: {
          name: 'レストラン担当',
          entityName: 'Phnom Kitchen',
          phone: '+855-12-345-678',
          googleMapUrl: 'https://maps.google.com/?q=Phnom+Kitchen',
          province: 'Phnom Penh',
          district: 'Chamkarmon'
        }
      }
    }
  });

  // =========================
  // Farmer user
  // =========================

  const farmer = await prisma.user.upsert({
    where: { userId: 'farmer1' },
    update: {
      profile: {
        upsert: {
          create: {
            name: '養殖担当',
            entityName: 'Tonle Sap Farm',
            phone: '+855-98-765-432',
            googleMapUrl: 'https://maps.google.com/?q=Tonle+Sap+Farm',
            province: 'Takeo',
            district: 'Bati'
          },
          update: {
            province: 'Takeo',
            district: 'Bati'
          }
        }
      }
    },
    create: {
      userId: 'farmer1',
      password: passwordHash,
      role: 'FARMER',
      profile: {
        create: {
          name: '養殖担当',
          entityName: 'Tonle Sap Farm',
          phone: '+855-98-765-432',
          googleMapUrl: 'https://maps.google.com/?q=Tonle+Sap+Farm',
          province: 'Takeo',
          district: 'Bati'
        }
      }
    }
  });

  // =========================
  // Listing (only if not exists)
  // =========================
  const existing = await prisma.listing.findFirst({
    where: {
      farmerId: farmer.id,
      fishType: 'Tilapia'
    }
  });

  if (!existing) {
    await prisma.listing.create({
      data: {
        farmerId: farmer.id,
        fishType: 'Tilapia',
        basePricePerKg: 3.5,
        guttingAvailable: true,
        guttingPricePerKg: 0.6,
        deliveryAvailable: true,
        freeDeliveryMinKg: 30,
        minOrderKg: 5,
        isActive: true,
        deliveryFeeTiers: {
          create: [
            { label: '0-5km', fee: 1, sortOrder: 1 },
            { label: '5-10km', fee: 2, sortOrder: 2 },
            { label: '10-20km', fee: 4, sortOrder: 3 },
            { label: '20-30km', fee: 6, sortOrder: 4 }
          ]
        }
      }
    });
  }

  const pricing = await prisma.pricingConfig.findFirst({where: {isActive: true}});
  if (!pricing) {
    await prisma.pricingConfig.create({
      data: {
        pricingVersion: 'beta-v0.1-202602',
        alphaRate: 0.05,
        betaRate: 0.05,
        betaDiscountRate: 0,
        isActive: true
      }
    });
  }

  console.log('🌱 Seed completed:', {
    restaurant: restaurant.userId,
    farmer: farmer.userId
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
