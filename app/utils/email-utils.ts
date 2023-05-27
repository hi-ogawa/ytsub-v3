type Email = any;

declare let globalThis: {
  debugEmail: Email[];
};

export const debugEmails = (globalThis.debugEmail ??= []);

export async function sendEmail(email: Email) {
  if (process.env.NODE_ENV !== "production") {
    debugEmails.push(email);
  }
}
