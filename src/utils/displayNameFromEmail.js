export function displayNameFromEmail(email) {
  const local = email.trim().split('@')[0] ?? '';
  if (!local) return 'there';

  const parts = local.split(/[._+\-]+/).filter(Boolean);
  if (parts.length === 0) return 'there';

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
