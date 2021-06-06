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

// export function bindProps<Props>(component: React.DetailedHTMLProps<Props>, propsToBind: React.PropsWithChildren<Props>) {
//   return (...props) => <component {...propsToBind} {...props} />;
// }

// type Foo<C> = ;

// type InferPropType<C> = C extends React.ComponentType<infer Props>
//   ? Props
//   : C extends keyof React.ReactHTML
//   ? React.ClassAttributes<C> & React.HTMLAttributes<C>
//   : never;

// type InferCreateType<C> = C extends React.ComponentType<infer Props>
//   ? C
//   : C extends keyof React.ReactHTML
//   ? React.DetailedReactHTMLElement<
//       React.HTMLAttributes<HTMLElement>,
//       HTMLElement
//     >
//   : never;
// // type InferPropType<C> = C extends React.ComponentType<infer Props> ?
// //   Props : (C extends React.DetailedReactHTMLElement<infer Props, infer What> ? Props: never);

// export function bindProps<Comp, Keys extends keyof InferPropType<Comp>>(
//   C: Comp,
//   boundProps: Pick<InferPropType<Comp>, Keys>
// ): (_: Omit<InferPropType<Comp>, Keys>) => InferCreateType<Comp> {
//   // @ts-ignore
//   return (props) => React.createElement(C, { ...props, ...boundProps });
// }

// // function f<C>(c: C, props: C extends React.DetailedReactHTMLElement<infer P, infer T> ? P : never) {
// //   // return <c></c>
// // }

// // React.memo()

// type Foo = { a: string; b: number; c: object };

// function mergeFooSplitOnA(x: Pick<Foo, "a">, y: Omit<Foo, "a">): Foo {
//   return { ...x, ...y }; // Ok
// }

// // function mergeFooGenericSplit<K extends keyof Foo>(
// //   x: Pick<Foo, K>,
// //   y: Omit<Foo, K>
// // ): Foo {
// //   return { ...x, ...y }; // Error: Type 'Pick<Foo, K> & Omit<Foo, K>' is missing the following properties from type 'Foo': a, b, c
// // }

// function mergeInline() {
//   let x: Pick<Foo, "a"> = { a: "foo" };
//   let y: Omit<Foo, "a"> = { b: 42, c: {} };
//   let assembled: Foo = { ...x, ...y }; // works fine
//   // React.cloneElement(Info);
//   // let x = <button></button>;
//   // type X = typeof x;
//   // let x = React.createElement("button");
//   // // f(jsx)
//   // bindProps(React.createElement("button"), { onClick: 42 });
//   // bindProps("button" as const, { o });
//   bindProps(Info, { title: "a" })({ children: null });
//   // let x = f({ a: "a" }, { b: 32, c: {} });
// }
