"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <p className="font-semibold">Algo deu errado</p>
      <p className="mt-1 max-w-md text-sm text-muted">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Tentar novamente</button>
    </div>
  );
}
