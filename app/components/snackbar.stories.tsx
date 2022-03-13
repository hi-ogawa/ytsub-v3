import { Transition } from "@headlessui/react";
import * as React from "react";
import { X } from "react-feather";
import { useList } from "react-use";
import { Snackbar, SnackbarItem, Variant } from "./snackbar";

export function Basic() {
  return (
    <div className="p-2 flex flex-col items-center">
      <Snackbar />
      <SnackbarItem content={"hey dude"} />
    </div>
  );
}

const VARIANTS = ["default", "info", "success", "warning", "error"];

interface Item {
  key: any;
  variant: Variant;
  content: React.ReactNode;
  show: boolean;
}

export function Extra() {
  const [items, { insertAt, removeAt, updateAt }] = useList<Item>([]);
  const [id, setId] = React.useState<number>(1);

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    // @ts-expect-error
    const params = Object.fromEntries(new FormData(e.target).entries());
    const { variant, content } = params;
    insertAt(0, { key: id, variant, content, show: true });
    setId(id + 1);
  }

  return (
    <div className="p-2 flex flex-col items-center">
      <form
        onSubmit={onSubmit as any}
        className="card border rounded w-full max-w-sm p-2 px-4 gap-3"
      >
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Content</span>
          </label>
          <input
            type="text"
            name="content"
            className="input input-bordered w-full"
            defaultValue="Hello World"
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Variant</span>
          </label>
          {VARIANTS.map((variant) => (
            <div key={variant} className="form-control w-full pl-2">
              <label className="label cursor-pointer">
                <span className="label-text text-xs text-gray-600 uppercase">
                  {variant}
                </span>
                <input
                  type="radio"
                  name="variant"
                  value={variant}
                  className="radio checked:bg-primary"
                  defaultChecked={variant === "default"}
                />
              </label>
            </div>
          ))}
        </div>
        <button type="submit" className="btn">
          show snackbar
        </button>
      </form>
      <div className="absolute bottom-2 left-2 transition">
        <div className="flex flex-col gap-2 w-60">
          {items.map((item, i) => (
            <Transition
              key={item.key}
              as={React.Fragment}
              show={item.show}
              appear={true}
              enter="transition-transform duration-300"
              enterFrom="translate-x-[-150%]"
              enterTo="translate-x-0"
              leave="transition-transform duration-300"
              leaveFrom="translate-x-[-150%]"
              leaveTo="translate-x-[-150%]"
              afterLeave={() => removeAt(i)}
            >
              <div className="w-full bg-error rounded p-2 shadow-lg text-sm flex items-center gap-2">
                <div className="grow">
                  {item.content} ({item.key})
                </div>
                <button
                  className="flex-none btn btn-xs btn-ghost btn-circle"
                  onClick={() => updateAt(i, { ...item, show: false })}
                >
                  <X size={16} />
                </button>
              </div>
            </Transition>
          ))}
        </div>
      </div>
    </div>
  );
}
