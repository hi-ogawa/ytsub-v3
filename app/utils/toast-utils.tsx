import { Toaster, toast } from "react-hot-toast";

export function ToastWrapper(props: React.PropsWithChildren) {
  return (
    <>
      <Toaster
        toastOptions={{
          className: "!bg-colorBgElevated !text-colorText",
        }}
      />
      {props.children}
    </>
  );
}

export function toastInfo(...args: Parameters<typeof toast>) {
  args[1] ??= {};
  args[1].icon = <span className="i-ri-information-line w-5 h-5"></span>;
  toast(...args);
}
