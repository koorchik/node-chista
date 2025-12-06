/**
 * Permissions Example
 *
 * Demonstrates role-based permission checking patterns using checkPermissions().
 * Shows how to pass user context via constructor and throw ServiceError for denied access.
 *
 * Run with: npx ts-node --esm examples/permissions/main.ts
 */

import { ServiceError } from '../../src/ServiceError.js';
import { UserContext } from './types.js';
import { ArticlesUpdate } from './services/ArticlesUpdate.js';
import { DocumentsDelete } from './services/DocumentsDelete.js';

async function main() {
  // Example 1: Role-based access
  console.log('\n=== Role-based access ===\n');

  const admin: UserContext = { userId: 'user-1', role: 'admin', organizationId: 'org-1' };
  const viewer: UserContext = { userId: 'user-2', role: 'viewer', organizationId: 'org-1' };

  // Admin can update
  console.log('Admin updating article:');
  try {
    const result = await new ArticlesUpdate(admin).run({
      articleId: 'article-1',
      title: 'Updated Title',
      content: 'Updated content'
    });
    console.log('Success:', result);
  } catch (error) {
    if (error instanceof ServiceError) console.error('Error:', error.toObject());
  }

  // Viewer cannot update
  console.log('\nViewer attempting to update:');
  try {
    await new ArticlesUpdate(viewer).run({
      articleId: 'article-1',
      title: 'Hacked Title',
      content: 'Hacked content'
    });
  } catch (error) {
    if (error instanceof ServiceError) console.error('Denied:', error.toObject());
  }

  // Example 2: Resource ownership
  console.log('\n=== Resource ownership ===\n');

  const user1: UserContext = { userId: 'user-1', role: 'editor', organizationId: 'org-1' };
  const user2: UserContext = { userId: 'user-2', role: 'editor', organizationId: 'org-1' };

  // Owner can delete their own document
  console.log('Owner deleting own document:');
  try {
    const result = await new DocumentsDelete(user1).run({ documentId: 'doc-1' });
    console.log('Success:', result);
  } catch (error) {
    if (error instanceof ServiceError) console.error('Error:', error.toObject());
  }

  // Non-owner cannot delete someone else's document
  console.log('\nNon-owner attempting to delete:');
  try {
    await new DocumentsDelete(user2).run({ documentId: 'doc-2' });
  } catch (error) {
    if (error instanceof ServiceError) console.error('Denied:', error.toObject());
  }

  // Admin can delete any document in their org
  console.log('\nAdmin deleting any document in org:');
  try {
    const result = await new DocumentsDelete(admin).run({ documentId: 'doc-2' });
    console.log('Success:', result);
  } catch (error) {
    if (error instanceof ServiceError) console.error('Error:', error.toObject());
  }

  // Admin cannot delete document from different org
  console.log('\nAdmin attempting to delete document from different org:');
  try {
    await new DocumentsDelete(admin).run({ documentId: 'doc-3' });
  } catch (error) {
    if (error instanceof ServiceError) console.error('Denied:', error.toObject());
  }
}

main();
