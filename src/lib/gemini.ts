import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const FALLBACK_PASSAGES = [
  "燕子去了，有再来的时候；杨柳枯了，有再青的时候；桃花谢了，有再开的时候。但是，聪明的，你告诉我，我们的日子为什么一去不复返呢？",
  "秋天的后园。秋蝉的衰弱的残声，还在树叶茂密处挣扎。青翠的竹叶，由于这声响，似乎都要落下来。我感到了那种迫近的凉意。"
];

export interface EvaluationResult {
  overall: number;
  fluency: number;
  accuracy: number;
  clarity: number;
  emotion: number;
  advice: string;
}

/**
 * Fetch a classical modern Chinese literature passage for recitation.
 */
export async function fetchAIPassage(): Promise<string> {
  const themes = ["自然山水", "家乡思念", "人生感悟", "四季流转", "生活百态", "童年往事"];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        parts: [{
          text: `请随机生成一段约80-120字的中国现代文学经典段落，用于汉语朗诵练习。
当前场景主题：【${randomTheme}】
要求：
- 严格选自鲁迅、朱自清、老舍、沈从文、萧红、郁达夫、张爱玲等著名作家的真实作品。
- 必须是真实存在的文学段落，严禁AI原创。
- 请避开最常见的教科书段落（如《荷塘月色》开头、《给我的孩子》等），尽量挖掘具有文学张力和情感色彩的冷门佳句。
- 语言需具备节奏感，适合朗诵测评。
- 仅返回段落原文，不要包含标题、作者、引号或任何说明文字。`
        }]
      }]
    });
    
    const text = response.text || "";
    return text.trim() || FALLBACK_PASSAGES[0];
  } catch (error) {
    console.error("Failed to fetch AI passage:", error);
    return FALLBACK_PASSAGES[Math.floor(Math.random() * FALLBACK_PASSAGES.length)];
  }
}

/**
 * Evaluate the user's recorded audio against the reference passage.
 */
export async function evaluateAudio(audioBase64: string, passageText: string): Promise<EvaluationResult> {
  const prompt = `你是一位享誉国际的汉语语音评测与艺术朗诵指导专家。请对用户的录音进行深度、专业且具有指导意义的评测。

【参考文本】
${passageText}

【评测标准】
1. 朗诵流畅程度：考察语速稳定性、气息支点、连读处理及停连的艺术性。
2. 发音标准程度：严扣声韵调，识别方言干扰，指出具体的纠音建议。
3. 吐字清晰程度：考察字头、字腹、字尾的归韵，识别吃字或含糊现象。
4. 情感饱满程度：评估语调的抑扬顿挫是否与文本意境契合，共情能力如何。

【输出要求（严禁套话）】
- JSON 格式返回。
- advice 字段必须包含以下三部分（总字数建议200字以上）：
  1. 【优点分析】：发掘用户在音色、节奏或某个具体字眼处理上的闪光点。
  2. 【具体不足】：必须列举录音中表现不佳的特定词汇或句子，并说明原因（如：某处声调偏高、某字气息不稳、某句情感过于直白）。
  3. 【专业建议】：提供具体的训练方法（如：提颧伸唇练习、气息控制方法、情感投射技巧）。
- 仅返回 JSON，不要任何额外文本。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        parts: [
          { text: prompt },
          { 
            inlineData: {
              mimeType: "audio/webm",
              data: audioBase64
            }
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overall: { type: Type.NUMBER },
            fluency: { type: Type.NUMBER },
            accuracy: { type: Type.NUMBER },
            clarity: { type: Type.NUMBER },
            emotion: { type: Type.NUMBER },
            advice: { type: Type.STRING }
          },
          required: ["overall", "fluency", "accuracy", "clarity", "emotion", "advice"]
        }
      }
    });

    const resultText = response.text || "{}";
    return JSON.parse(resultText) as EvaluationResult;
  } catch (error) {
    console.error("Evaluation failed:", error);
    throw error;
  }
}
