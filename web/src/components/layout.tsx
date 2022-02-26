import { useCallback, useEffect, useRef, useState } from "react";
import { Model, Layout, TabNode } from "flexlayout-react";
import { observer } from "mobx-react";

import { autorun } from "mobx";

import { VirtualMachine } from "../virtual_machine";
import { Help } from "./help";
import { VM } from "./vm";
import { Editor } from "./editor";

const enum PaneComponent {
  Editor = "editor",
  VM = "vm",
  Help = "help",
}

export const CorewarLayout = observer(({ vm }: { vm: VirtualMachine }) => {
  const flexLayout = useRef<Layout>(null);

  const [layoutModel] = useState(() => {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    const layout = savedLayout ? JSON.parse(savedLayout) : DEFAULT_LAYOUT;
    return Model.fromJson(layout);
  });

  useEffect(() => {
    return () => {
      localStorage.setItem(
        LAYOUT_STORAGE_KEY,
        JSON.stringify(layoutModel.toJson())
      );
    };
  });

  const newTab = useCallback(
    (component: PaneComponent, name: string) => {
      flexLayout.current?.addTabWithDragAndDropIndirect(
        "Add panel<br>(Drag to location)",
        {
          component,
          name,
          config: {},
        },
        () => {}
      );
    },
    [flexLayout]
  );

  const layoutFactory = useCallback(
    (node: TabNode) => {
      const component = node.getComponent();
      const config = node.getConfig();

      switch (component) {
        case PaneComponent.Editor:
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
        case PaneComponent.VM:
          return (
            <VM
              vm={vm}
              onNewPlayerRequested={() =>
                newTab(PaneComponent.Editor, "Champion")
              }
              onHelpRequested={() =>
                newTab(PaneComponent.Help, "Documentation")
              }
            />
          );
        case PaneComponent.Help:
          return <Help />;
        default:
          return null;
      }
    },
    [vm]
  );

  return (
    <Layout
      ref={flexLayout}
      model={layoutModel}
      factory={layoutFactory}
      onModelChange={() => console.log("model change")}
    />
  );
});

const LAYOUT_STORAGE_KEY = "layout";

const DEFAULT_LAYOUT = {
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
                component: PaneComponent.Editor,
                config: {},
              },
            ],
          },
          {
            type: "tabset",
            weight: 50,
            selected: 0,
            location: "bottom",
            children: [
              {
                type: "tab",
                name: "Champion",
                component: PaneComponent.Editor,
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
            component: PaneComponent.VM,
            config: {},
          },
          {
            type: "tab",
            name: "Documentation",
            component: PaneComponent.Help,
            config: {},
          },
        ],
      },
    ],
  },
};
