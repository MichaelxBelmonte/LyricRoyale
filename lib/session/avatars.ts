// Player avatars — emoji chosen on the join screen and shown on the host roster,
// the scoreboard, and the player's own controller.
export const PLAYER_AVATARS = ["🎤", "🔥", "👾", "🤖", "⚡", "🦄", "💀", "🌈", "🎧", "🐙", "🍕", "👑"];

// Deterministic fallback so a player who skips the picker still gets a distinct
// avatar based on join order.
export function avatarForIndex(index: number): string {
  const size = PLAYER_AVATARS.length;
  return PLAYER_AVATARS[((index % size) + size) % size];
}

export function isPlayerAvatar(value: string | undefined): value is string {
  return typeof value === "string" && PLAYER_AVATARS.includes(value);
}
