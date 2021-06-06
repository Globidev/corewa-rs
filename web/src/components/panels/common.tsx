export function toCssColor(color: number) {
  color >>>= 0;
  const b = color & 0xff,
    g = (color & 0xff00) >>> 8,
    r = (color & 0xff0000) >>> 16;
  return `rgb(${r}, ${g}, ${b})`;
}

interface IInfoProps {
  title: string;
  children: React.ReactNode;
  minWidth?: number;
}

export const Info = ({ title, children, minWidth = 80 }: IInfoProps) => (
  <div className="pad-top" style={{ display: "flex" }}>
    <div className="pad-left" style={{ minWidth: `${minWidth}px` }}>
      {title}
    </div>
    <div className="code">{children}</div>
  </div>
);
