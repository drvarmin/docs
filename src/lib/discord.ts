export interface DiscordInfo {
  id: string;
  name: string;
  instant_invite: string;
  presence_count: number;
}

export async function getDiscordInfo(): Promise<DiscordInfo | null> {
  try {
    const url = "https://discord.com/api/guilds/1342529924027645962/widget.json";
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Failed to fetch Discord info:', response.status);
      return null;
    }
    
    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      instant_invite: data.instant_invite,
      presence_count: data.presence_count,
    };
  } catch (error) {
    console.error('Error fetching Discord info:', error);
    return null;
  }
}