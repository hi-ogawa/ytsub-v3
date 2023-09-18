import { FloatingTree } from "@floating-ui/react";
import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { Compose } from "@hiogawa/utils-react";
import {
  Link,
  LiveReload,
  NavLink,
  Outlet,
  Scripts,
  ShouldRevalidateFunction,
  useLocation,
  useMatches,
  useNavigate,
  useRouteError,
} from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { toast } from "react-hot-toast";
import { Drawer } from "./components/drawer";
import { PopoverSimple } from "./components/popover";
import { ThemeSelect } from "./components/theme-select";
import { TopProgressBarRemix } from "./components/top-progress-bar";
import { $R, R } from "./misc/routes";
import { rpcClientQuery } from "./trpc/client";
import {
  useCurrentUser,
  useHydrateCurrentUser,
  useSetCurrentUser,
} from "./utils/current-user";
import { useFlashMessageHandler } from "./utils/flash-message";
import { useLoaderDataExtra } from "./utils/loader-utils";
import { cls } from "./utils/misc";
import type { PageHandle } from "./utils/page-handle";
import { QueryClientWrapper } from "./utils/react-query-utils";
import { ToastWrapper, toast2 } from "./utils/toast-utils";

export { loader } from "./root.server";
import { LoaderData } from "./root.server";

// use root loader only for initial `currentUser` hydration (cf. app/utils/current-user.ts)
export const shouldRevalidate: ShouldRevalidateFunction = () => false;

export default function DefaultComponent() {
  return (
    <RootWrapper>
      <Root />
    </RootWrapper>
  );
}

export function ErrorBoundary() {
  return (
    <RootWrapper>
      <ErrorRoot />
    </RootWrapper>
  );
}

function RootWrapper(props: React.PropsWithChildren) {
  return (
    <div className="h-full">
      <TopProgressBarRemix />
      <button
        className="hidden"
        data-testid="toast-remove"
        onClick={() => {
          toast2.removeAll();
        }}
      />
      <Compose
        elements={[<FloatingTree />, <ToastWrapper />, <QueryClientWrapper />]}
      >
        {props.children}
      </Compose>
      <Scripts />
      <LiveReload />
    </div>
  );
}

function Root() {
  const data = useLoaderDataExtra() as LoaderData;
  useHydrateCurrentUser(data.currentUser);
  useFlashMessageHandler();

  // `PageHandle` of the leaf compoment
  const matches = useMatches();
  const handle: PageHandle = matches.at(-1)?.handle ?? {};

  return (
    <>
      <div className="h-full flex flex-col relative z-0">
        <Navbar title={handle.navBarTitle?.()} menu={handle.navBarMenu?.()} />
        <div className="flex-[1_0_0] flex flex-col" data-test="main">
          <div
            className="w-full flex-[1_0_0] h-full overflow-y-auto"
            data-testid="main-scroll"
          >
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}

function ErrorRoot() {
  const error = useRouteError();
  const location = useLocation();

  return (
    <div className="flex flex-col items-center p-4">
      <div className="flex flex-col gap-3 w-full max-w-2xl">
        {location.pathname !== "/" && (
          <div>
            <a href="/" className="antd-btn antd-btn-default px-2 py-1">
              Back to Home
            </a>
          </div>
        )}
        <pre className="text-sm overflow-auto border p-2 text-colorErrorText bg-colorErrorBg border-colorErrorBorder">
          {error instanceof Error
            ? error.stack || error.message
            : JSON.stringify(error, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function Navbar({
  title,
  menu,
}: {
  title?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const user = useCurrentUser();

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
    title: "Videos",
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
  {
    to: R["/caption-editor"],
    icon: <span className="i-ri-closed-captioning-line w-6 h-6" />,
    title: "Caption Editor",
    requireSignin: false,
  },
];

function SearchComponent(props: { closeDrawer: () => void }) {
  const form = useTinyForm({ videoId: "" });
  const navigate = useNavigate();

  return (
    <form
      className="w-full"
      data-test="search-form"
      onSubmit={form.handleSubmit(() => {
        props.closeDrawer();
        navigate($R["/videos/new"](null, form.data));
      })}
    >
      <label className="w-full relative text-base-content flex items-center">
        <span className="absolute text-colorTextSecondary ml-2.5 i-ri-search-line w-4 h-4"></span>
        <input
          type="text"
          className="w-full antd-input p-1 pl-9"
          placeholder="Enter Video ID or URL"
          required
          {...form.fields.videoId.props()}
        />
      </label>
    </form>
  );
}

function SignoutComponent() {
  const setCurrentUser = useSetCurrentUser();
  const navigate = useNavigate();
  const signoutMutation = useMutation({
    ...rpcClientQuery.users_signout.mutationOptions(),
    onSuccess: () => {
      toast2.success("Successfully signed out");
      setCurrentUser();
      navigate($R["/"]());
    },
  });

  return (
    <button
      className="w-full antd-menu-item flex items-center gap-2 p-2"
      onClick={() => signoutMutation.mutate()}
      disabled={signoutMutation.isLoading}
    >
      <span
        className={cls(
          "w-6 h-6",
          signoutMutation.isLoading ? "antd-spin" : "i-ri-logout-box-line"
        )}
      ></span>
      Sign out
    </button>
  );
}
