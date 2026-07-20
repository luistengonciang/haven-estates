export default function Table({ children }) {
  return (
    <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full border-collapse text-left text-xs sm:text-sm">{children}</table>
    </div>
  );
}
