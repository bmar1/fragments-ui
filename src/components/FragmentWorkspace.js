import { useState, useEffect, useCallback } from 'react';
import { createFragment, getUserFragments } from '../api';
import './FragmentWorkspace.css';

/**
 * Manual test UI: create text/plain fragments and list IDs from the API.
 */
export default function FragmentWorkspace({ user }) {
  const [text, setText] = useState('');
  const [fragmentIds, setFragmentIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastCreated, setLastCreated] = useState(null);

  const refreshList = useCallback(async () => {
    setListBusy(true);
    setError(null);
    try {
      const result = await getUserFragments(user);
      setFragmentIds(result.fragments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load fragments.');
    } finally {
      setListBusy(false);
    }
  }, [user]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  async function handleCreate(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Enter some text for your fragment.');
      return;
    }

    setBusy(true);
    setError(null);
    setLastCreated(null);

    try {
      const result = await createFragment(user, trimmed);
      setLastCreated(result);
      setText('');
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create fragment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace" aria-labelledby="workspace-heading">
      <h2 id="workspace-heading" className="workspace__title">
        Your fragments
      </h2>
      <p className="workspace__hint">
        Create a <code className="workspace__code">text/plain</code> fragment. It is
        sent to the API with your Cognito identity token.
      </p>

      {error ? (
        <p className="workspace__error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="workspace__form" onSubmit={handleCreate}>
        <label className="workspace__label" htmlFor="fragment-text">
          Fragment text
        </label>
        <textarea
          id="fragment-text"
          className="workspace__textarea"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something to store as a fragment…"
          disabled={busy}
        />
        <div className="workspace__actions">
          <button type="submit" className="login__submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create fragment'}
          </button>
          <button
            type="button"
            className="login__signout"
            onClick={refreshList}
            disabled={listBusy || busy}
          >
            {listBusy ? 'Refreshing…' : 'Refresh list'}
          </button>
        </div>
      </form>

      {lastCreated ? (
        <div className="workspace__result">
          <p className="workspace__result-title">Last create response</p>
          {lastCreated.location ? (
            <p className="workspace__meta">
              <span className="workspace__meta-label">Location</span>
              <code className="workspace__code workspace__code--block">
                {lastCreated.location}
              </code>
            </p>
          ) : null}
          <pre className="workspace__json">
            {JSON.stringify(lastCreated.data, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="workspace__list">
        <h3 className="workspace__list-title">Fragment IDs</h3>
        {fragmentIds.length === 0 ? (
          <p className="workspace__empty">No fragments yet — create one above.</p>
        ) : (
          <ul className="workspace__ids">
            {fragmentIds.map((id) => (
              <li key={id}>
                <code className="workspace__code">{id}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
