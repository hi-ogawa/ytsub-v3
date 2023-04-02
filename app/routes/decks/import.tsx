import { tinyassert } from "@hiogawa/utils";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { R } from "../../misc/routes";
import { importDeckJson } from "../../misc/seed-utils";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Import Deck",
};

//
// action
//

export const action = makeLoader(Controller, async function () {
  const user = await this.requireUser();
  const data = JSON.parse(await this.request.text());
  await importDeckJson(user.id, data);
  return null;
});

//
// component
//

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
  const form = useForm<{ fileList?: FileList }>();
  const navigate = useNavigate();

  const mutation = useMutation(
    async () => {
      const { fileList } = form.getValues();
      const file = fileList?.[0];
      tinyassert(file);
      const res = await fetch(R["/decks/import"], {
        method: "POST",
        body: file,
      });
      tinyassert(res.ok);
    },
    {
      onSuccess: () => {
        toast.success("Deck imported successfully!");
        navigate(R["/decks"]);
      },
      onError: () => {
        toast.error("Failed to import a deck");
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
        <input
          type="file"
          accept="application/json"
          {...form.register("fileList", { required: true })}
        />
      </label>
      <button
        className={cls(
          "antd-btn antd-btn-primary p-1 flex justify-center items-center",
          mutation.isLoading && "antd-btn-loading"
        )}
        disabled={!form.formState.isValid || mutation.isLoading}
      >
        Import
      </button>
    </form>
  );
}
