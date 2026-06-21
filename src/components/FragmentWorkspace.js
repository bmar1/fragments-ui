import { useState, useEffect, useCallback } from 'react';
import { createFragment, getUserFragments, FRAGMENT_TYPES } from '../api';
import './FragmentWorkspace.css';

function validateContent(contentType, content) {
  if (!content.trim()) {
    return 'Enter some content for your fragment.';
  }
  if (contentType === 'application/json') {
    try {
      JSON.parse(content);
    } catch {
      return 'Content must be valid JSON for application/json fragments.';
    }
  }
  return null;
}

function formatFragmentRow(fragment) {
  if (typeof fragment === 'string') {
    return { id: fragment, type: '—', size: '—', updated: '—' };
  }
  return {
    id: fragment.id,
    type: fragment.type || '—',
    size: fragment.size ?? '—',
    updated: fragment.updated || fragment.created || '—',
  };
}

/**
 * Manual test UI: create fragments and list metadata from the API.
 */
export default function FragmentWorkspace({ user }) {
  const [contentType, setContentType] = useState('text/plain');
  const [content, setContent] = useState('');
  const [fragments, setFragments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastCreated, setLastCreated] = useState(null);

  const refreshList = useCallback(async () => {
    setListBusy(true);
    setError(null);
    try {
      const result = await getUserFragments(user);
      setFragments(result.fragments || []);
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
    const validationError = validateContent(contentType, content);
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    setLastCreated(null);

    try {
      const result = await createFragment(user, contentType, content);
      setLastCreated(result);
      setContent('');
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create fragment.');
    } finally {
      setBusy(false);
    }
  }

  const rows = fragments.map(formatFragmentRow);

  return (
    <section className="workspace" aria-labelledby="workspace-heading">
      <h2 id="workspace-heading" className="workspace__title">
        Your fragments
      </h2>
      <p className="workspace__hint">
        Create a fragment by choosing a type and entering content. Supports{' '}
        <code className="workspace__code">text/*</code> and{' '}
        <code className="workspace__code">application/json</code>.
      </p>

      {error ? (
        <p className="workspace__error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="workspace__form" onSubmit={handleCreate}>
        <label className="workspace__label" htmlFor="fragment-type">
          Fragment type
        </label>
        <select
          id="fragment-type"
          className="workspace__select"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          disabled={busy}
        >
          {FRAGMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <label className="workspace__label" htmlFor="fragment-content">
          Fragment content
        </label>
        <textarea
          id="fragment-content"
          className="workspace__textarea"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            contentType === 'application/json'
              ? '{"message": "hello"}'
              : 'Type something to store as a fragment…'
          }
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
        <h3 className="workspace__list-title">Your fragments (metadata)</h3>
        {rows.length === 0 ? (
          <p className="workspace__empty">No fragments yet — create one above.</p>
        ) : (
          <table className="workspace__table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Type</th>
                <th scope="col">Size</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code className="workspace__code">{row.id}</code>
                  </td>
                  <td>{row.type}</td>
                  <td>{row.size}</td>
                  <td>{row.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
