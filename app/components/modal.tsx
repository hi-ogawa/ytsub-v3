import { Transition } from "@headlessui/react";
import * as React from "react";

interface ModalContext {
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;
}

const DefaultModalContext = React.createContext<ModalContext | undefined>(
  undefined
);

export function useModal(): ModalContext {
  const value = React.useContext(DefaultModalContext);
  if (!value) throw new Error("ModalContext undefined");
  return value;
}

type ModalState = "OPEN" | "CLOSING" | "CLOSED";

export const ModalProvider: React.FC = ({ children }) => {
  const [content, setContent] = React.useState<React.ReactNode>();
  const [state, setState] = React.useState<ModalState>("CLOSED");

  function openModal(content: React.ReactNode) {
    setContent(content);
    setState("OPEN");
  }

  function closeModal() {
    setState("CLOSING");
  }

  function closeModalFinal() {
    setContent(undefined);
    setState("CLOSED");
  }

  return (
    <DefaultModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <Transition appear show={state === "OPEN"}>
        <div className="absolute inset-0 z-50 flex justify-center items-center">
          <Transition.Child
            className="transition duration-300 absolute inset-0 z-[-1]"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="absolute inset-0 bg-black/[0.3]"
              onClick={closeModal}
            />
          </Transition.Child>
          <Transition.Child
            className="w-full max-w-xl" // TODO: options for `openModal`
            enter="transition duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition duration-300"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
            afterLeave={closeModalFinal}
          >
            {content}
          </Transition.Child>
        </div>
      </Transition>
    </DefaultModalContext.Provider>
  );
};
