/**
 * KORA YouTube Pipeline
 * 
 * Handles YouTube video processing including:
 * - Video metadata extraction
 * - Transcript extraction from captions
 * - Fallback transcription via Whisper/AssemblyAI
 * - Content analysis and summarization
 */

export { YouTubeClient, createYouTubeClient } from "./client"
export { TranscriptExtractor, extractTranscript } from "./transcript"
export { YouTubePipeline, processYouTubeUrl, batchProcessYouTubeUrls } from "./pipeline"
export type {
  YouTubeClientConfig,
  TranscriptExtractionResult,
  TranscriptSegment,
  TranscriptionProvider,
} from "./types"
