// Speech-to-Text для голосовых напоминаний через OpenAI Whisper

export interface VoiceTranscription {
  text: string;
  confidence: number;
  duration?: number;
}

// Распознать голосовое сообщение через Whisper API
export async function transcribeVoice(
  audioBuffer: ArrayBuffer,
  whisperUrl: string
): Promise<VoiceTranscription | null> {
  try {
    console.log("🎤 Transcribing voice via Whisper API...");
    
    // Создаём FormData с аудио файлом
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: "audio/ogg" });
    formData.append("audio_file", audioBlob, "voice.ogg");

    // Отправляем на Whisper API
    const response = await fetch(
      `${whisperUrl}/asr?task=transcribe&language=ru&output=json`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      console.error(`Whisper API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    
    console.log("✅ Whisper transcription result:", result);

    return {
      text: result.text || "",
      confidence: 1.0, // Whisper не возвращает confidence, ставим 1.0
    };
  } catch (error) {
    console.error("Error transcribing voice:", error);
    return null;
  }
}

// Скачать голосовой файл из Telegram
export async function downloadVoiceFile(fileId: string, botToken: string): Promise<ArrayBuffer | null> {
  try {
    // 1. Получаем информацию о файле
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    
    const fileInfo = await fileInfoResponse.json();
    
    if (!fileInfo.ok) {
      console.error("Failed to get file info:", fileInfo);
      return null;
    }

    const filePath = fileInfo.result.file_path;
    
    // 2. Скачиваем файл
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const fileResponse = await fetch(fileUrl);
    
    if (!fileResponse.ok) {
      console.error("Failed to download file");
      return null;
    }

    return await fileResponse.arrayBuffer();
  } catch (error) {
    console.error("Error downloading voice file:", error);
    return null;
  }
}

// Простое распознавание через встроенный Telegram API (если доступно)
export function transcribeViaTelegram(
  _fileId: string, 
  _botToken: string
): string | null {
  try {
    // Telegram не предоставляет встроенное STT через Bot API
    // Нужно использовать сторонний сервис
    
    // Для MVP - просто информируем что это голосовое
    return "[Голосовое сообщение]";
  } catch (error) {
    console.error("Error transcribing via Telegram:", error);
    return null;
  }
}
