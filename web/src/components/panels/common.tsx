import { ReactNode } from "react";

type InfoProps = {
  title: string;
  children?: ReactNode;
  theme?: "light" | "dark";
};

export const Info = ({ title, children, theme }: InfoProps) => {
  const bgTheme = theme ?? "light";

  return (
    <div
      className="info"
      style={{ display: "flex", justifyContent: "space-between" }}
    >
      <label>{title}</label>
      <div className={`code code-${bgTheme}`}>{children}</div>
    </div>
  );
};
