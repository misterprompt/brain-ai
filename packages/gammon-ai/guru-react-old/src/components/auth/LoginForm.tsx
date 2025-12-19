import { useState, type FormEvent } from 'react';
import { apiClient, type LoginPayload } from '../../api/client';

export type LoginFormProps = {
  onAuthenticated?: () => void;
};

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [form, setForm] = useState<LoginPayload>({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof LoginPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
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
      const response = await apiClient.login<{ success?: boolean; data?: { token?: string; accessToken?: string } }>(form);
      const anyResp = response as any;
      const token = anyResp?.data?.token ?? anyResp?.data?.accessToken ?? anyResp?.token;

      if (!token || typeof token !== 'string') {
        throw new Error('Réponse de connexion invalide (token manquant).');
      }

      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('authToken', token);
      }

      if (onAuthenticated) {
        onAuthenticated();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de la connexion.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Connexion</h2>

      {error && <div className="auth-error">{error}</div>}

      <div className="auth-field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          autoComplete="email"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Mot de passe</label>
        <input
          id="login-password"
          type="password"
          value={form.password}
          onChange={handleChange('password')}
          autoComplete="current-password"
          required
        />
      </div>

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
