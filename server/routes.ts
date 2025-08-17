// Minimal Resend test route for debugging
import { Resend } from 'resend';

// Test route: POST /api/email/send-test
// Body: { to: string, subject: string, html: string, attachment?: { filename: string, content: string, type: string } }
export function registerResendTestRoute(app: Express) {
  app.post('/api/email/send-test', async (req, res) => {
    try {
      const { to, subject, html, attachment } = req.body;
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sendResult = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to,
        subject,
        html,
        attachments: attachment ? [attachment] : undefined,
      });
      if (sendResult.error) {
        console.error('Resend API error:', sendResult.error);
        return res.status(500).json({ message: `Resend error: ${sendResult.error.message || sendResult.error}` });
      }
      res.json({ message: 'Email sent successfully!' });
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({ message: 'Failed to send email' });
    }
  });
}
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTranscriptSchema, insertSummarySchema, insertEmailShareSchema } from "@shared/schema";
import multer, { type FileFilterCallback } from "multer";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register the minimal Resend test route for debugging
  registerResendTestRoute(app);
  // Upload transcript file
  app.post("/api/transcripts/upload", upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = req.file.buffer.toString('utf-8');
      const filename = req.file.originalname;

      const transcriptData = insertTranscriptSchema.parse({
        content,
        filename,
      });

      const transcript = await storage.createTranscript(transcriptData);
      res.json(transcript);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to upload transcript" });
    }
  });

  // Create transcript from text
  app.post("/api/transcripts", async (req, res) => {
    try {
      const transcriptData = insertTranscriptSchema.parse(req.body);
      const transcript = await storage.createTranscript(transcriptData);
      res.json(transcript);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create transcript" });
    }
  });

  // Generate summary using AI API
  app.post("/api/summaries", async (req, res) => {
    try {
      // Parse request but validate required fields manually for better error messages
      const { transcriptId, prompt } = req.body;
      
      if (!transcriptId) {
        return res.status(400).json({ message: "transcriptId is required" });
      }
      if (!prompt) {
        return res.status(400).json({ message: "prompt is required" });
      }
      
      const summaryData = { transcriptId, prompt };
      
      // Get the transcript
      const transcript = await storage.getTranscript(summaryData.transcriptId);
      if (!transcript) {
        return res.status(404).json({ message: "Transcript not found" });
      }

      // Try multiple AI services in priority order: Google Gemini, OpenAI, then Groq
      const googleApiKey = process.env.GOOGLE_API_KEY;
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
      
      let aiSummary: string | undefined;
      let apiUsed = '';

      // Try Google Gemini first
      if (googleApiKey) {
        try {
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are an AI assistant that creates meeting summaries. Follow the user's instructions exactly for formatting and content focus.

Please summarize the following meeting transcript according to these instructions: "${summaryData.prompt}"

Transcript:
${transcript.content}`
                    }
                  ]
                }
              ]
            }),
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            aiSummary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            apiUsed = 'Google Gemini';
            console.log(`Summary generated using ${apiUsed}`);
          } else {
            const errorText = await geminiResponse.text();
            console.warn("Google Gemini API failed, trying OpenAI...", errorText);
          }
        } catch (error) {
          console.warn("Google Gemini API error, trying OpenAI...", error);
        }
      }

      // Try OpenAI if Gemini failed or isn't available
      if (!aiSummary && openaiApiKey) {
        try {
          const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are an AI assistant that creates meeting summaries. Follow the user's instructions exactly for formatting and content focus."
                },
                {
                  role: "user",
                  content: `Please summarize the following meeting transcript according to these instructions: "${summaryData.prompt}"\n\nTranscript:\n${transcript.content}`
                }
              ],
              temperature: 0.3,
              max_tokens: 2048,
            }),
          });

          if (openaiResponse.ok) {
            const openaiData = await openaiResponse.json();
            aiSummary = openaiData.choices[0]?.message?.content;
            apiUsed = 'OpenAI';
            console.log(`Summary generated using ${apiUsed}`);
          } else {
            const errorText = await openaiResponse.text();
            console.warn("OpenAI API failed, trying Groq...", errorText);
          }
        } catch (error) {
          console.warn("OpenAI API error, trying Groq...", error);
        }
      }

      // Fallback to Groq if other services failed or aren't available
      if (!aiSummary && groqApiKey) {
        try {
          const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                {
                  role: "system",
                  content: "You are an AI assistant that creates meeting summaries. Follow the user's instructions exactly for formatting and content focus."
                },
                {
                  role: "user",
                  content: `Please summarize the following meeting transcript according to these instructions: "${summaryData.prompt}"\n\nTranscript:\n${transcript.content}`
                }
              ],
              temperature: 0.3,
              max_tokens: 2048,
            }),
          });

          if (groqResponse.ok) {
            const groqData = await groqResponse.json();
            aiSummary = groqData.choices[0]?.message?.content;
            apiUsed = 'Groq';
            console.log(`Summary generated using ${apiUsed}`);
          } else {
            const errorText = await groqResponse.text();
            console.error("All AI services failed. Groq error:", errorText);
          }
        } catch (error) {
          console.error("Groq API error:", error);
        }
      }

      // Check if we have any API key
      if (!googleApiKey && !openaiApiKey && !groqApiKey) {
        return res.status(500).json({ message: "No AI API key configured (GOOGLE_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY required)" });
      }

      if (!aiSummary) {
        return res.status(500).json({ message: "Failed to generate summary with available AI services" });
      }

      // Save the summary
      const summary = await storage.createSummary({
        transcriptId: summaryData.transcriptId,
        prompt: summaryData.prompt,
        content: aiSummary,
      });

      res.json(summary);
    } catch (error) {
      console.error("Summary generation error:", error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // Update summary content
  app.patch("/api/summaries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { editedContent } = req.body;

      if (typeof editedContent !== 'string') {
        return res.status(400).json({ message: "editedContent must be a string" });
      }

      const summary = await storage.updateSummaryContent(id, editedContent);
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }

      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to update summary" });
    }
  });

  // Send email with summary
  app.post("/api/email/send", async (req, res) => {
    try {
      const emailData = insertEmailShareSchema.parse(req.body);
      // Get the summary and transcript
      const summary = await storage.getSummary(emailData.summaryId);
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }
      const transcript = await storage.getTranscript(summary.transcriptId);
      if (!transcript) {
        return res.status(404).json({ message: "Transcript not found" });
      }
      // Parse recipients
      const recipients = JSON.parse(emailData.recipients);
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ message: "Invalid recipients" });
      }
      // Prepare email content
      const summaryContent = summary.editedContent || summary.content;
      let emailBody = emailData.message ? `${emailData.message}\n\n---\n\n` : '';
      emailBody += `MEETING SUMMARY\n\n${summaryContent}`;
      // Prepare attachments if needed
      let attachments = [];
      if (emailData.includeTranscript && transcript.content) {
        attachments.push({
          filename: transcript.filename || 'transcript.txt',
          content: transcript.content,
          type: 'text/plain',
        });
      }
      // Send email using Resend
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sendResult = await resend.emails.send({
        from: 'no-reply@resend.dev',
        to: recipients,
        subject: emailData.subject,
        text: emailBody,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (sendResult.error) {
        console.error('Resend API error:', sendResult.error);
        return res.status(500).json({ message: `Resend error: ${sendResult.error.message || sendResult.error}` });
      }
      // Save email share record
      const emailShare = await storage.createEmailShare(emailData);
      res.json(emailShare);
    } catch (error) {
      console.error("Email sending error:", error);
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Get summary by ID
  app.get("/api/summaries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const summary = await storage.getSummary(id);
      
      if (!summary) {
        return res.status(404).json({ message: "Summary not found" });
      }

      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to get summary" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
