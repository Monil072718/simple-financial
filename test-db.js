// Test database connection
import { query } from './src/lib/db.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully');
    console.log('Current time:', result.rows[0]);
    
    // Test schema creation
    const { ensureSchema } = await import('./src/lib/migrate.js');
    await ensureSchema();
    console.log('✅ Schema ensured successfully');
    
    // Test user creation
    const { createUser } = await import('./src/lib/users.js');
    try {
      const user = await createUser(
        'Test User',
        'test@example.com',
        'password123'
      );
      console.log('✅ Test user created:', user);
    } catch (error) {
      if (error.code === '23505') {
        console.log('ℹ️ Test user already exists');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testConnection();
