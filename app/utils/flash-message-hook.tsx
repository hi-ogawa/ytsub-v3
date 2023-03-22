import React from "react";
import { toast } from "react-hot-toast";
import type { FlashMessage } from "./flash-message";

export function useFlashMessages(flashMessages: FlashMessage[]) {
  React.useEffect(() => {
    for (const message of flashMessages) {
      switch (message.variant) {
        case "success": {
          toast.success(message.content);
          break;
        }
        case "error": {
          toast.error(message.content);
          break;
        }
        default: {
          toastInfo(message.content);
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
