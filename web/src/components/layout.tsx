import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Model,
  Layout,
  TabNode,
  IJsonTabNode,
  IJsonModel,
  Action,
  Actions,
} from "flexlayout-react";
import { observer } from "mobx-react-lite";

import { Corewar } from "../state/corewar";
import { load, save } from "../state/persistent";

import { Help } from "./help";
import { VM } from "./vm";
import { Editor } from "./editor";
import { runInAction } from "mobx";

export const CorewarLayout = observer(({ corewar }: { corewar: Corewar }) => {
  const flexLayout = useRef<Layout>(null);

  const layoutModel = useMemo(() => {
    const layout = load("ui::layout") ?? DEFAULT_LAYOUT;
    return Model.fromJson(layout);
  }, []);

  const updateNodeConfig = useCallback(
    (nodeId: string, config: TypedNodeConfig) => {
      layoutModel.doAction(Actions.updateNodeAttributes(nodeId, { config }));
    },
    [layoutModel]
  );

  const createPlayerForEditor = useCallback(
    (nodeId: string, config: TypedNodeConfig) => {
      let playerId = config?.playerId;

      if (playerId === undefined) {
        playerId = corewar.randomPlayerId();
        updateNodeConfig(nodeId, {
          type: "editor",
          playerId,
        });
      }

      const pid = playerId;
      runInAction(() => corewar.createPlayer(pid, config?.code, config?.color));
    },
    [corewar, updateNodeConfig]
  );

  useEffect(() => {
    layoutModel.visitNodes((node) => {
      if (node instanceof TabNode && node.getComponent() === "editor") {
        createPlayerForEditor(node.getId(), node.getConfig());
      }
    });
  }, [layoutModel, createPlayerForEditor]);

  const newTab = useCallback(
    (tabData: TypedJsonTabNode) => {
      flexLayout.current?.addTabWithDragAndDropIndirect(
        "Add panel<br>(Drag to location)",
        tabData
      );
    },
    [flexLayout]
  );

  const newPlayerTab = useCallback(() => {
    newTab({
      component: "editor",
      name: `Champion`,
      config: { type: "editor", playerId: corewar.randomPlayerId() },
    });
  }, [newTab, corewar]);

  const newHelpTab = useCallback(
    () =>
      newTab({
        component: "help",
        name: "Documentation",
      }),
    [newTab]
  );

  const onAction = useCallback(
    (action: Action) => {
      if (action.type === Actions.ADD_NODE) {
        const component = action.data.json?.component;
        if (isPaneComponent(component) && component === "editor") {
          const config = action.data.json.config as TypedNodeConfig;
          createPlayerForEditor(action.data.toNode, config);
        }
      }
      return action;
    },
    [createPlayerForEditor]
  );

  const layoutFactory = useCallback(
    (node: TabNode) => {
      const component = node.getComponent();

      if (!isPaneComponent(component)) {
        return undefined;
      }

      switch (component) {
        case "editor": {
          const config = node.getConfig() as TypedNodeConfig;

          if (config?.type !== "editor") {
            return undefined;
          }

          const player = corewar.getPlayer(config.playerId);

          if (player === undefined) {
            console.warn("editor <=> player invariant broken");
            return undefined;
          }

          return (
            <Editor
              player={player}
              onChanged={(config) => {
                updateNodeConfig(node.getId(), {
                  type: "editor",
                  ...config,
                });
              }}
            />
          );
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
    [corewar, newPlayerTab, newHelpTab, updateNodeConfig]
  );

  return (
    <Layout
      ref={flexLayout}
      model={layoutModel}
      factory={layoutFactory}
      onModelChange={(model) => save("ui::layout", model.toJson())}
      onAction={onAction}
      // onRenderTab={(node, values) => {
      //   const editorId = node.getConfig().id;
      //   if (typeof editorId === "number") {
      //     const player = corewar.getPlayer(editorId);
      //     // values.leading =
      //     values.name = "A";
      //     values.buttons = ["a"];
      //     values.content = (
      //       <>
      //         <div style={{ color: toCssColor(player.color) }}>Champion</div>
      //       </>
      //     );
      //   }
      // }}
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

type TypedNodeConfig =
  | { type: "editor"; playerId: number; code?: string; color?: number }
  | undefined;

type TypedJsonTabNode = Omit<IJsonTabNode, "component" | "config"> & {
  component: PaneComponent;
  config?: TypedNodeConfig;
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
          },
          {
            type: "tab",
            name: "Documentation",
            component: "help",
          },
        ],
      },
    ],
  },
};
