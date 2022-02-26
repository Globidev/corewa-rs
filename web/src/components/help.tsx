import { useEffect, useState } from "react";
import { Converter as MarkdownConverter } from "showdown";

import documentationAsRawMd from "../../README.md?raw";

export const Help = () => {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    const converter = new MarkdownConverter({ tables: true });
    setMarkdown(converter.makeHtml(documentationAsRawMd));
  }, [setMarkdown]);

  return (
    <div className="markdown-body">
      <div dangerouslySetInnerHTML={{ __html: markdown }} />
    </div>
  );
};
