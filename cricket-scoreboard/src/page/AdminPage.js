
import React, {
  useCallback, useEffect, useRef, useState
} from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

import Navigation from './Navigation';
import Scoreboard from './Scoreboard';
import OdiScoreboard from './OdiScoreboard';
import T20Scoreboard from './T20Scoreboard';
import T10Scoreboard from './T10Scoreboard';
import T5Scoreboard from './T5Scoreboard';

import { GENZ_PLAYERS } from '../genZData';
import { OG_PLAYERS } from '../ogData';

import './LiveScoreboard.css';

function ScoreEditor({ format }) {
  const [initialState, setInitialState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [saveError, setSaveError] = useState('');

  const stateRef = useRef({});
  const dirtyRef = useRef(false);
  const writingRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from('scoreboard_matches')
        .select('state')
        .eq('format', format)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setLoadError(error.message);
        return;
      }

      const saved = data?.state || {};
      stateRef.current = saved;
      setInitialState(saved);
    }

    void load();
    return () => { active = false; };
  }, [format]);

  const saveNow = useCallback(async () => {
    if (writingRef.current) return;

    writingRef.current = true;

    try {
      while (dirtyRef.current) {
        dirtyRef.current = false;
        setSaveStatus('saving');

        const stateToSave = { ...stateRef.current };

        const { error } = await supabase
          .from('scoreboard_matches')
          .upsert({
            format,
            state: stateToSave,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'format' });

        if (error) {
          dirtyRef.current = true;
          setSaveStatus('error');
          setSaveError(error.message);
          return;
        }

        setSaveError('');

        if (!dirtyRef.current) {
          setSaveStatus('saved');
        }
      }
    } finally {
      writingRef.current = false;
    }
  }, [format]);

  const onStateChange = useCallback((key, value) => {
    stateRef.current = {
      ...stateRef.current,
      [key]: value
    };

    dirtyRef.current = true;
    setSaveStatus('pending');

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => void saveNow(), 200
    );
  }, [saveNow]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);

    if (dirtyRef.current) {
      void saveNow();
    }
  }, [saveNow]);

  if (loadError) {
    return <p role="alert">Cannot load scoreboard: {loadError}</p>;
  }

  if (!initialState) {
    return <p className="score-message">Loading editor…</p>;
  }

  const props = { initialState, onStateChange };

  return (
    <>
      <div className="score-admin-status">
        <strong>Admin editor — {format}</strong>

        <span aria-live="polite">
          {saveStatus === 'saving'
            ? 'Saving…'
            : saveStatus === 'pending'
            ? 'Changes pending…'
            : saveStatus === 'error'
            ? 'Save failed'
            : 'All changes saved'}
        </span>

        {saveStatus === 'error' && (
          <>
            <span role="alert">{saveError}</span>
            <button type="button" onClick={() => void saveNow()}>
              Retry save
            </button>
          </>
        )}
      </div>

      {format === 'Test' && (
        <Scoreboard
          {...props}
          genZRoster={GENZ_PLAYERS}
          ogRoster={OG_PLAYERS}
        />
      )}

      {format === 'ODI' && <OdiScoreboard {...props} />}
      {format === 'T20' && <T20Scoreboard {...props} />}
      {format === 'T10' && <T10Scoreboard {...props} />}
      {format === '5 Over' && <T5Scoreboard {...props} />}
    </>
  );
}

export default function AdminPage() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [format, setFormat] = useState('Test');

  useEffect(() => {
    let active = true;

    async function restore() {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!authError && user) {
        const { data, error: roleError } = await supabase
          .from('scoreboard_admins')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (active && !roleError && data) {
          setAdmin(user);
        }
      }

      if (active) setChecking(false);
    }

    void restore();
    return () => { active = false; };
  }, []);

  async function signIn(event) {
    event.preventDefault();

    setBusy(true);
    setError('');

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (loginError) throw loginError;

      const { data: allowed, error: roleError } =
        await supabase
          .from('scoreboard_admins')
          .select('user_id')
          .eq('user_id', data.user.id)
          .maybeSingle();

      if (roleError) throw roleError;

      if (!allowed) {
        await supabase.auth.signOut();
        throw new Error(
          'This account is not authorized to manage scores.'
        );
      }

      setAdmin(data.user);
      setPassword('');
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAdmin(null);
  }

  if (checking) {
    return <p className="score-message">Checking admin access…</p>;
  }

  if (!admin) {
    return (
      <main className="score-login-container">
        <form className="card score-login-card" onSubmit={signIn}>
          <h1>FoxEleven Admin Login</h1>
          <p>Authorized scorers only.</p>

          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="input-field"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="input-field"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="score-error">{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-blue"
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p>
            <Link to="/">View public scoreboards</Link>
          </p>
        </form>
      </main>
    );
  }

  return (
    <>
      <Navigation
        activeFormat={format}
        setActiveFormat={setFormat}
      />

      <div className="score-admin-toolbar">
        <span>Signed in: {admin.email}</span>

        <div>
          <Link to="/">Public scoreboard</Link>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      <ScoreEditor key={format} format={format} />
    </>
  );
}
