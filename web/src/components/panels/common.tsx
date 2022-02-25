import { ReactNode, FC } from "react";

export function toCssColor(color: number) {
  color >>>= 0;
  const b = color & 0xff,
    g = (color & 0xff00) >>> 8,
    r = (color & 0xff0000) >>> 16;
  return `rgb(${r}, ${g}, ${b})`;
}

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
