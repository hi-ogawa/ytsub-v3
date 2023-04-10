import type React from "react";

export interface PageHandle {
  navBarTitle?: () => React.ReactNode;
  navBarMenu?: () => React.ReactNode;
}
