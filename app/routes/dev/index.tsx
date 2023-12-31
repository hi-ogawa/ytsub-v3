export default function DevRoute() {
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-xl">Development Info</h1>
        <div className="flex gap-2">
          Commit
          <a
            className="antd-link"
            href="https://github.com/hi-ogawa/ytsub-v3/commit/69978ef6bdc37afc11b931b4b3257ea821853dac"
            target="_blank"
          >
            69978ef
          </a>
        </div>
      </div>
    </div>
  );
}
