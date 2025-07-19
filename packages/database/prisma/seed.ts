import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users
  const user1 = await prisma.user.create({
    data: {
      phone: '+628123456789',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      name: 'Budi Santoso',
      language: 'id',
      trustScore: {
        create: {
          trustScore: 3.5,
          trustLevel: 'VERIFIED',
          phoneVerified: true,
          ktpVerified: true,
          selfieVerified: true,
          socialVerified: false,
          submissionCount: 5,
          accuracyScore: 0.8,
        },
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      phone: '+628987654321',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      name: 'Sari Wulandari',
      language: 'jv', // Javanese
      trustScore: {
        create: {
          trustScore: 4.2,
          trustLevel: 'PREMIUM',
          phoneVerified: true,
          ktpVerified: true,
          selfieVerified: true,
          socialVerified: true,
          submissionCount: 12,
          accuracyScore: 0.9,
          communityScore: 0.7,
        },
      },
    },
  });

  const user3 = await prisma.user.create({
    data: {
      phone: '+628555666777',
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      name: 'Ahmad Rahman',
      language: 'id',
      trustScore: {
        create: {
          trustScore: 1.5,
          trustLevel: 'BASIC',
          phoneVerified: true,
          ktpVerified: false,
          selfieVerified: false,
          socialVerified: false,
          submissionCount: 1,
          accuracyScore: 0.6,
        },
      },
    },
  });

  console.log('✅ Created test users');

  // Create test submissions
  const submission1 = await prisma.submission.create({
    data: {
      userId: user1.id,
      description: 'Jalan rusak parah di depan rumah, banyak lubang besar yang berbahaya untuk pengendara motor',
      category: 'INFRASTRUCTURE',
      location: {
        coordinates: [-6.2088, 106.8456], // Jakarta
        address: 'Jl. Sudirman No. 123, Menteng, Jakarta Pusat',
        accuracy: 15,
        kelurahan: 'Menteng',
        kecamatan: 'Menteng',
        kabupaten: 'Jakarta Pusat',
        provinsi: 'DKI Jakarta',
      },
      images: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ],
      conversationLog: [
        {
          id: '1',
          role: 'bot',
          content: 'Halo! Ada masalah apa yang ingin Anda laporkan?',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          messageType: 'text',
        },
        {
          id: '2',
          role: 'user',
          content: 'Jalan rusak parah di depan rumah',
          timestamp: new Date('2024-01-15T10:01:00Z'),
          messageType: 'text',
        },
      ],
      status: 'PROCESSED',
      processed: true,
      processedAt: new Date(),
      qualityScore: {
        create: {
          textScore: 2.5,
          mediaScore: 3.0,
          locationScore: 2.0,
          aiValidationScore: 2.5,
          totalScore: 10.0,
          finalWeight: 3.5,
        },
      },
    },
  });

  const submission2 = await prisma.submission.create({
    data: {
      userId: user2.id,
      description: 'Tempat sampah di taman rusak dan sampah berserakan kemana-mana, bau tidak sedap',
      category: 'CLEANLINESS',
      location: {
        coordinates: [-6.2297, 106.8308], // Jakarta
        address: 'Taman Suropati, Menteng, Jakarta Pusat',
        accuracy: 10,
        kelurahan: 'Menteng',
        kecamatan: 'Menteng',
        kabupaten: 'Jakarta Pusat',
        provinsi: 'DKI Jakarta',
      },
      images: ['https://example.com/image3.jpg'],
      conversationLog: [
        {
          id: '1',
          role: 'bot',
          content: 'Selamat siang! Masalah apa yang ingin dilaporkan?',
          timestamp: new Date('2024-01-16T14:00:00Z'),
          messageType: 'text',
        },
        {
          id: '2',
          role: 'user',
          content: 'Tempat sampah rusak di taman',
          timestamp: new Date('2024-01-16T14:01:00Z'),
          messageType: 'text',
        },
      ],
      status: 'PROCESSED',
      processed: true,
      processedAt: new Date(),
      qualityScore: {
        create: {
          textScore: 3.0,
          mediaScore: 2.0,
          locationScore: 2.0,
          aiValidationScore: 3.0,
          totalScore: 10.0,
          finalWeight: 4.2,
        },
      },
    },
  });

  console.log('✅ Created test submissions');

  // Create issue clusters
  const cluster1 = await prisma.issueCluster.create({
    data: {
      title: 'Jalan Rusak di Area Menteng',
      description: 'Beberapa titik jalan rusak di kawasan Menteng yang perlu perbaikan segera',
      category: 'INFRASTRUCTURE',
      severity: 'HIGH',
      centerLat: -6.2088,
      centerLng: 106.8456,
      radiusMeters: 500,
      kelurahan: 'Menteng',
      kecamatan: 'Menteng',
      kabupaten: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
      issueCount: 1,
      totalWeight: 3.5,
      avgQuality: 10.0,
      priority: 85,
      status: 'ACTIVE',
    },
  });

  // Link submission to cluster
  await prisma.submission.update({
    where: { id: submission1.id },
    data: { clusterId: cluster1.id },
  });

  // Create issues from submissions
  const issue1 = await prisma.issue.create({
    data: {
      submissionId: submission1.id,
      title: 'Jalan Berlubang di Jl. Sudirman',
      description: submission1.description,
      category: 'INFRASTRUCTURE',
      severity: 'HIGH',
      priority: 85,
      coordinates: [-6.2088, 106.8456],
      address: 'Jl. Sudirman No. 123, Menteng, Jakarta Pusat',
      kelurahan: 'Menteng',
      kecamatan: 'Menteng',
      kabupaten: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
      status: 'REPORTED',
      clusterId: cluster1.id,
    },
  });

  const issue2 = await prisma.issue.create({
    data: {
      submissionId: submission2.id,
      title: 'Tempat Sampah Rusak di Taman Suropati',
      description: submission2.description,
      category: 'CLEANLINESS',
      severity: 'MEDIUM',
      priority: 70,
      coordinates: [-6.2297, 106.8308],
      address: 'Taman Suropati, Menteng, Jakarta Pusat',
      kelurahan: 'Menteng',
      kecamatan: 'Menteng',
      kabupaten: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
      status: 'ACKNOWLEDGED',
    },
  });

  console.log('✅ Created issues and clusters');

  // Create admin user
  const admin = await prisma.adminUser.create({
    data: {
      email: 'admin@jakarta.go.id',
      name: 'Jakarta Admin',
      role: 'GOVERNMENT_ADMIN',
      provinsi: 'DKI Jakarta',
      kabupaten: 'Jakarta Pusat',
      department: 'Dinas Pekerjaan Umum',
      passwordHash: '$2a$10$dummy.hash.for.development', // In real app, use proper bcrypt
    },
  });

  // Create sample verifications
  await prisma.verification.create({
    data: {
      userId: user1.id,
      type: 'KTP',
      status: 'APPROVED',
      documentUrl: 'https://example.com/ktp1.jpg',
      selfieUrl: 'https://example.com/selfie1.jpg',
      confidence: 0.95,
      manualReview: false,
    },
  });

  await prisma.verification.create({
    data: {
      userId: user2.id,
      type: 'SOCIAL_FACEBOOK',
      status: 'APPROVED',
      socialUrl: 'https://facebook.com/sari.wulandari',
      confidence: 0.88,
      manualReview: false,
    },
  });

  console.log('✅ Created admin user and verifications');

  // Create community endorsement
  await prisma.communityEndorsement.create({
    data: {
      endorsingUserId: user1.id,
      endorsedUserId: user2.id,
      message: 'Sari selalu melaporkan masalah dengan detail dan akurat',
    },
  });

  // Create analytics events
  await prisma.analyticsEvent.createMany({
    data: [
      {
        eventType: 'submission_created',
        userId: user1.id,
        data: { category: 'INFRASTRUCTURE', trustLevel: 'VERIFIED' },
        coordinates: [-6.2088, 106.8456],
        kelurahan: 'Menteng',
        kecamatan: 'Menteng',
        kabupaten: 'Jakarta Pusat',
        provinsi: 'DKI Jakarta',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      },
      {
        eventType: 'user_verified',
        userId: user1.id,
        data: { verificationType: 'KTP', trustLevel: 'VERIFIED' },
        timestamp: new Date('2024-01-10T09:00:00Z'),
      },
      {
        eventType: 'submission_created',
        userId: user2.id,
        data: { category: 'CLEANLINESS', trustLevel: 'PREMIUM' },
        coordinates: [-6.2297, 106.8308],
        kelurahan: 'Menteng',
        kecamatan: 'Menteng',
        kabupaten: 'Jakarta Pusat',
        provinsi: 'DKI Jakarta',
        timestamp: new Date('2024-01-16T14:00:00Z'),
      },
    ],
  });

  console.log('✅ Created analytics events');

  console.log('🎉 Database seeding completed successfully!');
  console.log(`
📊 Created:
- 3 test users (Basic, Verified, Premium trust levels)
- 2 submissions with quality scores
- 1 issue cluster with 1 issue
- 1 standalone issue
- 1 admin user
- 2 verifications (KTP and social media)
- 1 community endorsement
- 3 analytics events
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });