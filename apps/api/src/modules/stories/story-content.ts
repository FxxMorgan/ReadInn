import { z } from 'zod';

const editorAttributeValueSchema = z.union([
  z.string().max(2048),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const editorAttributesSchema = z.record(editorAttributeValueSchema).superRefine((attributes, context) => {
  if (Object.keys(attributes).length > 20) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Un nodo del editor no puede tener mas de 20 atributos.',
    });
  }
});

const editorMarkSchema = z.object({
  type: z.enum(['bold', 'italic', 'underline', 'strike', 'code', 'link']),
  attrs: editorAttributesSchema.optional(),
}).strict().superRefine((mark, context) => {
  if (mark.type !== 'link') return;
  const href = mark.attrs?.['href'];
  if (typeof href !== 'string' || !/^(https?:|mailto:)/i.test(href.trim())) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['attrs', 'href'],
      message: 'Los enlaces solo pueden usar http, https o mailto.',
    });
  }
});

interface EditorNode {
  type: string;
  text?: string | undefined;
  attrs?: Record<string, string | number | boolean | null> | undefined;
  marks?: Array<z.infer<typeof editorMarkSchema>> | undefined;
  content?: EditorNode[] | undefined;
}

const editorNodeSchema: z.ZodType<EditorNode> = z.lazy(() => z.object({
  type: z.enum([
    'doc',
    'paragraph',
    'text',
    'heading',
    'bulletList',
    'orderedList',
    'listItem',
    'blockquote',
    'horizontalRule',
    'hardBreak',
    'codeBlock',
    'image',
  ]),
  text: z.string().max(100_000).optional(),
  attrs: editorAttributesSchema.optional(),
  marks: z.array(editorMarkSchema).max(8).optional(),
  content: z.array(editorNodeSchema).max(5_000).optional(),
}).strict().superRefine((node, context) => {
  if (node.type !== 'image') return;
  const src = node.attrs?.['src'];
  if (typeof src !== 'string' || !/^https?:/i.test(src.trim())) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['attrs', 'src'],
      message: 'Las imagenes solo pueden usar http o https.',
    });
  }
}));

const editorDocumentSchema = editorNodeSchema.refine((node) => node.type === 'doc', {
  message: 'El contenido enriquecido debe comenzar con un nodo doc.',
  path: ['type'],
});

export const editorContentSchema = z.union([
  z.array(z.string().max(100_000)).max(5_000),
  editorDocumentSchema,
  z.string().max(1_000_000),
]);

function textFromNode(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const node = value as { type?: unknown; text?: unknown; content?: unknown };
  if (typeof node.text === 'string') return node.text;
  if (node.type === 'hardBreak') return '\n';
  if (!Array.isArray(node.content)) return '';
  return node.content.map(textFromNode).join('');
}

export function contentToParagraphs(content: unknown): string[] {
  if (typeof content === 'string') {
    return content.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  }
  if (Array.isArray(content)) {
    return content.map(textFromNode).map((paragraph) => paragraph.trim()).filter(Boolean);
  }
  if (!content || typeof content !== 'object') return [];
  const nodes = (content as { content?: unknown }).content;
  if (!Array.isArray(nodes)) return [];
  return nodes.map(textFromNode).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function countWords(text: string): number {
  let count = 0;
  const words = /\S+/g;
  while (words.exec(text)) count += 1;
  return count;
}

export function chapterMetrics(plainText: string): { wordCount: number; estimatedReadMin: number } {
  const wordCount = countWords(plainText);
  return { wordCount, estimatedReadMin: Math.max(1, Math.ceil(wordCount / 200)) };
}
