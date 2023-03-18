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
          toast(message.content, {
            icon: <img src={RI_INFORMATION_LINE_ICON} />,
          });
        }
      }
    }
  }, [flashMessages]);
}

// https://remixicon.com/
const RI_INFORMATION_LINE_ICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM11 7h2v2h-2V7zm0 4h2v6h-2v-6z'/%3E%3C/svg%3E`;
