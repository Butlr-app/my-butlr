export function richContentToText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';

  const texts: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === 'string') {
      const text = node.trim();
      if (text) texts.push(text);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (typeof record.text === 'string') {
      visit(record.text);
      return;
    }
    if (record.content) visit(record.content);
    if (record.children) visit(record.children);
    if (record.blocks) visit(record.blocks);
  };

  visit(value);
  return texts.join('\n').replace(/\n{3,}/g, '\n\n');
}
