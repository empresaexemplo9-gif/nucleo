import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <p className="text-5xl font-bold text-brand">404</p>
      <p className="mt-2 font-medium">Registro não encontrado</p>
      <p className="text-sm text-muted">Ele pode ter sido excluído ou você não tem acesso.</p>
      <Link href="/" className="mt-4 text-sm font-medium text-brand hover:underline">Voltar ao painel</Link>
    </div>
  );
}
