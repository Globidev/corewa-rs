import { ReactNode, FC } from "react";

type InfoProps = {
  title: string;
  children?: ReactNode;
  minWidth?: number;
};

export const Info: FC<InfoProps> = ({ title, children, minWidth = 80 }) => (
  <div className="pad-top" style={{ display: "flex" }}>
    <div className="pad-left" style={{ minWidth: `${minWidth}px` }}>
      {title}
    </div>
    <div className="code">{children}</div>
  </div>
);
