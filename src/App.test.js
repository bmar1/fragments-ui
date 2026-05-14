jest.mock('./utils/auth', () => ({
  getSession: jest.fn(() => Promise.resolve({ user: null })),
  signIn: jest.fn(() => Promise.resolve()),
  signOut: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('./api', () => ({
  getUserFragments: jest.fn(() =>
    Promise.resolve({ status: 'ok', fragments: [] })
  ),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { getUserFragments } from './api';
import { getSession, signIn, signOut } from './utils/auth';

beforeEach(() => {
  getSession.mockResolvedValue({ user: null });
  signIn.mockResolvedValue(undefined);
  signOut.mockResolvedValue(false);
  getUserFragments.mockResolvedValue({ status: 'ok', fragments: [] });
});

test('renders welcome intro after auth check', async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument();
  });

  expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  expect(screen.getByText('Fragments')).toBeInTheDocument();
});

test('renders Cognito login button when signed out', async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
});

test('Login triggers Hosted UI redirect', async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  expect(signIn).toHaveBeenCalled();
});

test('greets by username when Cognito session exists', async () => {
  getSession.mockResolvedValue({
    user: {
      username: 'Bilal Umar',
      email: 'bilal@example.com',
      idToken: 'header.payload.sig',
      accessToken: 'header.payload.sig',
      authorizationHeaders: () => ({}),
    },
  });

  render(<App />);

  await waitFor(() => {
    const headline = screen.getByRole('heading', { level: 1 });
    expect(headline.textContent).toMatch(
      /^Good (morning|afternoon|evening), Bilal Umar$/
    );
  });

  expect(screen.getByText(/hello again/i)).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: /sign in/i })
  ).not.toBeInTheDocument();
});

test('logout calls signOut', async () => {
  getSession.mockResolvedValue({
    user: {
      username: 'Alex',
      email: 'alex@example.com',
      idToken: 'a',
      accessToken: 'b',
      authorizationHeaders: () => ({}),
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^logout$/i })).toBeInTheDocument();
  });

  await userEvent.click(screen.getByRole('button', { name: /^logout$/i }));
  expect(signOut).toHaveBeenCalled();
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });
});
