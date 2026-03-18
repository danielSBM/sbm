interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export function extractTOC(content: string): TOCItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const items: TOCItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    items.push({ id, text, level });
  }

  return items;
}

export default function TableOfContents({ items }: { items: TOCItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav className="sbm-card p-6 sticky top-24">
      <h4 className="font-heading font-bold text-sm tracking-tighter text-white mb-4 uppercase">
        Table of Contents
      </h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={item.level === 3 ? "pl-4" : ""}
          >
            <a
              href={`#${item.id}`}
              className="text-sbm-muted hover:text-sbm-indigo text-sm transition-colors block py-0.5"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
