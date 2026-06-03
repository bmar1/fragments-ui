import { useEffect } from 'react';
import FragmentWorkspace from './FragmentWorkspace';
import { getFragmentsApiUrl } from '../api';
import './Login.css';

export default function SignedInPanel({ username, email, user, onSignOut }) {
  useEffect(() => {
    // Helpful when pointing the UI at EC2 vs localhost
    console.info('[Fragments] API base URL:', getFragmentsApiUrl());
  }, []);

  return (
    <div className="signed-in">
      <section className="login" aria-labelledby="signed-in-heading">
        <h2 id="signed-in-heading" className="login__title">
          Welcome back
        </h2>
        <p className="login__hint">
          Hello again, <strong className="login__username">{username}</strong>.
          {email ? (
            <>
              {' '}
              You are signed in as <span className="login__email">{email}</span>.
            </>
          ) : null}
        </p>

        <div className="login__actions">
          <button type="button" className="login__signout" onClick={onSignOut}>
            Logout
          </button>
        </div>
      </section>

      <FragmentWorkspace user={user} />
    </div>
  );
}
