import { tinyassert } from "@hiogawa/utils";
import type { SendEmailV3_1 } from "node-mailjet";
import { z } from "zod";
import { serverConfig } from "./config";

// we only borrow their typing and fetch it by ourselves
// https://dev.mailjet.com/email/guides/send-api-v31
type Email = SendEmailV3_1.Body;

// previewed in /dev/emails for e2e
export const debugEmails: Email[] = ((globalThis as any).__debugEmails ??= []);

//
// email utils api
//

export async function sendEmail(email: Email) {
  if (process.env.NODE_ENV !== "production") {
    debugEmails.push(email);
  }
  await sendMailjet(email);
}

//
// mailjet client
//

async function sendMailjet(email: Email) {
  const username = serverConfig.MJ_APIKEY_PUBLIC;
  const password = serverConfig.MJ_APIKEY_PRIVATE;
  if (!username || !password) {
    return;
  }
  const res = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    body: JSON.stringify(email),
    headers: {
      "content-type": "application/json",
      authorization:
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
    },
  });
  tinyassert(res.ok);
  const resJson = await res.json();
  const parsed = Z_MAILJET_RESPONSE.parse(resJson);
  tinyassert(parsed.Messages.every((e) => e.Status === "success"));
}

const Z_MAILJET_RESPONSE = z
  .object({
    Messages: z
      .object({
        Status: z.string(),
      })
      .passthrough()
      .array(),
  })
  .passthrough();
