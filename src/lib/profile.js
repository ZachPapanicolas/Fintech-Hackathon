const PROFILE_KEY = "counsel_user_profile";
const NOTES_KEY = "counsel_user_notes";

export function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveProfile(updates) {
  const current = getProfile();
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...current, ...updates }));
}

export function addNotes(newNotes) {
  if (!newNotes || newNotes.length === 0) return;
  const existing = getNotes();
  const combined = [...existing, ...newNotes].slice(-40); // keep last 40 notes
  localStorage.setItem(NOTES_KEY, JSON.stringify(combined));
}

export function buildProfileContext(profile, notes = []) {
  const hasProfile = profile && Object.keys(profile).length > 0;
  const hasNotes = notes && notes.length > 0;
  if (!hasProfile && !hasNotes) return "";

  const { name, onboarded, ...facts } = profile;
  const firstName = name || "this person";

  let context = `\n\nYou genuinely know and care about ${firstName}. Here's everything you know about them — treat this like your mental model of a close friend, not a data file. Reference it naturally, not robotically.\n`;

  if (Object.keys(facts).length > 0) {
    context += `\nWhat you know about their finances and life:\n`;
    context += Object.entries(facts)
      .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`)
      .join("\n");
  }

  if (hasNotes) {
    context += `\n\nThings you've picked up from your conversations:\n`;
    context += notes.map((n) => `- ${n}`).join("\n");
  }

  context += `\n\nUse ${firstName}'s name naturally. If something they say connects to what you know about them, acknowledge it — like a friend who was paying attention. If they tell you something new, incorporate it. Never ask something you already know.`;

  return context;
}
