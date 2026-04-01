import Groq from "groq-sdk";

const groq = new Groq({ 
  apiKey: process.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true 
});

export const generateAIResponse = async (prompt: string, context: string) => {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are Nexera AI, the intelligent assistant integrated into Nexera Note — a markdown-based workspace. You understand the user's notes and projects deeply. Provide concise, helpful, and actionable answers based on the provided context. When referencing note content, use markdown formatting."
        },
        {
          role: "user",
          content: `Context about the user's workspace:\n${context}\n\nUser question: ${prompt}`
        }
      ],
      model: "llama-3.3-70b-versatile",
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq AI Error:", error);
    return "Sorry, I encountered an error with the AI service.";
  }
};
