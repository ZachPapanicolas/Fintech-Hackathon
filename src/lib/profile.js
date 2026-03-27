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
  const lines = Object.entries(profile)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `\n\nHere's what you already know about this user from previous conversations:\n${lines}\nUse this to give more personalized, relevant responses. If you learn anything new about them (income, debt, goals, situation), remember it matters.`;
}

export function profileExtractionPrompt(messages) {
  const convo = messages
    .map((m) => `${m.role === "user" ? "User" : "Counselor"}: ${m.content}`)
    .join("\n");

  return `From this conversation, extract any personal financial details the user shared. Return a flat JSON object with keys like "name", "income", "monthly_expenses", "debt", "savings", "financial_goals", "job", "age", or any other relevant facts. Only include keys where the user actually shared info. If nothing new was shared, return {}.\n\nConversation:\n${convo}\n\nJSON only, no explanation.`;
}
