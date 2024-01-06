import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { z } from "zod";
import { useUrlQuerySchema } from "../../utils/loader-utils";
import { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Typing Practice",
};

// TODO: highlight diff to spot wrong input (cannot use textare)
// TODO: settings to filter out by language?

export default function Page() {
  // http://localhost:3000/typing?input=%EB%A1%9C%EB%A7%A8%ED%8B%B1%ED%95%9C%20psycho%20%EB%82%A0%20%ED%83%90%ED%95%98%EB%A9%B4%20%EB%AA%A8%EB%93%A0%20%EA%B1%B8%20%EA%B2%AC%EB%8E%8C%EC%95%BC%EC%A7%80
  const [query] = useUrlQuerySchema(
    z.object({ input: z.string().default("") })
  );
  const form = useTinyForm({ test: query.input, answer: "" });

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-2xl flex flex-col">
        <div className="p-6 flex flex-col gap-3">
          <form
            className="w-full flex flex-col gap-4"
            onSubmit={form.handleSubmit(() => {})}
          >
            <label className="flex flex-col gap-1">
              <span className="text-colorTextLabel">Test</span>
              <textarea
                className="antd-input p-1"
                {...form.fields.test.props()}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-colorTextLabel">Answer</span>
              <textarea
                className="antd-input p-1"
                {...form.fields.answer.props()}
              />
            </label>
          </form>
        </div>
      </div>
    </div>
  );
}
