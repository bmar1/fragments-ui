import './Login.css';

export default function SignedInPanel({
  username,
  email,
  onContinue,
  onSignOut,
}) {
  return (
    <section className="login" aria-labelledby="signed-in-heading">
      <h2 id="signed-in-heading" className="login__title">
        Welcome back
      </h2>
      <p className="login__hint">
        Hello again, <strong className="login__username">{username}</strong>.
        You are signed in as{' '}
        <span className="login__email">{email}</span> — continue whenever you
        are ready; your workspace is waiting.
      </p>

      <div className="login__actions">
        <button type="button" className="login__submit" onClick={onContinue}>
          Continue
        </button>
        <button type="button" className="login__signout" onClick={onSignOut}>
          Logout
        </button>
      </div>
    </section>
  );
}
