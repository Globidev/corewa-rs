import { FC } from "react";

type Props = {
  title: string;
};

export const Panel: FC<Props> = ({ title, children }) => {
  return (
    <div className="panel">
      <SectionTitle title={title} />

      <div className="panel-content spaced">{children}</div>
    </div>
  );
};

const SectionTitle = ({ title }: { title: string }) => (
  <div className="section-title-line">
    <span className="section-title-text">{title}</span>
  </div>
);
