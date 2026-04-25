
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const chatWithAI = async (messages: Message[]) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API Key not found in environment variables.');
  }

  // Use the specific endpoint that was verified to work
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const body: any = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    };

    if (systemMessage) {
      body.system_instruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Failed to fetch from Gemini API (${response.status})`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response:', data);
      throw new Error('Resposta inválida da IA.');
    }
    
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
};

export const chatWithDeepSeek = chatWithAI;
