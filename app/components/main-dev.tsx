import { mapKeys } from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  BrowserRouter,
  NavLink,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

type StoryFiles = Record<string, Record<string, React.ComponentClass>>;

// @ts-expect-error https://vitejs.dev/guide/features.html#glob-import
const GLOB_IMPORT: any = import.meta.globEager("./**/*.stories.tsx");
const STORY_FILES: StoryFiles = mapKeys(GLOB_IMPORT, (_, key) => key.slice(2));

function App() {
  return (
    <div className="h-full flex p-2 gap-2">
      <div className="flex-none w-48 p-2">
        <ul className="menu menu-compact gap-1">
          {Object.entries(STORY_FILES).map(([file, stories]) => (
            <React.Fragment key={file}>
              <li className="menu-title text-sm text-gray-400">{file}</li>
              {Object.keys(stories).map((story) => (
                <li key={story}>
                  <NavLink to={file + "/" + story}>
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
              <Route key={file} path={file} element={<Outlet />}>
                {Object.entries(stories).map(([story, Component]) => (
                  <Route key={story} path={story} element={<Component />} />
                ))}
              </Route>
            ))}
            <Route path="*" element={<div>STORY NOT SELECTED</div>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function Root() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

function main() {
  ReactDOM.render(<Root />, document.getElementById("root"));
}

main();
