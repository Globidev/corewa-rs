import { useState } from "react";
import { Converter as MarkdownConverter } from "showdown";

import documentationMarkdown from "../../README.md?raw";

export const Help = () => {
  const [documentationHTML] = useState(() => {
    const converter = new MarkdownConverter({ tables: true });
    return converter.makeHtml(documentationMarkdown);
  });

  return (
    <div className="markdown-body">
      <div dangerouslySetInnerHTML={{ __html: documentationHTML }} />
    </div>
  );
};
