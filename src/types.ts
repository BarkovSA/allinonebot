import { Context } from "grammy";

// Режимы бота
export enum BotMode {
  MainMenu = "main_menu",
  ImageGen = "image_gen",
  Weather = "weather",
  Alarm = "alarm",
  MovieRecommendation = "movie_recommendation",
  VideoGen = "video_gen",
  VideoQuote = "video_quote",
  VideoCelebration = "video_celebration",
  VideoMotivation = "video_motivation",
}

// Расширенный контекст бота
export interface BotContext extends Context {
  userId: number;
  mode: BotMode;
}

// Пользователь в БД
export interface User {
  id?: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Статус генерации изображения
export interface GenerationStatus {
  userId: number;
  startTime: number;
  uuid?: string;
}

// FusionBrain API Types
export interface FusionBrainModel {
  id: string; // UUID в новой версии API
  uuid?: string; // Альтернативное поле
  name: string;
  version: number;
  type: string;
}

export interface FusionBrainRunRequest {
  type: string;
  numImages: number;
  width: number;
  height: number;
  generateParams: {
    query: string;
  };
}

export interface FusionBrainRunResponse {
  uuid: string;
  status: string;
}

export interface FusionBrainStatusResponse {
  uuid: string;
  status: "INITIAL" | "PROCESSING" | "DONE" | "FAIL";
  result?: {
    files?: string[]; // Base64 encoded images согласно Rust проекту
  };
  censored?: boolean;
  errorDescription?: string;
  error_description?: string; // snake_case версия
}

// Callback data для inline кнопок
export type CallbackData =
  | "menu_image_gen"
  | "menu_weather"
  | "menu_alarm"
  | "menu_movie"
  | "menu_video"
  | "image_space"
  | "image_back"
  | "back_to_menu";
