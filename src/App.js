import { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greeting = useMemo(() => greetingForHour(now.getHours()), [now]);

  return (
    <main className="intro">
      <div className="intro__ambient" aria-hidden="true">
        <span className="intro__orb intro__orb--a" />
        <span className="intro__orb intro__orb--b" />
        <span className="intro__orb intro__orb--c" />
      </div>

      <div className="intro__panel">
        <p className="intro__eyebrow">Fragments</p>
        <h1 className="intro__title">{greeting}</h1>
        <p className="intro__welcome">
          Welcome. Take a moment — everything you need is right here.
        </p>
        <time className="intro__date" dateTime={now.toISOString()}>
          {formatLongDate(now)}
        </time>
      </div>
    </main>
  );
}

export default App;
