import { config } from "../../config.ts";
import {
  FusionBrainModel,
  FusionBrainRunResponse,
  FusionBrainStatusResponse,
} from "../../types.ts";

export class FusionBrainClient {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private modelId: string | null = null;

  constructor() {
    this.apiKey = config.fusionBrain.apiKey;
    this.secretKey = config.fusionBrain.secretKey;
    this.baseUrl = config.fusionBrain.baseUrl;
  }

  // Получить headers для запросов
  private getHeaders(): HeadersInit {
    return {
      "X-Key": `Key ${this.apiKey}`,
      "X-Secret": `Secret ${this.secretKey}`,
    };
  }

  // Получить доступные модели и выбрать первую
  async getModelId(): Promise<string> {
    if (this.modelId !== null) {
      return this.modelId;
    }

    try {
      // Правильный endpoint - pipelines, не models
      const response = await fetch(`${this.baseUrl}/key/api/v1/pipelines`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        // Если endpoint не работает, используем стандартный UUID
        console.warn(`⚠️ Failed to get models (${response.statusText}), using standard model UUID`);
        this.modelId = "99d833d6-fec0-44fd-a1c2-35d6bf96b5c2"; // Kandinsky Split 3.0 UUID
        return this.modelId;
      }

      const models: FusionBrainModel[] = await response.json();
      
      if (models.length === 0) {
        console.warn("⚠️ No models available, using default model UUID");
        this.modelId = "99d833d6-fec0-44fd-a1c2-35d6bf96b5c2";
        return this.modelId;
      }

      this.modelId = models[0].id || models[0].uuid;
      console.log(`✅ Selected model: ${models[0].name} (ID: ${this.modelId})`);
      
      return this.modelId;
    } catch (error) {
      console.warn("⚠️ Error getting model ID, using default:", error);
      this.modelId = "99d833d6-fec0-44fd-a1c2-35d6bf96b5c2"; // Fallback на стандартный UUID
      return this.modelId;
    }
  }

  // Запустить генерацию изображения
  async generateImage(prompt: string): Promise<string> {
    try {
      const modelId = await this.getModelId();
      
      console.log(`🔧 Using model ID: ${modelId}`);
      console.log(`🔧 API URL: ${this.baseUrl}/key/api/v1/text2image/run`);
      console.log(`🔧 API Key (first 10 chars): ${this.apiKey.substring(0, 10)}...`);

      // Подготовка данных для multipart/form-data
      const formData = new FormData();
      formData.append("pipeline_id", modelId.toString());
      
      const params = {
        type: "GENERATE",
        numImages: 1,
        width: 1024,
        height: 1024,
        generateParams: {
          query: prompt,
        },
      };
      
      console.log(`🔧 Request params:`, JSON.stringify(params, null, 2));
      
      const paramsBlob = new Blob([JSON.stringify(params)], {
        type: "application/json",
      });
      formData.append("params", paramsBlob, "params.json");

      // Заголовки согласно документации FusionBrain
      const headers: Record<string, string> = {
        "X-Key": `Key ${this.apiKey}`,
        "X-Secret": `Secret ${this.secretKey}`,
      };

      // Правильный endpoint согласно рабочему Rust проекту
      const url = `${this.baseUrl}/key/api/v1/pipeline/run`;
      console.log(`🔧 Sending request to: ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error Response:", errorText);
        console.error("❌ Status:", response.status);
        console.error("❌ Headers:", JSON.stringify([...response.headers.entries()]));
        
        // Возможно, ключи неверные или API изменился
        if (response.status === 404) {
          throw new Error(`API endpoint not found. Please check if your API keys are correct and the service is available. URL: ${url}`);
        }
        
        throw new Error(`Failed to start generation: ${response.statusText} - ${errorText}`);
      }

      const result: FusionBrainRunResponse = await response.json();
      console.log(`🚀 Generation started with UUID: ${result.uuid}`);
      
      return result.uuid;
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }

  // Проверить статус генерации (с retry при сетевых ошибках)
  async checkStatus(uuid: string, retries = 3): Promise<FusionBrainStatusResponse> {
    const url = `${this.baseUrl}/key/api/v1/pipeline/status/${uuid}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Status check failed. URL: ${url}`);
          console.error(`❌ Response: ${response.status} - ${errorText}`);
          throw new Error(`Failed to check status: ${response.statusText}`);
        }

        const result: FusionBrainStatusResponse = await response.json();
        return result;
      } catch (error) {
        if (attempt < retries) {
          console.warn(`⚠️ Network error on attempt ${attempt}/${retries}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        } else {
          console.error("Error checking status:", error);
          throw error;
        }
      }
    }
    
    throw new Error("Max retries reached");
  }

  // Дождаться завершения генерации (с polling)
  async waitForGeneration(uuid: string): Promise<string> {
    const maxAttempts = config.antiSpam.maxStatusChecks;
    const interval = config.antiSpam.statusCheckInterval;
    const initialDelay = config.antiSpam.initialDelay || 20000;

    // Первая задержка - генерация требует времени
    console.log(`⏳ Waiting ${initialDelay/1000}s before first status check...`);
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 Checking status (attempt ${attempt}/${maxAttempts})...`);
      
      const status = await this.checkStatus(uuid);

      if (status.status === "DONE") {
        // Результат в result.files согласно Rust проекту
        if (status.result?.files && status.result.files.length > 0) {
          console.log(`✅ Generation completed!`);
          return status.result.files[0]; // Возвращаем base64 изображение
        } else {
          throw new Error("Generation completed but no images in result");
        }
      }

      if (status.status === "FAIL") {
        const errorMsg = status.errorDescription || status.error_description || "Generation failed";
        throw new Error(errorMsg);
      }

      if (status.censored) {
        throw new Error("Image was censored by content filter");
      }

      // Ждём перед следующей проверкой
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error("Generation timeout - max attempts reached");
  }

  // Полная генерация с ожиданием результата
  async generate(prompt: string): Promise<string> {
    const uuid = await this.generateImage(prompt);
    const base64Image = await this.waitForGeneration(uuid);
    return base64Image;
  }
}
