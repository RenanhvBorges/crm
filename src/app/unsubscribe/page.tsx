import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { confirmUnsubscribe } from "./actions";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ rid?: string; t?: string; done?: string }>;
}) {
  const { rid, t, done } = await searchParams;
  const valid = !!rid && !!t && verifyUnsubscribeToken(rid, t);

  return (
    <main className="flex min-h-screen items-center justify-center bg-oxford-blue px-4">
      <div className="w-full max-w-sm rounded-lg bg-oxford-white p-8 text-center shadow-lg">
        {!valid ? (
          <>
            <h1 className="mb-2 text-xl">Link inválido</h1>
            <p className="text-sm text-fg-3">
              Este link de descadastro não é válido ou já expirou.
            </p>
          </>
        ) : done === "1" ? (
          <>
            <h1 className="mb-2 text-xl">Descadastro confirmado</h1>
            <p className="text-sm text-fg-3">
              Você não vai mais receber e-mails de marketing da Oxford.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl">Cancelar inscrição</h1>
            <p className="mb-6 text-sm text-fg-3">
              Tem certeza que deseja parar de receber e-mails de marketing da Oxford?
            </p>
            <form action={confirmUnsubscribe}>
              <input type="hidden" name="rid" value={rid} />
              <input type="hidden" name="t" value={t} />
              <button
                type="submit"
                className="w-full rounded-md bg-oxford-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-oxford-blue-600"
              >
                Cancelar inscrição
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
