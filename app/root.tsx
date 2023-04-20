import { Compose } from "@hiogawa/utils-react";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  useMatches,
  useNavigate,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/server-runtime";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { useForm } from "react-hook-form";
import { Toaster, toast } from "react-hot-toast";
import { Drawer } from "./components/drawer";
import { QueryClientWrapper } from "./components/misc";
import { PopoverSimple } from "./components/popover";
import { ThemeSelect } from "./components/theme-select";
import { TopProgressBarRemix } from "./components/top-progress-bar";
import type { UserTable } from "./db/models";
import { $R, R } from "./misc/routes";
import { HideRecaptchaBadge } from "./routes/users/register";
import { trpc } from "./trpc/client";
import { publicConfig } from "./utils/config";
import { ConfigPlaceholder } from "./utils/config-placeholder";
import { Controller, makeLoader } from "./utils/controller-utils";
import { getFlashMessages } from "./utils/flash-message";
import { useFlashMessages } from "./utils/flash-message-hook";
import { RootLoaderData, useRootLoaderData } from "./utils/loader-utils";
import { cls } from "./utils/misc";
import type { PageHandle } from "./utils/page-handle";

export const links: LinksFunction = () => {
  // prettier-ignore
  return [
    { rel: "stylesheet", href: require("../build/css/index.css") },
    { rel: "icon", href: require("./assets/icon-32.png"), sizes: "32x32" },
    { rel: "manifest", href: "/manifest.json" },
  ];
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

//
// component
//

export default function DefaultComponent() {
  // hydration error for theme class (dark, light)
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, height=device-height, initial-scale=1.0"
        />
        <title>
          {publicConfig.VERCEL_ENV === "preview" ? "[PREVIEW] Ytsub" : "Ytsub"}
        </title>
        <Meta />
        <Links />
        <ConfigPlaceholder />
        <HideRecaptchaBadge />
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
        <Compose elements={[<QueryClientWrapper />, <Root />]} />
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
  const matches = useMatches();
  const handle: PageHandle = matches.at(-1)?.handle ?? {};

  return (
    <>
      <TopProgressBarRemix />
      <div className="h-full flex flex-col">
        <Navbar
          title={handle.navBarTitle?.()}
          user={data.currentUser}
          menu={handle.navBarMenu?.()}
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

function Navbar({
  title,
  user,
  menu,
}: {
  title?: React.ReactNode;
  user?: UserTable;
  menu?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <header className="w-full h-12 flex-none bg-primary text-primary-content flex items-center p-2 px-6 gap-4 shadow-md shadow-black/[0.05] dark:shadow-black/[0.7] z-1">
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
                  <SignoutComponent />
                </li>
              </ul>
            )}
          />
        </div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <ul className="flex flex-col gap-3 p-4 w-[280px] h-full">
          <li>
            <SearchComponent closeDrawer={() => setDrawerOpen(false)} />
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
                  {entry.title}
                </NavLink>
              </li>
            );
          })}
          <li className="border-t my-2"></li>
          <li className="self-start">
            <ThemeSelect />
          </li>
          <li></li>
          <li className="self-start">
            <a
              className="antd-btn antd-btn-ghost flex items-center gap-2"
              href="https://github.com/hi-ogawa/ytsub-v3"
              target="_blank"
            >
              Source code
              <span className="i-ri-github-line w-6 h-6"></span>
            </a>
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

function SearchComponent(props: { closeDrawer: () => void }) {
  const form = useForm({ defaultValues: { videoId: "" } });
  const navigate = useNavigate();

  return (
    <form
      className="w-full"
      data-test="search-form"
      onSubmit={form.handleSubmit((data) => {
        props.closeDrawer();
        navigate($R["/videos/new"](null, data));
      })}
    >
      <label className="w-full relative text-base-content flex items-center">
        <span className="absolute text-colorTextSecondary ml-2.5 i-ri-search-line w-4 h-4"></span>
        <input
          type="text"
          className="w-full antd-input p-1 pl-9"
          placeholder="Enter Video ID or URL"
          {...form.register("videoId", { required: true })}
        />
      </label>
    </form>
  );
}

function SignoutComponent() {
  const signoutMutation = useMutation({
    ...trpc.users_signout.mutationOptions(),
    onSuccess: () => {
      window.location.href = $R["/users/redirect"](null, { type: "signout" });
    },
  });

  return (
    <button
      className="w-full antd-menu-item flex items-center gap-2 p-2"
      onClick={() => signoutMutation.mutate(null)}
      disabled={signoutMutation.isLoading}
    >
      <span className="i-ri-logout-box-line w-6 h-6"></span>
      Sign out
    </button>
  );
}
