import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Brain,
  Upload,
  Edit,
  Wand2,
  FileText,
  Share,
  Users,
  CheckCircle,
  ListTodo,
  Loader2,
  Copy,
  Mail,
  RotateCcw,
  TriangleAlert,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/ui/file-upload";
import { queryClient } from "@/lib/queryClient";

import {
  uploadTranscriptFile,
  createTranscriptFromText,
  generateSummary,
  updateSummary,
  sendEmailSummary,
  type Summary,
  type UploadTranscriptResponse,
} from "@/lib/api";

const emailFormSchema = z.object({
  recipients: z.string().min(1, "Recipients are required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().optional(),
  includeTranscript: z.boolean().default(false),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

export default function Home() {
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("Summarize in bullet points for executives");
  const [currentTranscript, setCurrentTranscript] = useState<UploadTranscriptResponse | null>(null);
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
  const [editedSummaryContent, setEditedSummaryContent] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const { toast } = useToast();

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      recipients: "",
      subject: "",
      message: "",
      includeTranscript: false,
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: uploadTranscriptFile,
    onSuccess: (data) => {
      setCurrentTranscript(data);
      setTranscriptText(data.content);
      toast({
        title: "File uploaded successfully",
        description: "Your transcript file has been processed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create transcript from text mutation
  const createTranscriptMutation = useMutation({
    mutationFn: createTranscriptFromText,
    onSuccess: (data) => {
      setCurrentTranscript(data);
      toast({
        title: "Transcript saved",
        description: "Your transcript text has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save transcript",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: generateSummary,
    onSuccess: (data) => {
      setCurrentSummary(data);
      setEditedSummaryContent(data.content);
      emailForm.setValue("subject", `Meeting Summary - ${new Date().toLocaleDateString()}`);
      toast({
        title: "Summary generated",
        description: "AI has successfully generated your meeting summary.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update summary mutation
  const updateSummaryMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateSummary(id, content),
    onSuccess: (data) => {
      setCurrentSummary(data);
      toast({
        title: "Summary updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: sendEmailSummary,
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "Email sent successfully",
        description: "The summary has been sent to all recipients.",
      });
    },
    onError: (error) => {
      toast({
        title: "Email sending failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    setTranscriptFile(file);
    uploadFileMutation.mutate(file);
  };

  const handleFileClear = () => {
    setTranscriptFile(null);
    setCurrentTranscript(null);
    setTranscriptText("");
  };

  const handleTranscriptTextSubmit = () => {
    if (!transcriptText.trim()) {
      toast({
        title: "No transcript text",
        description: "Please enter some transcript text.",
        variant: "destructive",
      });
      return;
    }
    createTranscriptMutation.mutate(transcriptText);
  };

  const handleGenerateSummary = () => {
    if (!currentTranscript) {
      if (transcriptText.trim()) {
        // First create transcript, then generate summary
        createTranscriptMutation.mutate(transcriptText);
        return;
      }
      toast({
        title: "No transcript",
        description: "Please upload a file or enter transcript text first.",
        variant: "destructive",
      });
      return;
    }

    if (!customPrompt.trim()) {
      toast({
        title: "No prompt",
        description: "Please enter a custom prompt for the AI.",
        variant: "destructive",
      });
      return;
    }

    generateSummaryMutation.mutate({
      transcriptId: currentTranscript.id,
      prompt: customPrompt,
    });
  };

  const handleRegenerateSummary = () => {
    if (currentTranscript) {
      generateSummaryMutation.mutate({
        transcriptId: currentTranscript.id,
        prompt: customPrompt,
      });
    }
  };

  const handleSummaryEdit = () => {
    if (currentSummary && editedSummaryContent !== currentSummary.content) {
      updateSummaryMutation.mutate({
        id: currentSummary.id,
        content: editedSummaryContent,
      });
    }
  };

  const handleCopySummary = async () => {
    if (editedSummaryContent) {
      try {
        await navigator.clipboard.writeText(editedSummaryContent);
        toast({
          title: "Copied to clipboard",
          description: "Summary has been copied to your clipboard.",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Failed to copy to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const onEmailSubmit = (data: EmailFormData) => {
    if (!currentSummary) {
      toast({
        title: "No summary to send",
        description: "Please generate a summary first.",
        variant: "destructive",
      });
      return;
    }

    // Parse and validate email addresses
    const emailList = data.recipients
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emailList.length === 0) {
      toast({
        title: "Invalid recipients",
        description: "Please enter valid email addresses.",
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate({
      summaryId: currentSummary.id,
      recipients: JSON.stringify(emailList),
      subject: data.subject,
      message: data.message,
      includeTranscript: data.includeTranscript,
    });
  };

  const promptTemplates = [
    {
      icon: Users,
      title: "Executive Summary",
      prompt: "Summarize in bullet points for executives",
    },
    {
      icon: ListTodo,
      title: "Action Items Only",
      prompt: "Highlight only action items and deadlines",
    },
    {
      icon: CheckCircle,
      title: "Decisions & Next Steps",
      prompt: "Focus on decisions made and next steps",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <Brain className="text-blue-600 mr-3" />
            AI Meeting Notes Summarizer
          </h1>
          <p className="text-gray-600 mt-1">
            Upload transcripts, customize prompts, and share AI-generated summaries
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* 1. Upload Transcript */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Upload className="text-blue-600 mr-2" />
              1. Upload Meeting Transcript
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Upload Text File
              </Label>
              <FileUpload
                onFileSelect={handleFileSelect}
                onFileClear={handleFileClear}
                selectedFile={transcriptFile || undefined}
                data-testid="file-upload"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <div>
              <Label htmlFor="transcript-text" className="text-sm font-medium text-gray-700 mb-2 block">
                Paste Transcript Text
              </Label>
              <Textarea
                id="transcript-text"
                rows={8}
                className="resize-vertical"
                placeholder="Paste your meeting transcript here... 

Example:
John: We need to finalize the Q4 budget by next Friday.
Sarah: I'll prepare the revenue projections by Wednesday.
Mike: The marketing team needs approval for the new campaign..."
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                data-testid="textarea-transcript"
              />
              {transcriptText && !currentTranscript && (
                <Button
                  onClick={handleTranscriptTextSubmit}
                  className="mt-2"
                  disabled={createTranscriptMutation.isPending}
                  data-testid="button-save-transcript"
                >
                  {createTranscriptMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save Transcript
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Custom Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Edit className="text-blue-600 mr-2" />
              2. Customize Summary Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="custom-prompt" className="text-sm font-medium text-gray-700 mb-2 block">
                AI Prompt
              </Label>
              <Textarea
                id="custom-prompt"
                rows={3}
                placeholder="Enter custom instructions for the AI summary...

Examples:
• Summarize in bullet points for executives
• Highlight only action items and deadlines
• Create a detailed summary with participant insights
• Focus on decisions made and next steps"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                data-testid="textarea-prompt"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {promptTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto p-2 text-left"
                  onClick={() => setCustomPrompt(template.prompt)}
                  data-testid={`button-template-${index}`}
                >
                  <template.icon className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm">{template.title}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Generate Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Wand2 className="text-blue-600 mr-2" />
                3. Generate AI Summary
              </CardTitle>
              <Button
                onClick={handleGenerateSummary}
                disabled={generateSummaryMutation.isPending}
                className="font-medium"
                data-testid="button-generate-summary"
              >
                {generateSummaryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Summary
                    <Wand2 className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {generateSummaryMutation.isPending && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin" />
                <p className="text-gray-600">AI is analyzing your transcript...</p>
                <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
              </div>
            )}

            {generateSummaryMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <TriangleAlert className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Generation Failed</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {generateSummaryMutation.error?.message || "Please check your transcript and try again."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Review & Edit Summary */}
        {currentSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="text-blue-600 mr-2" />
                4. Review & Edit Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="summary-text" className="text-sm font-medium text-gray-700">
                    Generated Summary
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopySummary}
                    data-testid="button-copy-summary"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy to Clipboard
                  </Button>
                </div>
                <Textarea
                  id="summary-text"
                  rows={12}
                  className="resize-vertical"
                  placeholder="AI-generated summary will appear here..."
                  value={editedSummaryContent}
                  onChange={(e) => setEditedSummaryContent(e.target.value)}
                  onBlur={handleSummaryEdit}
                  data-testid="textarea-summary"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  You can edit the summary above before sharing
                </p>
                <Button
                  variant="outline"
                  onClick={handleRegenerateSummary}
                  disabled={generateSummaryMutation.isPending}
                  data-testid="button-regenerate"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. Share Summary via Email */}
        {currentSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Share className="text-blue-600 mr-2" />
                5. Share Summary via Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="recipients"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Email Addresses</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter email addresses separated by commas (e.g., john@company.com, sarah@company.com)"
                            {...field}
                            data-testid="input-recipients"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          Separate multiple email addresses with commas
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Meeting Summary - [Date]"
                            {...field}
                            data-testid="input-subject"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Optional Message</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Add a personal message (optional)..."
                            {...field}
                            data-testid="textarea-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={emailForm.control}
                      name="includeTranscript"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-include-transcript"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm text-gray-700">
                              Include original transcript as attachment
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={sendEmailMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 font-medium"
                      data-testid="button-send-email"
                    >
                      {sendEmailMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Send Summary
                    </Button>
                  </div>
                </form>
              </Form>

              {emailSent && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">
                        Email Sent Successfully!
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        The summary has been sent to all recipients.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center py-8 text-gray-500 text-sm">
          <p>Developed by Utkarsh • Built for efficient meeting management</p>
        </footer>
      </main>
    </div>
  );
}
