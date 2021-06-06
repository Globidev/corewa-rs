import { useEffect, useState } from "react";
import { Converter as MarkdownConverter } from "showdown";

// @ts-ignore
import documentation from "../../README.md";

export const Help = ({}) => {
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    fetch(documentation)
      .then((r) => r.text())
      .then((rawMd) => {
        const md = new MarkdownConverter({ tables: true }).makeHtml(rawMd);
        setMarkdown(md);
      });
  }, [setMarkdown]);

  return (
    <div className="markdown-body">
      <div dangerouslySetInnerHTML={{ __html: markdown }} />
    </div>
  );
};
