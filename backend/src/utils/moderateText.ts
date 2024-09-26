import { config } from '../config';

export const moderateText = async (text: string): Promise<string | null> => {
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
      }),
      method: 'POST',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const isFlagged = data.results[0].flagged;

    if (isFlagged) {
      return null;
    }

    return text;
  } catch (error) {
    console.log(error);
    return null;
  }
};
