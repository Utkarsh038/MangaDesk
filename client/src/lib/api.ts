import { apiRequest } from "./queryClient";

export interface UploadTranscriptResponse {
  id: string;
  content: string;
  filename?: string;
  createdAt: string;
}

export interface CreateSummaryRequest {
  transcriptId: string;
  prompt: string;
}

export interface Summary {
  id: string;
  transcriptId: string;
  prompt: string;
  content: string;
  editedContent?: string;
  createdAt: string;
}

export interface SendEmailRequest {
  summaryId: string;
  recipients: string; // JSON string of email array
  subject: string;
  message?: string;
  includeTranscript: boolean;
}

export async function uploadTranscriptFile(file: File): Promise<UploadTranscriptResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/transcripts/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload file');
  }
  
  return response.json();
}

export async function createTranscriptFromText(content: string): Promise<UploadTranscriptResponse> {
  const response = await apiRequest('POST', '/api/transcripts', { content });
  return response.json();
}

export async function generateSummary(data: CreateSummaryRequest): Promise<Summary> {
  const response = await apiRequest('POST', '/api/summaries', data);
  return response.json();
}

export async function updateSummary(id: string, editedContent: string): Promise<Summary> {
  const response = await apiRequest('PATCH', `/api/summaries/${id}`, { editedContent });
  return response.json();
}

export async function sendEmailSummary(data: SendEmailRequest) {
  const response = await apiRequest('POST', '/api/email/send', data);
  return response.json();
}
