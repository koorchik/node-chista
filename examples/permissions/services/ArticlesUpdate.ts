/**
 * ArticlesUpdate service demonstrating role-based access control.
 *
 * Only admins and editors can update articles; viewers are denied.
 */

import type { InferFromSchema } from 'livr/types';
import { Base } from './Base.js';

// Validation schema
const articleUpdateValidation = {
  articleId: ['required', 'string'],
  title: ['required', { min_length: 1, max_length: 200 }],
  content: ['required', 'string']
} as const;

type ArticleUpdateInput = InferFromSchema<typeof articleUpdateValidation>;

interface ArticleUpdateOutput {
  updated: boolean;
}

export class ArticlesUpdate extends Base<ArticleUpdateInput, ArticleUpdateOutput> {
  static validation = articleUpdateValidation;

  async checkPermissions(data: ArticleUpdateInput): Promise<boolean> {
    // Only admins and editors can update articles
    if (this.user.role === 'viewer') {
      this.denyAccess('VIEWERS_CANNOT_EDIT');
    }
    return true;
  }

  async execute(data: ArticleUpdateInput): Promise<ArticleUpdateOutput> {
    console.log(`User ${this.user.userId} updating article ${data.articleId}`);
    return { updated: true };
  }
}
