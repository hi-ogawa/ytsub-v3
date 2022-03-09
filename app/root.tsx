import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  useTransition,
} from "@remix-run/react";
import { LinksFunction, MetaFunction } from "@remix-run/server-runtime";
import * as React from "react";
import { Home, Loader, Menu, Search } from "react-feather";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: require("../build/tailwind/" + process.env.NODE_ENV + "/index.css"),
    },
    { rel: "icon", href: require("./assets/icon-32.png"), sizes: "32x32" },
  ];
};

export const meta: MetaFunction = () => {
  return {
    title: "ytsub-v3",
    viewport:
      "width=device-width, height=device-height, initial-scale=1, maximum-scale=1, user-scalable=no",
  };
};

export default function Component() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <SideMenuDrawerWrapper>
          <div className="h-full flex flex-col h-full">
            <Navbar />
            <div className="grow flex justify-center items-center">
              <Outlet />
            </div>
          </div>
        </SideMenuDrawerWrapper>
        <GlobalSpinner />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

function GlobalSpinner() {
  const transition = useTransition();
  return (
    transition.state !== "idle" && (
      <div className="absolute right-3 bottom-3 h-10 w-10 p-1 bg-gray-300/50 rounded">
        <Loader className="animate-[spin_4s_linear_infinite]" />
      </div>
    )
  );
}

const DRAWER_TOGGLE_INPUT_ID = "--drawer-toggle-input--";

function toggleDrawer(open?: boolean): void {
  const element = document.querySelector<HTMLInputElement>(
    "#" + DRAWER_TOGGLE_INPUT_ID
  );
  if (!element) return;
  if (open === undefined) {
    element.checked = !element.checked;
  } else {
    element.checked = open;
  }
}

function Navbar() {
  return (
    <header className="w-full h-12 flex-none bg-primary text-primary-content flex items-center px-4 py-2 shadow-lg z-10">
      <div className="flex-none pr-4">
        <label
          className="btn btn-sm btn-ghost"
          htmlFor={DRAWER_TOGGLE_INPUT_ID}
        >
          <Menu size={24} />
        </label>
      </div>
      <div className="flex-1">Page Title</div>
      <div className="flex-none hidden sm:block">
        <SearchComponent />
      </div>
    </header>
  );
}

interface SideMenuEntry {
  to: string;
  icon: any;
  title: string;
}

const SIDE_MENU_ENTRIES: SideMenuEntry[] = [
  {
    to: "/",
    icon: Home,
    title: "Home",
  },
];

function SideMenuDrawerWrapper({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="drawer h-screen w-full">
      <input
        className="drawer-toggle"
        type="checkbox"
        id={DRAWER_TOGGLE_INPUT_ID}
      />
      <div className="drawer-content">{children}</div>
      <div className="drawer-side">
        <label className="drawer-overlay" htmlFor={DRAWER_TOGGLE_INPUT_ID} />
        <ul className="menu p-4 w-64 bg-base-100 text-base-content">
          <li className="disabled block sm:hidden">
            <SearchComponent />
          </li>
          {SIDE_MENU_ENTRIES.map((entry) => (
            <li key={entry.to}>
              <Link to={entry.to} onClick={() => toggleDrawer(false)}>
                <entry.icon size={28} className="text-gray-500 pr-2" />
                {entry.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SearchComponent() {
  return (
    <form className="w-full" action="/setup" method="get">
      <label className="w-full relative text-base-content flex items-center">
        <Search size={26} className="absolute text-gray-400 pl-2" />
        <input
          type="text"
          name="id"
          className="w-full input input-sm input-bordered pl-8"
          placeholder="Enter Video ID"
          required
        />
      </label>
    </form>
  );
}
