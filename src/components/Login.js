import { useState } from 'react';
import { signIn } from '../utils/auth';
import './Login.css';

export default function Login({
  remoteOAuthError,
  onDismissRemoteOAuthError,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    setError(null);
    onDismissRemoteOAuthError?.();
    setBusy(true);
    try {
      await signIn();
    } catch (err) {
      console.error('[Fragments] Login redirect failed', err);
      setError(
        err instanceof Error ? err.message : 'Could not start sign-in. Check .env and Console.'
      );
      setBusy(false);
    }
  }

  return (
    <section className="login" aria-labelledby="login-heading">
      <h2 id="login-heading" className="login__title">
        Sign in
      </h2>
      <p className="login__hint">
        Sign in with your Cognito user. You will be redirected to the Hosted UI — use{' '}
        <strong>Sign up</strong> there to create a test account and verify your email.
      </p>

      {remoteOAuthError ? (
        <p className="login__error" role="alert">
          Cognito: {remoteOAuthError}. Check scopes on your app client match{' '}
          <code className="login__code">REACT_APP_COGNITO_SCOPE</code>, or try{' '}
          <code className="login__code">openid email</code>.
        </p>
      ) : null}

      {error ? (
        <p className="login__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="login__actions">
        <button
          type="button"
          className="login__submit"
          onClick={handleLogin}
          disabled={busy}
        >
          {busy ? 'Redirecting…' : 'Login'}
        </button>
      </div>
    </section>
  );
}
