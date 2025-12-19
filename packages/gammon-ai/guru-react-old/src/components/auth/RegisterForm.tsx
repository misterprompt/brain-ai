import { useState, type FormEvent } from 'react';
import { apiClient, type RegisterPayload } from '../../api/client';

export type RegisterFormProps = {
  onRegistered?: () => void;
};

export function RegisterForm({ onRegistered }: RegisterFormProps) {
  const [form, setForm] = useState<RegisterPayload>({ email: '', password: '', username: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof RegisterPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }));
  };

  const validate = (): string | null => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Veuillez saisir une adresse email valide.';
    }
    if (!form.password || form.password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      // Le backend attend { name, email, password }
      const payloadForApi = {
        name: form.username && form.username.trim().length > 0 ? form.username : form.email,
        email: form.email,
        password: form.password
      };

      const response = await apiClient.register<{ success?: boolean; data?: { token?: string; accessToken?: string } }>(
        payloadForApi as any
      );

      const anyResp = response as any;
      const token = anyResp?.data?.token ?? anyResp?.data?.accessToken ?? anyResp?.token;

      if (token && typeof token === 'string') {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem('authToken', token);
        }
      }

      if (onRegistered) {
        onRegistered();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de l'inscription.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Inscription</h2>

      {error && <div className="auth-error">{error}</div>}

      <div className="auth-field">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          autoComplete="email"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-username">Nom d'utilisateur (optionnel)</label>
        <input
          id="register-username"
          type="text"
          value={form.username ?? ''}
          onChange={handleChange('username')}
          autoComplete="username"
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-password">Mot de passe</label>
        <input
          id="register-password"
          type="password"
          value={form.password}
          onChange={handleChange('password')}
          autoComplete="new-password"
          required
        />
      </div>

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Création du compte…" : "S'inscrire"}
      </button>
    </form>
  );
}
