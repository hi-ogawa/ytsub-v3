import React from "react";
import { toast } from "react-hot-toast";
import type { FlashMessage } from "./flash-message";
import { toastInfo } from "./toast-utils";

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
