/** Turn an HTTP status (or a network failure) into StatusScreen props. */
export function describeLoadError(status, what = 'this page') {
  if (status === 401) return { kind: 'auth', title: 'Please sign in again', message: `Your session has ended, so we couldn’t load ${what}. Sign in to pick up where you left off.` }
  if (status === 403) return { kind: 'forbidden', title: 'You don’t have access', message: `This account can’t open ${what}. If you think that’s wrong, contact the school office.` }
  if (status === 404) return { kind: 'notfound', title: 'We couldn’t find your record', message: `There’s no ${what} for this account yet. Please contact the school office.` }
  if (!status) return { kind: 'network', title: 'Can’t reach the server', message: 'Check your internet connection, then try again.' }
  return { kind: 'server', title: 'Something went wrong', message: `We couldn’t load ${what} right now. Please try again in a moment.` }
}
