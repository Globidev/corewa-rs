import { ReactNode, FC } from "react";

type InfoProps = {
  title: string;
  children?: ReactNode;
  minWidth?: number;
};

export const Info: FC<InfoProps> = ({ title, children }) => (
  <div
    className="pad-top"
    style={{ display: "flex", justifyContent: "space-between" }}
  >
    <label>{title}</label>
    <div className="code">{children}</div>
  </div>
);
