import "virtual:uno.css";
import { tinyassert } from "@hiogawa/utils";
import { Compose } from "@hiogawa/utils-react";
import { createRoot } from "react-dom/client";
import {
  NavLink,
  Outlet,
  RouteObject,
  RouterProvider,
  createBrowserRouter,
  redirect,
} from "react-router-dom";
import * as stories from "./components/stories";
import { ThemeSelect } from "./components/theme-select";
import { cls } from "./utils/misc";
import { QueryClientWrapper } from "./utils/react-query-utils";
import { ToastWrapper } from "./utils/toast-utils";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/e2b9f18764cfb466ff9c91871cd1b65a9d006877/packages/app/src/app.tsx

//
// route generation
//

// type check
stories satisfies Record<string, React.FC>;

const storiesRoutes = Object.entries(stories).map(
  ([name, Fc]): RouteObject => ({
    path: name,
    element: <Fc />,
  })
);

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      ...storiesRoutes,
      {
        path: "*",
        loader: () => redirect("/TestFab"),
      },
    ],
  },
]);

//
// components
//

function App() {
  return (
    <Compose
      elements={[
        <ToastWrapper />,
        <QueryClientWrapper />,
        <RouterProvider router={router} />,
      ]}
    />
  );
}

function Root() {
  return (
    <div className="h-full w-full flex flex-col">
      <header className="flex-none flex items-center p-2 px-4 shadow-md shadow-black/[0.05] dark:shadow-black/[0.7]">
        <h1 className="text-xl">UI DEV</h1>
        <div className="flex-1"></div>
        <ThemeSelect />
      </header>
      <div className="flex-1 flex">
        <div className="flex-none p-2 overflow-y-auto mr-2 border-r">
          <SideMenu />
        </div>
        <div className="flex-1 flex justify-center items-center p-2">
          <div className="w-full h-full relative overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

function SideMenu() {
  return (
    <ul className="flex flex-col gap-1.5">
      {storiesRoutes.map((route) => (
        <li key={route.path} className="flex">
          <NavLink
            to={"/" + route.path}
            className={({ isActive }) =>
              cls(
                "flex-1 antd-menu-item p-2",
                isActive && "antd-menu-item-active"
              )
            }
          >
            {route.path}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

//
// main
//

function main() {
  const el = document.getElementById("root");
  tinyassert(el);
  const root = createRoot(el);
  root.render(<App />);
}

main();
