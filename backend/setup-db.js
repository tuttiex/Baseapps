require('dotenv').config();
const fs = require('fs');
const pool = require('./db/pool');

async function runSchema() {
    try {
        console.log('📂 Reading schema file...');
        const schema = fs.readFileSync('./db/schema.sql', 'utf8');

        console.log('🚀 Executing schema...');
        await pool.query(schema);

        console.log('✅ Schema executed successfully!');
        console.log('\n📊 Verifying tables created...');

        const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

        console.log('\n✅ Tables created:');
        result.rows.forEach(row => {
            console.log(`   - ${row.tablename}`);
        });

        await pool.end();
        console.log('\n🎉 Database setup complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error running schema:');
        console.error('Message:', error.message);
        console.error('Detail:', error.detail);
        console.error('Hint:', error.hint);
        process.exit(1);
    }
}

runSchema();
