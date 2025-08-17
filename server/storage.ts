import { type Transcript, type Summary, type EmailShare, type InsertTranscript, type InsertSummary, type InsertEmailShare } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Transcript operations
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  getTranscript(id: string): Promise<Transcript | undefined>;
  
  // Summary operations
  createSummary(summary: InsertSummary): Promise<Summary>;
  getSummary(id: string): Promise<Summary | undefined>;
  updateSummaryContent(id: string, editedContent: string): Promise<Summary | undefined>;
  getSummariesByTranscript(transcriptId: string): Promise<Summary[]>;
  
  // Email share operations
  createEmailShare(emailShare: InsertEmailShare): Promise<EmailShare>;
  getEmailShare(id: string): Promise<EmailShare | undefined>;
}

export class MemStorage implements IStorage {
  private transcripts: Map<string, Transcript>;
  private summaries: Map<string, Summary>;
  private emailShares: Map<string, EmailShare>;

  constructor() {
    this.transcripts = new Map();
    this.summaries = new Map();
    this.emailShares = new Map();
  }

  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const id = randomUUID();
    const transcript: Transcript = {
      ...insertTranscript,
      id,
      filename: insertTranscript.filename ?? null,
      createdAt: new Date(),
    };
    this.transcripts.set(id, transcript);
    return transcript;
  }

  async getTranscript(id: string): Promise<Transcript | undefined> {
    return this.transcripts.get(id);
  }

  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    const id = randomUUID();
    const summary: Summary = {
      transcriptId: insertSummary.transcriptId,
      prompt: insertSummary.prompt,
      content: insertSummary.content || "", // Default empty string if not provided
      id,
      editedContent: null,
      createdAt: new Date(),
    };
    this.summaries.set(id, summary);
    return summary;
  }

  async getSummary(id: string): Promise<Summary | undefined> {
    return this.summaries.get(id);
  }

  async updateSummaryContent(id: string, editedContent: string): Promise<Summary | undefined> {
    const summary = this.summaries.get(id);
    if (summary) {
      const updatedSummary = { ...summary, editedContent };
      this.summaries.set(id, updatedSummary);
      return updatedSummary;
    }
    return undefined;
  }

  async getSummariesByTranscript(transcriptId: string): Promise<Summary[]> {
    return Array.from(this.summaries.values()).filter(
      (summary) => summary.transcriptId === transcriptId
    );
  }

  async createEmailShare(insertEmailShare: InsertEmailShare): Promise<EmailShare> {
    const id = randomUUID();
    const emailShare: EmailShare = {
      ...insertEmailShare,
      id,
      message: insertEmailShare.message ?? null,
      includeTranscript: insertEmailShare.includeTranscript ?? null,
      sentAt: new Date(),
    };
    this.emailShares.set(id, emailShare);
    return emailShare;
  }

  async getEmailShare(id: string): Promise<EmailShare | undefined> {
    return this.emailShares.get(id);
  }
}

export const storage = new MemStorage();
