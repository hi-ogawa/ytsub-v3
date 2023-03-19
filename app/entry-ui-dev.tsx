import { tinyassert } from "@hiogawa/utils";
import ReactDOM from "react-dom";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import * as stories from "./components/stories";
import "./styles/main-vite";
import { cls } from "./utils/misc";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/e2b9f18764cfb466ff9c91871cd1b65a9d006877/packages/app/src/app.tsx

// check typing
stories satisfies Record<string, React.FC>;

function Root() {
  return (
    <BrowserRouter>
      <div className="h-full w-full flex flex-col">
        <header className="flex-none flex items-center p-2 px-4 shadow-md shadow-black/[0.05]">
          <h1 className="text-xl">UI DEV</h1>
        </header>
        <div className="flex-1 flex">
          <div className="flex-none p-2 overflow-y-auto mr-2 border-r">
            <ul className="flex flex-col gap-1.5">
              {Object.keys(stories).map((key) => (
                <li key={key} className="flex">
                  <NavLink
                    to={key}
                    className={({ isActive }) =>
                      cls(
                        "flex-1 antd-menu-item p-2",
                        isActive && "antd-menu-item-active"
                      )
                    }
                  >
                    {key}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 flex justify-center items-center p-2">
            <div className="w-full h-full relative overflow-hidden">
              <Routes>
                {Object.entries(stories).map(([key, Component]) => (
                  <Route key={key} path={key} element={<Component />} />
                ))}
                <Route
                  path="*"
                  element={
                    <div className="w-full h-full flex justify-center items-center text-3xl text-gray-500">
                      SELECT ITEM FROM THE MENU
                    </div>
                  }
                />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

function main() {
  const el = document.getElementById("root");
  tinyassert(el);
  ReactDOM.render(<Root />, el);
}

main();
