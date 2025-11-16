#!/usr/bin/env node

/**
 * RBAC Seed Script
 * Initializes the database with default roles and permissions
 *
 * Usage: npx ts-node src/scripts/seed-rbac.ts
 */

import { rbacService } from '../services/rbac.service';

async function seedRBAC() {
  console.log('🔐 Starting RBAC initialization...\n');

  try {
    // Initialize default roles and permissions
    const result = await rbacService.initializeDefaultRoles();

    console.log('✅ RBAC initialization completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Roles created: ${result.roles.length}`);
    console.log(`   - Permissions created: ${result.permissions.length}\n`);

    console.log('👥 Created Roles:');
    result.roles.forEach((role) => {
      console.log(`   - ${role.displayName} (${role.name})`);
      console.log(`     ${role.description}`);
    });

    console.log('\n🔑 Permission Resources:');
    const resources = [...new Set(result.permissions.map((p) => p.resource))];
    console.log(`   Total resources: ${resources.length}`);
    console.log(`   Resources: ${resources.join(', ')}\n`);

    console.log('📝 Next Steps:');
    console.log('   1. Assign roles to users using the API or admin panel');
    console.log('   2. Use RBAC middleware to protect your routes');
    console.log('   3. Customize permissions as needed for your application\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing RBAC:', error);
    process.exit(1);
  }
}

// Run the seed function
seedRBAC();
