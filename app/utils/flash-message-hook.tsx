import React from "react";
import { toast } from "react-hot-toast";
import type { FlashMessage } from "./flash-message";

export function useFlashMessages(flashMessages: FlashMessage[]) {
  React.useEffect(() => {
    for (const message of flashMessages) {
      const options = { id: message.content }; // stable toast id for React.StrictMode
      switch (message.variant) {
        case "success": {
          toast.success(message.content, options);
          break;
        }
        case "error": {
          toast.error(message.content, options);
          break;
        }
        default: {
          toastInfo(message.content, options);
        }
      }
    }
  }, [flashMessages]);
}

export function toastInfo(...args: Parameters<typeof toast>) {
  args[1] ??= {};
  args[1].icon = <span className="i-ri-information-line w-5 h-5"></span>;
  toast(...args);
}
