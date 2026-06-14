export const spotifyIntegrationDetails = {
  name: "Spotify",
  description: "Search music and control playback from Autobot chat.",
} as const;

export function getSpotifyIntegrationCallbackUrl(appUrl: string): string {
  return new URL("/api/integrations/spotify/callback", appUrl).toString();
}
