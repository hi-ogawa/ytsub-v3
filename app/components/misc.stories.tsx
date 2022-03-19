import * as React from "react";
import { X } from "react-feather";
import { useList } from "react-use";
import { Collapse } from "./collapse";
import { Slide } from "./slide";
import {
  SnackbarItemComponent,
  SnackbarProvider,
  SnackbardContainerComponent,
  VARIANTS,
  useSnackbar,
} from "./snackbar";

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
