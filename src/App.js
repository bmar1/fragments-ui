import { useState, useEffect, useMemo, useCallback } from 'react';
import Login from './components/Login';
import SignedInPanel from './components/SignedInPanel';
import { getSession, signOut } from './utils/auth';
import './App.css';

function formatLongDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function App() {
  const [now, setNow] = useState(() => new Date());
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [oauthBootError, setOauthBootError] = useState(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { user, oauthError } = await getSession();

        if (oauthError) {
          setOauthBootError(
            oauthError.description ||
              oauthError.error ||
              'Sign-in was rejected by Cognito.'
          );
        } else {
          setOauthBootError(null);
        }

        if (cancelled || !user) return;
        console.info(
          '[Fragments] Signed-in user — inspect idToken / accessToken (paste into jwt.io)',
          user
        );
        setSession(user);
      } catch (err) {
        console.error('[Fragments] Auth bootstrap failed', err);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = useMemo(() => greetingForHour(now.getHours()), [now]);

  const handleSignOut = useCallback(async () => {
    try {
      const redirected = await signOut();
      if (!redirected) setSession(null);
    } catch (err) {
      console.error('[Fragments] Logout failed', err);
      setSession(null);
    }
  }, []);

  const handleContinue = useCallback(() => {
    /* Hook for navigation into the main app */
  }, []);

  const headline = session ? `${greeting}, ${session.username}` : greeting;

  if (!authReady) {
    return (
      <main className="intro intro--boot">
        <div className="intro__ambient" aria-hidden="true">
          <span className="intro__orb intro__orb--a" />
          <span className="intro__orb intro__orb--b" />
          <span className="intro__orb intro__orb--c" />
        </div>
        <p className="intro__boot">Checking session…</p>
      </main>
    );
  }

  return (
    <main className="intro">
      <div className="intro__ambient" aria-hidden="true">
        <span className="intro__orb intro__orb--a" />
        <span className="intro__orb intro__orb--b" />
        <span className="intro__orb intro__orb--c" />
      </div>

      <div className="intro__layout">
        <div className="intro__panel">
          <p className="intro__eyebrow">Fragments</p>
          <h1 className="intro__title">{headline}</h1>
          <p className="intro__welcome">
            {session ? (
              <>
                Glad you are here — everything you need is ready. Continue on the
                right when you want to move forward.
              </>
            ) : (
              <>
                Welcome. Take a moment — everything you need is right here.
              </>
            )}
          </p>
          <time className="intro__date" dateTime={now.toISOString()}>
            {formatLongDate(now)}
          </time>
        </div>
        {session ? (
          <SignedInPanel
            username={session.username}
            email={session.email}
            onContinue={handleContinue}
            onSignOut={handleSignOut}
          />
        ) : (
          <Login
            remoteOAuthError={oauthBootError}
            onDismissRemoteOAuthError={() => setOauthBootError(null)}
          />
        )}
      </div>
    </main>
  );
}

export default App;
