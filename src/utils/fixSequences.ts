import prisma from '../config/prisma';

export async function resetDatabaseSequences() {
  const tables = [
    'orders',
    'order_items',
    'payments',
    'order_status_histories',
    'users',
    'products',
    'categories',
    'brands',
    'carts',
    'cart_items',
  ];

  console.log('🔄 Syncing PostgreSQL auto-increment sequences...');
  for (const table of tables) {
    try {
      const sql = `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`;
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ Synced sequence for table: ${table}`);
    } catch (e: any) {
      console.error(`⚠️ Could not sync sequence for ${table}:`, e.message);
    }
  }
}

if (require.main === module) {
  resetDatabaseSequences()
    .then(() => {
      console.log('🎉 All sequences synced successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error syncing sequences:', err);
      process.exit(1);
    });
}
