import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { tinyassert } from "@hiogawa/utils";
import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { R } from "../../misc/routes";
import { rpcClient } from "../../trpc/client";
import { cls, none } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { toast } from "../../utils/toast-utils";

export const handle: PageHandle = {
  navBarTitle: () => "Import Deck",
};

export default function DefaultComponent() {
  return (
    <div className="w-full flex justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center border p-6">
        <FormComponent />
      </div>
    </div>
  );
}

function FormComponent() {
  const form = useTinyForm({ file: none<File>() });
  const navigate = useNavigate();

  const mutation = useMutation(
    async () => {
      const file = form.data.file;
      tinyassert(file);
      const data = await file.text();
      await rpcClient.decks_import({ data });
    },
    {
      onSuccess: () => {
        toast.success("Deck imported successfully!");
        navigate(R["/decks"]);
      },
    }
  );

  return (
    <form
      className="w-full flex flex-col gap-4 relative"
      onSubmit={form.handleSubmit(() => mutation.mutate())}
    >
      <div className="text-lg">Import Deck</div>
      <label className="flex flex-col gap-1">
        <span className="text-colorTextSecondary">File</span>
        <input
          type="file"
          accept="application/json"
          required
          onChange={(e) => {
            form.fields.file.onChange(e.target.files?.item(0) ?? undefined);
          }}
        />
      </label>
      <button
        className={cls(
          "antd-btn antd-btn-primary p-1 flex justify-center items-center",
          mutation.isLoading && "antd-btn-loading"
        )}
        disabled={mutation.isLoading || mutation.isSuccess}
      >
        Import
      </button>
    </form>
  );
}
