import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { zip } from "@hiogawa/utils";
import { z } from "zod";
import { useUrlQuerySchema } from "../../utils/loader-utils";
import { cls } from "../../utils/misc";
import { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Typing Practice",
};

export default function Page() {
  const [query, setQuery] = useUrlQuerySchema(
    z.object({
      test: z
        .string()
        .default("")
        .transform((s) => s.trim().split(/\s+/).join(" ")),
    })
  );
  const form = useTinyForm({ test: query.test, answer: "" });

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-2xl flex flex-col">
        <div className="p-6 flex flex-col gap-3">
          <form
            className="w-full flex flex-col gap-5"
            onSubmit={form.handleSubmit(() => {})}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">Reference</div>
              <div className="flex flex-col relative">
                <textarea
                  className="antd-input p-1"
                  value={form.fields.test.value}
                  onChange={(e) => {
                    const value = e.target.value;
                    form.fields.test.onChange(value);
                    setQuery({ test: value }, { replace: true });
                  }}
                />
                {/* use "div" and "span" with same geometry to highlight mismatch over textarea */}
                {/* TODO: how to hande new line? (or filter out new line from test input?) */}
                <div
                  className="absolute pointer-events-none absolute p-1 border border-transparent text-transparent"
                  data-testid="typing-mismatch-overlay"
                >
                  {zip([...form.data.test], [...form.data.answer]).map(
                    ([x, y], i) => (
                      <span
                        key={i}
                        className={cls(
                          x !== y && "border-b-3 border-colorErrorText"
                        )}
                      >
                        {x}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">Practice Input</div>
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
