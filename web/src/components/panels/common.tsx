import { ReactNode, FC } from "react";

export function toCssColor(color: number) {
  color >>>= 0;
  const b = color & 0xff,
    g = (color & 0xff00) >>> 8,
    r = (color & 0xff0000) >>> 16;

  const rs = r.toString(16).padStart(2, "0");
  const gs = g.toString(16).padStart(2, "0");
  const bs = b.toString(16).padStart(2, "0");

  return `#${rs}${gs}${bs}`;
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
