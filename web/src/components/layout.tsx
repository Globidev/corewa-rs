import { useCallback, useRef, useState } from "react";
import {
  Model,
  Layout,
  TabNode,
  IJsonTabNode,
  IJsonModel,
} from "flexlayout-react";
import { observer } from "mobx-react-lite";

import { Corewar } from "../state/corewar";
import { load, save } from "../state/persistent";

import { Help } from "./help";
import { VM } from "./vm";
import { Editor } from "./editor";

export const CorewarLayout = observer(({ corewar }: { corewar: Corewar }) => {
  const flexLayout = useRef<Layout>(null);

  const [layoutModel] = useState(() => {
    const layout = load("ui::layout") ?? DEFAULT_LAYOUT;
    return Model.fromJson(layout);
  });

  const newTab = useCallback(
    (tabData: TypedJsonTabNode) => {
      flexLayout.current?.addTabWithDragAndDropIndirect(
        "Add panel<br>(Drag to location)",
        tabData
      );
    },
    [flexLayout]
  );

  const newPlayerTab = useCallback(
    () =>
      newTab({
        component: "editor",
        name: "Champion",
        config: { id: corewar.nextEditorId() },
      }),
    [newTab, corewar]
  );

  const newHelpTab = useCallback(
    () =>
      newTab({
        component: "help",
        name: "Documentation",
      }),
    [newTab]
  );

  const layoutFactory = useCallback(
    (node: TabNode) => {
      const component = node.getComponent();

      if (!isPaneComponent(component)) {
        return undefined;
      }

      switch (component) {
        case "editor": {
          const config = node.getConfig();

          if (typeof config.id !== "number") {
            return undefined;
          }

          return <Editor player={corewar.getPlayer(config.id)} />;
        }

        case "vm":
          return (
            <VM
              corewar={corewar}
              onNewPlayerRequested={newPlayerTab}
              onHelpRequested={newHelpTab}
            />
          );

        case "help":
          return <Help />;
      }
    },
    [corewar, newPlayerTab, newHelpTab]
  );

  return (
    <Layout
      ref={flexLayout}
      model={layoutModel}
      factory={layoutFactory}
      onModelChange={(model) => save("ui::layout", model.toJson())}
    />
  );
});

const PANE_COMPONENTS = ["editor", "vm", "help"] as const;
type PaneComponent = typeof PANE_COMPONENTS[number];

function isPaneComponent(
  rawComponent: string | undefined
): rawComponent is PaneComponent {
  return (PANE_COMPONENTS as readonly (string | undefined)[]).includes(
    rawComponent
  );
}

type TypedJsonTabNode = Omit<IJsonTabNode, "component"> & {
  component: PaneComponent;
};

const DEFAULT_LAYOUT: IJsonModel = {
  global: {},
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "row",
        weight: 20,
        children: [
          {
            type: "tabset",
            weight: 50,
            selected: 0,
            children: [
              {
                type: "tab",
                name: "Champion",
                component: "editor",
                config: {
                  id: 0,
                },
              },
            ],
          },
          {
            type: "tabset",
            weight: 50,
            selected: 0,
            tabLocation: "bottom",
            children: [
              {
                type: "tab",
                name: "Champion",
                component: "editor",
                config: {
                  id: 1,
                },
              },
            ],
          },
        ],
      },
      {
        type: "tabset",
        weight: 80,
        selected: 0,
        children: [
          {
            type: "tab",
            name: "Virtual Machine",
            enableClose: false,
            component: "vm",
            config: {},
          },
          {
            type: "tab",
            name: "Documentation",
            component: "help",
            config: {},
          },
        ],
      },
    ],
  },
};
