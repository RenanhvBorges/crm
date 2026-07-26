import { ChangePasswordForm } from "./change-password-form";

export default function SecuritySettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl">Segurança</h1>
      <p className="mb-6 text-sm text-fg-3">Trocar a senha da sua conta.</p>

      <div className="rounded-lg border border-border-1 bg-oxford-white p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
