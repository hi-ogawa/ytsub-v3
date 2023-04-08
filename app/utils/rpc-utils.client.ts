import type { z } from "zod";

// quick and dirty tRPC style api loader/action (cf. https://trpc.io/docs/server/procedures)

function defineQueryHandler<InputSchema extends z.ZodType<unknown>, Output>(
  inputSchema: InputSchema, handler: (args: { input: z.infer<InputSchema>, controller: Controller }) => Output
) {
  const loader = async (...args: Parameters<LoaderFunction>) => {
    const controller = await Controller.create(...args);
    const inputRaw = await controller.request.json();
    const input = inputSchema.parse(inputRaw);
    // TODO: serialize
    const output = await handler({ input, controller });
    return output;
  };
  return loader as any as { __input: z.infer<InputSchema>, __output: Awaited<Output> };
}
