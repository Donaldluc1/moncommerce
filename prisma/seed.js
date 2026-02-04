// prisma/seed.js
// Script pour pré-remplir la base de données avec des données de test

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...\n');

  // Nettoyer la base (optionnel - décommenter si besoin)
  // console.log('🗑️  Nettoyage de la base...');
  // await prisma.paiement.deleteMany();
  // await prisma.client.deleteMany();
  // await prisma.depense.deleteMany();
  // await prisma.vente.deleteMany();
  // await prisma.user.deleteMany();
  // console.log('✅ Base nettoyée\n');

  // Créer un utilisateur de test
  console.log('👤 Création d\'un utilisateur de test...');
  const hashedPassword = await bcrypt.hash('test123', 10);
  
  const user = await prisma.user.upsert({
    where: { telephone: '0708090102' },
    update: {},
    create: {
      telephone: '0708090102',
      password: hashedPassword,
      email: 'test@exemple.com',
      nomCommerce: 'Boutique Test',
      typeActivite: 'Boutique'
    }
  });
  console.log(`✅ Utilisateur créé : ${user.nomCommerce} (${user.telephone})\n`);

  // Créer des clients de test
  console.log('👥 Création de clients de test...');
  
  const client1 = await prisma.client.create({
    data: {
      nom: 'Jean Kouassi',
      telephone: '0709080706',
      adresse: 'Cocody, Abidjan',
      totalCredit: 5000,
      userId: user.id
    }
  });

  const client2 = await prisma.client.create({
    data: {
      nom: 'Marie Koné',
      telephone: '0708070605',
      adresse: 'Yopougon, Abidjan',
      totalCredit: 3000,
      userId: user.id
    }
  });
  
  console.log(`✅ 2 clients créés\n`);

  // Créer des ventes de test
  console.log('🛒 Création de ventes de test...');
  
  const ventes = await Promise.all([
    prisma.vente.create({
      data: {
        montant: 10000,
        modePaiement: 'cash',
        nomClient: 'Client Anonyme',
        notes: 'Achat de riz et huile',
        userId: user.id
      }
    }),
    prisma.vente.create({
      data: {
        montant: 5000,
        modePaiement: 'credit',
        userId: user.id,
        clientId: client1.id
      }
    }),
    prisma.vente.create({
      data: {
        montant: 3000,
        modePaiement: 'credit',
        userId: user.id,
        clientId: client2.id
      }
    }),
    prisma.vente.create({
      data: {
        montant: 7500,
        modePaiement: 'cash',
        nomClient: 'Aya Traoré',
        userId: user.id
      }
    })
  ]);
  
  console.log(`✅ ${ventes.length} ventes créées\n`);

  // Créer des dépenses de test
  console.log('💸 Création de dépenses de test...');
  
  const depenses = await Promise.all([
    prisma.depense.create({
      data: {
        montant: 15000,
        motif: 'Achat de marchandises au marché',
        categorie: 'Stock',
        userId: user.id
      }
    }),
    prisma.depense.create({
      data: {
        montant: 5000,
        motif: 'Transport taxi',
        categorie: 'Transport',
        userId: user.id
      }
    }),
    prisma.depense.create({
      data: {
        montant: 3000,
        motif: 'Électricité du mois',
        categorie: 'Électricité',
        userId: user.id
      }
    })
  ]);
  
  console.log(`✅ ${depenses.length} dépenses créées\n`);

  // Créer des paiements de crédit
  console.log('💰 Création de paiements de test...');
  
  const paiements = await Promise.all([
    prisma.paiement.create({
      data: {
        montant: 2000,
        notes: 'Paiement partiel',
        clientId: client2.id
      }
    })
  ]);

  // Mettre à jour le total crédit de client2
  await prisma.client.update({
    where: { id: client2.id },
    data: { totalCredit: 1000 } // 3000 - 2000
  });
  
  console.log(`✅ ${paiements.length} paiement créé\n`);

  // Résumé
  console.log('================================');
  console.log('🎉 SEEDING TERMINÉ !');
  console.log('================================\n');
  console.log('📊 Résumé :');
  console.log(`   - 1 utilisateur`);
  console.log(`   - 2 clients`);
  console.log(`   - ${ventes.length} ventes`);
  console.log(`   - ${depenses.length} dépenses`);
  console.log(`   - ${paiements.length} paiement`);
  console.log('\n🔑 Identifiants de test :');
  console.log(`   Téléphone : 0708090102`);
  console.log(`   Mot de passe : test123`);
  console.log('\n✅ Tu peux maintenant tester l\'API !\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur pendant le seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });