import { typedBoolean } from "@hiogawa/utils";
import {
  Form,
  Link,
  Links,
  LiveReload,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ShouldReloadFunction,
  useMatches,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/server-runtime";
import { atom, useAtom } from "jotai";
import { last } from "lodash";
import type React from "react";
import { Toaster, toast } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "react-query";
import { Drawer } from "./components/drawer";
import { PopoverSimple } from "./components/popover";
import { ThemeSelect } from "./components/theme-select";
import { TopProgressBarRemix } from "./components/top-progress-bar";
import type { UserTable } from "./db/models";
import { R, R_RE } from "./misc/routes";
import { publicConfig } from "./utils/config";
import { ConfigPlaceholder } from "./utils/config-placeholder";
import { Controller, makeLoader } from "./utils/controller-utils";
import { getFlashMessages } from "./utils/flash-message";
import { useFlashMessages } from "./utils/flash-message-hook";
import { useHydrated } from "./utils/hooks";
import { RootLoaderData, useRootLoaderData } from "./utils/loader-utils";
import { cls } from "./utils/misc";
import type { Match } from "./utils/page-handle";

export const links: LinksFunction = () => {
  // prettier-ignore
  return [
    { rel: "stylesheet", href: require("../build/css/" + process.env.NODE_ENV + "/index.css") },
    { rel: "icon", href: require("./assets/icon-32.png"), sizes: "32x32" },
    { rel: "manifest", href: "/_copy/manifest.json" },
  ];
};

export const meta: MetaFunction = () => {
  [publicConfig.VERCEL_ENV == "preview" && "[PREVIEW]", "ytsub-v3"].filter(
    typedBoolean
  );
  return {
    title:
      (publicConfig.VERCEL_ENV === "preview" ? "[PREVIEW] " : "") + "ytsub-v3",
    viewport: "width=device-width, height=device-height, initial-scale=1",
  };
};

//
// loader
//

export const loader = makeLoader(Controller, async function () {
  const data: RootLoaderData = {
    currentUser: await this.currentUser(),
    flashMessages: getFlashMessages(this.session),
  };
  return this.serialize(data);
});

export const unstable_shouldReload: ShouldReloadFunction = ({
  submission,
  url,
  prevUrl,
}) => {
  if (submission?.action === R["/bookmarks/new"]) {
    return false;
  }
  // skip reload during "practice" loop
  if (
    url.pathname === prevUrl.pathname &&
    url.pathname.match(R_RE["/decks/$id/practice"])
  ) {
    return false;
  }
  // TODO: rest should fallback to default behavior
  return true;
};

//
// component
//

export default function DefaultComponent() {
  useHydrated(); // initialize global hydration state shared via this hook

  // TODO: hydration error for theme class (dark, light)
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ConfigPlaceholder />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}></script>
      </head>
      <body className="h-full">
        {/* TODO: default position="top" is fine? */}
        <Toaster
          position="bottom-left"
          toastOptions={{
            className: "!bg-colorBgElevated !text-colorText",
          }}
        />
        {/* escape hatch to close all toasts for e2e test (cf. forceDismissToast in helper.ts) */}
        <button
          data-test="forceDismissToast"
          hidden
          onClick={() => toast.dismiss()}
        />
        <RootProviders>
          <Root />
        </RootProviders>
      </body>
    </html>
  );
}

// copied from index.html via
//   node -e 'console.log(fs.readFileSync("./index.html", "utf-8").match(/<script>(.*?)<\/script>/sm)[1].replaceAll(/\/\/.*/g, "").replaceAll("\n", " ").trim())'
const THEME_SCRIPT = `(() => {         const STORAGE_KEY = "ytsub:theme";         const DEFAULT_THEME = "system";         const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");          function getTheme() {           return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;         }          function setTheme(config) {           window.localStorage.setItem(STORAGE_KEY, config);           applyTheme();         }          function applyTheme() {           const theme = getTheme();           const derived = theme === "system" ? (prefersDark.matches ? "dark" : "light") : theme;           disableTransitions(() => {             document.documentElement.classList.remove("dark", "light");             document.documentElement.classList.add(derived);           });         }                   function disableTransitions(callback) {           const el = document.createElement("style");           el.innerHTML = "* { transition: none !important; }";           document.head.appendChild(el);           callback();           window.getComputedStyle(document.documentElement).transition;            document.head.removeChild(el);         }          function initTheme() {           applyTheme();           prefersDark.addEventListener("change", applyTheme);           Object.assign(globalThis, { __theme: { setTheme, getTheme } });         }          initTheme();       })();`;

function Root() {
  const data = useRootLoaderData();
  useFlashMessages(data.flashMessages);

  // `PageHandle` of the leaf compoment
  const matches: Match[] = useMatches();
  const { navBarTitle, navBarMenu } = last(matches)?.handle ?? {};

  return (
    <>
      <TopProgressBarRemix />
      <div className="h-full flex flex-col">
        <Navbar
          title={navBarTitle?.()}
          user={data.currentUser}
          menu={navBarMenu?.()}
        />
        <div className="flex-[1_0_0] flex flex-col" data-test="main">
          <div className="w-full flex-[1_0_0] h-full overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>
      <Scripts />
      <LiveReload />
    </>
  );
}

