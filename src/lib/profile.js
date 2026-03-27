const PROFILE_KEY = "counsel_user_profile";

export function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProfile(updates) {
  const current = getProfile();
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...current, ...updates }));
}

export function buildProfileContext(profile) {
  if (!profile || Object.keys(profile).length === 0) return "";

  const { name, onboarded, ...facts } = profile;
  const firstName = name || "this person";

  const lines = Object.entries(facts)
    .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`)
    .join("\n");

  return `

IMPORTANT — You are talking to your friend ${firstName}. You know them well. Here is everything you know about them:
${name ? `- name: ${name}` : ""}
${lines}

You care about ${firstName} genuinely. Use their name naturally. Reference what you know about their situation without being weird about it — like a friend who remembers, not a robot reading a file. Never ask them something you already know the answer to. If something has changed or they share something new, update your understanding. Their goals, stress, and situation matter to you.`;
}
