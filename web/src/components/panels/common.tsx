import { ReactNode } from "react";

type InfoProps = {
  title: string;
  children?: ReactNode;
  minWidth?: number;
};

export const Info = ({ title, children }: InfoProps) => (
  <div
    className="pad-top info"
    style={{ display: "flex", justifyContent: "space-between" }}
  >
    <label>{title}</label>
    <div className="code">{children}</div>
  </div>
);
