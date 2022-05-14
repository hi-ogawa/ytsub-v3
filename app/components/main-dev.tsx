import { mapKeys } from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Menu } from "react-feather";
import {
  BrowserRouter,
  NavLink,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

type StoryFiles = Record<string, Record<string, React.FC>>;

// @ts-expect-error https://vitejs.dev/guide/features.html#glob-import
const GLOB_IMPORT: any = import.meta.globEager("./**/*.stories.tsx");
const STORY_FILES: StoryFiles = mapKeys(GLOB_IMPORT, (_, key) => key.slice(2));

function withBase(filePath: string): string {
  // @ts-expect-error https://vitejs.dev/guide/build.html#public-base-path
  return import.meta.env.BASE_URL + filePath;
}

function App({ open }: { open: boolean }) {
  return (
    <div className="h-full flex p-2">
      <div
        className={`flex-none p-2 overflow-y-auto transition-[width] ${
          open ? "w-48 mr-2" : "w-0 p-0 overflow-hidden"
        }`}
      >
        <ul className="menu menu-compact gap-1">
          {Object.entries(STORY_FILES).map(([file, stories]) => (
            <React.Fragment key={file}>
              <li className="menu-title text-sm text-gray-400">{file}</li>
              {Object.keys(stories).map((story) => (
                <li key={story}>
                  <NavLink to={withBase(file) + "/" + story}>
                    <span>{story}</span>
                  </NavLink>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>
      </div>
      <div className="grow flex justify-center items-center border">
        <div className="w-full h-full relative overflow-hidden">
          <Routes>
            {Object.entries(STORY_FILES).map(([file, stories]) => (
              <Route key={file} path={withBase(file)} element={<Outlet />}>
                {Object.entries(stories).map(([story, Component]) => (
                  <Route key={story} path={story} element={<Component />} />
                ))}
              </Route>
            ))}
            <Route
              path="*"
              element={
                <div className="w-full h-full flex justify-center items-center text-3xl text-gray-500">
                  STORY NOT SELECTED
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function Root() {
  const [open, setOpen] = React.useState(true);

  return (
    <BrowserRouter>
      <div className="h-full w-full flex flex-col">
        <header className="flex-none flex items-center p-2 bg-primary text-primary-content">
          <button
            className="flex-none btn btn-sm btn-ghost"
            onClick={() => setOpen(!open)}
          >
            <Menu size={24} />
          </button>
        </header>
        <App open={open} />
      </div>
    </BrowserRouter>
  );
}

function main() {
  ReactDOM.render(<Root />, document.getElementById("root"));
}

main();
