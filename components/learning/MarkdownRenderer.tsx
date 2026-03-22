"use client";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines between paragraphs
    if (!trimmed) {
      if (i > 0 && i < lines.length - 1) {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
      }
      continue;
    }

    // Headings (# ## ###)
    if (trimmed.startsWith("###")) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-blue-300 mt-3 mb-2">
          {trimmed.replace(/^#+\s?/, "")}
        </h3>
      );
    } else if (trimmed.startsWith("##")) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-blue-200 mt-4 mb-2">
          {trimmed.replace(/^#+\s?/, "")}
        </h2>
      );
    } else if (trimmed.startsWith("#")) {
      elements.push(
        <h1
          key={i}
          className="text-lg font-bold text-blue-100 mt-5 mb-3"
        >
          {trimmed.replace(/^#+\s?/, "")}
        </h1>
      );
    }
    // Bullet points (-, *, +)
    else if (/^[-*+]\s/.test(trimmed)) {
      elements.push(
        <div key={i} className="flex gap-2 ml-2 text-sm text-gray-200">
          <span className="text-gray-500 mt-0.5">•</span>
          <span>{trimmed.replace(/^[-*+]\s?/, "")}</span>
        </div>
      );
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 ml-2 text-sm text-gray-200">
            <span className="text-gray-500 min-w-fit">{match[1]}.</span>
            <span>{match[2]}</span>
          </div>
        );
      }
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-gray-200 leading-relaxed">
          {trimmed}
        </p>
      );
    }
  }

  return <div className="space-y-1">{elements}</div>;
}
