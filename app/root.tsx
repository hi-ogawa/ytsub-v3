import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
} from "@remix-run/react";
import { LinksFunction, MetaFunction } from "@remix-run/server-runtime";
import * as React from "react";
import { Search } from "react-feather";

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
        <div className="h-full flex flex-col h-full">
          <Navbar />
          <div className="grow flex justify-center items-center">
            <Outlet />
          </div>
        </div>
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

function Navbar() {
  return (
    <header className="w-full h-12 flex-none bg-primary text-primary-content flex items-center px-4 py-2 shadow-lg z-10">
      <div className="flex-1">
        <Link to="/" className="btn btn-sm btn-ghost">
          Home
        </Link>
      </div>
      <div className="flex-none">
        <form action="/setup" method="get">
          <label className="relative text-base-content flex items-center">
            <Search size={26} className="absolute text-gray-400 pl-2" />
            <input
              type="text"
              name="id"
              className="input input-sm input-bordered pl-8"
              placeholder="Enter Video ID"
            />
          </label>
        </form>
      </div>
    </header>
  );
}
