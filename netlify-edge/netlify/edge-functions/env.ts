export default function () {
  // @ts-ignore
  return new Response(JSON.stringify(Deno.env.toObject(), null, 2));
}
