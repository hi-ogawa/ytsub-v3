import * as React from "react";

// TODO
// - Context/Hook based API
// - Stacking Animation

export function Snackbar() {
  return <>hey</>;
}

// Contents
// pass items

// snackbar

// snackbar-item

export function SnackbarContainer() {
  return (
    <div className="snackbar">
      <div className="snackbar-item"></div>
    </div>
  );
}

export type Variant = "default" | "info" | "success" | "warning" | "error";

export function SnackbarItem({
  content,
  variant = "default",
}: {
  content: React.ReactNode;
  variant?: Variant;
}) {
  variant;
  return <div className={`alert shadow-lg`}>{content}</div>;
}
