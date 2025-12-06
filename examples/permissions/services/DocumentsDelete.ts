/**
 * DocumentsDelete service demonstrating resource ownership checks.
 *
 * - Users can delete their own documents
 * - Admins can delete any document in their organization
 * - Cross-organization access is denied
 */

import type { InferFromSchema } from 'livr/types';
import { ServiceError } from '../../../src/ServiceError.js';
import { Base } from './Base.js';
import { documents } from '../types.js';

// Validation schema
const documentDeleteValidation = {
  documentId: ['required', 'string']
} as const;

type DocumentDeleteInput = InferFromSchema<typeof documentDeleteValidation>;

interface DocumentDeleteOutput {
  deleted: boolean;
}

export class DocumentsDelete extends Base<DocumentDeleteInput, DocumentDeleteOutput> {
  static validation = documentDeleteValidation;

  async checkPermissions(data: DocumentDeleteInput): Promise<boolean> {
    const doc = documents.get(data.documentId);

    if (!doc) {
      throw new ServiceError({
        code: 'NOT_FOUND',
        fields: { documentId: 'DOCUMENT_NOT_FOUND' }
      });
    }

    // Admins can delete any document in their organization
    if (this.user.role === 'admin' && doc.organizationId === this.user.organizationId) {
      return true;
    }

    // Others can only delete their own documents
    if (doc.ownerId !== this.user.userId) {
      this.denyAccess('NOT_OWNER');
    }

    return true;
  }

  async execute(data: DocumentDeleteInput): Promise<DocumentDeleteOutput> {
    documents.delete(data.documentId);
    console.log(`Document ${data.documentId} deleted by ${this.user.userId}`);
    return { deleted: true };
  }
}
