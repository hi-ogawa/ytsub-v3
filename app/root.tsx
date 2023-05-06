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
import { PopoverSimple } from "./components/popover";
import { ThemeScriptPlaceholder, ThemeSelect } from "./components/theme-select";
import { TopProgressBarRemix } from "./components/top-progress-bar";
import type { UserTable } from "./db/models";
import { $R, R } from "./misc/routes";
import { HideRecaptchaBadge } from "./routes/users/register";
import { trpc } from "./trpc/client";
import { publicConfig } from "./utils/config";
import { ConfigPlaceholder } from "./utils/config-placeholder";
import { useFlashMessages } from "./utils/flash-message-hook";
import { RootLoaderData, useRootLoaderData } from "./utils/loader-utils";
import { makeLoader } from "./utils/loader-utils.server";
import { cls } from "./utils/misc";
import type { PageHandle } from "./utils/page-handle";
import { QueryClientWrapper } from "./utils/react-query-utils";

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

export const loader = makeLoader(async ({ ctx }) => {
  const loaderData: RootLoaderData = {
    currentUser: await ctx.currentUser(),
    // TODO: revalidation of root loader is required only for reloading flash message, which sounds so odd, so please think about a different approach.
    flashMessages: await ctx.getFlashMessages(),
  };
  return loaderData;
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
        <ThemeScriptPlaceholder />
        <HideRecaptchaBadge />
      </head>
      <body className="h-full">
        {/* TODO: default position="top" is fine? */}
        <Toaster
          position="bottom-left"
          toastOptions={{
            className: "!bg-colorBgElevated !text-colorText",
          }}
        />
        <button
          className="hidden"
          data-testid="toast-remove"
          onClick={() => {
            toast.remove();
          }}
        />
        <HydratedTestId />
        <Compose elements={[<QueryClientWrapper />, <Root />]} />
      </body>
    </html>
  );
}

function HydratedTestId() {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  return <span data-testid={hydrated && "hydrated"}></span>;
}

function Root() {
  const data = useRootLoaderData();
  useFlashMessages(data.flashMessages);

  // `PageHandle` of the leaf compoment
  const matches = useMatches();
  const handle: PageHandle = matches.at(-1)?.handle ?? {};

  return (
    <>
      <TopProgressBarRemix />
      <div className="h-full flex flex-col relative z-0">
        <Navbar
          title={handle.navBarTitle?.()}
          user={data.currentUser}
          menu={handle.navBarMenu?.()}
        />
        <div className="flex-[1_0_0] flex flex-col" data-test="main">
          <div
            className="w-full flex-[1_0_0] h-full overflow-y-auto"
            data-testid="main-scroll"
          >
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
        data-testid="Navbar-drawer-button"
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
