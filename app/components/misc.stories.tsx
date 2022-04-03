import * as React from "react";
import { LogOut, Settings, User, X } from "react-feather";
import { useList } from "react-use";
import { Transition } from "@headlessui/react";
import { Collapse } from "./collapse";
import { Slide } from "./slide";
import {
  SnackbarItemComponent,
  SnackbarProvider,
  SnackbardContainerComponent,
  VARIANTS,
  useSnackbar,
} from "./snackbar";
import { Popover } from "./popover";

function TestSnackbarContextInner() {
  const { enqueueSnackbar } = useSnackbar();

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    // @ts-expect-error
    const params = Object.fromEntries(new FormData(e.target).entries());
    const { variant, content } = params;
    enqueueSnackbar(content, { variant });
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
                  defaultChecked={variant === "success"}
                />
              </label>
            </div>
          ))}
        </div>
        <button type="submit" className="btn">
          show snackbar
        </button>
      </form>
    </div>
  );
}

export function TestSnackbarContext() {
  const components = {
    Container: SnackbardContainerComponent,
    Item: SnackbarItemComponent,
  };
  return (
    <SnackbarProvider components={components} timeout={5000}>
      <TestSnackbarContextInner />
    </SnackbarProvider>
  );
}

export function TestCollapseSingle() {
  const [show, setShow] = React.useState(true);
  return (
    <div className="p-4 flex flex-col items-center">
      <div className="card rounded w-full max-w-sm p-4 px-4 gap-4">
        <button className="btn" onClick={() => setShow(!show)}>
          Toggle
        </button>
        <Collapse show={show} appear={true}>
          <div className="flex border p-2 justify-center items-center bg-gray-100">
            Hello
          </div>
        </Collapse>
      </div>
    </div>
  );
}

const COLLAPSE_MANY_LIST = ["hello", "world"].map((content) => ({
  key: content,
  content,
  show: true,
  appear: false,
}));

export function TestCollapseMany() {
  const [items, { insertAt, removeAt, updateAt }] = useList(COLLAPSE_MANY_LIST);

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="card rounded w-full max-w-sm p-4 px-4 gap-3">
        <input
          className="w-full input input-bordered px-4"
          type="text"
          placeholder="Input Text"
          onKeyUp={(e) => {
            if (e.key === "Enter" && e.currentTarget.value) {
              insertAt(0, {
                key: String(Math.random()),
                content: e.currentTarget.value,
                show: true,
                appear: true,
              });
            }
          }}
        />
        <div className="flex flex-col">
          {items.map((item, i) => (
            <Collapse
              key={item.key}
              show={item.show}
              appear={item.appear}
              afterLeave={() => removeAt(i)}
            >
              <div className="flex border bg-gray-100 p-2 mb-2">
                <div className="grow">{item.content}</div>
                <button
                  className="flex-none btn btn-xs btn-ghost btn-circle"
                  onClick={() => updateAt(i, { ...item, show: false })}
                >
                  <X size={16} />
                </button>
              </div>
            </Collapse>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TestSlide() {
  const [show, setShow] = React.useState(true);
  return (
    <div className="p-4 flex flex-col items-center">
      <div className="card rounded w-full max-w-sm p-4 px-4 gap-4">
        <button className="btn" onClick={() => setShow(!show)}>
          Toggle
        </button>
        <Slide show={show} appear={true}>
          <div className="w-full flex border p-2 justify-center items-center bg-gray-100">
            Hello
          </div>
        </Slide>
      </div>
    </div>
  );
}

export function TestPopover() {
  return (
    <div className="p-4 flex flex-col items-center">
      <div className="border rounded w-full max-w-sm p-4 flex flex-col gap-2">
        <div>
          <Popover
            placement="bottom-end"
            reference={({ props }) => (
              <button
                className="btn btn-sm btn-ghost"
                data-test="user-menu"
                {...props}
              >
                <User />
              </button>
            )}
            floating={({ open, props }) => (
              // Use @headlessui/react@insiders to pass ref
              // https://github.com/tailwindlabs/headlessui/issues/273#issuecomment-1049961182
              <Transition
                show={open}
                unmount={false}
                className="transition duration-200"
                enterFrom="scale-90 opacity-0"
                enterTo="scale-100 opacity-100"
                leaveFrom="scale-100 opacity-100"
                leaveTo="scale-90 opacity-0"
                {...props}
              >
                <ul className="menu rounded p-3 shadow w-48 bg-base-100 text-base-content">
                  <li>
                    <span>
                      <Settings />
                      Account
                    </span>
                  </li>
                  <li>
                    <span>
                      <LogOut />
                      Sign out
                    </span>
                  </li>
                </ul>
              </Transition>
            )}
          />
        </div>
      </div>
    </div>
  );
}

export function TestPopoverDaisyUI() {
  return (
    <div className="p-4 flex flex-col items-center">
      <div className="border rounded w-full max-w-sm p-4 flex gap-2">
        <div>
          <div className="dropdown dropdown-end">
            <label
              tabIndex={0}
              className="btn btn-sm btn-ghost"
              data-test="user-menu"
            >
              <User />
            </label>
            <ul
              tabIndex={0}
              className="dropdown-content menu rounded p-3 shadow w-48 bg-base-100 text-base-content"
            >
              <li>
                <a href="">
                  <Settings />
                  Account
                </a>
              </li>
              <li>
                <a href="">
                  <LogOut />
                  Sign out
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
