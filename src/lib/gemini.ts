import { GoogleGenAI, Type } from "@google/genai";

// Use import.meta.env for standard Vite deployments (Vercel, etc.) 
// and process.env for the AI Studio preview environment.
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const FALLBACK_PASSAGES = [
  "燕子去了，有再来的时候；杨柳枯了，有再青的时候；桃花谢了，有再开的时候。但是，聪明的，你告诉我，我们的日子为什么一去不复返呢？",
  "秋天的后园。秋蝉的衰弱的残声，还在树叶茂密处挣扎。青翠的竹叶，由于这声响，似乎都要落下来。我感到了那种迫近的凉意。",
  "江南的雪，可是滋润美艳之至了；那是还在隐约着的青春的消息，是极壮健的处子的皮肤。雪野中有血红的宝珠山茶，白中隐青的单瓣梅花。",
  "时间对于我，正如拿在手中的金钱一样，用掉一分便少一分。我不知道我的一生中，究竟还有多少这种可以随意选用的金钱。",
  "月光如流水一般，静静地泻在这一片叶子和花上。薄薄的青雾浮起在荷塘里。叶子和花仿佛在牛乳中洗过一样；又像笼着轻纱的梦。",
  "我也许就在那儿，在一处荒凉的、被遗忘的角落，像一棵树一样，深深地扎下根。不管风吹雨打，我都不离开这块土地。",
  "这北方的大地，在春天里，总是要经历一番痛苦的挣扎。那从北冰洋刮来的寒风，还要在那儿徘徊不去，仿佛要守住它最后的阵地。",
  "我们要给我们的心留一点空白。在繁忙的生活中，在紧张的工作中，在各种各样的压力下，我们要学会给自己的心留一点闲暇。",
  "那是一个夏天的午后，太阳火辣辣地照着大地。蝉儿在树上不停地叫着，仿佛在诉说着夏天。我坐在窗前，看着窗外的风景。",
  "人生是一场漫长的修行。在这场修行中，我们会遇到各种各样的人，经历各种各样的事。我们要学会从这些经历中吸取教训，不断成长。",
  "在这个世界上，有一种力量，它是无形的，但它却能改变一切。那就是爱。爱能温暖人心，能化解仇恨，能给人带来希望。",
  "海浪不停地拍打着沙滩，发出‘哗哗’的声音。那是大海在诉说着它的故事。我站在海边，感受着海风的吹拂，心情格外舒畅。"
];

export interface EvaluationResult {
  overall: number;
  fluency: number;
  accuracy: number;
  clarity: number;
  emotion: number;
  advice: string;
  transcription: string;
}

/**
 * Fetch a classical modern Chinese literature passage for recitation.
 */
export async function fetchAIPassage(): Promise<string> {
  const themes = ["自然山水", "家乡思念", "人生感悟", "四季流转", "生活百态", "童年往事"];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const authors = ["鲁迅", "朱自清", "老舍", "沈从文", "萧红", "郁达夫", "张爱玲", "冰心", "巴金", "徐志摩"];
  const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [{
          text: `请随机生成一段约80-120字的中国现代文学经典段落，用于汉语朗诵练习。
目标作家倾向：【${randomAuthor}】
当前场景主题：【${randomTheme}】
要求：
- 严格选自中国近现代著名作家的真实作品。
- 必须是真实存在的文学段落，严禁AI原创或随意拼凑。
- 请挖掘具有文学张力和情感色彩的佳句，语言需具备节奏感，适合朗诵测评。
- 仅返回段落原文，不要包含标题、作者、引号或任何说明文字。`
        }]
      }]
    });
    
    const text = response.text || "";
    if (!text.trim()) throw new Error("Empty AI response");
    return text.trim();
  } catch (error) {
    console.error("Gemini AI Calling Error (Passage):", error);
    // Return a random selection from a larger pool to fix "fixed segments" issue
    const randomIndex = Math.floor(Math.random() * FALLBACK_PASSAGES.length);
    return FALLBACK_PASSAGES[randomIndex];
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
2. 发音标准程度：严扣声韵调。请先在心中对语音进行转写，核对是否完整读出了参考文本中的每一个词，识别方言干扰并提供纠音建议。
3. 吐字清晰程度：考察字头、字腹、字尾的归韵。请排除环境底噪干扰，专注于人声评价。
4. 情感饱满程度：评估语调的抑扬顿挫是否与文本意境契合，共情能力如何。

【由于录音环境可能存在底噪或设备录音质量限制，请采取“内容优先”的评分策略：只要用户读音清晰可辨且内容完整准确，不应因录音音质原因给予低分。评分应具有一定的鼓励性，除非出现明显的漏读、错读或严重的情感缺失。】

【输出要求（严禁套话）】
- JSON 格式返回。
- transcription 字段：请提供你听到的用户朗读的文字内容（即语音转文字结果）。
- advice 字段必须包含以下三部分（总字数建议200字以上）：
  1. 【优点分析】：发掘用户在音色、节奏或某个具体字眼处理上的闪光点。
  2. 【具体不足】：必须列举录音中表现不佳的特定词汇或句子，并说明原因（如：某处声调偏高、某字气息不稳、某句情感过于直白）。
  3. 【专业建议】：提供具体的训练方法（如：提颧伸唇练习、气息控制方法、情感投射技巧）。
- 仅返回 JSON，不要任何额外文本。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
            advice: { type: Type.STRING },
            transcription: { type: Type.STRING }
          },
          required: ["overall", "fluency", "accuracy", "clarity", "emotion", "advice", "transcription"]
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
