import { useCallback, useRef, useState } from "react";
import {
  Model,
  Layout,
  TabNode,
  IJsonTabNode,
  IJsonModel,
} from "flexlayout-react";
import { observer } from "mobx-react-lite";

import { autorun } from "mobx";

import { VirtualMachine } from "../virtual_machine";
import { Help } from "./help";
import { VM } from "./vm";
import { Editor } from "./editor";

export const CorewarLayout = observer(({ vm }: { vm: VirtualMachine }) => {
  const flexLayout = useRef<Layout>(null);

  const [layoutModel] = useState(() => {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    const layout = savedLayout ? JSON.parse(savedLayout) : DEFAULT_LAYOUT;
    return Model.fromJson(layout);
  });

  const newTab = useCallback(
    (tabData: TypedJsonTabNode) => {
      flexLayout.current?.addTabWithDragAndDropIndirect(
        "Add panel<br>(Drag to location)",
        { ...tabData, config: {} }
      );
    },
    [flexLayout]
  );

  const newPlayerTab = useCallback(
    () =>
      newTab({
        component: "editor",
        name: "Champion",
      }),
    [newTab]
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
          const player =
            vm.playersById.get(config.playerId ?? 0) ?? vm.newPlayer();
          config.playerId = player.id;
          // Update this editor's player id if it were to be changed
          autorun(() => (config.playerId = player.id));

          return (
            <Editor
              code={config.code}
              onCodeChanged={(code, champion) => {
                config.code = code;
                player.champion = champion;
                vm.compile();
              }}
              onClosed={() => vm.removePlayer(player.id)}
            />
          );
        }

        case "vm":
          return (
            <VM
              vm={vm}
              onNewPlayerRequested={newPlayerTab}
              onHelpRequested={newHelpTab}
            />
          );

        case "help":
          return <Help />;
      }
    },
    [vm, newPlayerTab, newHelpTab]
  );

  return (
    <Layout
      ref={flexLayout}
      model={layoutModel}
      factory={layoutFactory}
      onModelChange={(model) =>
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(model.toJson()))
      }
    />
  );
});

const LAYOUT_STORAGE_KEY = "ui::layout";

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
                config: {},
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
                config: {},
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
