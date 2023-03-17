import { Transition } from "@headlessui/react";
import { typedBoolean } from "@hiogawa/utils";
import {
  Form,
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ShouldReloadFunction,
  useMatches,
  useTransition,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/server-runtime";
import { last } from "lodash";
import React from "react";
import {
  BookOpen,
  Bookmark,
  Home,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Video,
} from "react-feather";
import { Toaster, toast } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "react-query";
import { ModalProvider } from "./components/modal";
import { Popover } from "./components/popover";
import {
  SnackbarItemComponent,
  SnackbarProvider,
  SnackbardContainerComponent,
  useSnackbar,
} from "./components/snackbar";
import { TopProgressBar } from "./components/top-progress-bar";
import type { UserTable } from "./db/models";
import { R, R_RE } from "./misc/routes";
import { publicConfig } from "./utils/config";
import { ConfigPlaceholder } from "./utils/config-placeholder";
import { Controller, makeLoader } from "./utils/controller-utils";
import { getFlashMessages } from "./utils/flash-message";
import { useHydrated } from "./utils/hooks";
import { RootLoaderData, useRootLoaderData } from "./utils/loader-utils";
import type { Match } from "./utils/page-handle";

const ASSETS = {
  "index.css": require("../build/tailwind/" +
    process.env.NODE_ENV +
    "/index.css"),
  "icon-32.png": require("./assets/icon-32.png"),
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: ASSETS["index.css"] },
    { rel: "icon", href: ASSETS["icon-32.png"], sizes: "32x32" },
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
    viewport:
      "width=device-width, height=device-height, initial-scale=1, maximum-scale=1, user-scalable=no",
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

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ConfigPlaceholder />
      </head>
      <body className="h-full">
        <Toaster position="bottom-left" />
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

function Root() {
  const data = useRootLoaderData();

  const { enqueueSnackbar } = useSnackbar();
  React.useEffect(() => {
    for (const message of data.flashMessages) {
      enqueueSnackbar(message.content, { variant: message.variant });
    }
  }, [data]);

  // `PageHandle` of the leaf compoment
  const matches: Match[] = useMatches();
  const { navBarTitle, navBarMenu } = last(matches)?.handle ?? {};

  return (
    <>
      <GlobalProgress />
      <SideMenuDrawerWrapper isSignedIn={!!data.currentUser}>
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
      </SideMenuDrawerWrapper>
      <Scripts />
      <LiveReload />
    </>
  );
}

function RootProviders({ children }: React.PropsWithChildren<{}>) {
  return (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider
        components={{
          Container: SnackbardContainerComponent,
          Item: SnackbarItemComponent,
        }}
        timeout={5000}
      >
        <ModalProvider>{children}</ModalProvider>
      </SnackbarProvider>
    </QueryClientProvider>
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

function GlobalProgress() {
  const transition = useTransition();
  return <TopProgressBar loading={transition.state !== "idle"} />;
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

function Navbar({
  title,
  user,
  menu,
}: {
  title?: React.ReactNode;
  user?: UserTable;
  menu?: React.ReactNode;
}) {
  return (
    <header className="w-full h-12 flex-none bg-primary text-primary-content flex items-center px-2 md:px-4 py-2 gap-0 md:gap-2 shadow-lg z-10">
      <div className="flex-none pr-2 md:pr-0">
        <label
          className="btn btn-sm btn-ghost"
          htmlFor={DRAWER_TOGGLE_INPUT_ID}
        >
          <Menu size={24} />
        </label>
      </div>
      <div className="flex-1">{title}</div>
      {menu}
      {!user && (
        <div className="flex-none">
          <Link to={R["/users/signin"]} className="btn btn-sm btn-ghost">
            <LogIn data-test="login-icon" />
          </Link>
        </div>
      )}
      {user && (
        <div className="flex-none">
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
            floating={({ open, setOpen, props }) => (
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
                <ul className="menu rounded p-3 shadow w-48 bg-base-100 text-base-content text-sm">
                  <li>
                    <Link to={R["/users/me"]} onClick={() => setOpen(false)}>
                      <Settings />
                      Account
                    </Link>
                  </li>
                  <Form
                    method="post"
                    action={R["/users/signout"]}
                    data-test="signout-form"
                    onClick={() => setOpen(false)}
                  >
                    <li>
                      <button type="submit" className="flex gap-3">
                        <LogOut />
                        Sign out
                      </button>
                    </li>
                  </Form>
                </ul>
              </Transition>
            )}
          />
        </div>
      )}
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
    icon: Home,
    title: "Examples",
    requireSignin: false,
  },
  {
    to: R["/videos"],
    icon: Video,
    title: "Your Videos",
    requireSignin: true,
  },
  {
    to: R["/bookmarks"],
    icon: Bookmark,
    title: "Bookmarks",
    requireSignin: true,
  },
  {
    to: R["/decks"],
    icon: BookOpen,
    title: "Practice",
    requireSignin: true,
  },
];

function SideMenuDrawerWrapper({
  isSignedIn,
  children,
}: React.PropsWithChildren<{ isSignedIn: boolean }>) {
  // TODO: initial render shows open drawer?
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
          <li className="disabled block">
            <SearchComponent />
          </li>
          {SIDE_MENU_ENTRIES.map((entry) => {
            const disabled = entry.requireSignin && !isSignedIn;
            return (
              <li
                key={entry.to}
                className={`${disabled && "disabled"}`}
                title={disabled ? "Signin required" : undefined}
              >
                <Link
                  to={entry.to}
                  onClick={() => toggleDrawer(false)}
                  // workaround to refresh root loader for flush message
                  reloadDocument={disabled}
                >
                  <entry.icon size={28} className="pr-2" />
                  {entry.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SearchComponent() {
  return (
    <Form
      className="w-full"
      action={R["/videos/new"]}
      method="get"
      onSubmit={() => toggleDrawer(false)}
      data-test="search-form"
    >
      <label className="w-full relative text-base-content flex items-center">
        <Search size={26} className="absolute text-gray-400 pl-2" />
        <input
          type="text"
          name="videoId"
          className="w-full input input-sm input-bordered pl-8"
          placeholder="Enter Video ID or URL"
          required
        />
      </label>
    </Form>
  );
}
