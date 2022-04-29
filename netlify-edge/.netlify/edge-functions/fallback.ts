export default function (request: Request) {
  const { pathname } = new URL(request.url);
  if (pathname === "/favicon.ico") {
    return;
  }
  if (pathname === "/hello.html") {
    return;
  }
  const res = {
    name: "fallback",
    url: request.url,
  };
  return new Response(JSON.stringify(res, null, 2));
}
