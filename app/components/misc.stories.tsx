import { Transition } from "@headlessui/react";
import * as React from "react";
import {
  Bookmark,
  LogOut,
  Save,
  Settings,
  Trash2,
  User,
  X,
} from "react-feather";
import { useList, useToggle } from "react-use";
import { Collapse } from "./collapse";
import {
  RadialProgress,
  RadialProgressV2,
  Spinner,
  VideoComponent,
} from "./misc";
import { ModalProvider, useModal } from "./modal";
import { Popover } from "./popover";
import { PracticeHistoryChart } from "./practice-history-chart";
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

export function TestVideoComponent() {
  const [isLoading, toggle] = useToggle(true);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-2 gap-2">
        <label className="label flex justify-start gap-4 items-center">
          <input
            className="toggle"
            type="checkbox"
            checked={isLoading}
            onChange={() => toggle()}
          />
          <span className="label-text">Toggle loading</span>
        </label>
        <VideoComponent
          video={{
            title:
              "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson",
            author: "Learn French with Elisabeth - HelloFrench",
            channelId: "UCo6iNXVDuG-SQlAdxAGPGHg",
            id: 0,
            videoId: "MoH8Fk2K9bc",
            language1_id: ".fr-FR",
            language2_id: ".en",
          }}
          actions={
            <>
              <li>
                <button>
                  <Save />
                  Save
                </button>
              </li>
              <li>
                <button>
                  <Trash2 />
                  Delete
                </button>
              </li>
            </>
          }
        />
        <VideoComponent
          video={{
            title:
              "Russian Alphabet (How to Pronounce Russian Letters) | Super Easy Russian 60",
            author: "Easy Russian",
            channelId: "UCxvt-g7JsPNnEn8tUtZZBBg",
            id: 0,
            videoId: "FSYe9GQc9Ow",
            language1_id: ".ru",
            language2_id: ".en",
          }}
          bookmarkEntriesCount={17}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export function TestFab() {
  const [checked, setChecked] = React.useState(true);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-2 gap-2">
        <div>
          <input
            className="toggle"
            type="checkbox"
            checked={checked}
            onChange={() => setChecked(!checked)}
          />
        </div>
        <div className="w-80 h-80 border relative">
          <Transition
            show={checked}
            className="absolute flex gap-3 p-3 transition-all duration-300"
            enterFrom="scale-[0.3] opacity-0"
            enterTo="scale-100 opacity-100"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-[0.3] opacity-0"
          >
            <button className="w-12 h-12 rounded-full bg-primary text-primary-content flex justify-center items-center shadow-lg hover:contrast-[0.8] transition-[filter] duration-300">
              <Bookmark />
            </button>
          </Transition>
        </div>
      </div>
    </div>
  );
}

export function TestSpinner() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-2 gap-2">
        <Spinner className="w-10 h-10" />
        <Spinner className="w-20 h-20" />
        <Spinner className="w-40 h-40" />
      </div>
    </div>
  );
}

const TestModalInner: React.FC = () => {
  const { openModal, closeModal } = useModal();

  function onClick() {
    openModal(
      <div className="w-full p-6 my-8 bg-white shadow-xl rounded-xl">
        <div className="text-lg font-medium leading-6 text-gray-900">
          Some title
        </div>
        <div className="mt-2">
          <div className="text-sm text-gray-500">Some comments</div>
        </div>
        <div className="mt-4">
          <button className="btn" onClick={closeModal}>
            Done!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-2 gap-2">
        <button onClick={onClick} className="btn">
          Show Modal
        </button>
      </div>
    </div>
  );
};

export function TestModalProvider() {
  return (
    <ModalProvider>
      <TestModalInner />
    </ModalProvider>
  );
}

export function TestPracticeHistoryChart() {
  const data = [
    { date: "2022-05-08", total: 10, NEW: 3, LEARN: 4, REVIEW: 3 },
    { date: "2022-05-09", total: 9, NEW: 2, LEARN: 5, REVIEW: 2 },
    { date: "2022-05-10", total: 16, NEW: 7, LEARN: 6, REVIEW: 3 },
    { date: "2022-05-11", total: 18, NEW: 5, LEARN: 8, REVIEW: 5 },
    { date: "2022-05-12", total: 18, NEW: 8, LEARN: 7, REVIEW: 3 },
    { date: "2022-05-13", total: 14, NEW: 2, LEARN: 5, REVIEW: 7 },
    { date: "2022-05-14", total: 18, NEW: 5, LEARN: 8, REVIEW: 5 },
  ];
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg">
        <PracticeHistoryChart data={data} className="h-[300px] w-full" />
      </div>
    </div>
  );
}

export function TestRadialProgress() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg p-4 flex flex-col gap-2 items-center">
        <RadialProgressV2 className="w-20 h-20" progress={0.7} />
        <RadialProgress className="w-20 h-20" progress={0.7} />
      </div>
    </div>
  );
}