function RootProviders({ children }: React.PropsWithChildren<{}>) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Should be no-op on SSR
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function Navbar({
  title,
  user,
  menu,
}: {
  title?: React.ReactNode;
  user?: UserTable;
  menu?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useAtom(drawerOpenAtom);

  return (
    <header className="w-full h-12 flex-none bg-primary text-primary-content flex items-center p-2 px-6 gap-4 shadow-md shadow-black/[0.05] dark:shadow-black/[0.7]">
      <button
        className="antd-btn antd-btn-ghost i-ri-menu-line w-6 h-6"
        onClick={() => setDrawerOpen(!drawerOpen)}
      />
      <div className="flex-1">{title}</div>
      {menu}
      {!user && (
        <div className="flex-none flex items-center">
          <Link
            to={R["/users/signin"]}
            className="antd-btn antd-btn-ghost i-ri-login-box-line w-6 h-6"
            data-test="login-icon"
          />
        </div>
      )}
      {user && (
        <div className="flex-none flex items-center">
          <PopoverSimple
            placement="bottom-end"
            reference={
              <button
                className="antd-btn antd-btn-ghost i-ri-user-line w-6 h-6"
                data-test="user-menu"
              />
            }
            floating={(context) => (
              <ul className="flex flex-col items-stretch gap-2 p-2 w-[180px] text-sm">
                <li>
                  <Link
                    className="antd-menu-item flex items-center gap-2 p-2"
                    to={R["/users/me"]}
                    onClick={() => context.onOpenChange(false)}
                  >
                    <span className="i-ri-settings-line w-6 h-6"></span>
                    Account
                  </Link>
                </li>
                <li>
                  <Form
                    method="post"
                    action={R["/users/signout"]}
                    data-test="signout-form"
                    onClick={() => context.onOpenChange(false)}
                  >
                    <button
                      type="submit"
                      className="w-full antd-menu-item flex items-center gap-2 p-2"
                    >
                      <span className="i-ri-logout-box-line w-6 h-6"></span>
                      Sign out
                    </button>
                  </Form>
                </li>
              </ul>
            )}
          />
        </div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <ul className="flex flex-col gap-3 p-4 w-[280px] h-full">
          <li>
            <SearchComponent />
          </li>
          {SIDE_MENU_ENTRIES.map((entry) => {
            const disabled = entry.requireSignin && !user;
            return (
              <li
                key={entry.to}
                className="flex"
                title={disabled ? "Signin required" : undefined}
              >
                <NavLink
                  className={({ isActive }) =>
                    cls(
                      "antd-menu-item flex-1 p-2 flex items-center gap-4 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
                      isActive && "antd-menu-item-active"
                    )
                  }
                  to={entry.to}
                  aria-disabled={disabled}
                  onClick={() => setDrawerOpen(false)}
                >
                  {entry.icon}
                  {/* <entry.icon size={24} /> */}
                  {entry.title}
                </NavLink>
              </li>
            );
          })}
          <li className="border-t py-2"></li>
          <li>
            <ThemeSelect />
          </li>
        </ul>
      </Drawer>
    </header>
  );
}

interface SideMenuEntry {
  to: string;
  icon: any;
  title: string;
  requireSignin: boolean;
}

const SIDE_MENU_ENTRIES: SideMenuEntry[] = [
  {
    to: R["/"],
    icon: <span className="i-ri-home-4-line w-6 h-6" />,
    title: "Examples",
    requireSignin: false,
  },
  {
    to: R["/videos"],
    icon: <span className="i-ri-vidicon-line w-6 h-6" />,
    title: "Your Videos",
    requireSignin: true,
  },
  {
    to: R["/bookmarks"],
    icon: <span className="i-ri-bookmark-line w-6 h-6" />,
    title: "Bookmarks",
    requireSignin: true,
  },
  {
    to: R["/decks"],
    icon: <span className="i-ri-book-open-line w-6 h-6" />,
    title: "Practice",
    requireSignin: true,
  },
];

function SearchComponent() {
  const [, setDrawerOpen] = useAtom(drawerOpenAtom);

  return (
    <Form
      className="w-full"
      action={R["/videos/new"]}
      method="get"
      onSubmit={() => setDrawerOpen(false)}
      data-test="search-form"
    >
      <label className="w-full relative text-base-content flex items-center">
        <span className="absolute text-colorTextSecondary ml-2.5 i-ri-search-line w-4 h-4"></span>
        <input
          type="text"
          name="videoId"
          className="w-full antd-input p-1 pl-9"
          placeholder="Enter Video ID or URL"
          required
        />
      </label>
    </Form>
  );
}

//
// page local state
//

const drawerOpenAtom = atom(false);
