import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { useEffect } from "react";
import { z } from "zod";
import { useUrlQuerySchema } from "../../utils/loader-utils";
import { cls } from "../../utils/misc";
import { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Typing Practice",
};

// TODO:
// - compute diff with keeping original position information
// - highlight textarea? (wyswyg style something? styleover)

// function computeDiff(x: string, y: string) {
//   // compare by tokens
//   const xs = x.trim().split(/\s+/);
//   const ys = y.trim().split(/\s+/);
// }

export default function Page() {
  // http://localhost:3000/typing?input=%EB%A1%9C%EB%A7%A8%ED%8B%B1%ED%95%9C%20psycho%20%EB%82%A0%20%ED%83%90%ED%95%98%EB%A9%B4%20%EB%AA%A8%EB%93%A0%20%EA%B1%B8%20%EA%B2%AC%EB%8E%8C%EC%95%BC%EC%A7%80
  const [query] = useUrlQuerySchema(
    z.object({ input: z.string().default("") })
  );
  const form = useTinyForm({ editing: false, test: query.input, answer: "" });

  // TODO:
  useEffect(() => {
    // word by
    console.log([form.data.answer]);
    // form.fields.test;
    // form.fields.answer;
  }, [form.data]);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-2xl flex flex-col">
        <div className="p-6 flex flex-col gap-3">
          <form
            className="w-full flex flex-col gap-5"
            onSubmit={form.handleSubmit(() => {})}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span>Test</span>
                <button
                  className={cls(
                    "antd-btn antd-btn-default text-sm px-1",
                    form.data.editing && "text-colorPrimary border-colorPrimary"
                  )}
                  onClick={() => form.fields.editing.onChange((prev) => !prev)}
                >
                  Edit
                </button>
              </div>
              {/* TODO: keep textarea but style over it somehow? */}
              {form.data.editing ? (
                <textarea
                  className="antd-input p-1"
                  {...form.fields.test.props()}
                />
              ) : (
                <div className="border p-1">{form.data.test}</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span>Answer</span>
                <button
                  className="antd-btn antd-btn-default text-sm px-1"
                  onClick={() => {
                    form.fields.answer.onChange("");
                  }}
                >
                  Reset
                </button>
              </div>
              <textarea
                className="antd-input p-1"
                {...form.fields.answer.props()}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
