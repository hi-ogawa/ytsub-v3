import { Dialog } from "@headlessui/react";
import * as React from "react";

export default function DefaultComponent() {
  return (
    <Dialog
      open={true}
      onClose={() => {}}
      className="fixed inset-0 flex justify-center items-center"
    >
      <Dialog.Overlay className="fixed inset-0 bg-black/[0.5]" />
      <div className="bg-white z-10">Hello</div>
    </Dialog>
  );
}
