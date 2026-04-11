import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateSimulation, useParsePolicyPdf } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Zap, FileText, Upload, X } from "lucide-react";

function isMeaningfulText(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length < 5) return false;

  const alphaChars = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const alphaRatio = alphaChars / trimmed.replace(/\s/g, "").length;
  if (alphaRatio < 0.55) return false;

  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;
  if (uniqueChars < 8) return false;

  const maxRepeat = Math.max(
    ...Object.values(
      [...trimmed.toLowerCase()].reduce((acc, c) => {
        if (c !== " ") acc[c] = (acc[c] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
  );
  if (maxRepeat / trimmed.replace(/\s/g, "").length > 0.4) return false;

  return true;
}

const formSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title is too long")
    .refine(
      (v) => {
        const words = v.trim().split(/\s+/);
        const alphaRatio = (v.match(/[a-zA-Z]/g) || []).length / v.replace(/\s/g, "").length;
        return words.length >= 2 && alphaRatio >= 0.5;
      },
      { message: "Title must contain at least two meaningful words" }
    ),
  policyDescription: z
    .string()
    .min(30, "Policy description must be at least 30 characters")
    .refine(isMeaningfulText, {
      message:
        "Please enter a real policy description. Gibberish, random characters, or very short phrases are not accepted.",
    }),
  city: z.string().min(1, "Please select a city"),
});

export default function NewSimulation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createSimulation = useCreateSimulation();
  const parsePdf = useParsePolicyPdf();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfMeta, setPdfMeta] = useState<{ name: string; pages: number; words: number } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      policyDescription: "",
      city: "",
    },
  });

  const handlePdfUpload = async (file: File) => {
    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }

    parsePdf.mutate(
      { file },
      {
        onSuccess: (result) => {
          // Trim to a reasonable length for the textarea
          const trimmed = result.text.slice(0, 3000).trim();
          form.setValue("policyDescription", trimmed, { shouldValidate: true });
          setPdfMeta({ name: file.name, pages: result.pageCount, words: result.wordCount });
          toast({
            title: "PDF parsed",
            description: `Extracted ${result.wordCount.toLocaleString()} words from ${result.pageCount} page${result.pageCount !== 1 ? "s" : ""}.`,
          });
        },
        onError: () => {
          toast({
            title: "PDF parse failed",
            description: "Could not extract text from the file. Try a different PDF or paste the policy text manually.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const clearPdf = () => {
    setPdfMeta(null);
    form.setValue("policyDescription", "", { shouldValidate: false });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createSimulation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          toast({
            title: "Simulation Initialized",
            description: "Platform is ready. Click Run Simulation to start the debate.",
          });
          setLocation(`/simulations/${data.id}`);
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error || "Could not create simulation parameters.";
          toast({
            title: "Initialization Failed",
            description: message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-700 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/simulations")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Initialize Model</h1>
          <p className="text-muted-foreground mt-1">Configure parameters for a new policy simulation</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Simulation Parameters
          </CardTitle>
          <CardDescription>
            Define the policy to be tested and the target demographic area. The engine will generate 10 citizen archetypes who debate the policy in real time.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Simulation Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mandatory Electric Vehicles by 2030" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormDescription>A concise name for this policy model.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target City</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue placeholder="Select a city model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mumbai">Mumbai (High Density, Coastal)</SelectItem>
                        <SelectItem value="Delhi">Delhi (Capital, High Pollution)</SelectItem>
                        <SelectItem value="Bengaluru">Bengaluru (Tech Hub, Traffic)</SelectItem>
                        <SelectItem value="Chennai">Chennai (Manufacturing, Coastal)</SelectItem>
                        <SelectItem value="Hyderabad">Hyderabad (Tech Hub, Expanding)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Demographic distribution will be adjusted for the selected city profile.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="policyDescription"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-1.5">
                      <FormLabel className="mb-0">Policy Description</FormLabel>
                      <div className="flex items-center gap-2">
                        {pdfMeta && (
                          <Badge variant="outline" className="gap-1.5 text-xs font-normal">
                            <FileText className="h-3 w-3 text-primary" />
                            {pdfMeta.name} &middot; {pdfMeta.pages}p &middot; {pdfMeta.words.toLocaleString()} words
                            <button
                              type="button"
                              onClick={clearPdf}
                              className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                              title="Remove PDF"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          disabled={parsePdf.isPending}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {parsePdf.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          {parsePdf.isPending ? "Parsing..." : "Upload PDF"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePdfUpload(file);
                          }}
                        />
                      </div>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the policy in clear, specific language. Example: All auto-rickshaws in the city must transition to CNG or electric engines by January 2027. Existing operators will receive a one-time subsidy of ₹50,000 toward vehicle conversion...&#10;&#10;Or upload a PDF policy document using the button above to auto-fill this field."
                        className="min-h-[160px] bg-background/50 resize-none text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe the policy clearly or upload a PDF document. The AI agents will read this and form authentic opinions — vague or nonsensical input produces poor results.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t border-border/50 pt-6 flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setLocation("/simulations")}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSimulation.isPending} className="shadow-lg shadow-primary/20 min-w-[160px]">
                {createSimulation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  "Create Simulation"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
