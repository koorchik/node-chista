/**
 * Shared types and mock data for permissions example.
 */

// User context passed to services
export interface UserContext {
  userId: string;
  role: 'admin' | 'editor' | 'viewer';
  organizationId: string;
}

// Simulated database for documents
export const documents = new Map<string, { id: string; ownerId: string; organizationId: string }>([
  ['doc-1', { id: 'doc-1', ownerId: 'user-1', organizationId: 'org-1' }],
  ['doc-2', { id: 'doc-2', ownerId: 'user-2', organizationId: 'org-1' }],
  ['doc-3', { id: 'doc-3', ownerId: 'user-3', organizationId: 'org-2' }]
]);
