import * as React from "react";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "react-feather";
import { useList } from "react-use";
import { Collapse } from "../collapse";
import { Slide } from "../slide";

// Separate non-component exports for HMR
import {
  DefaultSnackbarContext,
  SnackbarItem,
  SnackbarItemProps,
  SnackbarOptions,
  SnackbarProviderProps,
  useSnackbar,
} from "./misc";
export * from "./misc";

export function SnackbarProvider({
  children,
  components,
  timeout,
}: React.PropsWithChildren<SnackbarProviderProps>) {
  const [items, { set, insertAt }] = useList<SnackbarItem>([]);

  function removeById(id: string) {
    set((items) => {
      const i = items.findIndex((item) => item.id === id);
      if (i === -1) return items;
      items = items.slice();
      items.splice(i, 1);
      return items;
    });
  }

  function updateById(id: string, update: (item: SnackbarItem) => void) {
    set((items) => {
      const i = items.findIndex((item) => item.id === id);
      if (i === -1) return items;
      items = items.slice();
      items[i] = { ...items[i] };
      update(items[i]);
      return items;
    });
  }

  function enqueueSnackbar(node: React.ReactNode, options?: SnackbarOptions) {
    const id = String(Math.random());
    insertAt(0, {
      id,
      node,
      state: "show",
      variant: options?.variant ?? "default",
    });
    setTimeout(() => closeSnackbar(id), timeout);
    return id;
  }

  function closeSnackbar(id: string) {
    updateById(
      id,
      (item) => item.state === "show" && (item.state = "slide-out")
    );
  }

  return (
    <DefaultSnackbarContext.Provider value={{ enqueueSnackbar, closeSnackbar }}>
      {children}
      <components.Container>
        {items.map((item) => (
          <Slide
            key={item.id}
            show={item.state === "show"}
            appear={true}
            duration={500}
            afterLeave={() =>
              updateById(item.id, (item) => (item.state = "collapse"))
            }
          >
            <Collapse
              show={item.state !== "collapse"}
              appear={false}
              duration={300}
              afterLeave={() => removeById(item.id)}
            >
              <components.Item id={item.id} variant={item.variant}>
                {item.node}
              </components.Item>
            </Collapse>
          </Slide>
        ))}
      </components.Container>
    </DefaultSnackbarContext.Provider>
  );
}

export function SnackbardContainerComponent({
  children,
}: React.PropsWithChildren<{}>) {
  return (
    <div className="absolute bottom-2 left-2 transition">
      <div className="flex flex-col w-80 relative">{children}</div>
    </div>
  );
}

const VARIANT_TO_ICON = {
  default: null,
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
} as const;

export function SnackbarItemComponent({
  id,
  variant,
  children,
}: React.PropsWithChildren<SnackbarItemProps>) {
  const { closeSnackbar } = useSnackbar();
  const Icon = VARIANT_TO_ICON[variant];
  return (
    <div
      className={`
        w-full rounded shadow-lg text-sm
        flex items-center gap-2 mt-2 p-2
        ${variant === "default" && "bg-gray-200"}
        ${variant === "info" && "bg-info"}
        ${variant === "success" && "bg-success"}
        ${variant === "warning" && "bg-warning"}
        ${variant === "error" && "bg-error"}
      `}
    >
      {Icon && <Icon size={20} className="flex-none" />}
      <div className="grow">{children}</div>
      <button
        className="flex-none btn btn-xs btn-ghost btn-circle"
        onClick={() => closeSnackbar(id)}
      >
        <X size={16} />
      </button>
    </div>
  );
}
